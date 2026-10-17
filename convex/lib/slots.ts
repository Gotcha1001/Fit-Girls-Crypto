// convex/lib/slots.ts
//
// Pure slot maths. Shared by Convex and the browser (imports only ./schedule).
//
// Everything that is "a working day" is computed in the HOST's time zone and
// handed in as `tz`. Busy blocks and results are real UTC instants, so the
// overlap/gap logic needs no zone at all.

import {
  GAP_MS,
  HOUR_MS,
  MIN_MS,
  SLOT_GRID_MS,
  slotStartMs,
  tzOffsetMs,
} from "./schedule";

export const ALL_HOURS: readonly number[] = Array.from(
  { length: 24 },
  (_, i) => i,
);

/** A booked block of time. */
export type Busy = { startsAt: number; endsAt: number };

/**
 * True when `ts` sits on a 5-minute mark of the UTC clock. Safe in every zone:
 * all real UTC offsets are multiples of 15 minutes, so a 5-minute mark in UTC
 * is a 5-minute mark on the wall clock too.
 */
export function isOnGrid(ts: number): boolean {
  return Number.isInteger(ts) && ts % SLOT_GRID_MS === 0;
}

/** Round up to the next 5-minute mark. */
export function ceilToGrid(ts: number): number {
  return Math.ceil(ts / SLOT_GRID_MS) * SLOT_GRID_MS;
}

/**
 * Start of the local wall-clock hour containing `ts` in `tz`.
 *
 * Unlike slotStartMs(dayIndexOf(ts), hourOf(ts)) this is also right for the
 * SECOND 01:xx on a fall-back night, and for zones on :30 / :45 offsets
 * (Kolkata, Kathmandu), where the local hour starts at :30 / :15 UTC.
 */
export function floorToLocalHour(ts: number, tz: string): number {
  const local = ts + tzOffsetMs(ts, tz);
  return ts - (((local % HOUR_MS) + HOUR_MS) % HOUR_MS);
}

/** The local hour start after the one containing `t`. Always moves forward. */
function nextLocalHour(t: number, tz: string): number {
  const next = floorToLocalHour(t + HOUR_MS, tz);
  return next > t ? next : t + HOUR_MS; // guard for half-hour DST shifts
}

/**
 * Would a call at [startsAt, endsAt) break the gap rule against any booking in
 * `busy`? Overlapping is a clash, and so is being closer than GAP_MS.
 */
export function clashesWithGap(
  startsAt: number,
  endsAt: number,
  busy: readonly Busy[],
): boolean {
  return busy.some(
    (b) => startsAt < b.endsAt + GAP_MS && b.startsAt < endsAt + GAP_MS,
  );
}

/**
 * Her working hours as unbroken runs of real UTC time. Hours 9,10,11 and
 * 14,15 give [[09:00, 12:00], [14:00, 16:00]] (local). A call can't bridge two
 * runs.
 *
 * `hours` are LOCAL wall-clock hours in `tz` on local day `dayIndex`.
 *
 * Runs are merged by real time, not by hour number, so DST days behave:
 *  - Spring-forward: the missing hour has zero length and is dropped, and the
 *    hours either side still join into one run.
 *  - Fall-back: the repeated hour is ONE open hour that covers both
 *    occurrences, so that run is 1 hour longer.
 *  - Hour 24 is never needed: the end of hour 23 is the next day's start.
 */
export function openRuns(
  dayIndex: number,
  openHours: readonly number[],
  tz: string,
): Array<readonly [number, number]> {
  const hours = [...new Set(openHours)]
    .filter((h) => Number.isInteger(h) && h >= 0 && h <= 23)
    .sort((a, b) => a - b);
  const runs: Array<[number, number]> = [];
  for (const h of hours) {
    const from = slotStartMs(dayIndex, h, tz);
    const to = slotStartMs(dayIndex, h + 1, tz);
    if (to <= from) continue; // hour doesn't exist today (spring-forward gap)
    const last = runs[runs.length - 1];
    if (last && last[1] === from) last[1] = to;
    else runs.push([from, to]);
  }
  return runs;
}

