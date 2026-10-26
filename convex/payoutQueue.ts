// convex/payoutQueue.ts
//
// Pays hosts automatically. A cron (convex/crons.ts) runs processDue every 15 minutes:
//   1. find hosts with payouts that are due,
//   2. claim them (atomic, so two runs can never pay the same row twice),
//   3. send ONE USDT transfer per host through Plisio,
//   4. mark the rows sent (or failed).
//
// Logging: every decision is logged with the "[payout]" prefix. In the Convex
// dashboard go to Logs and filter by "[payout]" to see the whole chain.
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { internal } from "./_generated/api";
import {
  internalAction,
  internalMutation,
  internalQuery,
  query,
} from "./_generated/server";
import { requireCurrentUser } from "./lib/auth";
import { withdraw } from "./lib/plisio";

/** A host is paid once her due earnings add up to this much (USDT). Smaller amounts roll over. */

//Production value change it back after testing
// const MIN_PAYOUT_USDT = 10;

// Testing value
const MIN_PAYOUT_USDT = 0.5;

const MAX_ROWS_PER_BATCH = 100;

// Shortens a wallet address for logs: TXPtLQ...DB2q
const maskAddress = (a: string) =>
  a.length > 12 ? `${a.slice(0, 6)}...${a.slice(-4)}` : a;

export const listDueHosts = internalQuery({
  args: { now: v.number() },
  handler: async (ctx, { now }): Promise<Id<"hosts">[]> => {
    const rows = await ctx.db
      .query("hostPayouts")
      .withIndex("by_status_release", (q) =>
        q.eq("status", "pending").lte("releaseAt", now),
      )
      .take(500);
    const hostIds = [...new Set(rows.map((r) => r.hostId))];
    console.log("[payout] listDueHosts", {
      now,
      dueRows: rows.length,
      hosts: hostIds.length,
    });
    return hostIds;
  },
});

// Atomic: checks every due row is still owed, locks them as "processing",
// and returns what to send. Returns null when there is nothing to send yet.
export const claimHost = internalMutation({
  args: { hostId: v.id("hosts"), now: v.number() },
  handler: async (ctx, { hostId, now }) => {
    const host = await ctx.db.get(hostId);
    if (!host) {
      console.log("[payout] claimHost skip: host not found", { hostId });
      return null;
    }
    if (host.status !== "approved") {
      console.log("[payout] claimHost skip: host not approved", {
        hostId,
        status: host.status,
      });
      return null;
    }
    if (!host.payoutAccountRef) {
      console.log("[payout] claimHost skip: no payoutAccountRef", { hostId });
      return null;
    }

    const rows = await ctx.db
      .query("hostPayouts")
      .withIndex("by_host_status", (q) =>
        q.eq("hostId", hostId).eq("status", "pending"),
      )
      .take(MAX_ROWS_PER_BATCH);
    console.log("[payout] claimHost pending rows", {
      hostId,
      count: rows.length,
    });

    const valid = [];
    for (const r of rows) {
      if (r.releaseAt > now) {
        console.log("[payout] claimHost row not yet due", {
          rowId: r._id,
          releaseAt: r.releaseAt,
          now,
        });
        continue;
      }
      const payment = await ctx.db.get(r.paymentId);
      let owed = !!payment && payment.status === "succeeded";
      if (payment && owed && payment.kind === "booking") {
        const bookingId = ctx.db.normalizeId("bookings", payment.refId);
        const booking = bookingId ? await ctx.db.get(bookingId) : null;
        owed =
          !!booking &&
          (booking.status === "paid" || booking.status === "completed");
      }
      if (!owed) {
        // refunded / cancelled before it was due
        console.log("[payout] claimHost row cancelled", {
          rowId: r._id,
          paymentStatus: payment?.status,
        });
        await ctx.db.patch(r._id, {
          status: "cancelled",
          error: "Booking cancelled or refunded before payout",
        });
        continue;
      }
      valid.push(r);
    }

    const total =
      Math.floor(valid.reduce((s, r) => s + r.amountUsdt, 0) * 100) / 100;

    if (valid.length === 0) {
      console.log("[payout] claimHost skip: no valid rows", { hostId });
      return null;
    }
    if (total < MIN_PAYOUT_USDT) {
      console.log("[payout] claimHost skip: below minimum", {
        hostId,
        total,
        MIN_PAYOUT_USDT,
      });
      return null;
    }

    const batchId = `batch_${Date.now()}`;
    for (const r of valid) {
      await ctx.db.patch(r._id, { status: "processing", batchId });
    }
    console.log("[payout] claimHost claimed", {
      hostId,
      batchId,
      total,
      rows: valid.length,
    });
    return {
      batchId,
      address: host.payoutAccountRef,
      total,
      ids: valid.map((r) => r._id),
    };
  },
});

