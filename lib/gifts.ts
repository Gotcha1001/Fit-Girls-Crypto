// lib/gifts.ts
// Shared by the browser (gift UI) and Convex (validation + pricing).

export interface GiftDefinition {
  id: string;
  name: string;
  emoji: string;
  coinCost: number;
}

// Static catalog — no table needed since these never change per-user.
export const GIFT_CATALOG: GiftDefinition[] = [
  { id: "rose", name: "Rose", emoji: "🌹", coinCost: 10 },
  { id: "chocolate", name: "Chocolates", emoji: "🍫", coinCost: 15 },
  { id: "coffee", name: "Coffee", emoji: "☕", coinCost: 8 },
  { id: "champagne", name: "Champagne", emoji: "🍾", coinCost: 40 },
  { id: "ring", name: "Ring", emoji: "💍", coinCost: 150 },
  { id: "heart", name: "Heart", emoji: "❤️", coinCost: 5 },
];

export function findGiftById(giftId: string): GiftDefinition | undefined {
  return GIFT_CATALOG.find((g) => g.id === giftId);
}
