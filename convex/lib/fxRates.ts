// convex/lib/fxRates.ts
import type { DatabaseReader } from "../_generated/server";
import { FALLBACK_RATES, type Rates } from "./currency";

/** The latest saved exchange rates (or the built-in approximations). */
export async function loadRates(ctx: { db: DatabaseReader }): Promise<Rates> {
  const row = await ctx.db.query("fxRates").first();
  return row?.rates ?? FALLBACK_RATES;
}
