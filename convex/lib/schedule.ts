// convex/lib/schedule.ts
//
// Shared by Convex (server) AND the Next.js app (browser) -- keep it free of
// imports so both sides can use it. One source of truth for the rules.
//
// Time zones: every function that touches a wall clock takes an IANA zone
// ("Africa/Johannesburg", "Asia/Kolkata", ...). Slots are always computed in
// the HOST's zone; the viewer's zone is only used for display.
//
// A "day index" is the number of local calendar days since 1970-01-01 in the
// zone you pass in. The same instant can have a different day index in
// different zones -- never compare day indexes across zones.
//
// Built on Intl only (no dependencies). DST is handled by wallToUtc().

export const HOUR_MS = 3_600_000;
export const MIN_MS = 60_000;
export const DAY_MS = 86_400_000;

/**
 * The zone everything was implicitly in before time zones existed.
 * Only for the one-off backfill of old users/hosts -- do not use as a
 * runtime fallback.
 */
export const LEGACY_TZ = "Africa/Johannesburg";

// ───────────── gap + slot grid ─────────────

/** Break she always gets between two calls (prep time, no stress). */
export const GAP_MINUTES = 5;
export const GAP_MS = GAP_MINUTES * MIN_MS;

/** Calls must start on a multiple of this. Must divide 60 evenly. */
export const SLOT_GRID_MINUTES = 5;
export const SLOT_GRID_MS = SLOT_GRID_MINUTES * MIN_MS;

/** A call can only be booked while its start is at least this far away. */
export const MIN_LEAD_MS = HOUR_MS;

/** How far ahead clients can book. */
export const MAX_DAYS_AHEAD = 30;

/** Most days one availability query may return. */
export const MAX_RANGE_DAYS = 14;

/** Longest single call (must match MAX_MINUTES in bookings.ts). */
export const MAX_CALL_MINUTES = 120;

/** Used for a girl who has never saved her weekly hours: 09:00 to 21:00 (her local time). */
export const DEFAULT_OPEN_HOURS: readonly number[] = [
  9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20,
];

/** open = bookable, booked = someone else has it, mine = my booking, off = she isn't working. */
export type SlotState = "open" | "booked" | "mine" | "off";

export const WEEKDAY_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
export const WEEKDAY_LONG = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

const mod = (n: number, m: number): number => ((n % m) + m) % m;

// ───────────── Intl core ─────────────

const partsCache = new Map<string, Intl.DateTimeFormat>();

function partsFmt(tz: string): Intl.DateTimeFormat {
  let f = partsCache.get(tz);
  if (!f) {
    f = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      hourCycle: "h23",
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      second: "numeric",
    });
    partsCache.set(tz, f);
  }
  return f;
}

/**
 * True for a real IANA zone name. Rejects "+02:00"-style offsets (some
 * engines accept them) because we want a named zone that follows DST rules.
 */
