// convex/lib/availability.ts
//
// SERVER-ONLY helpers that turn "weekly hours + one-day overrides + bookings"
// into the hourly calendar. Used by convex/calendar.ts (what the calendar
// shows) AND by convex/bookings.ts (what createBooking allows), so what a
// client sees and what the server accepts can never disagree.
//
// The pure rules (zone maths, 1-hour lead time, slot maths) live in
// ./schedule.ts and ./slots.ts, which the browser also imports.
//
// Time zones: a "day" and an "hour" here are always in the HOST's zone (`tz`
// = host.timezone). Bookings are stored as UTC instants, so only the
// mapping onto her local calendar needs the zone.

import type { MutationCtx, QueryCtx } from "../_generated/server";
import type { Doc, Id } from "../_generated/dataModel";
import {
  DEFAULT_OPEN_HOURS,
  MAX_CALL_MINUTES,
  MIN_MS,
  dayIndexOf,
  hourOf,
  isValidTimeZone,
  slotExists,
  weekdayOf,
  type SlotState,
} from "./schedule";
import { ALL_HOURS, slotStartsBetween } from "./slots";
import { getCurrentUser } from "./auth";

type Ctx = QueryCtx | MutationCtx;
type BookingDoc = Doc<"bookings">;

/** weekday (0 = Mon) -> open hours. `null` means she never saved her hours. */
export type WeeklyHours = Map<number, number[]> | null;

/** A booking starting this long before a window can still reach into it. */
const LOOKBACK_MS = (MAX_CALL_MINUTES + 60) * MIN_MS;

// ───────────── host zone ─────────────

/**
 * The host's IANA zone, or null if she has none (old accounts before the
 * backfill ran). Public queries use this and return "unavailable" on null.
 * There is deliberately no silent fallback to a default zone.
 */
export function hostTzOrNull(host: Doc<"hosts">): string | null {
  return host.timezone && isValidTimeZone(host.timezone) ? host.timezone : null;
}

/** Same, but throws -- for mutations and host-only queries. */
export function requireHostTz(host: Doc<"hosts">): string {
  const tz = hostTzOrNull(host);
  if (!tz) throw new Error("Host has no time zone set");
  return tz;
}

// ───────────── bookings ─────────────

/** Cancelled, expired and refunded bookings give the slot back. */
export function holdsSlot(status: BookingDoc["status"]): boolean {
  return (
    status !== "cancelled" && status !== "expired" && status !== "refunded"
  );
}

export function bookingEnd(b: BookingDoc): number {
  return b.endsAt ?? b.startsAt + b.minutes * MIN_MS;
}

/**
 * Every hourly slot this booking reserves, as the UTC start of each LOCAL
 * hour block in `tz` (a 90-min call at 14:00 = 14:00 and 15:00 her time).
 * Derived on the fly, so it stays right even if she later changes zone.
 */
export function bookingSlots(b: BookingDoc, tz: string): number[] {
  return slotStartsBetween(b.startsAt, bookingEnd(b), tz);
}

/**
 * Bookings of one girl that reserve at least one hourly slot inside
 * [fromMs, toMs). Only bookings that still hold their slot are returned.
 * Uses the by_host_time index, so it never scans her whole history.
 *
 * `tz` is the HOST's zone: slot boundaries are her local hours, which on
 * :30 / :45 zones (Kolkata, Kathmandu) don't line up with UTC hours.
 */
export async function bookingsTouching(
  ctx: Ctx,
  hostId: Id<"hosts">,
  fromMs: number,
  toMs: number,
  tz: string,
): Promise<BookingDoc[]> {
  const rows = await ctx.db
    .query("bookings")
    .withIndex("by_host_time", (q) =>
      q
        .eq("hostId", hostId)
        .gte("startsAt", fromMs - LOOKBACK_MS)
        .lt("startsAt", toMs),
    )
    .collect();
  return rows.filter(
    (b) =>
      holdsSlot(b.status) &&
      bookingSlots(b, tz).some((s) => s >= fromMs && s < toMs),
  );
}

// ───────────── working hours ─────────────

/** Validates and sorts a list of hours (0-23). Throws a readable error. */
export function cleanHours(input: number[]): number[] {
  const set = new Set<number>();
  for (const h of input) {
    if (!Number.isInteger(h) || h < 0 || h > 23) {
      throw new Error("Hours must be whole numbers from 0 to 23");
    }
    set.add(h);
  }
  return [...set].sort((a, b) => a - b);
}

