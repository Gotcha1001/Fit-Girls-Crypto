"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { ProfileForm } from "@/app/components/ProfileForm";
import { Loader2 } from "lucide-react";

export default function OnboardingPage(): React.JSX.Element {
  const existingProfile = useQuery(api.profiles.getMyProfile);

  return (
    <div className="mx-auto max-w-2xl py-8">
      <h1 className="mb-1 text-2xl font-semibold">
        {existingProfile ? "Update your profile" : "Let's set up your profile"}
      </h1>
      <p className="mb-8 text-sm text-gray-500">
        This is what people will see when they discover you nearby.
      </p>

      {existingProfile === undefined ? (
        <div className="flex justify-center py-16 text-gray-400">
          <Loader2 className="animate-spin" />
        </div>
      ) : (
        <ProfileForm existingProfile={existingProfile} />
      )}
    </div>
  );
}
