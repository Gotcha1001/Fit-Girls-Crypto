// convex/fx.ts
//
// Keeps exchange rates fresh. A cron (convex/crons.ts) runs `refresh` every
// 12 hours; it fetches rates (base USD) and saves them in the fxRates table.
// Everything else reads them through lib/fxRates.ts (server) or getRates (browser).
//
// Source: open.er-api.com (free, no key; asks for a "Rates By Exchange Rate API"
// credit link). Swap the URL here for a paid provider whenever you like.
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { internalAction, internalMutation, query } from "./_generated/server";
import { FALLBACK_RATES } from "./lib/currency";

// Public: the browser needs the rates to show prices in the viewer's currency.
export const getRates = query({
  args: {},
  handler: async (ctx) => {
    const row = await ctx.db.query("fxRates").first();
    return {
      rates: row?.rates ?? FALLBACK_RATES,
      updatedAt: row?.updatedAt ?? null,
      live: row !== null,
    };
  },
});

export const saveRates = internalMutation({
  args: { rates: v.record(v.string(), v.number()) },
  handler: async (ctx, { rates }) => {
    for (const old of await ctx.db.query("fxRates").collect()) {
      await ctx.db.delete(old._id);
    }
    await ctx.db.insert("fxRates", {
      base: "USD",
      rates,
      updatedAt: Date.now(),
    });
  },
});

export const refresh = internalAction({
  args: {},
  handler: async (ctx): Promise<void> => {
    try {
      const res = await fetch("https://open.er-api.com/v6/latest/USD");
      if (!res.ok) throw new Error(`Rate service answered ${res.status}`);
      const json = (await res.json()) as {
        result?: string;
        rates?: Record<string, number>;
      };
      if (json.result !== "success" || !json.rates) {
        throw new Error("Rate service returned no rates");
      }
      // Keep only sane numbers, so one bad value can't poison every price.
      const rates: Record<string, number> = {};
      for (const [code, rate] of Object.entries(json.rates)) {
        if (/^[A-Z]{3}$/.test(code) && Number.isFinite(rate) && rate > 0) {
          rates[code] = rate;
        }
      }
      if (rates.USD !== 1 || !rates.ZAR) throw new Error("Rates look wrong");
      await ctx.runMutation(internal.fx.saveRates, { rates });
    } catch (e) {
      // Keep the last good rates; try again at the next run.
      console.error("FX refresh failed:", e);
    }
  },
});
