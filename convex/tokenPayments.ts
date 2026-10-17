import { v } from "convex/values";
import { action } from "./_generated/server";
import { api } from "./_generated/api";
import { createInvoice } from "./lib/plisio";

export const initialize = action({
  args: { packageId: v.string(), siteUrl: v.string() },
  handler: async (ctx, { packageId, siteUrl }): Promise<{ url: string }> => {
    const purchase = await ctx.runMutation(api.tokens.createPurchase, { packageId });

    const invoice = await createInvoice({
      orderName: `tk_${purchase.purchaseId}`, // the webhook finds the purchase from this
      amountCents: purchase.priceCents,
      currency: "ZAR",
      email: purchase.email,
      description: "Tokens",
      successUrl: `${siteUrl}/tokens/${purchase.purchaseId}/success`,
      failUrl: `${siteUrl}/tokens`,
    });
    return { url: invoice.invoiceUrl };
  },
});
