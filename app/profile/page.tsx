"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import Link from "next/link";
import { Loader2, Pencil } from "lucide-react";
import { ProfileCarousel } from "@/app/components/ProfileCarousel";
import { OnlineIndicator } from "@/app/components/OnlineIndicator";

export default function MyProfilePage(): React.JSX.Element {
  const profile = useQuery(api.profiles.getMyProfile);

  if (profile === undefined) {
    return (
      <div className="flex justify-center py-16 text-gray-400">
        <Loader2 className="animate-spin" />
      </div>
    );
  }

  if (profile === null) {
    return (
      <div className="mx-auto max-w-md py-16 text-center">
        <p className="mb-4 text-gray-500">
          You haven&apos;t set up your profile yet.
        </p>
        <Link
          href="/onboarding"
          className="rounded-full bg-rose-600 px-6 py-3 font-semibold text-white hover:bg-rose-500"
        >
          Set up profile
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg">
      <div className="mb-4">
        <ProfileCarousel
          photos={profile.photos}
          alt={profile.displayName}
          badge={
            <OnlineIndicator
              lastActiveAt={profile.lastActiveAt}
              variant="overlay"
            />
          }
        />
      </div>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold">
            {profile.displayName}, {profile.age}
          </h1>
          <p className="text-sm text-gray-400">{profile.city}</p>
        </div>
        <Link
          href="/onboarding"
          className="flex items-center gap-1 rounded-full border border-gray-300 px-3 py-2 text-xs dark:border-gray-700"
        >
          <Pencil size={12} /> Edit
        </Link>
      </div>

      <p className="mt-4 text-sm text-gray-600 dark:text-gray-300">
        {profile.bio}
      </p>

      <p className="mt-4 text-xs text-gray-400">
        Coin balance: {profile.coins} — used to send gifts.
      </p>
    </div>
  );
}
