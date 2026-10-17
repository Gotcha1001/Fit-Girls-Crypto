// convex/lib/currency.ts
//
// ONE place for everything about money across countries. Used by both the
// server (convex/*) and the browser (hooks/useMoney.ts).
//
// How it works
//  - A girl's COUNTRY decides her currency. She sets her call + photo prices in
//    it. They are stored as minor units (cents) of that currency.
//  - A client's COUNTRY decides the currency he SEES. Her price is converted
//    with live exchange rates and shown in his currency.
//  - The payment gateway is a separate step. Paystack is only used for testing
//    and can only charge in a few currencies, so whatever the client sees is
//    converted to CHARGE_CURRENCY when the order is created. When you move to a
//    gateway that charges in any currency, change CHARGE_CURRENCY (or pick it
//    per client) here and nothing else needs to change.
//
// Rates are "units of currency per 1 USD", e.g. { USD: 1, ZAR: 17.5, EUR: 0.92 }.

/** What the payment gateway actually charges in (Paystack test mode = rand). */
export const CHARGE_CURRENCY = "ZAR";

/** Used for old accounts that never picked a country (they were all rand). */
export const LEGACY_COUNTRY = "ZA";

/** ISO 3166 country -> ISO 4217 currency. */
export const COUNTRY_CURRENCY: Record<string, string> = {
  AD: "EUR",
  AE: "AED",
  AF: "AFN",
  AG: "XCD",
  AI: "XCD",
  AL: "ALL",
  AM: "AMD",
  AO: "AOA",
  AR: "ARS",
  AS: "USD",
  AT: "EUR",
  AU: "AUD",
  AW: "AWG",
  AX: "EUR",
  AZ: "AZN",
  BA: "BAM",
  BB: "BBD",
  BD: "BDT",
  BE: "EUR",
  BF: "XOF",
  BG: "EUR",
  BH: "BHD",
  BI: "BIF",
  BJ: "XOF",
  BL: "EUR",
  BM: "BMD",
  BN: "BND",
  BO: "BOB",
  BQ: "USD",
  BR: "BRL",
  BS: "BSD",
  BT: "BTN",
  BV: "NOK",
  BW: "BWP",
  BY: "BYN",
  BZ: "BZD",
  CA: "CAD",
  CC: "AUD",
  CD: "CDF",
  CF: "XAF",
  CG: "XAF",
  CH: "CHF",
  CI: "XOF",
  CK: "NZD",
  CL: "CLP",
  CM: "XAF",
  CN: "CNY",
  CO: "COP",
  CR: "CRC",
  CU: "CUP",
  CV: "CVE",
  CW: "ANG",
  CX: "AUD",
  CY: "EUR",
  CZ: "CZK",
  DE: "EUR",
  DJ: "DJF",
  DK: "DKK",
  DM: "XCD",
  DO: "DOP",
  DZ: "DZD",
  EC: "USD",
  EE: "EUR",
  EG: "EGP",
  EH: "MAD",
  ER: "ERN",
  ES: "EUR",
  ET: "ETB",
  FI: "EUR",
  FJ: "FJD",
  FK: "FKP",
  FM: "USD",
  FO: "DKK",
  FR: "EUR",
  GA: "XAF",
  GB: "GBP",
  GD: "XCD",
  GE: "GEL",
  GF: "EUR",
  GG: "GBP",
  GH: "GHS",
  GI: "GIP",
  GL: "DKK",
  GM: "GMD",
  GN: "GNF",
  GP: "EUR",
  GQ: "XAF",
  GR: "EUR",
  GT: "GTQ",
  GU: "USD",
  GW: "XOF",
  GY: "GYD",
  HK: "HKD",
  HM: "AUD",
  HN: "HNL",
  HR: "EUR",
  HT: "HTG",
  HU: "HUF",
  ID: "IDR",
  IE: "EUR",
  IL: "ILS",
  IM: "GBP",
  IN: "INR",
  IO: "USD",
  IQ: "IQD",
  IR: "IRR",
  IS: "ISK",
  IT: "EUR",
  JE: "GBP",
  JM: "JMD",
  JO: "JOD",
  JP: "JPY",
  KE: "KES",
  KG: "KGS",
  KH: "KHR",
  KI: "AUD",
  KM: "KMF",
  KN: "XCD",
  KP: "KPW",
  KR: "KRW",
  KW: "KWD",
  KY: "KYD",
  KZ: "KZT",
  LA: "LAK",
  LB: "LBP",
  LC: "XCD",
  LI: "CHF",
  LK: "LKR",
  LR: "LRD",
  LS: "LSL",
  LT: "EUR",
  LU: "EUR",
  LV: "EUR",
  LY: "LYD",
  MA: "MAD",
  MC: "EUR",
  MD: "MDL",
  ME: "EUR",
  MF: "EUR",
  MG: "MGA",
  MH: "USD",
  MK: "MKD",
  ML: "XOF",
  MM: "MMK",
  MN: "MNT",
  MO: "MOP",
  MP: "USD",
  MQ: "EUR",
  MR: "MRU",
  MS: "XCD",
  MT: "EUR",
  MU: "MUR",
  MV: "MVR",
  MW: "MWK",
  MX: "MXN",
  MY: "MYR",
  MZ: "MZN",
  NA: "NAD",
  NC: "XPF",
  NE: "XOF",
  NF: "AUD",
  NG: "NGN",
  NI: "NIO",
  NL: "EUR",
  NO: "NOK",
  NP: "NPR",
  NR: "AUD",
  NU: "NZD",
  NZ: "NZD",
  OM: "OMR",
  PA: "PAB",
  PE: "PEN",
  PF: "XPF",
  PG: "PGK",
  PH: "PHP",
  PK: "PKR",
  PL: "PLN",
  PM: "EUR",
  PN: "NZD",
  PR: "USD",
  PS: "ILS",
  PT: "EUR",
  PW: "USD",
  PY: "PYG",
  QA: "QAR",
  RE: "EUR",
  RO: "RON",
  RS: "RSD",
  RU: "RUB",
  RW: "RWF",
  SA: "SAR",
  SB: "SBD",
  SC: "SCR",
  SD: "SDG",
  SE: "SEK",
  SG: "SGD",
  SH: "SHP",
  SI: "EUR",
  SJ: "NOK",
  SK: "EUR",
  SL: "SLE",
  SM: "EUR",
  SN: "XOF",
  SO: "SOS",
  SR: "SRD",
  SS: "SSP",
  ST: "STN",
  SV: "USD",
  SX: "ANG",
  SY: "SYP",
  SZ: "SZL",
  TC: "USD",
  TD: "XAF",
  TF: "EUR",
  TG: "XOF",
  TH: "THB",
  TJ: "TJS",
  TK: "NZD",
  TL: "USD",
  TM: "TMT",
  TN: "TND",
  TO: "TOP",
  TR: "TRY",
  TT: "TTD",
  TV: "AUD",
  TW: "TWD",
  TZ: "TZS",
  UA: "UAH",
  UG: "UGX",
  UM: "USD",
  US: "USD",
  UY: "UYU",
  UZ: "UZS",
  VA: "EUR",
  VC: "XCD",
  VE: "VES",
  VG: "USD",
  VI: "USD",
  VN: "VND",
  VU: "VUV",
  WF: "XPF",
  WS: "WST",
  XK: "EUR",
  YE: "YER",
  YT: "EUR",
  ZA: "ZAR",
  ZM: "ZMW",
  ZW: "USD",
};

