// convex/payoutQueue.ts  (REPLACE whole file)
//
// Everything about paying hosts lives here:
//
//   myEarnings     query            the host's Earnings page reads this
//   minPayout      query            the payout threshold, for any page that shows it
//   backfillSentTotals internalMutation  ONE-TIME: fills hosts.sentTotalUsdt
//   processDue     internalAction   cron (every 15 min): pays hosts who reached the minimum
//   hostsWithDue   internalQuery    which hosts have released, unpaid rows
//   claimHost      internalMutation atomically flips a host's due rows to "processing"
//   markSent       internalMutation after Plisio accepted the withdrawal
//   markFailed     internalMutation after Plisio refused / errored
//   requeueFailed  internalMutation manual: failed -> pending (run from the dashboard)
//
// Row lifecycle (hostPayouts.status):
//   pending -> processing -> sent
//                         -> failed   (NOT retried automatically, see below)
//   pending|failed -> cancelled       (noShow.evaluate, host no-show)
//
// Why failed rows are not retried automatically: if Plisio accepted the
// withdrawal but our reply was lost, an automatic retry would pay her twice.
// Check the Plisio dashboard first, then run `requeueFailed` if nothing left.
import { v } from "convex/values";
import {
  internalAction,
  internalMutation,
  internalQuery,
  query,
} from "./_generated/server";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import { getCurrentUser } from "./lib/auth";
import { getMinPayoutUsdt } from "./lib/payoutConfig";
import { withdraw } from "./lib/plisio";
type PayoutStatus = Doc<"hostPayouts">["status"];
/** Most rows paid in one withdrawal (keeps each mutation small). */
const MAX_ROWS_PER_PAYOUT = 200;
/** Most hosts paid in one cron run. */
const MAX_HOSTS_PER_RUN = 100;
/** Rows shown in the "Your earnings" list. */
const RECENT_LIMIT = 20;
const round2 = (n: number): number => Math.round(n * 100) / 100;
const errorMessage = (e: unknown): string =>
  e instanceof Error ? e.message : String(e);
// ───────────────────────── Earnings page ─────────────────────────
export type EarningsRow = {
  id: Id<"hostPayouts">;
  amountUsdt: number;
  status: PayoutStatus;
  releaseAt: number;
  sentAt: number | null;
  txUrl: string | null;
};
export type Earnings = {
  minPayoutUsdt: number;
  hasWallet: boolean;
  /** Released and waiting for the minimum (includes rows being sent right now). */
  releasedUsdt: number;
  /** Still inside the 24 h refund hold. */
  heldUsdt: number;
  /** Already paid to her wallet. */
  sentUsdt: number;
  /** Payouts that failed and need a look. */
  problemUsdt: number;
  /** Everything earned, excluding cancelled rows (exact: paid total comes from hosts.sentTotalUsdt). */
  lifetimeUsdt: number;
  /** When the next held row is released, or null if nothing is held. */
  nextReleaseAt: number | null;
  recent: EarningsRow[];
};
export const myEarnings = query({
  // `now` comes from the browser (rounded to the minute) so the query is
  // re-run each minute and "On hold" turns into "Pending" without a refresh.
  // A query must not call Date.now() itself.
  args: { now: v.number() },
  handler: async (ctx, { now }): Promise<Earnings | null> => {
    const user = await getCurrentUser(ctx);
    if (!user) return null;
    const host = await ctx.db
      .query("hosts")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .unique();
    if (!host) return null;

    // No row cap any more:
    //  - "sent" money comes from the running total on the host (hosts.sentTotalUsdt),
    //    so it is exact however many payouts she has had.
    //  - Everything not yet sent (pending / processing / failed) is read in full.
    //    These sets stay small because the cron pays them out, so reading
    //    them all is cheap.
    const unsent = await Promise.all(
      (["pending", "processing", "failed"] as const).map((status) =>
        ctx.db
          .query("hostPayouts")
          .withIndex("by_host_status", (q) =>
            q.eq("hostId", host._id).eq("status", status),
          )
          .collect(),
      ),
    );

    let released = 0;
    let held = 0;
    let problem = 0;
    let nextReleaseAt: number | null = null;
    for (const r of unsent[0]) {
      // pending
      if (r.releaseAt > now) {
        held += r.amountUsdt;
        if (nextReleaseAt === null || r.releaseAt < nextReleaseAt) {
          nextReleaseAt = r.releaseAt;
        }
      } else {
        released += r.amountUsdt;
      }
    }
    for (const r of unsent[1]) released += r.amountUsdt; // processing
    for (const r of unsent[2]) problem += r.amountUsdt; // failed

    const sent = host.sentTotalUsdt ?? 0;
    const lifetime = sent + released + held + problem;

    // Newest rows for the list (cancelled ones hidden). Only these are read.
    const newest = await ctx.db
      .query("hostPayouts")
      .withIndex("by_host", (q) => q.eq("hostId", host._id))
      .order("desc")
      .filter((q) => q.neq(q.field("status"), "cancelled"))
      .take(RECENT_LIMIT);
    const recent: EarningsRow[] = newest.map((r) => ({
      id: r._id,
      amountUsdt: r.amountUsdt,
      status: r.status,
      releaseAt: r.releaseAt,
      sentAt: r.sentAt ?? null,
      txUrl: r.txUrl ?? null,
    }));

    return {
      minPayoutUsdt: getMinPayoutUsdt(),
      hasWallet: !!host.payoutAccountRef,
      releasedUsdt: round2(released),
      heldUsdt: round2(held),
      sentUsdt: round2(sent),
      problemUsdt: round2(problem),
      lifetimeUsdt: round2(lifetime),
      nextReleaseAt,
      recent,
    };
  },
});

