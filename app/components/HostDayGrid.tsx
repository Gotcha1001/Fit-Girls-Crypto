"use client";

import { useMemo } from "react";
import Link from "next/link";
import type { FunctionReturnType } from "convex/server";

import type { api } from "@/convex/_generated/api";
import {
  HOUR_MS,
  dayShiftLabel,
  formatHour,
  formatTimeRange,
  slotExists,
  slotStartMs,
  tzCity,
} from "@/convex/lib/schedule";
import { ALL_HOURS } from "@/convex/lib/slots";
import { cn } from "@/lib/utils";

import { HourBar, type BarSegment } from "./HourBar";

type Day = NonNullable<FunctionReturnType<typeof api.calendar.getMyDay>>;
type DayBooking = Day["bookings"][number];

// rose-* is remapped to the chosen accent in globals.css, so these follow the theme.
//   open   = dark card, accent border + glow (free to take bookings)
//   booked = filled with the accent, so it reads differently from "open"
//   mine   = sky blue (unchanged)
//   off    = flat grey, no glow
const SLOT_COLORS: Record<string, string> = {
  open: "accent-card bg-zinc-900/60 text-rose-50",
  booked: "accent-card bg-rose-600/40 text-white",
  mine: "border-sky-500/50 bg-sky-500/25 text-sky-100",
  off: "border-zinc-700 bg-zinc-800/50 text-zinc-500",
};

const BOOKING_LABEL: Record<string, string> = {
  paid: "Paid · open to start call",
  pending_payment: "Awaiting payment",
  completed: "Completed",
};

/**
 * The host's day, in HER time zone (day.timezone): one card per hour. An hour
 * can hold several short calls, so each card lists every booking inside it
 * (soonest first) with the guest's local time underneath.
 * Tap the hour label to open/close that hour when it has no bookings.
 */
export function HostDayGrid({
  day,
  onToggleHour,
}: {
  day: Day | null | undefined;
  onToggleHour: (hour: number) => void;
}) {
  const byHour = useMemo(() => {
    const map = new Map<number, DayBooking[]>();
    if (!day) return map;
    const tz = day.timezone;
    const sorted = [...day.bookings].sort((a, b) => a.startsAt - b.startsAt);
    for (const b of sorted) {
      for (const h of ALL_HOURS) {
        if (!slotExists(day.dayIndex, h, tz)) continue; // DST gap hour
        const slotStart = slotStartMs(day.dayIndex, h, tz);
        if (b.startsAt < slotStart + HOUR_MS && b.endsAt > slotStart) {
          const list = map.get(h) ?? [];
          list.push(b);
          map.set(h, list);
        }
      }
    }
    return map;
  }, [day]);

  const segments: BarSegment[] = useMemo(
    () =>
      (day?.bookings ?? []).map((b) => ({
        startsAt: b.startsAt,
        endsAt: b.endsAt,
        tone: "booked" as const,
      })),
    [day],
  );

  return (
    <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
      {ALL_HOURS.map((h) => {
        // The hour that doesn't exist on a spring-forward day: no card.
        if (day && !slotExists(day.dayIndex, h, day.timezone)) return null;

        const tz = day?.timezone ?? "UTC";
        const hourStart = day ? slotStartMs(day.dayIndex, h, tz) : 0;
        const state = day?.states[h] ?? "off";
        const list = byHour.get(h) ?? [];
        const hasBookings = list.length > 0;

        return (
          <div
            key={h}
            className={cn(
              "rounded-xl border p-3",
              hasBookings ? SLOT_COLORS.booked : SLOT_COLORS[state],
            )}
          >
            <button
              type="button"
              disabled={hasBookings}
              onClick={() => onToggleHour(h)}
              className="flex w-full items-center justify-between text-left disabled:cursor-default"
            >
              <span className="font-mono text-sm font-semibold">
                {formatHour(h)}
              </span>
              <span className="text-xs capitalize opacity-80">
                {hasBookings
                  ? `${list.length} call${list.length === 1 ? "" : "s"}`
                  : state}
              </span>
            </button>

            <HourBar
              hourStart={hourStart}
              segments={segments}
              closed={state === "off" && !hasBookings}
              showScale={hasBookings}
            />

            {hasBookings && (
              <ul className="mt-2 space-y-1">
                {list.map((b) => {
                  const gTz = b.guestTimezone;
                  const differs = !!gTz && gTz !== tz;
                  const shift = differs
                    ? dayShiftLabel(b.startsAt, tz, gTz)
                    : "";
                  return (
                    <li key={b._id}>
                      <Link
                        href={`/bookings/${b._id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block rounded-md bg-black/25 px-2 py-1.5 text-xs transition hover:ring-1 hover:ring-rose-300/70"
                      >
                        <span className="font-mono font-semibold">
                          {formatTimeRange(b.startsAt, b.endsAt, tz)}
                        </span>
                        <span className="ml-1 opacity-90">
                          · {b.guestName} · {b.minutes}m
                        </span>
                        {differs && gTz && (
                          <span className="block opacity-80">
                            Client: {formatTimeRange(b.startsAt, b.endsAt, gTz)}{" "}
                            · {tzCity(gTz)}
                            {shift && ` (${shift})`}
                          </span>
                        )}
                        <span className="block opacity-70">
                          {BOOKING_LABEL[b.status] ?? b.status}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        );
      })}
    </div>
  );
}
