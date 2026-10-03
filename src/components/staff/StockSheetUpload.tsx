"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  applyStockImport,
  previewStockImport,
  type StockImportPreview,
} from "@/app/actions/staff-inventory";

export function StockSheetUpload() {
  const router = useRouter();
  const [csvText, setCsvText] = useState<string | null>(null);
  const [fileName, setFileName] = useState("");
  const [preview, setPreview] = useState<StockImportPreview | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    setPreview(null);
    setResult(null);
    if (!file) return;
    const text = await file.text();
    setCsvText(text);
    setFileName(file.name);
    startTransition(async () => setPreview(await previewStockImport(text)));
  }

  function apply() {
    if (!csvText) return;
    startTransition(async () => {
      const res = await applyStockImport(csvText);
      if (res.error) {
        setResult(res.error);
        return;
      }
      setResult(
        `Updated ${res.updated} product${res.updated === 1 ? "" : "s"}${res.failed ? ` · ${res.failed} failed — re-upload to retry` : ""}.`
      );
      setPreview(null);
      setCsvText(null);
      router.refresh();
    });
  }

  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-4">
      <h2 className="mb-1 text-sm font-semibold text-neutral-900">Stock count</h2>
      <p className="mb-3 text-xs text-neutral-500">
        Download the stock sheet, fill in <code>new_stock</code> with what you physically count, and
        upload it here. Rows you leave blank aren&apos;t changed, so you can count one shelf at a time.
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <a
          href="/staff/dashboard/inventory/stock-sheet"
          className="rounded-full border border-neutral-300 px-3 py-1.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-50"
        >
          Download stock sheet
        </a>
        <label className="cursor-pointer rounded-full bg-brand-900 px-3 py-1.5 text-xs font-semibold text-white">
          Upload counted sheet
          <input type="file" accept=".csv,text/csv" onChange={onFile} className="hidden" />
        </label>
        {fileName && <span className="text-xs text-neutral-500">{fileName}</span>}
        {isPending && <span className="text-xs text-neutral-500">Working…</span>}
      </div>

      {preview?.error && (
        <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{preview.error}</p>
      )}

      {preview && !preview.error && (
        <div className="mt-3 rounded-md bg-neutral-50 p-3 text-xs">
          <p className="mb-2 text-sm text-neutral-800">
            <strong>{preview.changes.length}</strong> product{preview.changes.length === 1 ? "" : "s"} will
            change · {preview.unchangedCount} already match · {preview.blankCount} not counted
          </p>
          {preview.changes.length > 0 && (
            <ul className="mb-2 max-h-56 overflow-y-auto rounded border border-neutral-200 bg-white">
              {preview.changes.map((c) => (
                <li key={c.id} className="flex justify-between gap-3 border-b border-neutral-100 px-2 py-1 last:border-0">
                  <span className="truncate">{c.name}</span>
                  <span className="shrink-0 font-mono">
                    {c.from} → <strong>{c.to}</strong>
                  </span>
                </li>
              ))}
            </ul>
          )}
          {preview.unknownSlugs.length > 0 && (
            <p className="mb-1 text-amber-700">
              {preview.unknownSlugs.length} row(s) don&apos;t match any product and will be skipped:{" "}
              {preview.unknownSlugs.slice(0, 5).join(", ")}
              {preview.unknownSlugs.length > 5 ? "…" : ""}
            </p>
          )}
          {preview.invalidRows.length > 0 && (
            <p className="mb-1 text-amber-700">
              {preview.invalidRows.length} row(s) have an invalid count and will be skipped:{" "}
              {preview.invalidRows
                .slice(0, 5)
                .map((r) => `row ${r.row} (${r.value})`)
                .join(", ")}
              {preview.invalidRows.length > 5 ? "…" : ""}
            </p>
          )}
          {preview.changes.length > 0 && (
            <button
              type="button"
              disabled={isPending}
              onClick={apply}
              className="mt-2 rounded-full bg-brand-gradient px-4 py-1.5 text-xs font-semibold text-white shadow-glow disabled:opacity-50"
            >
              Apply {preview.changes.length} change{preview.changes.length === 1 ? "" : "s"}
            </button>
          )}
        </div>
      )}

      {result && <p className="mt-3 text-sm text-neutral-700">{result}</p>}
    </div>
  );
}