/** The payout threshold, for pages that mention it (e.g. host onboarding). */
export const minPayout = query({
  args: {},
  handler: async (): Promise<{ minPayoutUsdt: number }> => ({
    minPayoutUsdt: getMinPayoutUsdt(),
  }),
});

/**
 * ONE-TIME. Run from the Convex dashboard (Functions -> payoutQueue:backfillSentTotals)
 * right after deploying. It recomputes every host's sentTotalUsdt from her
 * "sent" rows, so it is safe to run more than once.
 */
export const backfillSentTotals = internalMutation({
  args: {},
  handler: async (ctx): Promise<number> => {
    const hosts = await ctx.db.query("hosts").collect();
    for (const h of hosts) {
      const sent = await ctx.db
        .query("hostPayouts")
        .withIndex("by_host_status", (q) =>
          q.eq("hostId", h._id).eq("status", "sent"),
        )
        .collect();
      await ctx.db.patch(h._id, {
        sentTotalUsdt: round2(sent.reduce((sum, r) => sum + r.amountUsdt, 0)),
      });
    }
    return hosts.length;
  },
});

// ───────────────────────── Payout cron ─────────────────────────
/** Hosts that have at least one released, unpaid row. */
export const hostsWithDue = internalQuery({
  args: { now: v.number() },
  handler: async (ctx, { now }): Promise<Id<"hosts">[]> => {
    const due = await ctx.db
      .query("hostPayouts")
      .withIndex("by_status_release", (q) =>
        q.eq("status", "pending").lte("releaseAt", now),
      )
      .take(500);
    return Array.from(new Set(due.map((r) => r.hostId))).slice(
      0,
      MAX_HOSTS_PER_RUN,
    );
  },
});
export type ClaimedPayout = {
  batchId: string;
  address: string;
  amountUsdt: number;
  payoutIds: Id<"hostPayouts">[];
};
/**
 * Adds up a host's released rows. If she has a wallet, is not suspended and
 * has reached the minimum, marks those rows "processing" and returns what to
 * send. It is a mutation, so two overlapping cron runs can never claim the
 * same rows.
 */
