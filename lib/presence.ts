// Shared presence constants + helper. Client-side only (convex/ has its own
// throttle constant in profiles.ts so the two folders stay independent).

/** How often a signed-in, visible tab pings the server. */
export const HEARTBEAT_INTERVAL_MS = 60_000;

/** A profile is "online" if it was active within this window. */
export const ONLINE_THRESHOLD_MS = 150_000;

/** How often the UI re-evaluates online/offline against the clock. */
export const PRESENCE_TICK_MS = 30_000;

export function isOnlineAt(lastActiveAt: number, now: number): boolean {
  return now - lastActiveAt < ONLINE_THRESHOLD_MS;
}
