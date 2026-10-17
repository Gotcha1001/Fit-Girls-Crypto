"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

/**
 * Admin only. Shows the ID photo and selfie for one application.
 * Click a photo to open it full size in a new tab.
 */
export function ApplicationIdPhotos({
  applicationId,
  uploaded,
}: {
  applicationId: Id<"hostApplications">;
  uploaded: boolean;
}) {
  // Skip the query for old applications that have no photos.
  const urls = useQuery(
    api.idDocuments.getApplicationIdUrls,
    uploaded ? { applicationId } : "skip",
  );

  if (!uploaded) {
    return (
      <p className="rounded-lg bg-yellow-500/10 p-2 text-sm text-yellow-300">
        No ID photos were uploaded for this application.
      </p>
    );
  }
  if (urls === undefined)
    return <p className="text-sm opacity-70">Loading photos…</p>;
  if (urls === null || (!urls.idUrl && !urls.selfieUrl)) {
    return <p className="text-sm opacity-70">Photos not available.</p>;
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {[
        { label: "ID / passport", url: urls.idUrl },
        { label: "Selfie holding ID", url: urls.selfieUrl },
      ].map(
        ({ label, url }) =>
          url && (
            <figure key={label} className="space-y-1">
              <figcaption className="text-xs opacity-70">{label}</figcaption>
              <a href={url} target="_blank" rel="noopener noreferrer">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={url}
                  alt={label}
                  referrerPolicy="no-referrer"
                  className="max-h-64 w-full rounded-lg border object-contain"
                />
              </a>
            </figure>
          ),
      )}
    </div>
  );
}
