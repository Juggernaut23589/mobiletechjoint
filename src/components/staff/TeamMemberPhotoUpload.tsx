"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { X, Upload } from "lucide-react";
import { uploadTeamMemberPhoto } from "@/app/actions/staff-team-blog";

/** Picking a file only stages a local preview; the photo is only
 *  uploaded once Publish is pressed, same pattern as the other upload
 *  managers across the dashboard. */
export function TeamMemberPhotoUpload({ id, photoUrl }: { id: string; photoUrl: string | null }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  function handlePick(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = e.target.files?.[0];
    if (!picked) return;
    setError(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(picked);
    setPreviewUrl(URL.createObjectURL(picked));
  }

  function resetDraft() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handlePublish() {
    if (!file) return;
    setError(null);

    const formData = new FormData();
    formData.set("id", id);
    formData.set("file", file);

    startTransition(async () => {
      const result = await uploadTeamMemberPhoto(formData);
      if (result.error) setError(result.error);
      else {
        router.refresh();
        resetDraft();
      }
    });
  }

  const displayUrl = previewUrl ?? photoUrl;

  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-4">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-neutral-500">Photo</h2>

      {displayUrl && (
        <div className="relative mb-3 aspect-[4/5] w-32 overflow-hidden rounded-md bg-neutral-100">
          <Image src={displayUrl} alt="" fill sizes="128px" className="object-cover" />
          {previewUrl && (
            <button
              type="button"
              onClick={resetDraft}
              disabled={isPending}
              className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white disabled:opacity-50"
              aria-label="Remove picked photo"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <label className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed border-neutral-300 px-4 py-3 text-sm text-neutral-500 hover:border-brand-400 hover:text-brand-600">
          <Upload className="h-4 w-4" />
          {file ? "Change photo" : photoUrl ? "Replace photo" : "Choose photo"}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            disabled={isPending}
            onChange={handlePick}
            className="hidden"
          />
        </label>
        <button
          type="button"
          disabled={!file || isPending}
          onClick={handlePublish}
          className="rounded-md bg-brand-900 px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
        >
          {isPending ? "Publishing…" : "Publish"}
        </button>
      </div>

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}
