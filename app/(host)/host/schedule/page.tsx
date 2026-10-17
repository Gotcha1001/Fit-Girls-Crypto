"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery } from "convex/react";

import { api } from "@/convex/_generated/api";
import {
  MAX_DAYS_AHEAD,
  formatDayLong,
  relativeDayLabel,
} from "@/convex/lib/schedule";
import { useZonedClock } from "@/hooks/useZonedClock";
import { useViewerTz } from "@/hooks/useViewerTz";
import { HostDayGrid } from "@/app/components/HostDayGrid";
import { cn } from "@/lib/utils";

/**
 * Themed pill button. A plain <button> (not shadcn Button) so the accent
 * border can't be overridden by a variant's own border colour.
 * rose-* follows the chosen accent via globals.css.
 */
function NavBtn({
  active = false,
  disabled = false,
  onClick,
  children,
}: {
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "accent-card rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors",
        "disabled:pointer-events-none disabled:opacity-40",
        active
          ? "bg-rose-600 text-white hover:bg-rose-500"
          : "bg-zinc-900/60 text-zinc-100 hover:bg-rose-600/20",
      )}
    >
      {children}
    </button>
  );
}

export default function HostSchedulePage() {
  // For a host, her profile zone IS her schedule zone (setLocale keeps them in sync).
  const hostTz = useViewerTz();
  const { timeLabel, dayIndex: today, label } = useZonedClock(hostTz);
  const maxDay = today + MAX_DAYS_AHEAD;

  // null = "follow today", so the view stays right past her midnight.
  const [picked, setPicked] = useState<number | null>(null);
  const dayIndex =
    picked === null ? today : Math.min(Math.max(picked, today), maxDay);

  const [error, setError] = useState<string | null>(null);

  const day = useQuery(api.calendar.getMyDay, { dayIndex });
  const setOverride = useMutation(api.calendar.setDayOverride);
  const clearOverride = useMutation(api.calendar.clearDayOverride);

  function jump(delta: number) {
    setPicked(Math.min(Math.max(dayIndex + delta, today), maxDay));
  }

  async function toggleHour(hour: number) {
    if (!day) return;
    setError(null);
    const next = new Set(day.hours);
    if (next.has(hour)) next.delete(hour);
    else next.add(hour);
    try {
      await setOverride({
        dayIndex,
        hours: [...next].sort((a, b) => a - b),
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save");
    }
  }

  async function reset() {
    setError(null);
    try {
      await clearOverride({ dayIndex });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not reset");
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4 pb-16">
      <header className="accent-card space-y-2 rounded-xl border bg-zinc-900/60 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-xl font-semibold text-white">Schedule</h1>
          <Link
            href="/host/schedule/weekly"
            className="text-sm text-rose-300 underline hover:text-rose-200"
          >
            Weekly hours →
          </Link>
        </div>
        <p className="text-sm text-zinc-300">
          All times in your time zone:{" "}
          <span className="font-semibold">{label}</span> · now{" "}
          <span className="font-mono font-semibold">{timeLabel}</span>
        </p>
      </header>

      <div className="flex flex-wrap items-center gap-2">
        <NavBtn disabled={dayIndex <= today} onClick={() => jump(-1)}>
          ←
        </NavBtn>
        <NavBtn active={dayIndex === today} onClick={() => setPicked(null)}>
          Today
        </NavBtn>
        <NavBtn disabled={dayIndex >= maxDay} onClick={() => jump(1)}>
          →
        </NavBtn>
        <NavBtn disabled={dayIndex >= maxDay} onClick={() => jump(7)}>
          +7 days
        </NavBtn>
        <span className="ml-auto text-sm text-zinc-300">
          {relativeDayLabel(dayIndex, today)} · {formatDayLong(dayIndex)}
        </span>
      </div>

      {day?.isOverride && (
        <div className="flex items-center justify-between rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200">
          <span>This day has a custom override.</span>
          <NavBtn onClick={reset}>Reset to weekly hours</NavBtn>
        </div>
      )}

      {error && <p className="text-sm text-red-400">{error}</p>}

      <HostDayGrid day={day} onToggleHour={toggleHour} />

      <p className="text-xs text-zinc-500">
        Tap an open or off slot to change it for this day only (saves as an
        override). Tap a booked call to open that booking in a new tab and join
        the call. Each booking also shows the client&apos;s local time. Edit
        your usual weekly hours under Schedule → Weekly hours.
      </p>
    </div>
  );
}
