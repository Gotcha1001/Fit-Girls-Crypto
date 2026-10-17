"use client";

import { useQuery } from "convex/react";
import { Heart, Loader2 } from "lucide-react";
import { api } from "@/convex/_generated/api";
import { ProfileCard } from "@/app/components/ProfileCard";

export default function LikesPage(): React.JSX.Element {
  const likes = useQuery(api.likes.getLikesReceived);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold">Likes</h1>
        {likes !== undefined && (
          <span className="flex items-center gap-1 rounded-full bg-rose-600 px-3 py-1 text-sm font-semibold text-white">
            <Heart size={14} className="fill-white" />
            {likes.length} total {likes.length === 1 ? "like" : "likes"}
          </span>
        )}
      </div>

      {likes === undefined ? (
        <div className="flex justify-center py-16 text-gray-400">
          <Loader2 className="animate-spin" />
        </div>
      ) : likes.length === 0 ? (
        <p className="py-16 text-center text-gray-400">
          No likes yet — check back soon. 💫
        </p>
      ) : (
        <>
          <p className="mb-4 text-sm text-gray-500">
            Tap a profile to view it, or tap the heart to like them back.
          </p>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {likes.map(({ likeId, profile }) => (
              <ProfileCard key={likeId} profile={profile} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
