// convex/secretPhotoPayments.ts
//
// Starts the Plisio checkout for a photo order. The host's 80% is queued as a
// payout by payments.markSucceeded once the payment lands.
import { v } from "convex/values";
import { action } from "./_generated/server";
import { internal } from "./_generated/api";
import { createInvoice } from "./lib/plisio";

export const initCheckout = action({
  args: { orderId: v.id("secretPhotoOrders") },
  handler: async (ctx, { orderId }): Promise<string> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not signed in");

    const o = await ctx.runQuery(internal.secretPhotos.getForCheckout, {
      orderId,
      clerkId: identity.subject,
    });

    const reference = `ph_${orderId}_${Date.now()}`;
    const photosPage = `${process.env.SITE_URL}/photos?order=${orderId}`;

    const invoice = await createInvoice({
      orderName: reference,
      amountCents: o.amountCents,
      currency: "ZAR",
      email: o.buyerEmail,
      description: "Photo order",
      successUrl: photosPage,
      failUrl: photosPage,
    });

    await ctx.runMutation(internal.secretPhotos.recordPayment, {
      providerReference: reference,
      orderId,
      hostId: o.hostId,
      payerId: o.payerId,
      amountCents: o.amountCents,
      platformFeeCents: o.platformFeeCents,
    });
    return invoice.invoiceUrl;
  },
});
