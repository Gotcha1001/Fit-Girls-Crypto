// convex/lib/secretPhotoOrders.ts
//
// Shared by the Paystack webhook (payments.markSucceeded) when a secret-photo
// payment lands. Kept in lib/ so payments.ts can call it directly inside its
// own mutation, in the same transaction.
import type { Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";

/**
 * Splits `total` across `weights` in proportion, in whole cents, so the parts
 * always add up to exactly `total` (the last item takes the rounding leftover).
 */
export function allocate(total: number, weights: number[]): number[] {
  const sum = weights.reduce((a, b) => a + b, 0);
  if (sum <= 0) return weights.map(() => 0);
  let left = total;
  return weights.map((w, i) => {
    const part =
      i === weights.length - 1 ? left : Math.floor((total * w) / sum);
    left -= part;
    return part;
  });
}

/** Marks the order paid and unlocks its photos for the buyer. Idempotent. */
export async function fulfilSecretPhotoOrder(
  ctx: MutationCtx,
  orderId: Id<"secretPhotoOrders">,
  paymentId: Id<"payments">,
): Promise<void> {
  const order = await ctx.db.get(orderId);
  if (!order || order.status === "paid") return; // unknown, or webhook retried

  await ctx.db.patch(orderId, {
    status: "paid",
    paymentId,
    paidAt: Date.now(),
  });

  const weights = order.items.map((i) => i.priceCents);
  const amounts = allocate(order.amountCents, weights);
  const hostShares = allocate(order.hostShareCents, weights);

  for (let i = 0; i < order.items.length; i++) {
    const { photoId } = order.items[i];

    // Never create a second copy for the same buyer.
    const existing = await ctx.db
      .query("secretPhotoPurchases")
      .withIndex("by_photo_buyer", (q) =>
        q.eq("photoId", photoId).eq("buyerId", order.buyerId),
      )
      .first();
    if (existing) continue;

    await ctx.db.insert("secretPhotoPurchases", {
      photoId,
      buyerId: order.buyerId,
      hostId: order.hostId,
      orderId,
      amountCents: amounts[i],
      hostShareCents: hostShares[i],
      viaBundle: order.kind === "bundle",
      createdAt: Date.now(),
    });
  }
}