export type Rates = Record<string, number>;

/**
 * Approximate rates, ONLY used until the first live refresh (convex/fx.ts)
 * has run, or if the rate service is down. Real rates replace them.
 */
export const FALLBACK_RATES: Rates = {
  USD: 1,
  ZAR: 17.5,
  EUR: 0.92,
  GBP: 0.78,
  AUD: 1.5,
  CAD: 1.37,
  NZD: 1.65,
  SGD: 1.3,
  JPY: 150,
  CNY: 7.2,
  INR: 84,
  PHP: 57,
  THB: 35,
  MYR: 4.4,
  IDR: 15800,
  KRW: 1350,
  HKD: 7.8,
  TWD: 32,
  VND: 25000,
  AED: 3.67,
  SAR: 3.75,
  QAR: 3.64,
  KWD: 0.31,
  ILS: 3.7,
  TRY: 34,
  EGP: 49,
  NGN: 1500,
  GHS: 15,
  KES: 129,
  UGX: 3700,
  TZS: 2700,
  ZMW: 27,
  BWP: 13.5,
  NAD: 17.5,
  MUR: 46,
  BRL: 5.5,
  MXN: 19,
  ARS: 950,
  CLP: 950,
  COP: 4100,
  PEN: 3.8,
  CHF: 0.88,
  SEK: 10.5,
  NOK: 10.8,
  DKK: 6.9,
  PLN: 4,
  CZK: 23,
  HUF: 360,
  RON: 4.6,
  UAH: 41,
  RUB: 92,
  PKR: 278,
  BDT: 120,
  LKR: 300,
  MAD: 10,
};