export const claimHost = internalMutation({
  args: { hostId: v.id("hosts"), now: v.number() },
  handler: async (ctx, { hostId, now }): Promise<ClaimedPayout | null> => {
    const host = await ctx.db.get(hostId);
    if (!host || host.status === "suspended" || !host.payoutAccountRef) {
      return null;
    }
    const pending = await ctx.db
      .query("hostPayouts")
      .withIndex("by_host_status", (q) =>
        q.eq("hostId", hostId).eq("status", "pending"),
      )
      .take(500);
    const due = pending
      .filter((r) => r.releaseAt <= now)
      .slice(0, MAX_ROWS_PER_PAYOUT);
    const amountUsdt = round2(due.reduce((sum, r) => sum + r.amountUsdt, 0));
    if (due.length === 0 || amountUsdt < getMinPayoutUsdt()) return null;
    const batchId = `pay_${hostId}_${now}`;
    for (const r of due) {
      await ctx.db.patch(r._id, { status: "processing", batchId });
    }
    return {
      batchId,
      address: host.payoutAccountRef,
      amountUsdt,
      payoutIds: due.map((r) => r._id),
    };
  },
});
export const markSent = internalMutation({
  args: {
    payoutIds: v.array(v.id("hostPayouts")),
    plisioOpId: v.string(),
    txUrl: v.optional(v.string()),
    sentAt: v.number(),
  },
  handler: async (
    ctx,
    { payoutIds, plisioOpId, txUrl, sentAt },
  ): Promise<void> => {
    let hostId: Id<"hosts"> | null = null;
    let newlySent = 0;
    for (const id of payoutIds) {
      const row = await ctx.db.get(id);
      if (!row) continue;
      hostId = row.hostId;
      // Only count a row the first time it becomes "sent".
      if (row.status !== "sent") newlySent += row.amountUsdt;
      await ctx.db.patch(id, {
        status: "sent",
        plisioOpId,
        txUrl,
        sentAt,
        error: undefined,
      });
    }
    // Keep the host's running "paid so far" total in step (one claim = one host).
    if (hostId && newlySent > 0) {
      const host = await ctx.db.get(hostId);
      if (host) {
        await ctx.db.patch(hostId, {
          sentTotalUsdt: round2((host.sentTotalUsdt ?? 0) + newlySent),
        });
      }
    }
  },
});

export const markFailed = internalMutation({
  args: {
    payoutIds: v.array(v.id("hostPayouts")),
    error: v.string(),
  },
  handler: async (ctx, { payoutIds, error }): Promise<void> => {
    for (const id of payoutIds) {
      await ctx.db.patch(id, { status: "failed", error });
    }
  },
});
/** Cron entry point (convex/crons.ts, every 15 minutes). */
export const processDue = internalAction({
  args: {},
  handler: async (ctx): Promise<void> => {
    const now = Date.now();
    const hostIds: Id<"hosts">[] = await ctx.runQuery(
      internal.payoutQueue.hostsWithDue,
      { now },
    );
    // One host at a time: one failure never blocks the others.
    for (const hostId of hostIds) {
      const claim: ClaimedPayout | null = await ctx.runMutation(
        internal.payoutQueue.claimHost,
        { hostId, now },
      );
      if (!claim) continue;
      try {
        const result = await withdraw(claim.address, claim.amountUsdt);
        await ctx.runMutation(internal.payoutQueue.markSent, {
          payoutIds: claim.payoutIds,
          plisioOpId: result.id,
          txUrl: result.txUrl,
          sentAt: Date.now(),
        });
      } catch (e) {
        const message = errorMessage(e);
        console.error(`[payout] ${claim.batchId} failed: ${message}`);
        await ctx.runMutation(internal.payoutQueue.markFailed, {
          payoutIds: claim.payoutIds,
          error: message,
        });
      }
    }
  },
});
/**
 * Manual: put every failed row back in the queue. Run it from the Convex
 * dashboard AFTER checking Plisio that the money did not actually leave.
 */
export const requeueFailed = internalMutation({
  args: {},
  handler: async (ctx): Promise<number> => {
    const failed = await ctx.db
      .query("hostPayouts")
      .withIndex("by_status_release", (q) => q.eq("status", "failed"))
      .take(500);
    for (const r of failed) {
      await ctx.db.patch(r._id, { status: "pending", error: undefined });
    }
    return failed.length;
  },
});
