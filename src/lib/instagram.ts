/**
 * Instagram Graph API integration — see the proposal (Workstream B) for the
 * full rationale. Two hard constraints shape everything here:
 *
 *   1. Requires the account to be Business/Creator + linked to a Facebook
 *      Page + a Meta app that has passed review for the relevant
 *      permissions. INSTAGRAM_ACCESS_TOKEN / INSTAGRAM_BUSINESS_ACCOUNT_ID
 *      are empty placeholders until that setup is done — every function
 *      here fails gracefully (returns a typed error, never throws) when
 *      they're missing, same pattern as src/lib/paystack.ts.
 *
 *   2. An Instagram post has media + a caption, NEVER a price, stock
 *      count, or SKU. Every product created from here lands as
 *      status='draft' with price_kobo=NULL — the DB's own CHECK
 *      constraint (price_required_when_published) makes it structurally
 *      impossible for one to go live without a human setting a price via
 *      the /admin/products review screen.
 *
 * This code is believed correct against Meta's Graph API v19+ shape as of
 * writing, but is UNVERIFIED against a real account — there is no way to
 * test it without real credentials, exactly the same situation Paystack
 * was in before real keys existed. Re-verify field names against Meta's
 * current docs once a real access token is available.
 */

const GRAPH_API_VERSION = "v21.0";

export interface InstagramMediaItem {
  id: string;
  caption: string | null;
  mediaType: "IMAGE" | "VIDEO" | "CAROUSEL_ALBUM";
  timestamp: string;
  /** Flattened: for a carousel, one entry per child; for a single post, one entry. */
  media: { url: string; isVideo: boolean }[];
}

function isConfigured(): boolean {
  return Boolean(
    process.env.INSTAGRAM_ACCESS_TOKEN && process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID
  );
}

export async function fetchRecentMedia(): Promise<
  | { ok: true; items: InstagramMediaItem[] }
  | { ok: false; error: string }
> {
  if (!isConfigured()) {
    return { ok: false, error: "Instagram is not configured (missing access token or account id)." };
  }

  const token = process.env.INSTAGRAM_ACCESS_TOKEN!;
  const accountId = process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID!;
  const fields =
    "id,caption,media_type,media_url,thumbnail_url,timestamp,children{media_url,media_type}";
  const url = `https://graph.facebook.com/${GRAPH_API_VERSION}/${accountId}/media?fields=${fields}&access_token=${token}`;

  const res = await fetch(url);
  const data = await res.json();

  if (!res.ok || data.error) {
    return { ok: false, error: data?.error?.message ?? `Graph API request failed (${res.status}).` };
  }

  const items: InstagramMediaItem[] = (data.data ?? []).map((raw: {
    id: string;
    caption?: string;
    media_type: string;
    media_url?: string;
    thumbnail_url?: string;
    timestamp: string;
    children?: { data: { media_url: string; media_type: string }[] };
  }) => {
    let media: { url: string; isVideo: boolean }[];

    if (raw.media_type === "CAROUSEL_ALBUM" && raw.children?.data) {
      media = raw.children.data.map((child) => ({
        url: child.media_url,
        isVideo: child.media_type === "VIDEO",
      }));
    } else {
      // Videos: media_url is the video file itself; thumbnail_url is the
      // cover image, added as a second (non-video) entry so the storefront
      // always has an image to show even before the customer plays the video.
      const isVideo = raw.media_type === "VIDEO";
      media = isVideo
        ? [
            ...(raw.thumbnail_url ? [{ url: raw.thumbnail_url, isVideo: false }] : []),
            { url: raw.media_url!, isVideo: true },
          ]
        : [{ url: raw.media_url!, isVideo: false }];
    }

    return {
      id: raw.id,
      caption: raw.caption ?? null,
      mediaType: raw.media_type as InstagramMediaItem["mediaType"],
      timestamp: raw.timestamp,
      media,
    };
  });

  return { ok: true, items };
}

/** Strips hashtags, @mentions, and excess whitespace — kept as the product description. */
export function cleanCaption(caption: string): string {
  return caption
    .replace(/#\S+/g, "")
    .replace(/@\S+/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** A draft needs SOME name. Instagram gives no product title, only a
 *  caption, so this is a best-effort guess a human will very likely want
 *  to rename during review — that's expected, not a bug. */
export function deriveProductName(caption: string | null, mediaId: string): string {
  if (!caption) return `Instagram product ${mediaId.slice(-8)}`;
  const firstLine = cleanCaption(caption).split("\n")[0].trim();
  if (!firstLine) return `Instagram product ${mediaId.slice(-8)}`;
  return firstLine.length > 80 ? firstLine.slice(0, 77) + "…" : firstLine;
}