export function isValidTimeZone(tz: unknown): tz is string {
  if (typeof tz !== "string" || tz.length === 0 || tz.length > 64) return false;
  if (/^[+-]/.test(tz)) return false;
  try {
    new Intl.DateTimeFormat("en", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/** Local wall clock minus UTC, in ms, at the real instant `ts`. */
export function tzOffsetMs(ts: number, tz: string): number {
  let y = 1970,
    mo = 1,
    d = 1,
    h = 0,
    mi = 0,
    s = 0;
  for (const p of partsFmt(tz).formatToParts(new Date(ts))) {
    switch (p.type) {
      case "year":
        y = +p.value;
        break;
      case "month":
        mo = +p.value;
        break;
      case "day":
        d = +p.value;
        break;
      case "hour":
        h = +p.value % 24;
        break; // some engines emit 24 at midnight
      case "minute":
        mi = +p.value;
        break;
      case "second":
        s = +p.value;
        break;
    }
  }
  return Date.UTC(y, mo - 1, d, h, mi, s) - Math.floor(ts / 1000) * 1000;
}

/**
 * Wall-clock ms (the local date/time written as if it were UTC) -> real instant.
 *
 * DST edge cases:
 *  - Fall-back (ambiguous local time): returns the FIRST occurrence.
 *  - Spring-forward (local time doesn't exist): shifts forward by the gap, so
 *    02:00 becomes 03:00. Use slotExists() to detect and hide those slots.
 *
 * Samples the offset a day either side of the guess instead of iterating, so
 * it is correct right on a transition (a plain two-pass guess can be off by an hour there).
 */
export function wallToUtc(wallMs: number, tz: string): number {
  const before = tzOffsetMs(wallMs - DAY_MS, tz);
  const after = tzOffsetMs(wallMs + DAY_MS, tz);
  const a = wallMs - before;
  const b = wallMs - after;
  const aOk = a + tzOffsetMs(a, tz) === wallMs;
  const bOk = b + tzOffsetMs(b, tz) === wallMs;
  if (aOk && bOk) return Math.min(a, b); // ambiguous: first occurrence
  if (aOk) return a;
  if (bOk) return b;
  return a; // inside a spring-forward gap: shift forward
}

// ───────────── day / hour maths (all in the zone you pass) ─────────────

/** Local calendar day (days since 1970-01-01) that `ts` falls on in `tz`. */
export function dayIndexOf(ts: number, tz: string): number {
  return Math.floor((ts + tzOffsetMs(ts, tz)) / DAY_MS);
}

/** Epoch ms of 00:00 local on that day. */
export function dayStartMs(dayIndex: number, tz: string): number {
  return wallToUtc(dayIndex * DAY_MS, tz);
}

/** Epoch ms where the local day ends (= start of the next day). 23/24/25h after dayStartMs. */
export function dayEndMs(dayIndex: number, tz: string): number {
  return dayStartMs(dayIndex + 1, tz);
}

/** 0 = Monday ... 6 = Sunday. (1970-01-01 was a Thursday.) Zone-independent. */
export function weekdayOf(dayIndex: number): number {
  return mod(dayIndex + 3, 7);
}

/** Local hour of day (0-23) at `ts` in `tz`. */
export function hourOf(ts: number, tz: string): number {
  return Math.floor(mod(ts + tzOffsetMs(ts, tz), DAY_MS) / HOUR_MS);
}

/** Epoch ms of `hour`:00 local on that day. hour may be 24 (= next day's start). */
export function slotStartMs(
  dayIndex: number,
  hour: number,
  tz: string,
): number {
  return wallToUtc(dayIndex * DAY_MS + hour * HOUR_MS, tz);
}

/**
 * False when that local hour doesn't exist (spring-forward gap), e.g. 02:00 on
 * the night clocks jump to 03:00. Treat such slots as "off".
 */
export function slotExists(
  dayIndex: number,
  hour: number,
  tz: string,
): boolean {
  const ts = slotStartMs(dayIndex, hour, tz);
  return dayIndexOf(ts, tz) === dayIndex && hourOf(ts, tz) === hour;
}

// ───────────── booking rules ─────────────

/** True while a call starting at `startsAt` can still be booked. */
export function isSlotBookable(startsAt: number, now: number): boolean {
  return startsAt >= now + MIN_LEAD_MS;
}

/** Moment bookings for that start time close. */
export function bookingClosesAt(startsAt: number): number {
  return startsAt - MIN_LEAD_MS;
}

/** Last day (in the HOST's zone) clients may book. */
export function lastBookableDay(now: number, tz: string): number {
  return dayIndexOf(now, tz) + MAX_DAYS_AHEAD;
}

// ───────────── zone labels + comparison (display only) ─────────────

/** "UTC+2", "UTC+5:30", "UTC−4" at instant `ts` (DST-aware). */
export function tzOffsetLabel(tz: string, ts: number): string {
  const minutes = Math.round(tzOffsetMs(ts, tz) / MIN_MS);
  if (minutes === 0) return "UTC";
  const sign = minutes > 0 ? "+" : "−";
  const abs = Math.abs(minutes);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  return `UTC${sign}${h}${m ? ":" + String(m).padStart(2, "0") : ""}`;
}

/** "Africa/Johannesburg · UTC+2" */
export function tzLabel(tz: string, ts: number): string {
  return `${tz} · ${tzOffsetLabel(tz, ts)}`;
}

/** "Africa/Johannesburg" -> "Johannesburg", "America/Argentina/Buenos_Aires" -> "Buenos Aires" */
export function tzCity(tz: string): string {
  const last = tz.split("/").pop() ?? tz;
  return last.replace(/_/g, " ");
}

/** How many hours zone B is ahead of zone A at instant `ts` (can be fractional, e.g. 5.5). */
export function hoursBetween(ts: number, tzA: string, tzB: string): number {
  return (tzOffsetMs(ts, tzB) - tzOffsetMs(ts, tzA)) / HOUR_MS;
}

/** "+1h", "−7h", "+5h 30m", or "same time" -- B relative to A. */
export function formatHoursBetween(
  ts: number,
  tzA: string,
  tzB: string,
): string {
  const diffMin = Math.round(
    (tzOffsetMs(ts, tzB) - tzOffsetMs(ts, tzA)) / MIN_MS,
  );
  if (diffMin === 0) return "same time";
  const sign = diffMin > 0 ? "+" : "−";
  const abs = Math.abs(diffMin);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  return `${sign}${h}h${m ? ` ${m}m` : ""}`;
}

/**
 * Whole days the local date in `toTz` is ahead (+1) or behind (−1) the local
 * date in `fromTz` at the same instant. Drives the "+1 day" tag in DualTime.
 */
export function localDayShift(
  ts: number,
  fromTz: string,
  toTz: string,
): number {
  return dayIndexOf(ts, toTz) - dayIndexOf(ts, fromTz);
}

/** "+1 day", "−1 day", or "" when both zones are on the same date. */
export function dayShiftLabel(
  ts: number,
  fromTz: string,
  toTz: string,
): string {
  const s = localDayShift(ts, fromTz, toTz);
  if (s === 0) return "";
  const n = Math.abs(s);
  return `${s > 0 ? "+" : "−"}${n} day${n === 1 ? "" : "s"}`;
}

// ───────────── formatting (display only) ─────────────

export function formatHour(hour: number): string {
  return `${String(hour).padStart(2, "0")}:00`;
}

const timeCache = new Map<string, Intl.DateTimeFormat>();

/** "14:30" in `tz`. */
export function formatTime(ts: number, tz: string): string {
  let f = timeCache.get(tz);
  if (!f) {
    f = new Intl.DateTimeFormat("en-GB", {
      timeZone: tz,
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    });
    timeCache.set(tz, f);
  }
  return f.format(new Date(ts));
}

export function formatTimeRange(
  startsAt: number,
  endsAt: number,
  tz: string,
): string {
  return `${formatTime(startsAt, tz)} – ${formatTime(endsAt, tz)}`;
}

// Day index -> calendar label. These only read the date, so no tz needed.
const dayDate = (dayIndex: number): Date => new Date(dayIndex * DAY_MS);

/** "Wednesday 7 October" */
export function formatDayLong(dayIndex: number): string {
  return dayDate(dayIndex).toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  });
}

/** "Wed 7 Oct" */
export function formatDayShort(dayIndex: number): string {
  return dayDate(dayIndex).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

export function dayOfMonth(dayIndex: number): number {
  return dayDate(dayIndex).getUTCDate();
}

/** "Today", "Tomorrow", otherwise "Friday". Both indexes must be in the SAME zone. */
export function relativeDayLabel(dayIndex: number, todayIndex: number): string {
  if (dayIndex === todayIndex) return "Today";
  if (dayIndex === todayIndex + 1) return "Tomorrow";
  if (dayIndex === todayIndex - 1) return "Yesterday";
  return WEEKDAY_LONG[weekdayOf(dayIndex)];
}

// ───────────── bridge to the shadcn <Calendar> (uses local Dates) ─────────────

export function dayIndexToLocalDate(dayIndex: number): Date {
  const d = dayDate(dayIndex);
  return new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

export function localDateToDayIndex(date: Date): number {
  return Math.round(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / DAY_MS,
  );
}

/** Call lengths offered in the UI. */
export function durationOptions(
  minMinutes: number,
  maxMinutes: number,
): number[] {
  const set = new Set<number>();
  for (const n of [1, 2, 3, 4]) set.add(minMinutes * n);
  for (const m of [60, 90, 120]) set.add(m);
  return [...set]
    .filter(
      (m) => m >= minMinutes && m <= Math.min(maxMinutes, MAX_CALL_MINUTES),
    )
    .sort((a, b) => a - b);
}
