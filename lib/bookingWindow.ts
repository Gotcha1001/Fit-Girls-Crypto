// lib/bookingWindow.ts
// Single source of truth for when a paid booking call can be joined.
// Imported by Convex (convex/callAccess.ts) AND the browser (bookings page),
// so the "Join call" button always matches what the server will allow.

export const MIN_MS = 60_000;
export const EARLY_JOIN_MS = 5 * MIN_MS; // can join 5 minutes before the start
export const LATE_GRACE_MS = 10 * MIN_MS; // and up to 10 minutes after the booked end

interface BookingTimes {
  startsAt: number;
  endsAt: number;
}

/** True while the server would issue a call token for this booking. */
export function isInJoinWindow(b: BookingTimes, now: number): boolean {
  return now >= b.startsAt - EARLY_JOIN_MS && now <= b.endsAt + LATE_GRACE_MS;
}

/** True once the call can no longer be joined (the booking is finished). */
export function isBookingOver(b: BookingTimes, now: number): boolean {
  return now > b.endsAt + LATE_GRACE_MS;
}
