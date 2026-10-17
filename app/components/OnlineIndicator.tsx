"use client";

import { useNow } from "../../hooks/useNow";
import { isOnlineAt, PRESENCE_TICK_MS } from "../../lib/presence";

interface OnlineIndicatorProps {
  /** profile.lastActiveAt (ms since epoch) */
  lastActiveAt: number;
  /** "overlay" = dark pill, for sitting on top of photos. "plain" = inline text. */
  variant?: "plain" | "overlay";
  showLabel?: boolean;
}

export function OnlineIndicator({
  lastActiveAt,
  variant = "plain",
  showLabel = true,
}: OnlineIndicatorProps): React.JSX.Element {
  const now = useNow(PRESENCE_TICK_MS);
  const online = isOnlineAt(lastActiveAt, now);

  const wrapperClasses: string =
    variant === "overlay"
      ? "rounded-full bg-black/55 px-2.5 py-1 text-white backdrop-blur"
      : online
        ? "text-green-600 dark:text-green-400"
        : "text-gray-400";

  return (
    <span
      role="status"
      aria-label={online ? "Online now" : "Offline"}
      className={`inline-flex items-center gap-1.5 text-xs font-medium ${wrapperClasses}`}
    >
      <span className="relative flex h-3 w-3">
        {online && (
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75 motion-reduce:animate-none" />
        )}
        <span
          className={`relative inline-flex h-3 w-3 rounded-full ${
            online ? "bg-green-500" : "bg-gray-400"
          }`}
        />
      </span>
      {showLabel && (online ? "Online now" : "Offline")}
    </span>
  );
}
