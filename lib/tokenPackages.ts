// lib/tokenPackages.ts
//
// Shared by the browser (settings UI), the checkout API route and Convex.
// Pricing is ALWAYS looked up here on the server, never trusted from the client.
//
// Prices are whole cents (ZAR) so we never do float maths on money.
// Change the numbers freely, but keep the ids stable (they are stored on purchases).
//
// NOTE: the existing app stores the balance in `profiles.coins`. "Tokens" in the
// UI and "coins" in the database are the same thing, no data migration needed.

export interface TokenPackage {
  id: string;
  tokens: number;
  priceCents: number;
  /** Small ribbon shown on the card, e.g. "Best value". */
  badge?: string;
}

export const TOKEN_PACKAGES: readonly TokenPackage[] = [
  { id: "tokens_20", tokens: 20, priceCents: 3000 },
  { id: "tokens_60", tokens: 60, priceCents: 8000 },
  { id: "tokens_100", tokens: 100, priceCents: 12000, badge: "Popular" },
  { id: "tokens_200", tokens: 200, priceCents: 22000 },
  { id: "tokens_500", tokens: 500, priceCents: 50000, badge: "Best value" },
];

export function findTokenPackage(packageId: string): TokenPackage | undefined {
  return TOKEN_PACKAGES.find((p) => p.id === packageId);
}

/** 12000 -> "R120.00" */
export function formatRand(cents: number): string {
  return `R${(cents / 100).toFixed(2)}`;
}

/** PayFast wants a plain "120.00" string, no currency symbol. */
export function centsToPayfastAmount(cents: number): string {
  return (cents / 100).toFixed(2);
}
