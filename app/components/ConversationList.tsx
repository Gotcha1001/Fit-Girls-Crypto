// app/components/ConversationList.tsx
"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import type { Id } from "@/convex/_generated/dataModel";

interface ConversationRowProps {
  conversationId: Id<"conversations">;
  otherUserId: Id<"users">;
  preview: string | undefined;
}

function ConversationRow({
  conversationId,
  otherUserId,
  preview,
}: ConversationRowProps): React.JSX.Element {
  const profile = useQuery(api.profiles.getProfileByUserId, {
    userId: otherUserId,
  });
  return (
    <Link
      href={`/messages/${conversationId}`}
      className="flex items-center gap-3 rounded-xl px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-800"
    >
      <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
        {profile?.photos[0] && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={profile.photos[0].url}
            alt=""
            className="h-full w-full object-cover"
          />
        )}
      </div>
      <div className="min-w-0">
        <p className="truncate font-medium text-black dark:text-white">
          {profile?.displayName ?? "..."}
        </p>
        <p className="truncate text-xs text-gray-400">{preview}</p>
      </div>
    </Link>
  );
}

export function ConversationList(): React.JSX.Element {
  const conversations = useQuery(api.messages.listConversations);

  if (conversations === undefined) {
    return (
      <div className="flex justify-center py-16 text-gray-400">
        <Loader2 className="animate-spin" />
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <p className="py-16 text-center text-gray-400">
        No conversations yet — head to Discover to say hi.
      </p>
    );
  }

  return (
    <div className="space-y-1">
      {conversations.map(({ conversation, otherUserId, preview }) => (
        <ConversationRow
          key={conversation._id}
          conversationId={conversation._id}
          otherUserId={otherUserId}
          preview={preview}
        />
      ))}
    </div>
  );
}
