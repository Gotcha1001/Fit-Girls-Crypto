"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import {
  ControlBar,
  LiveKitRoom,
  ParticipantTile,
  RoomAudioRenderer,
  useTracks,
} from "@livekit/components-react";
import { MediaDeviceFailure, Track } from "livekit-client";
import "@livekit/components-styles";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import { Loader2 } from "lucide-react";
import type { Id } from "@/convex/_generated/dataModel";

interface VideoCallRoomProps {
  callSessionId: Id<"callSessions">;
}

interface LiveKitTokenResponse {
  token: string;
  url: string;
  roomName: string;
}

// The only page both clients and girls are allowed to land on after a call.
const AFTER_CALL_PATH = "/bookings";

function handleMediaDeviceFailure(failure?: MediaDeviceFailure): void {
  switch (failure) {
    case MediaDeviceFailure.DeviceInUse:
      toast.error(
        "Your camera or microphone is being used by another app or tab. Close it, then use the camera button below to try again.",
      );
      break;
    case MediaDeviceFailure.PermissionDenied:
      toast.error(
        "Camera or microphone access is blocked. Allow it in your browser's site settings and reload.",
      );
      break;
    case MediaDeviceFailure.NotFound:
      toast.error("No camera or microphone was found on this device.");
      break;
    default:
      toast.error("Couldn't start your camera or microphone.");
  }
}

// Must render inside <LiveKitRoom>.
function CallLayout(): React.JSX.Element {
  const tracks = useTracks(
    [{ source: Track.Source.Camera, withPlaceholder: true }],
    { onlySubscribed: false },
  );

  const localTrack = tracks.find((t) => t.participant.isLocal);
  const remoteTrack = tracks.find((t) => !t.participant.isLocal);

  // Until the other person joins, show yourself full size.
  const mainTrack = remoteTrack ?? localTrack;
  // Once they're in, your own camera becomes the small corner window.
  const pipTrack = remoteTrack && localTrack ? localTrack : undefined;

  return (
    <div className="flex h-full min-h-0 flex-col bg-black">
      <div className="relative min-h-0 flex-1">
        {mainTrack && (
          <ParticipantTile trackRef={mainTrack} className="h-full w-full" />
        )}

        {pipTrack && (
          <div className="absolute bottom-3 right-3 z-10 h-36 w-28 overflow-hidden rounded-xl border border-white/30 shadow-lg sm:h-44 sm:w-64">
            <ParticipantTile trackRef={pipTrack} className="h-full w-full" />
          </div>
        )}
      </div>

      <ControlBar controls={{ chat: false }} className="shrink-0" />
      <RoomAudioRenderer />
    </div>
  );
}

interface CallStatusScreenProps {
  title: string;
  subtitle?: string;
  tone?: "neutral" | "error";
  actionLabel?: string;
  onAction?: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
  children?: React.ReactNode;
}

function CallStatusScreen({
  title,
  subtitle,
  tone = "neutral",
  actionLabel,
  onAction,
  secondaryLabel,
  onSecondary,
  children,
}: CallStatusScreenProps): React.JSX.Element {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 px-4 text-center">
      {children}
      <p
        className={`text-lg font-medium ${
          tone === "error" ? "text-red-500" : ""
        }`}
      >
        {title}
      </p>
      {subtitle && <p className="text-sm text-gray-400">{subtitle}</p>}
      <div className="mt-2 flex gap-2">
        {actionLabel && onAction && (
          <button
            type="button"
            onClick={onAction}
            className="rounded-full bg-rose-600 px-5 py-2 text-sm font-semibold text-white hover:bg-rose-500"
          >
            {actionLabel}
          </button>
        )}
        {secondaryLabel && onSecondary && (
          <button
            type="button"
            onClick={onSecondary}
            className="rounded-full border border-gray-300 px-5 py-2 text-sm dark:border-gray-700"
          >
            {secondaryLabel}
          </button>
        )}
      </div>
    </div>
  );
}