/** Does [startsAt, endsAt) sit fully inside one of her working runs? */
export function fitsInRuns(
  startsAt: number,
  endsAt: number,
  runs: ReadonlyArray<readonly [number, number]>,
): boolean {
  return runs.some(([from, to]) => startsAt >= from && endsAt <= to);
}

/**
 * Every start time where a call of `minutes` fits that (host-local) day.
 *
 * Two kinds of start are offered:
 *   1. Tightly packed starts (10 min -> :00 :15 :30 :45), chained from the
 *      start of her run or from the end of a booking plus its gap.
 *   2. The top of every LOCAL working hour (:00 on her clock), whenever a call
 *      there fits inside her run and keeps the gap from every booking. This
 *      means :00 is always offered unless a booking in that hour actually
 *      blocks it, instead of the grid drifting (e.g. :05, :20, :35) after an
 *      odd booking.
 *
 * The two kinds can overlap each other, which is fine: only one can be
 * booked, and the query re-runs after a booking so the clash check removes
 * the rest.
 *
 * Does NOT apply the 1-hour lead time: the client does that against its live
 * clock, so the list stays right as time passes without re-running the query.
 */
export function openStarts(opts: {
  dayIndex: number;
  openHours: readonly number[];
  busy: readonly Busy[];
  minutes: number;
  tz: string;
}): number[] {
  const { dayIndex, openHours, busy, minutes, tz } = opts;
  const duration = minutes * MIN_MS;
  const sorted = [...busy].sort((a, b) => a.startsAt - b.startsAt);
  const runs = openRuns(dayIndex, openHours, tz);
  const out = new Set<number>();

  // 1. Tightly packed chain.
  for (const [runStart, runEnd] of runs) {
    let t = runStart;
    while (t + duration <= runEnd) {
      const hit = sorted.find(
        (b) => t < b.endsAt + GAP_MS && b.startsAt < t + duration + GAP_MS,
      );
      if (hit) {
        // Jump to the first free moment after that booking and its gap.
        t = ceilToGrid(hit.endsAt + GAP_MS);
        continue;
      }
      out.add(t);
      // Next call starts after this one plus the gap.
      t = ceilToGrid(t + duration + GAP_MS);
    }
  }

  // 2. Top of every local working hour, if it fits and keeps the gap.
  for (const [runStart, runEnd] of runs) {
    for (let h = runStart; h + duration <= runEnd; h = nextLocalHour(h, tz)) {
      const clash = sorted.some(
        (b) => h < b.endsAt + GAP_MS && b.startsAt < h + duration + GAP_MS,
      );
      if (!clash) out.add(h);
    }
  }

  return [...out].sort((a, b) => a - b);
}

/**
 * Start timestamps of every whole LOCAL hour block (in `tz`) touched by
 * [startsAt, endsAt). Derived on the fly, never stored, so a host changing
 * zone can't leave stale keys behind.
 */
export function slotStartsBetween(
  startsAt: number,
  endsAt: number,
  tz: string,
): number[] {
  const out: number[] = [];
  for (
    let t = floorToLocalHour(startsAt, tz);
    t < endsAt;
    t = nextLocalHour(t, tz)
  ) {
    out.push(t);
  }
  return out;
}

export function slotStartsFor(
  startsAt: number,
  minutes: number,
  tz: string,
): number[] {
  return slotStartsBetween(startsAt, startsAt + minutes * MIN_MS, tz);
}

/** "2d 4h", "3h 05m", "12m 09s", "45s". */
export function formatCountdown(ms: number): string {
  if (ms <= 0) return "0s";
  const total = Math.floor(ms / 1000);
  const d = Math.floor(total / 86_400);
  const h = Math.floor((total % 86_400) / 3_600);
  const m = Math.floor((total % 3_600) / 60);
  const s = total % 60;
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${String(m).padStart(2, "0")}m`;
  if (m > 0) return `${m}m ${String(s).padStart(2, "0")}s`;
  return `${s}s`;
}
