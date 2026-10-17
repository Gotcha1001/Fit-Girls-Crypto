"use client";

import { useState } from "react";
import { useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { fileToResizedDataUri } from "../../lib/imageResize";
import { X, Upload, Loader2 } from "lucide-react";

export interface ProfilePhoto {
  url: string;
  publicId: string;
}

interface ImageUploaderProps {
  photos: ProfilePhoto[];
  onChange: (photos: ProfilePhoto[]) => void;
  maxPhotos?: number;
}

export function ImageUploader({
  photos,
  onChange,
  maxPhotos = 6,
}: ImageUploaderProps): React.JSX.Element {
  const uploadProfilePhoto = useAction(api.uploads.uploadProfilePhoto);
  const deleteProfilePhoto = useAction(api.uploads.deleteProfilePhoto);

  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleFiles(fileList: FileList | null): Promise<void> {
    if (!fileList || fileList.length === 0) return;
    setError(null);

    const remainingSlots = maxPhotos - photos.length;
    const files = Array.from(fileList).slice(0, remainingSlots);
    if (files.length === 0) return;

    setIsUploading(true);
    try {
      const uploaded = await Promise.all(
        files.map(async (file) => {
          const dataUri = await fileToResizedDataUri(file);
          return uploadProfilePhoto({ imageDataUri: dataUri });
        }),
      );
      onChange([...photos, ...uploaded]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setIsUploading(false);
    }
  }

  async function removePhoto(photo: ProfilePhoto): Promise<void> {
    setRemovingId(photo.publicId);
    setError(null);
    try {
      await deleteProfilePhoto({ publicId: photo.publicId });
      onChange(photos.filter((p) => p.publicId !== photo.publicId));
    } catch (err) {
      // Still let them remove it from the form even if Cloudinary cleanup
      // failed — an orphaned asset is a lesser problem than a stuck UI.
      onChange(photos.filter((p) => p.publicId !== photo.publicId));
      setError(
        err instanceof Error
          ? err.message
          : "Couldn't delete photo from storage",
      );
    } finally {
      setRemovingId(null);
    }
  }

  return (
    <div>
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
        {photos.map((photo) => (
          <div
            key={photo.publicId}
            className="relative aspect-square overflow-hidden rounded-xl"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photo.url}
              alt="Profile photo"
              className="h-full w-full object-cover"
            />
            <button
              type="button"
              onClick={() => removePhoto(photo)}
              disabled={removingId === photo.publicId}
              className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white hover:bg-black/80 disabled:opacity-50"
              aria-label="Remove photo"
            >
              {removingId === photo.publicId ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <X size={14} />
              )}
            </button>
          </div>
        ))}

        {photos.length < maxPhotos && (
          <label className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-gray-300 text-gray-400 hover:border-rose-400 hover:text-rose-500 dark:border-gray-700">
            {isUploading ? (
              <Loader2 size={20} className="animate-spin" />
            ) : (
              <>
                <Upload size={18} />
                <span className="text-[11px]">Add photo</span>
              </>
            )}
            <input
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              disabled={isUploading}
              onChange={(e) => handleFiles(e.target.files)}
            />
          </label>
        )}
      </div>

      {error && <p className="mt-2 text-xs text-red-500">{error}</p>}
      <p className="mt-2 text-xs text-gray-400">
        {photos.length}/{maxPhotos} photos — the first one is your main photo.
      </p>
    </div>
  );
}
