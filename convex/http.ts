import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { verifyCallback } from "./lib/plisio";

const http = httpRouter();

const ok = () => new Response("ok", { status: 200 });

// Plisio allows a small underpayment (0.1% in your settings). Accept up to 1% off.
function amountOk(paidCents: number, expectedCents: number): boolean {
  return Math.abs(paidCents - expectedCents) <= Math.max(1, expectedCents * 0.01);
}

http.route({
  path: "/plisio-webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    let data: Record<string, unknown>;
    try {
      data = JSON.parse(await request.text());
    } catch {
      return new Response("Bad JSON", { status: 400 });
    }

    // 1. Is this really from Plisio?
    const genuine = await verifyCallback(data, process.env.PLISIO_SECRET_KEY!);
    if (!genuine) return new Response("Invalid signature", { status: 401 });

    const status = String(data.status ?? "");
    const reference = String(data.order_name ?? ""); // our "bk_…" / "ph_…" / "tk_…"
    const txnId = String(data.txn_id ?? "");

    // 2. Only "completed" means paid in full. Everything else: acknowledge and wait.
    if (status !== "completed") {
      // Money arrived but the invoice expired short: log it so you can sort it out by hand.
      if (status === "expired" && Number(data.amount) > 0) {
        await ctx.runMutation(internal.tokens.logFailedPayment, {
          paymentId: reference || txnId,
          status: "PARTIAL_EXPIRED",
          amount: Number(data.source_amount) || 0,
          reason: `Invoice expired after a partial payment (${data.amount} ${data.currency}). Plisio txn ${txnId}`,
        });
      }
      return ok();
    }

    const sourceCurrency = String(data.source_currency ?? "");
    const paidCents = Math.round(Number(data.source_amount) * 100);
    // USDT actually received after Plisio's commission. Hosts' 80% is worked out from this.
    const cryptoNet = Number(data.invoice_sum ?? data.amount);

    if (!reference || !Number.isFinite(paidCents) || !Number.isFinite(cryptoNet)) {
      return ok(); // nothing we can match; never make Plisio retry forever
    }

    // 3a. Token purchases are tagged "tk_<purchaseId>"
    if (reference.startsWith("tk_")) {
      const purchaseId = reference.slice(3) as Id<"tokenPurchases">;
      const purchase = await ctx.runQuery(internal.tokens.getForPaymentInternal, {
        purchaseId,
      });
      if (!purchase) {
        await ctx.runMutation(internal.tokens.logFailedPayment, {
          paymentId: reference,
          status: "NOT_FOUND",
          amount: paidCents / 100,
          reason: "Purchase not found",
        });
        return ok();
      }
      if (sourceCurrency !== "ZAR" || !amountOk(paidCents, purchase.priceCents)) {
        await ctx.runMutation(internal.tokens.logFailedPayment, {
          paymentId: reference,
          purchaseId,
          status: "AMOUNT_MISMATCH",
          amount: paidCents / 100,
          reason: `Expected ${purchase.priceCents} ZAR cents, got ${paidCents} ${sourceCurrency}`,
        });
        return ok();
      }
      await ctx.runMutation(internal.tokens.markPaidFromWebhook, {
        purchaseId,
        paystackReference: txnId, // field name kept so nothing else changes; it now holds the Plisio txn id
      });
      return ok();
    }

    // 3b. Everything else (bookings "bk_", secret photos "ph_")
    await ctx.runMutation(internal.payments.markSucceeded, {
      reference,
      amountCents: paidCents,
      currency: sourceCurrency,
      txnId,
      cryptoNet,
    });
    return ok();
  }),
});

export default http;
