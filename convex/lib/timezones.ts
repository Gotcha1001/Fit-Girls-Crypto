// convex/lib/timezones.ts
import {
  getAllCountries,
  getAllTimezones,
  getCountry,
} from "countries-and-timezones";
import { ConvexError } from "convex/values";
import { isValidTimeZone } from "./schedule";

type RawCountry = { id: string; name: string; timezones: string[] };

export type CountryOption = { code: string; name: string; zones: string[] };

export const COUNTRIES: CountryOption[] = (
  Object.values(getAllCountries()) as RawCountry[]
)
  .map((c) => ({
    code: c.id,
    name: c.name,
    zones: c.timezones.filter(isValidTimeZone),
  }))
  .filter((c) => c.zones.length > 0)
  .sort((a, b) => a.name.localeCompare(b.name));

export function zonesForCountry(code: string): string[] {
  const c = getCountry(code) as RawCountry | null;
  return c ? c.timezones.filter(isValidTimeZone) : [];
}

export function isValidCountry(code: string) {
  return COUNTRIES.some((c) => c.code === code);
}

/** Full zone list. Browsers have Intl.supportedValuesOf; Convex's runtime
 *  doesn't, so fall back to the countries-and-timezones data. */
export function allZones(): string[] {
  const intl = Intl as unknown as {
    supportedValuesOf?: (key: string) => string[];
  };
  if (typeof intl.supportedValuesOf === "function") {
    try {
      return intl.supportedValuesOf("timeZone");
    } catch {
      /* fall through to the package data */
    }
  }
  return Object.values(getAllTimezones({ deprecated: false }))
    .map((z) => (z as { name: string }).name)
    .filter(isValidTimeZone)
    .sort();
}

export function browserZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

/** Validates both values and returns them normalised. Country and zone are
 *  checked independently on purpose: someone from ZA living in London is valid. */
export function validateLocale(
  country: string,
  timezone: string,
): { country: string; timezone: string } {
  const code = country.trim().toUpperCase();
  if (!isValidCountry(code)) {
    throw new ConvexError("Invalid country");
  }
  if (!isValidTimeZone(timezone)) {
    throw new ConvexError("Invalid time zone");
  }
  return { country: code, timezone };
}