export async function loadWeekly(
  ctx: Ctx,
  hostId: Id<"hosts">,
): Promise<WeeklyHours> {
  const rows = await ctx.db
    .query("hostWeeklyHours")
    .withIndex("by_host", (q) => q.eq("hostId", hostId))
    .collect();
  if (rows.length === 0) return null;
  return new Map(rows.map((r) => [r.weekday, r.hours]));
}

/** Her usual hours for a weekday, before any one-day change. */
export function usualHoursFor(
  weekly: WeeklyHours,
  weekday: number,
): readonly number[] {
  if (weekly === null) return DEFAULT_OPEN_HOURS;
  return weekly.get(weekday) ?? [];
}

/**
 * One-day overrides in an inclusive range of day indexes.
 * Day indexes are in the HOST's zone (that's why changing zone deletes them).
 */
export async function loadOverrides(
  ctx: Ctx,
  hostId: Id<"hosts">,
  firstDay: number,
  lastDay: number,
): Promise<Map<number, number[]>> {
  const rows = await ctx.db
    .query("hostDayOverrides")
    .withIndex("by_host_day", (q) =>
      q.eq("hostId", hostId).gte("dayIndex", firstDay).lte("dayIndex", lastDay),
    )
    .collect();
  return new Map(rows.map((r) => [r.dayIndex, r.hours]));
}

/** The hours she works on one date: the override if there is one, else her usual hours. */
export function effectiveHours(
  weekly: WeeklyHours,
  overrides: Map<number, number[]>,
  dayIndex: number,
): { hours: number[]; isOverride: boolean } {
  const override = overrides.get(dayIndex);
  if (override) return { hours: override, isOverride: true };
  return {
    hours: [...usualHoursFor(weekly, weekdayOf(dayIndex))],
    isOverride: false,
  };
}

/**
 * Same as effectiveHours, for a single day (used inside createBooking).
 * Zone-free: weekly hours are wall-clock and `dayIndex` is already her local
 * day, so no `tz` is needed here.
 */
export async function workingHoursOn(
  ctx: Ctx,
  hostId: Id<"hosts">,
  weekly: WeeklyHours,
  dayIndex: number,
): Promise<Set<number>> {
  const overrides = await loadOverrides(ctx, hostId, dayIndex, dayIndex);
  return new Set(effectiveHours(weekly, overrides, dayIndex).hours);
}

// ───────────── the calendar for one day ─────────────

/**
 * 24 slot states for one LOCAL day in `tz` (the host's zone), index = local hour.
 *   off    = she isn't working that hour (or the hour doesn't exist today)
 *   open   = free (the client still applies the 1-hour lead time on top)
 *   booked = someone else has it (never says who)
 *   mine   = the viewer's own booking
 * A booking always wins over "off", so a booking made earlier is never hidden
 * if she later trims her hours or changes zone.
 *
 * DST: on a spring-forward day the missing local hour is forced to "off".
 * On a fall-back day the repeated hour is ONE entry that covers both
 * occurrences (a booking in either marks it).
 */
export function daySlotStates(
  dayIndex: number,
  openHours: readonly number[],
  bookings: readonly BookingDoc[],
  viewerId: Id<"users"> | null,
  tz: string,
): SlotState[] {
  const open = new Set(openHours);
  const states: SlotState[] = ALL_HOURS.map((h) =>
    open.has(h) && slotExists(dayIndex, h, tz) ? "open" : "off",
  );

  for (const b of bookings) {
    for (const slot of bookingSlots(b, tz)) {
      // Only slots that fall on THIS local day. A booking running past
      // midnight puts its later slots on the next day's calendar.
      if (dayIndexOf(slot, tz) !== dayIndex) continue;
      const h = hourOf(slot, tz);
      states[h] =
        viewerId !== null && b.guestId === viewerId ? "mine" : "booked";
    }
  }
  return states;
}

// ───────────── who is this girl? ─────────────

export async function findMyHost(
  ctx: Ctx,
): Promise<{ user: Doc<"users">; host: Doc<"hosts"> } | null> {
  const user = await getCurrentUser(ctx);
  if (!user || user.role !== "host") return null;
  const host = await ctx.db
    .query("hosts")
    .withIndex("by_user", (q) => q.eq("userId", user._id))
    .unique();
  return host ? { user, host } : null;
}

export async function requireMyHost(
  ctx: Ctx,
): Promise<{ user: Doc<"users">; host: Doc<"hosts"> }> {
  const me = await findMyHost(ctx);
  if (!me)
    throw new Error("Only girls with a saved profile can manage a schedule");
  return me;
}
