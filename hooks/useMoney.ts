"use client";

// hooks/useMoney.ts
//
// Shows any price in the VIEWER's currency, picked from his country. A girl
// sees her own currency; a client sees his.
//
//   const { show } = useMoney();
//   show(5000, "ZAR")   // -> "$2.86" for a client whose country is the US
//
// Prices are stored in the currency they were set in (a girl's prices in HER
// currency, payments in CHARGE_CURRENCY), and `show` converts with live rates.
import { useMemo } from "react";
import { useQuery } from "convex/react";

import { api } from "@/convex/_generated/api";
import {
  convertMinor,
  currencyForCountry,
  formatMoney,
  type Rates,
} from "@/convex/lib/currency";

export function useMoney() {
  const me = useQuery(api.user.getMe);
  const fx = useQuery(api.fx.getRates);
  const rates: Rates | undefined = fx?.rates;

  return useMemo(() => {
    const viewerCurrency = currencyForCountry(me?.country, rates);

    return {
      /** The viewer's currency, e.g. "USD". */
      viewerCurrency,
      /** True once rates have loaded (before that, prices render blank). */
      ready: rates !== undefined && me !== undefined,
      /** `minor` is in `currency`; returns it written in the viewer's currency. */
      show: (minor: number, currency: string): string => {
        if (!rates || me === undefined) return "…";
        return formatMoney(
          convertMinor(minor, currency, viewerCurrency, rates),
          viewerCurrency,
        );
      },
      /** Same, but as a number of minor units (for maths). */
      toViewer: (minor: number, currency: string): number =>
        rates ? convertMinor(minor, currency, viewerCurrency, rates) : minor,
      /** Writes `minor` in its own currency, with no conversion. */
      own: (minor: number, currency: string): string =>
        formatMoney(minor, currency),
    };
  }, [me, rates]);
}
