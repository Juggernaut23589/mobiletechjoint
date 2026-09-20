#!/usr/bin/env python3
"""
Build a product-catalogue folder tree from camerajoint.ng.

camerajoint.ng runs WooCommerce, whose public Store API returns every product
as structured JSON (name, brand attribute, category, price, description, and
full-resolution image URLs). So this is an API export, not HTML scraping —
reliable, and far gentler on their server than crawling pages.

Output layout (what the business owner asked for):

    products-catalogue/
      README.txt
      catalogue-index.json           one summary row per product
      <brand>/                       e.g. canon, ulanzi, godox, kf-concept
        <product-slug>/
          product.json               name, price, category, description, source
          01.jpg  02.jpg  03.webp …  every image, in the store's own order

Idempotent and resumable: re-running skips images already on disk, so an
interrupted run just picks up where it left off.

Usage:
    python3 crawl-camerajoint-catalogue.py --dry-run          # brand breakdown, no downloads
    python3 crawl-camerajoint-catalogue.py --out /path/to/products-catalogue
"""
import argparse
import html
import json
import re
import sys
import time
import unicodedata
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import urlparse
from urllib.request import Request, urlopen

BASE = "https://www.camerajoint.ng"
API = f"{BASE}/wp-json/wc/store/v1/products"
UA = "MobileTechJoint catalogue import (contact: j.oarowolo@gmail.com)"
PER_PAGE = 100
IMAGE_WORKERS = 16
PAUSE_BETWEEN_PAGES = 0


def slugify(text: str) -> str:
    text = html.unescape(text)
    text = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode()
    text = re.sub(r"[^a-zA-Z0-9]+", "-", text).strip("-").lower()
    return text or "unnamed"


def fetch(url: str, retries: int = 4, binary: bool = False):
    delay = 1.0
    for attempt in range(retries):
        try:
            req = Request(url, headers={"User-Agent": UA, "Accept": "*/*"})
            with urlopen(req, timeout=60) as resp:
                data = resp.read()
                return (data, dict(resp.headers)) if binary else (json.loads(data), dict(resp.headers))
        except HTTPError as e:
            if e.code in (429, 500, 502, 503, 504) and attempt < retries - 1:
                time.sleep(delay)
                delay *= 2
                continue
            raise
        except URLError:
            if attempt < retries - 1:
                time.sleep(delay)
                delay *= 2
                continue
            raise


# Sub-lines and variants the source store lists as separate "brands" but
# which belong under one manufacturer folder. DGX -> Godox matches how the
# existing store already maps it (see scripts/backfill-brands.ts).
BRAND_ALIASES = {
    "fujifilm x": "FUJIFILM",
    "sony e": "Sony",
    "dgx": "GODOX",
    "instax": "FUJIFILM",
    "falcon": "Falconeyes",
}

KNOWN_BRANDS = set()  # filled from the Brand attribute across the catalogue

# Leading words that are descriptions, not manufacturers — a product whose
# name starts with one of these stays "Unbranded" rather than getting a
# folder called "mini" or "wireless".
GENERIC_LEADING_WORDS = {
    "mini", "wireless", "professional", "portable", "camera", "led", "usb", "universal",
    "heavy", "adjustable", "smart", "digital", "pro", "new", "original", "set", "kit",
    "video", "studio", "photo", "phone", "mobile", "tripod", "light", "ring", "flash",
    "lens", "battery", "charger", "cable", "adapter", "memory", "card", "bag", "case",
    "stand", "mount", "holder", "clip", "cold", "hot", "shoe", "arm", "dual", "single",
    "foldable", "extendable", "magnetic", "bluetooth", "hd", "4k", "8k", "black", "white",
    "the", "a", "an", "for", "with", "and", "large", "small", "big", "extra", "premium",
    "high", "low", "fast", "quick", "multi", "multifunction", "multifunctional", "type",
    "type-c", "hdmi", "sdi", "xlr", "rgb", "cob", "softbox", "umbrella", "reflector",
    "backdrop", "background", "green", "screen", "monitor", "microphone", "mic", "lavalier",
    "gimbal", "stabilizer", "drone", "action", "webcam", "security", "power", "bank",
    "plastic", "modeling", "modelling", "rod", "parabolic", "magic", "profesional",
    "curve", "silver", "dslr", "soulmate", "soft", "hard", "carbon", "aluminum",
    "aluminium", "metal", "steel", "wooden", "leather", "nylon", "waterproof",
}


def canonical_brand(name: str) -> str:
    name = html.unescape(name).strip()
    return BRAND_ALIASES.get(name.lower(), name)


def brand_of(product: dict) -> str:
    for attr in product.get("attributes", []):
        if attr.get("name", "").strip().lower() == "brand":
            terms = attr.get("terms") or []
            if terms:
                return canonical_brand(terms[0]["name"])
    for b in product.get("brands") or []:
        return canonical_brand(b["name"])
    # No Brand attribute: infer from the start of the product name if it
    # begins with a brand we've seen elsewhere in this catalogue.
    raw_title = html.unescape(product.get("name", "")).strip()
    title = raw_title.lower()
    for known in sorted(KNOWN_BRANDS, key=len, reverse=True):
        k = known.lower()
        if title.startswith(k + " ") or title.startswith(k + "-") or title == k:
            return known
    # Last resort: the leading word, if it reads like a manufacturer name.
    first = re.split(r"[\s/(,]+", raw_title, maxsplit=1)[0].strip("-–:")
    if (
        len(first) >= 3
        and re.search(r"[A-Za-z]", first)
        and first.lower() not in GENERIC_LEADING_WORDS
        and not re.fullmatch(r"[\d.]+[a-z]*", first, re.I)
        and not re.match(r"^[A-Za-z]{1,2}-?\d", first)
    ):
        return canonical_brand(first)
    return "Unbranded"


