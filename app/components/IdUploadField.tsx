"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

/**
 * Picks a photo, uploads it straight to private Convex storage and reports
 * the storage id to the parent form.
 */
export function IdUploadField({
  label,
  hint,
  onUploaded,
}: {
  label: string;
  hint?: string;
  onUploaded: (id: Id<"_storage"> | null) => void;
}) {
  const getUrl = useMutation(api.idDocuments.generateIdUploadUrl);
  const [state, setState] = useState<"idle" | "uploading" | "done">("idle");
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    setError(null);
    onUploaded(null);
    setState("idle");
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      return setError("Use a JPG, PNG or WebP photo.");
    }
    if (file.size > 8 * 1024 * 1024)
      return setError("Photo is too large (8 MB max).");

    setState("uploading");
    try {
      const url = await getUrl();
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!res.ok) throw new Error("Upload failed");
      const { storageId } = await res.json();
      setPreview(URL.createObjectURL(file));
      setState("done");
      onUploaded(storageId as Id<"_storage">);
    } catch {
      setState("idle");
      setError("Upload failed. Please try again.");
    }
  }

  return (
    <label className="block text-sm">
      {label}
      {hint && <span className="block text-xs text-neutral-400">{hint}</span>}
      <input
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={onPick}
        className="mt-1 block w-full rounded-lg bg-neutral-900 p-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-pink-600 file:px-3 file:py-1 file:text-white"
      />
      {state === "uploading" && (
        <span className="text-xs text-neutral-400">Uploading…</span>
      )}
      {state === "done" && preview && (
        <img
          src={preview}
          alt=""
          className="mt-2 h-24 rounded-md object-cover"
        />
      )}
      {error && (
        <span className="mt-1 block text-xs text-red-400">{error}</span>
      )}
    </label>
  );
}
