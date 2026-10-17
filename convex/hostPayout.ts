// convex/hostPayout.ts
//
// A girl saves her USDT (TRON / TRC-20) wallet address once. It is public
// information (not a secret like a bank login), but it is never sent back to
// the browser: only the last 4 characters are shown.
import { action } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { isValidTronAddress } from "./lib/tronAddress";

export const setupPayout = action({
  args: { walletAddress: v.string() },
  handler: async (ctx, { walletAddress }): Promise<void> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not signed in");

    const address = walletAddress.trim();
    if (!(await isValidTronAddress(address))) {
      throw new Error(
        "That is not a valid TRON (TRC-20) address. It starts with a T and is 34 characters long.",
      );
    }

    const host = await ctx.runQuery(internal.hosts.getHostForPayout, {
      clerkId: identity.subject,
    });
    if (!host) throw new Error("Save your profile first");
    if (host.hasPayout) {
      throw new Error("Payout wallet already set up. Contact support to change it.");
    }

    await ctx.runMutation(internal.hosts.savePayout, {
      hostId: host.hostId,
      payoutAccountRef: address,
      bankLast4: address.slice(-4), // field name kept; it now means "last 4 of wallet"
    });
  },
});
