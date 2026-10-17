"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { useRouter } from "next/navigation";
import { api } from "@/convex/_generated/api";
import { Video, Loader2 } from "lucide-react";
import type { Id } from "@/convex/_generated/dataModel";

interface CallBookingButtonProps {
  recipientId: Id<"users">;
}

export function CallBookingButton({
  recipientId,
}: CallBookingButtonProps): React.JSX.Element {
  const router = useRouter();
  const requestCall = useMutation(api.calls.requestCall);

  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [scheduledFor, setScheduledFor] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  async function handleRequest(callNow: boolean): Promise<void> {
    setIsSubmitting(true);
    setError(null);
    try {
      const callSessionId = await requestCall({
        recipientId,
        scheduledFor:
          !callNow && scheduledFor
            ? new Date(scheduledFor).getTime()
            : undefined,
      });
      if (callNow) {
        router.push(`/call/${callSessionId}`);
      } else {
        setIsOpen(false);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Couldn't request the call",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 rounded-full border border-rose-500 px-4 py-2 text-sm font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30"
      >
        <Video size={16} />
        Book a video call
      </button>
    );
  }

  return (
    <div className="w-full max-w-md rounded-2xl border border-gray-200 p-4 dark:border-gray-800">
      <p className="mb-3 text-sm font-semibold">Book a video call</p>

      <button
        type="button"
        onClick={() => handleRequest(true)}
        disabled={isSubmitting}
        className="mb-3 flex w-full items-center justify-center gap-2 rounded-full bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-500 disabled:opacity-60"
      >
        {isSubmitting ? (
          <Loader2 size={16} className="animate-spin" />
        ) : (
          <Video size={16} />
        )}
        Call now
      </button>

      <p className="mb-1 text-xs text-gray-400">— or schedule for later —</p>
      <div className="flex gap-2">
        <input
          type="datetime-local"
          value={scheduledFor}
          onChange={(e) => setScheduledFor(e.target.value)}
          className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
        />
        <button
          type="button"
          onClick={() => handleRequest(false)}
          disabled={isSubmitting || !scheduledFor}
          className="rounded-full border border-rose-500 px-4 py-2 text-sm font-semibold text-rose-600 disabled:opacity-50"
        >
          Request
        </button>
      </div>

      {error && <p className="mt-2 text-xs text-red-500">{error}</p>}
    </div>
  );
}