export const finishBatch = internalMutation({
  args: {
    ids: v.array(v.id("hostPayouts")),
    ok: v.boolean(),
    plisioOpId: v.optional(v.string()),
    txUrl: v.optional(v.string()),
    error: v.optional(v.string()),
  },
  handler: async (ctx, a) => {
    for (const id of a.ids) {
      if (a.ok) {
        await ctx.db.patch(id, {
          status: "sent",
          sentAt: Date.now(),
          plisioOpId: a.plisioOpId,
          txUrl: a.txUrl,
        });
      } else {
        await ctx.db.patch(id, { status: "failed", error: a.error });
      }
    }
    console.log("[payout] finishBatch", {
      rows: a.ids.length,
      ok: a.ok,
      plisioOpId: a.plisioOpId,
      error: a.error,
    });
  },
});

export const processDue = internalAction({
  args: {},
  handler: async (ctx): Promise<void> => {
    console.log("[payout] processDue start");
    const hostIds: Id<"hosts">[] = await ctx.runQuery(
      internal.payoutQueue.listDueHosts,
      { now: Date.now() },
    );
    for (const hostId of hostIds) {
      const claim = await ctx.runMutation(internal.payoutQueue.claimHost, {
        hostId,
        now: Date.now(),
      });
      if (!claim) continue;

      console.log("[payout] sending", {
        batchId: claim.batchId,
        address: maskAddress(claim.address),
        total: claim.total,
      });
      try {
        const res = await withdraw(claim.address, claim.total);
        console.log("[payout] plisio success", {
          batchId: claim.batchId,
          opId: res.id,
          txUrl: res.txUrl,
        });
        await ctx.runMutation(internal.payoutQueue.finishBatch, {
          ids: claim.ids,
          ok: true,
          plisioOpId: res.id,
          txUrl: res.txUrl,
        });
      } catch (e) {
        // A failed batch is NEVER retried automatically: if the network dropped after
        // Plisio sent the money, retrying would pay her twice. Check Plisio →
        // Transactions first, then run payoutQueue:retryFailed from the dashboard.
        const message = e instanceof Error ? e.message : String(e);
        console.error("[payout] plisio FAILED", {
          batchId: claim.batchId,
          error: message,
        });
        await ctx.runMutation(internal.payoutQueue.finishBatch, {
          ids: claim.ids,
          ok: false,
          error: message,
        });
      }
    }
    console.log("[payout] processDue done", { hostsProcessed: hostIds.length });
  },
});

// Run from the Convex dashboard after you have checked Plisio and fixed the cause
// (for example topped up the USDT balance). Puts failed rows back in the queue.
export const retryFailed = internalMutation({
  args: {},
  handler: async (ctx): Promise<number> => {
    const rows = await ctx.db
      .query("hostPayouts")
      .withIndex("by_status_release", (q) => q.eq("status", "failed"))
      .collect();
    for (const r of rows) {
      await ctx.db.patch(r._id, {
        status: "pending",
        error: undefined,
        batchId: undefined,
      });
    }
    console.log("[payout] retryFailed requeued", { rows: rows.length });
    return rows.length;
  },
});

// For the host dashboard: what is waiting and what was sent.
export const myPayouts = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireCurrentUser(ctx);
    const host = await ctx.db
      .query("hosts")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .unique();
    if (!host) return { waitingUsdt: 0, sentUsdt: 0, recent: [] };

    const rows = await ctx.db
      .query("hostPayouts")
      .withIndex("by_host", (q) => q.eq("hostId", host._id))
      .order("desc")
      .take(100);

    const sum = (pred: (s: string) => boolean) =>
      Math.round(
        rows
          .filter((r) => pred(r.status))
          .reduce((s, r) => s + r.amountUsdt, 0) * 100,
      ) / 100;

    return {
      waitingUsdt: sum(
        (s) => s === "pending" || s === "processing" || s === "failed",
      ),
      sentUsdt: sum((s) => s === "sent"),
      recent: rows.slice(0, 20).map((r) => ({
        amountUsdt: r.amountUsdt,
        status: r.status,
        releaseAt: r.releaseAt,
        sentAt: r.sentAt ?? null,
        txUrl: r.txUrl ?? null,
      })),
    };
  },
});
