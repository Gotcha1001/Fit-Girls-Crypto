"use client";

import Link from "next/link";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
  DEFAULT_OPEN_HOURS,
  formatHour,
  WEEKDAY_LONG,
} from "@/convex/lib/schedule";
import { ALL_HOURS } from "@/convex/lib/slots";
import { useZonedClock } from "@/hooks/useZonedClock";
import { useViewerTz } from "@/hooks/useViewerTz";
import { Button } from "@/components/ui/button";

import { cn } from "@/lib/utils";
import { HourPresets } from "@/app/components/HourPresents";

export default function WeeklyHoursPage() {
  // Hooks stay above the early returns.
  const hostTz = useViewerTz();
  const { timeLabel, label } = useZonedClock(hostTz);

  const weekly = useQuery(api.calendar.getMyWeeklyHours);
  const setWeekly = useMutation(api.calendar.setWeeklyHours);
  const setWeeklyBulk = useMutation(api.calendar.setWeeklyHoursBulk);

  if (weekly === undefined) {
    return <p className="p-4 text-zinc-400">Loading…</p>;
  }
  if (weekly === null) {
    return <p className="p-4 text-zinc-400">Host profile required.</p>;
  }

  async function toggle(
    weekday: number,
    hour: number,
    current: number[] | null,
  ) {
    // A day she never saved is showing the default hours, so start from those.
    const set = new Set(current ?? DEFAULT_OPEN_HOURS);
    if (set.has(hour)) set.delete(hour);
    else set.add(hour);
    await setWeekly({
      weekday,
      hours: [...set].sort((a, b) => a - b),
    });
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8 p-4 pb-16">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-white">Weekly hours</h1>
        <Button asChild variant="outline" size="sm">
          <Link href="/host/schedule">← Day calendar</Link>
        </Button>
      </div>

      <div className="space-y-1">
        <p className="text-sm text-zinc-300">
          All times in your time zone:{" "}
          <span className="font-semibold">{label}</span> · now{" "}
          <span className="font-mono font-semibold">{timeLabel}</span>
        </p>
        <p className="text-sm text-zinc-400">
          Your default is 09:00–21:00. You can open any hours you like, up to a
          full 24 hours, or switch to a night shift. Calls can run past midnight
          when you are open on both sides of it. One-day overrides on the day
          calendar take priority.
        </p>
      </div>

      <section className="accent-card space-y-2 rounded-xl border bg-zinc-900/60 p-4">
        <h2 className="text-sm font-medium text-zinc-200">Set every day</h2>
        <HourPresets
          onApply={(hours) =>
            setWeeklyBulk({ weekdays: [0, 1, 2, 3, 4, 5, 6], hours })
          }
        />
      </section>

      {weekly.map(({ weekday, hours }) => {
        const open = new Set(hours ?? DEFAULT_OPEN_HOURS);
        return (
          <section key={weekday} className="space-y-2">
            <h2 className="text-sm font-medium text-zinc-300">
              {WEEKDAY_LONG[weekday]}
              {hours === null && (
                <span className="ml-2 text-xs text-zinc-500">
                  (defaults 09:00–21:00 until you save)
                </span>
              )}
            </h2>
            <HourPresets onApply={(h) => setWeekly({ weekday, hours: h })} />
            <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-6 md:grid-cols-8">
              {ALL_HOURS.map((h) => {
                const on = open.has(h);
                return (
                  <button
                    key={h}
                    type="button"
                    onClick={() => toggle(weekday, h, hours)}
                    className={cn(
                      "rounded-md border px-1 py-2 text-center font-mono text-xs transition",
                      on
                        ? "border-emerald-500/50 bg-emerald-500/20 text-emerald-100"
                        : "border-zinc-800 bg-zinc-900/50 text-zinc-500",
                    )}
                  >
                    {formatHour(h)}
                  </button>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