export function VideoCallRoom({
  callSessionId,
}: VideoCallRoomProps): React.JSX.Element {
  const router = useRouter();
  const endCall = useMutation(api.calls.endCall);

  // Live query: re-renders automatically the moment the other person
  // accepts, declines, or ends the call.
  const session = useQuery(api.calls.getCallSession, { callSessionId });
  const status = session?.status;

  // Server-side guard: who may join, and (for paid bookings) when.
  // `tick` forces a re-check, because queries don't re-run as time passes.
  const [tick, setTick] = useState(0);
  const join = useQuery(api.callAccess.getJoinInfo, { callSessionId, tick });
  const canJoin = join?.ok === true;
  const retryable = join?.ok === false && join.retryable === true;

  const [tokenData, setTokenData] = useState<LiveKitTokenResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  // While waiting for the booking window to open, re-check every 30 seconds.
  useEffect(() => {
    if (!retryable) return;
    const id = setInterval(() => setTick((t) => t + 1), 30_000);
    return () => clearInterval(id);
  }, [retryable]);

  // Only ask for a LiveKit token once the call is accepted AND the guard allows it.
  // (The token route must enforce the same rule. This is the UI half.)
  useEffect(() => {
    if (status !== "accepted" || !canJoin) return;

    let cancelled = false;

    async function fetchToken(): Promise<void> {
      try {
        const response = await fetch(
          `/api/livekit-token?callSessionId=${callSessionId}`,
        );
        const data = (await response.json()) as
          | LiveKitTokenResponse
          | { error: string };

        if (!response.ok || "error" in data) {
          throw new Error(
            "error" in data ? data.error : "Couldn't join the call",
          );
        }
        if (!cancelled) {
          setError(null);
          setTokenData(data);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Couldn't join the call",
          );
        }
      }
    }

    fetchToken();
    return () => {
      cancelled = true;
    };
  }, [callSessionId, status, canJoin]);

  async function handleDisconnect(): Promise<void> {
    // Paid booking: don't end the session on disconnect. A dropped connection
    // shouldn't lock people out of a call they paid for; they can rejoin
    // until the booking window closes.
    if (join?.ok && join.bookingId) {
      router.push(`/bookings/${join.bookingId}`);
      return;
    }
    await endCall({ callSessionId });
    router.push(AFTER_CALL_PATH);
  }

  async function handleCancel(): Promise<void> {
    await endCall({ callSessionId });
    router.push(AFTER_CALL_PATH);
  }

  // ---- Loading / missing ----
  if (session === undefined) {
    return (
      <div className="flex h-full items-center justify-center text-gray-400">
        <Loader2 className="animate-spin" />
      </div>
    );
  }

  if (session === null) {
    return (
      <CallStatusScreen
        tone="error"
        title="Call not found"
        actionLabel="Back to bookings"
        onAction={(): void => router.push(AFTER_CALL_PATH)}
      />
    );
  }

  // ---- Waiting for the other person ----
  if (session.status === "pending") {
    return (
      <CallStatusScreen
        title="Calling…"
        subtitle="Waiting for them to accept. You'll join automatically as soon as they do."
        actionLabel="Cancel request"
        onAction={(): void => {
          void handleCancel();
        }}
      >
        <span className="relative flex h-5 w-5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400 opacity-75 motion-reduce:animate-none" />
          <span className="relative inline-flex h-5 w-5 rounded-full bg-rose-500" />
        </span>
      </CallStatusScreen>
    );
  }

  if (session.status === "declined") {
    return (
      <CallStatusScreen
        title="Call declined"
        subtitle="They can't take the call right now."
        actionLabel="Back to bookings"
        onAction={(): void => router.push(AFTER_CALL_PATH)}
      />
    );
  }

  if (session.status === "ended") {
    return (
      <CallStatusScreen
        title="Call ended"
        actionLabel="Back to bookings"
        onAction={(): void => router.push(AFTER_CALL_PATH)}
      />
    );
  }

  // ---- Accepted: guard first, then token, then join ----
  if (join === undefined) {
    return (
      <div className="flex h-full items-center justify-center text-gray-400">
        <Loader2 className="animate-spin" />
      </div>
    );
  }

  if (!join.ok) {
    return (
      <CallStatusScreen
        tone={join.retryable ? "neutral" : "error"}
        title={join.reason}
        subtitle={
          join.retryable
            ? "Keep this page open. You'll join automatically when the call opens."
            : undefined
        }
        actionLabel={join.retryable ? "Check again" : "Back"}
        onAction={(): void => {
          if (join.retryable) setTick((t) => t + 1);
          else router.push(AFTER_CALL_PATH);
        }}
      >
        {join.retryable && <Loader2 className="animate-spin text-gray-400" />}
      </CallStatusScreen>
    );
  }

  if (error) {
    return (
      <CallStatusScreen
        tone="error"
        title={error}
        actionLabel="Try again"
        onAction={(): void => window.location.reload()}
        secondaryLabel="Back"
        onSecondary={(): void => router.push(AFTER_CALL_PATH)}
      />
    );
  }

  if (!tokenData) {
    return (
      <div className="flex h-full items-center justify-center text-gray-400">
        <Loader2 className="animate-spin" />
      </div>
    );
  }

  return (
    <LiveKitRoom
      data-lk-theme="default"
      token={tokenData.token}
      serverUrl={tokenData.url}
      connect
      video
      audio
      className="h-full"
      onDisconnected={handleDisconnect}
      onMediaDeviceFailure={handleMediaDeviceFailure}
    >
      <CallLayout />
    </LiveKitRoom>
  );
}
