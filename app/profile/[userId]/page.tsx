"use client";

import { useMutation, useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { use, useState } from "react";
import { api } from "@/convex/_generated/api";

import { MessageCircle, Loader2, MapPin } from "lucide-react";
import type { Id } from "@/convex/_generated/dataModel";
import { CallBookingButton } from "@/app/components/CallBookingButton";
import { GiftPicker } from "@/app/components/GiftPicker";
import { ProfileCarousel } from "@/app/components/ProfileCarousel";
import { OnlineIndicator } from "@/app/components/OnlineIndicator";

interface OtherProfilePageProps {
  params: Promise<{ userId: string }>;
}

export default function OtherProfilePage({
  params,
}: OtherProfilePageProps): React.JSX.Element {
  const { userId } = use(params);
  const router = useRouter();
  const profile = useQuery(api.profiles.getProfileByUserId, {
    userId: userId as Id<"users">,
  });
  const getOrCreateConversation = useMutation(
    api.messages.getOrCreateConversation,
  );
  const [isMessaging, setIsMessaging] = useState<boolean>(false);

  async function handleMessage(): Promise<void> {
    setIsMessaging(true);
    try {
      const conversationId = await getOrCreateConversation({
        otherUserId: userId as Id<"users">,
      });
      router.push(`/messages/${conversationId}`);
    } finally {
      setIsMessaging(false);
    }
  }

  if (profile === undefined) {
    return (
      <div className="flex justify-center py-16 text-gray-400">
        <Loader2 className="animate-spin" />
      </div>
    );
  }

  if (profile === null) {
    return (
      <p className="py-16 text-center text-gray-400">Profile not found.</p>
    );
  }

  return (
    <div className="mx-auto max-w-lg space-y-6">
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

      <div>
        <h1 className="text-2xl font-semibold">
          {profile.displayName}, {profile.age}
        </h1>
        <p className="flex items-center gap-1 text-sm text-gray-400">
          <MapPin size={14} /> {profile.city}
        </p>
        <p className="mt-3 text-sm text-gray-600 dark:text-gray-300">
          {profile.bio}
        </p>
      </div>

      <div className="flex flex-wrap items-start gap-2">
        <button
          onClick={handleMessage}
          disabled={isMessaging}
          className="flex shrink-0 items-center gap-2 rounded-full bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-500 disabled:opacity-60"
        >
          <MessageCircle size={16} /> Message
        </button>
        <CallBookingButton recipientId={profile.userId} />
      </div>

      <GiftPicker toUserId={profile.userId} />
    </div>
  );
}
