"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Upload } from "lucide-react";
import { uploadTeamMemberPhoto } from "@/app/actions/staff-team-blog";

export function TeamMemberPhotoUpload({ id, photoUrl }: { id: string; photoUrl: string | null }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);

    const formData = new FormData();
    formData.set("id", id);
    formData.set("file", file);

    startTransition(async () => {
      const result = await uploadTeamMemberPhoto(formData);
      if (result.error) setError(result.error);
      else router.refresh();
      if (fileInputRef.current) fileInputRef.current.value = "";
    });
  }

  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-4">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-neutral-500">Photo</h2>

      {photoUrl && (
        <div className="relative mb-3 aspect-[4/5] w-32 overflow-hidden rounded-md bg-neutral-100">
          <Image src={photoUrl} alt="" fill sizes="128px" className="object-cover" />
        </div>
      )}

      <label className="flex cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed border-neutral-300 px-4 py-3 text-sm text-neutral-500 hover:border-brand-400 hover:text-brand-600">
        <Upload className="h-4 w-4" />
        {isPending ? "Uploading…" : photoUrl ? "Replace photo" : "Upload photo"}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          disabled={isPending}
          onChange={handleUpload}
          className="hidden"
        />
      </label>

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}
