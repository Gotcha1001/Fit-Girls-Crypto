"use client";

import { useNow } from "@/hooks/useNow";
import { formatHoursBetween, formatTime, tzLabel } from "@/convex/lib/schedule";

type Props = {
  /** The zone the page is "about" (her zone on the booking page). */
  primaryTz: string;
  primaryLabel: string; // "Her time" | "Your time"
  otherTz: string;
  otherLabel: string; // "Your time" | "Client's time"
};

export function DualClock({
  primaryTz,
  primaryLabel,
  otherTz,
  otherLabel,
}: Props) {
  const now = useNow(10_000);
  const same = primaryTz === otherTz;
  return (
    <div className="accent-card flex flex-wrap gap-x-6 gap-y-1 rounded-xl border bg-white/5 px-4 py-2 text-sm">
      <p>
        <span className="text-neutral-400">{primaryLabel}</span>{" "}
        <span className="font-semibold">{formatTime(now, primaryTz)}</span>{" "}
        <span className="text-xs text-neutral-400">
          {tzLabel(primaryTz, now)}
        </span>
      </p>
      {!same && (
        <p>
          <span className="text-neutral-400">{otherLabel}</span>{" "}
          <span className="font-semibold">{formatTime(now, otherTz)}</span>{" "}
          <span className="text-xs text-neutral-400">
            {tzLabel(otherTz, now)} (
            {formatHoursBetween(now, primaryTz, otherTz)})
          </span>
        </p>
      )}
    </div>
  );
}
