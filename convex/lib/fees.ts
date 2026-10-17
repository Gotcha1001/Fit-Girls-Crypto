// convex/lib/fees.ts
export const PLATFORM_PCT = 20;
export function split(amountCents: number) {
  const platformFeeCents = Math.round((amountCents * PLATFORM_PCT) / 100);
  return { platformFeeCents, hostShareCents: amountCents - platformFeeCents };
}
