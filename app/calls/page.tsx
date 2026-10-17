"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useUserContext } from "@/app/context/UserContext";
import { useViewerTz } from "@/hooks/useViewerTz";
import {
  dayIndexOf,
  formatDayLong,
  formatTime,
  tzCity,
} from "@/convex/lib/schedule";
import { useRouter } from "next/navigation";
import { Loader2, Phone, PhoneOff } from "lucide-react";
import type { Doc } from "@/convex/_generated/dataModel";

function CallRow({
  session,
  myUserId,
}: {
  session: Doc<"callSessions">;
  myUserId: string;
}): React.JSX.Element {
  const router = useRouter();
  const viewerTz = useViewerTz();
  const respondToCall = useMutation(api.calls.respondToCall);

  const otherUserId =
    session.requesterId === myUserId
      ? session.recipientId
      : session.requesterId;

  const otherProfile = useQuery(api.profiles.getProfileByUserId, {
    userId: otherUserId,
  });

  const isIncoming =
    session.recipientId === myUserId && session.status === "pending";

  return (
    <div className="flex items-center justify-between rounded-xl border border-gray-200 p-3 dark:border-gray-800">
      <div>
        <p className="font-medium">{otherProfile?.displayName ?? "..."}</p>
        <p className="text-xs text-gray-400">
          {session.scheduledFor
            ? `Scheduled for ${formatDayLong(dayIndexOf(session.scheduledFor, viewerTz))} · ${formatTime(session.scheduledFor, viewerTz)} (your time, ${tzCity(viewerTz)})`
            : "Call now request"}
          {" · "}
          {session.status}
        </p>
      </div>

      <div className="flex gap-2">
        {isIncoming && (
          <>
            <button
              onClick={async (): Promise<void> => {
                await respondToCall({
                  callSessionId: session._id,
                  accept: true,
                });
                router.push(`/call/${session._id}`);
              }}
              className="rounded-full bg-rose-600 p-2 text-white hover:bg-rose-500"
              aria-label="Accept"
            >
              <Phone size={16} />
            </button>
            <button
              onClick={() =>
                respondToCall({ callSessionId: session._id, accept: false })
              }
              className="rounded-full border border-gray-300 p-2 dark:border-gray-700"
              aria-label="Decline"
            >
              <PhoneOff size={16} />
            </button>
          </>
        )}
        {session.status === "accepted" && (
          <button
            onClick={() => router.push(`/call/${session._id}`)}
            className="rounded-full bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-500"
          >
            Join
          </button>
        )}
      </div>
    </div>
  );
}

export default function CallsPage(): React.JSX.Element {
  const currentUser = useUserContext();
  const sessions = useQuery(api.calls.listMyCallSessions);

  if (!currentUser || sessions === undefined) {
    return (
      <div className="flex justify-center py-16 text-gray-400">
        <Loader2 className="animate-spin" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="mb-6 text-2xl font-semibold">Call Requests</h1>
      {sessions.length === 0 ? (
        <p className="py-16 text-center text-gray-400">
          No call requests yet — book one from someone&apos;s profile.
        </p>
      ) : (
        <div className="space-y-2">
          {sessions.map((session) => (
            <CallRow
              key={session._id}
              session={session}
              myUserId={currentUser._id}
            />
          ))}
        </div>
      )}
    </div>
  );
}
