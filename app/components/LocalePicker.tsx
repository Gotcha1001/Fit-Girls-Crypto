"use client";

import { useEffect, useState } from "react";
import { getCountriesForTimezone } from "countries-and-timezones";
import { tzLabel } from "@/convex/lib/schedule";
import {
  allZones,
  browserZone,
  COUNTRIES,
  zonesForCountry,
} from "@/convex/lib/timezones";

export type Locale = { country: string; timezone: string };

const sel =
  "w-full rounded-lg border border-white/10 bg-neutral-900 p-2 text-sm";

export function LocalePicker({
  onChange,
  initial,
}: {
  /** Fires with a complete locale, or null while incomplete. */
  onChange: (v: Locale | null) => void;
  /** Start from this value instead of guessing from the browser. */
  initial?: Locale | null;
}) {
  const [country, setCountry] = useState("");
  const [timezone, setTimezone] = useState("");
  const [showAll, setShowAll] = useState(false);

  function commit(c: string, tz: string) {
    setCountry(c);
    setTimezone(tz);
    onChange(c && tz ? { country: c, timezone: tz } : null);
  }

  // Pre-fill once: from `initial` if given, otherwise from the browser.
  useEffect(() => {
    if (initial) {
      setShowAll(!zonesForCountry(initial.country).includes(initial.timezone));
      commit(initial.country, initial.timezone);
      return;
    }
    const tz = browserZone();
    const guess = getCountriesForTimezone(tz)[0]?.id;
    if (guess && COUNTRIES.some((c) => c.code === guess)) commit(guess, tz);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function pickCountry(code: string) {
    const zones = zonesForCountry(code);
    const browser = browserZone();
    const tz =
      zones.length === 1 ? zones[0] : zones.includes(browser) ? browser : "";
    commit(code, tz);
  }

  const now = Date.now();
  const zones = showAll ? allZones() : country ? zonesForCountry(country) : [];

  return (
    <div className="space-y-3">
      <label className="block space-y-1">
        <span className="text-sm text-neutral-300">Country</span>
        <select
          className={sel}
          value={country}
          onChange={(e) => pickCountry(e.target.value)}
        >
          <option value="">Select your country…</option>
          {COUNTRIES.map((c) => (
            <option key={c.code} value={c.code}>
              {c.name}
            </option>
          ))}
        </select>
      </label>

      <label className="block space-y-1">
        <span className="text-sm text-neutral-300">Time zone</span>
        <select
          className={sel}
          value={timezone}
          disabled={!country && !showAll}
          onChange={(e) => commit(country, e.target.value)}
        >
          <option value="">Select your time zone…</option>
          {zones.map((z) => (
            <option key={z} value={z}>
              {tzLabel(z, now)}
            </option>
          ))}
        </select>
      </label>

      <button
        type="button"
        onClick={() => setShowAll((s) => !s)}
        className="text-xs text-neutral-400 underline"
      >
        {showAll
          ? "Only show zones for my country"
          : "Show all time zones (I live abroad)"}
      </button>
    </div>
  );
}
