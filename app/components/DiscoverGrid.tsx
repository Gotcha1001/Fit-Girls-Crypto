"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { ProfileCard } from "./ProfileCard";
import Link from "next/link";
import { Loader2 } from "lucide-react";

export function DiscoverGrid(): React.JSX.Element {
  const [maxDistanceKm, setMaxDistanceKm] = useState<number>(100);

  const response = useQuery(api.profiles.searchProfiles, { maxDistanceKm });

  if (response === undefined) {
    return (
      <div className="flex justify-center py-16 text-gray-400">
        <Loader2 className="animate-spin" />
      </div>
    );
  }

  if (!response.hasProfile) {
    return (
      <div className="mx-auto max-w-sm py-16 text-center">
        <p className="mb-4 text-gray-500">
          Finish setting up your profile to start discovering people nearby.
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

  const { results } = response;

  return (
    <div>
      <div className="mb-6 flex items-center gap-3">
        <label htmlFor="distance" className="text-sm text-gray-500">
          Within {maxDistanceKm} km
        </label>
        <input
          id="distance"
          type="range"
          min={5}
          max={500}
          step={5}
          value={maxDistanceKm}
          onChange={(e) => setMaxDistanceKm(Number(e.target.value))}
          className="max-w-xs flex-1 accent-rose-500"
        />
      </div>

      {results.length === 0 && (
        <p className="py-16 text-center text-gray-400">
          No one matches your preferences nearby yet — try widening the
          distance.
        </p>
      )}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {results.map(({ profile, distanceKm }) => (
          <ProfileCard
            key={profile._id}
            profile={profile}
            distanceKm={distanceKm}
          />
        ))}
      </div>
    </div>
  );
}