def all_products():
    page = 1
    total_pages = None
    while total_pages is None or page <= total_pages:
        data, headers = fetch(f"{API}?per_page={PER_PAGE}&page={page}")
        if total_pages is None:
            total_pages = int(headers.get("X-WP-TotalPages", "1"))
            print(f"  {headers.get('X-WP-Total', '?')} products across {total_pages} pages", flush=True)
        for p in data:
            yield p
        print(f"  fetched page {page}/{total_pages}", flush=True)
        page += 1
        time.sleep(PAUSE_BETWEEN_PAGES)


def image_filename(index: int, src: str) -> str:
    ext = Path(urlparse(src).path).suffix.lower() or ".jpg"
    if ext not in (".jpg", ".jpeg", ".png", ".webp", ".gif", ".avif"):
        ext = ".jpg"
    return f"{index:02d}{ext}"


def download_image(src: str, dest: Path) -> str:
    if dest.exists() and dest.stat().st_size > 0:
        return "skipped"
    data, _ = fetch(src, binary=True)
    dest.write_bytes(data)
    return "downloaded"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default="products-catalogue")
    ap.add_argument("--dry-run", action="store_true", help="fetch metadata only; print the brand breakdown")
    args = ap.parse_args()

    print("Fetching product list from camerajoint.ng …", flush=True)
    products = list(all_products())

    for p in products:
        for attr in p.get("attributes", []):
            if attr.get("name", "").strip().lower() == "brand":
                for t in attr.get("terms") or []:
                    KNOWN_BRANDS.add(canonical_brand(t["name"]))

    display_name = {}
    by_brand = {}
    for p in products:
        b = brand_of(p)
        key = slugify(b)
        display_name.setdefault(key, b)
        by_brand.setdefault(display_name[key], []).append(p)

    print(f"\n{len(products)} products in {len(by_brand)} brands:")
    for brand, items in sorted(by_brand.items(), key=lambda kv: -len(kv[1])):
        imgs = sum(len(p.get("images") or []) for p in items)
        print(f"  {slugify(brand):22s} {len(items):4d} products  {imgs:5d} images   ({brand})")

    if args.dry_run:
        return

    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)
    (out / "README.txt").write_text(
        "Product catalogue exported from camerajoint.ng via its WooCommerce Store API.\n"
        "Layout: <brand>/<product-slug>/product.json + numbered images (01 = cover).\n"
        "See catalogue-index.json for one summary row per product.\n"
        f"Exported: {time.strftime('%Y-%m-%d %H:%M:%S %Z')}\n"
    )

    index = []
    jobs = []
    for p in products:
        brand = display_name[slugify(brand_of(p))]
        folder = out / slugify(brand) / (p.get("slug") or slugify(p["name"]))
        folder.mkdir(parents=True, exist_ok=True)
        images = p.get("images") or []
        record = {
            "source_id": p["id"],
            "name": html.unescape(p["name"]),
            "slug": p.get("slug"),
            "brand": brand,
            "categories": [html.unescape(c["name"]) for c in p.get("categories", [])],
            "sku": p.get("sku") or None,
            "price": p.get("prices", {}).get("price"),
            "regular_price": p.get("prices", {}).get("regular_price"),
            "sale_price": p.get("prices", {}).get("sale_price"),
            "currency": p.get("prices", {}).get("currency_code"),
            "in_stock": p.get("is_in_stock"),
            "short_description_html": p.get("short_description"),
            "description_html": p.get("description"),
            "source_url": p.get("permalink"),
            "images": [
                {"file": image_filename(i + 1, img["src"]), "source": img["src"], "alt": img.get("alt", "")}
                for i, img in enumerate(images)
            ],
        }
        (folder / "product.json").write_text(json.dumps(record, indent=2, ensure_ascii=False))
        summary = {k: record[k] for k in ("source_id", "name", "brand", "categories", "price", "currency")}
        summary.update({"folder": str(folder.relative_to(out)), "image_count": len(images)})
        index.append(summary)
        for i, img in enumerate(images):
            jobs.append((img["src"], folder / image_filename(i + 1, img["src"])))

    (out / "catalogue-index.json").write_text(json.dumps(index, indent=2, ensure_ascii=False))
    print(f"\nWrote {len(index)} product.json files. Downloading {len(jobs)} images with {IMAGE_WORKERS} workers …", flush=True)

    counts = {"downloaded": 0, "skipped": 0, "failed": 0}
    failures = []
    with ThreadPoolExecutor(max_workers=IMAGE_WORKERS) as pool:
        futures = {pool.submit(download_image, src, dest): (src, dest) for src, dest in jobs}
        for n, fut in enumerate(as_completed(futures), 1):
            src, dest = futures[fut]
            try:
                counts[fut.result()] += 1
            except Exception as e:  # noqa: BLE001 — record and keep going
                counts["failed"] += 1
                failures.append({"image": src, "dest": str(dest), "error": str(e)})
            if n % 250 == 0 or n == len(jobs):
                print(f"  {n}/{len(jobs)}  {counts}", flush=True)

    if failures:
        (out / "failed-images.json").write_text(json.dumps(failures, indent=2))
    print(f"\nDone. {counts}. Output: {out.resolve()}")
    if failures:
        print(f"{len(failures)} image(s) failed — listed in failed-images.json; re-run to retry them.")


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        sys.exit("\nInterrupted — re-run to resume; existing images are skipped.")
