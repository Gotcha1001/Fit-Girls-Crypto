import { ConvexError, v } from "convex/values";
import { action } from "./_generated/server";
import { api } from "./_generated/api";
import { createInvoice } from "./lib/plisio";

// Buy tokens with crypto (USDT on TRON) through a Plisio invoice.
//
// In production Convex hides the message of a plain `Error` from the browser
// (you just see "Server Error"). A ConvexError's message DOES reach the
// client, so every failure here is rethrown as one. The full detail is still
// logged to the Convex dashboard under Logs.
export const initialize = action({
  args: { packageId: v.string(), siteUrl: v.string() },
  handler: async (ctx, { packageId, siteUrl }): Promise<{ url: string }> => {
    let purchase;
    try {
      purchase = await ctx.runMutation(api.tokens.createPurchase, {
        packageId,
      });
    } catch (err) {
      console.error("[tokenPayments] createPurchase failed", err);
      throw new ConvexError(
        "Could not start your purchase. Please sign in again and retry.",
      );
    }

    try {
      const invoice = await createInvoice({
        orderName: `tk_${purchase.purchaseId}`, // the webhook finds the purchase from this
        amountCents: purchase.priceCents,
        currency: "ZAR",
        email: purchase.email || undefined,
        description: "Tokens",
        successUrl: `${siteUrl}/tokens/${purchase.purchaseId}/success`,
        failUrl: `${siteUrl}/tokens`,
      });
      return { url: invoice.invoiceUrl };
    } catch (err) {
      console.error("[tokenPayments] createInvoice failed", err);
      const msg = err instanceof Error ? err.message : "unknown error";
      throw new ConvexError(`Crypto checkout failed: ${msg}`);
    }
  },
});
