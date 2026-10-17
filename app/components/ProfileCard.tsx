"use client";

import Link from "next/link";
import { MapPin } from "lucide-react";
import type { Doc } from "@/convex/_generated/dataModel";
import { OnlineIndicator } from "./OnlineIndicator";
import { LikeButton } from "./LikeButton";

interface ProfileCardProps {
  profile: Doc<"profiles">;
  distanceKm?: number;
}

export function ProfileCard({
  profile,
  distanceKm,
}: ProfileCardProps): React.JSX.Element {
  const mainPhoto = profile.photos[0];

  return (
    // Wrapper is `relative` so the heart can sit on top of the card without
    // being nested inside the <a> (a button inside a link is invalid HTML).
    <div className="group relative">
      <Link
        href={`/profile/${profile.userId}`}
        className="block overflow-hidden rounded-2xl border bg-white shadow-sm transition dark:bg-gray-900 accent-card"
      >
        <div className="relative aspect-[4/5] w-full overflow-hidden bg-gray-100 dark:bg-gray-800">
          {mainPhoto ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={mainPhoto.url}
              alt={profile.displayName}
              className="h-full w-full object-cover transition group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-4xl">
              💫
            </div>
          )}
          <div className="absolute left-2 top-2">
            <OnlineIndicator
              lastActiveAt={profile.lastActiveAt}
              variant="overlay"
              showLabel={false}
            />
          </div>
        </div>
        <div className="p-3">
          <p className="font-semibold text-black dark:text-white">
            {profile.displayName}, {profile.age}
          </p>
          <p className="flex items-center gap-1 text-xs text-gray-400">
            <MapPin size={12} />
            {profile.city}
            {distanceKm !== undefined && ` · ${distanceKm.toFixed(0)} km away`}
          </p>
          {profile.bio && (
            <p className="mt-1 line-clamp-2 text-xs text-gray-500 dark:text-gray-400">
              {profile.bio}
            </p>
          )}
        </div>
      </Link>

      <LikeButton
        toUserId={profile.userId}
        className="absolute right-2 top-2"
      />
    </div>
  );
}
