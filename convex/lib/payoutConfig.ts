// convex/lib/payoutConfig.ts  (NEW FILE)
//
// ONE place for the payout threshold. Both the payout cron (payoutQueue.ts)
// and the Earnings page read it from here, so they can never disagree.
//
// To change it WITHOUT redeploying: Convex dashboard -> Settings -> Environment
// Variables -> add MIN_PAYOUT_USDT = 25 (any number). Takes effect on the next
// cron run (every 15 min) and the Earnings page updates live.
// If the variable is missing or not a positive number, the default below is used.

export const DEFAULT_MIN_PAYOUT_USDT = 10; // same value you have today

export function getMinPayoutUsdt(): number {
  const raw = Number(process.env.MIN_PAYOUT_USDT);
  return Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_MIN_PAYOUT_USDT;
}