/** Number of decimal places the currency uses (2 for USD, 0 for JPY, 3 for KWD). */
export function minorDigits(currency: string): number {
  try {
    return (
      new Intl.NumberFormat("en", {
        style: "currency",
        currency,
      }).resolvedOptions().maximumFractionDigits ?? 2
    );
  } catch {
    return 2;
  }
}

/** The currency for a country. Falls back to USD when we have no live rate for it. */
export function currencyForCountry(
  country: string | null | undefined,
  rates: Rates = FALLBACK_RATES,
): string {
  const code = (country ?? LEGACY_COUNTRY).trim().toUpperCase();
  const currency = COUNTRY_CURRENCY[code] ?? "USD";
  return rates[currency] ? currency : "USD";
}

/** Converts an amount in minor units from one currency to another. */
export function convertMinor(
  minor: number,
  from: string,
  to: string,
  rates: Rates,
): number {
  if (from === to) return minor;
  const rFrom = rates[from];
  const rTo = rates[to];
  if (!rFrom || !rTo)
    throw new Error(`No exchange rate for ${!rFrom ? from : to}`);
  const major = minor / 10 ** minorDigits(from);
  const target = (major / rFrom) * rTo;
  return Math.round(target * 10 ** minorDigits(to));
}

/** 1234 + "USD" -> "$12.34". The locale picks separators; the currency picks the symbol. */
export function formatMoney(
  minor: number,
  currency: string,
  locale?: string,
): string {
  const amount = minor / 10 ** minorDigits(currency);
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
    }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
}

/** "USD" -> "$", "ZAR" -> "R", "PHP" -> "₱". */
export function currencySymbol(currency: string, locale?: string): string {
  try {
    const part = new Intl.NumberFormat(locale, { style: "currency", currency })
      .formatToParts(0)
      .find((p) => p.type === "currency");
    return part?.value ?? currency;
  } catch {
    return currency;
  }
}

/** "12.5" typed in an input -> minor units (1250). */
export function toMinor(major: string | number, currency: string): number {
  return Math.round(Number(major) * 10 ** minorDigits(currency));
}

/** Minor units -> the number to show in an input (1250 -> "12.5"). */
export function fromMinor(minor: number, currency: string): string {
  return String(minor / 10 ** minorDigits(currency));
}

// ── price limits ───────────────────────────────────────────────────────────
// The limits are defined once, in rand (CHARGE_CURRENCY), and converted to
//Plisio converts this to USDT
// each girl's currency, so R5 to R100 a minute becomes roughly $0.30 to $5.70
// for a girl paid in dollars.

export type Limits = { min: number; max: number };

function niceMinor(minor: number, currency: string): number {
  const digits = minorDigits(currency);
  const major = Number((minor / 10 ** digits).toPrecision(2)); // 2 significant digits
  return Math.max(1, Math.round(major * 10 ** digits));
}

export function limitsFor(
  baseMin: number,
  baseMax: number,
  currency: string,
  rates: Rates,
): Limits {
  if (currency === CHARGE_CURRENCY) return { min: baseMin, max: baseMax };
  return {
    min: niceMinor(
      convertMinor(baseMin, CHARGE_CURRENCY, currency, rates),
      currency,
    ),
    max: niceMinor(
      convertMinor(baseMax, CHARGE_CURRENCY, currency, rates),
      currency,
    ),
  };
}

/**
 * Server-side check. Allows 15% either way, because the browser and the
 * server may be using rates a few hours apart.
 */
export function withinLimits(minor: number, limits: Limits): boolean {
  return (
    Number.isInteger(minor) &&
    minor >= Math.floor(limits.min * 0.85) &&
    minor <= Math.ceil(limits.max * 1.15)
  );
}
