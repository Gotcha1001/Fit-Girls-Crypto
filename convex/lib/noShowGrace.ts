// convex/lib/noShowGrace.ts  (NEW FILE)
//
// Just the constant. It lives in its own file with NO imports so noShow.ts can
// use it without importing anything that touches _generated/api (that import
// loop is what causes "implicitly has type 'any'" errors in Convex projects).

/** How long after the scheduled start we wait before judging attendance. */
export const GRACE_MS = 5 * 60 * 1000; // 5 minutes
