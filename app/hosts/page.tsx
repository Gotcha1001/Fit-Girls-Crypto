"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "convex/react";
import { Search, X } from "lucide-react";

import { api } from "@/convex/_generated/api";
import { currencyForCountry, toMinor } from "@/convex/lib/currency";
import { COUNTRIES } from "@/convex/lib/timezones";
import { HostCard } from "@/app/components/HostCard";
import { useMoney } from "@/hooks/useMoney";

type SortKey = "top" | "reviewed" | "name" | "priceLow" | "priceHigh";

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "top", label: "Top rated" },
  { value: "reviewed", label: "Most rated" },
  { value: "priceLow", label: "Price: low to high" },
  { value: "priceHigh", label: "Price: high to low" },
  { value: "name", label: "Name A–Z" },
];

const MIN_RATING_OPTIONS = [
  { value: 0, label: "Any rating" },
  { value: 5, label: "5+ out of 10" },
  { value: 7, label: "7+ out of 10" },
  { value: 8, label: "8+ out of 10" },
  { value: 9, label: "9+ out of 10" },
];

const COUNTRY_NAME = new Map(COUNTRIES.map((c) => [c.code, c.name]));

const controlClass =
  "rounded-lg border border-rose-500/40 bg-zinc-900/60 px-3 py-2 text-sm text-white outline-none focus:border-rose-500";

// ── URL <-> filter state. Anything invalid in the URL falls back to default. ──
function readSort(v: string | null): SortKey {
  return SORT_OPTIONS.some((o) => o.value === v) ? (v as SortKey) : "top";
}
function readMinRating(v: string | null): number {
  const n = Number(v);
  return MIN_RATING_OPTIONS.some((o) => o.value === n) ? n : 0;
}
function readMaxPrice(v: string | null): string {
  const n = Number(v);
  return v !== null && Number.isFinite(n) && n > 0 ? v : "";
}

function HostsList() {
  const hosts = useQuery(api.hosts.listApproved);
  const { toViewer, viewerCurrency, ready } = useMoney();

  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  // Seeded once from the URL (so a shared/bookmarked link restores the search)
  const [search, setSearch] = useState(() => params.get("q") ?? "");
  const [country, setCountry] = useState(() => params.get("country") ?? "");
  const [minRating, setMinRating] = useState(() =>
    readMinRating(params.get("rating")),
  );
  const [maxPrice, setMaxPrice] = useState(() =>
    readMaxPrice(params.get("maxprice")),
  ); // per minute, in the viewer's currency (whole units, e.g. "2.50")
  const [sort, setSort] = useState<SortKey>(() => readSort(params.get("sort")));

  // Keep the address bar in step with the filters (no history entry per tweak)
  useEffect(() => {
    const qs = new URLSearchParams();
    if (search.trim()) qs.set("q", search.trim());
    if (country) qs.set("country", country);
    if (minRating > 0) qs.set("rating", String(minRating));
    if (maxPrice) qs.set("maxprice", maxPrice);
    if (sort !== "top") qs.set("sort", sort);
    const next = qs.toString();
    if (next === params.toString()) return;
    router.replace(next ? `${pathname}?${next}` : pathname, { scroll: false });
  }, [search, country, minRating, maxPrice, sort, params, pathname, router]);

  // Only offer countries that actually have a girl listed.
  const countries = useMemo(() => {
    const codes = new Set<string>();
    for (const h of hosts ?? []) if (h.country) codes.add(h.country);
    return [...codes]
      .map((code) => ({ code, name: COUNTRY_NAME.get(code) ?? code }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [hosts]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    const maxMinor = maxPrice ? toMinor(maxPrice, viewerCurrency) : null;

    // Her rate is in HER currency: compare everyone in the viewer's.
    const priceOf = (h: NonNullable<typeof hosts>[number]): number =>
      toViewer(h.ratePerMinuteCents, currencyForCountry(h.country));

    const list = (hosts ?? []).filter((h) => {
      if (q && !h.displayName.toLowerCase().includes(q)) return false;
      if (country && h.country !== country) return false;
      // Unrated girls have no score, so a minimum rating hides them.
      if (minRating > 0 && (h.rating.average ?? 0) < minRating) return false;
      if (maxMinor !== null && ready && priceOf(h) > maxMinor) return false;
      return true;
    });

    return list.sort((a, b) => {
      switch (sort) {
        case "name":
          return a.displayName.localeCompare(b.displayName);
        case "priceLow":
          return priceOf(a) - priceOf(b);
        case "priceHigh":
          return priceOf(b) - priceOf(a);
        case "reviewed":
          return (
            b.rating.count - a.rating.count ||
            (b.rating.average ?? 0) - (a.rating.average ?? 0)
          );
        default: {
          // "top": highest average first, unrated last, ties by # of ratings
          const diff = (b.rating.average ?? -1) - (a.rating.average ?? -1);
          return diff || b.rating.count - a.rating.count;
        }
      }
    });
  }, [
    hosts,
    search,
    country,
    minRating,
    maxPrice,
    sort,
    viewerCurrency,
    ready,
    toViewer,
  ]);

  if (hosts === undefined) return <p className="p-8">Loading…</p>;
  if (hosts.length === 0) return <p className="p-8">No hosts available yet.</p>;

  const filtering =
    search !== "" || country !== "" || minRating > 0 || maxPrice !== "";

  function clearFilters(): void {
    setSearch("");
    setCountry("");
    setMinRating(0);
    setMaxPrice("");
  }

  return (
    <main className="mx-auto max-w-6xl p-6">
      <h1 className="mb-6 text-3xl font-bold">Book a video call</h1>

      {/* Search + filters */}
      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="relative sm:col-span-2 lg:col-span-4">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500"
            aria-hidden
          />
          <input
            type="search"
            value={search}
            onChange={(e): void => setSearch(e.target.value)}
            placeholder="Search by online name"
            aria-label="Search by online name"
            className={`${controlClass} w-full pl-9`}
          />
        </div>

        <select
          value={country}
          onChange={(e): void => setCountry(e.target.value)}
          aria-label="Filter by country"
          className={controlClass}
        >
          <option value="">All countries</option>
          {countries.map((c) => (
            <option key={c.code} value={c.code}>
              {c.name}
            </option>
          ))}
        </select>

        <select
          value={minRating}
          onChange={(e): void => setMinRating(Number(e.target.value))}
          aria-label="Minimum rating"
          className={controlClass}
        >
          {MIN_RATING_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>

        <label className="relative block">
          <span className="sr-only">
            Maximum price per minute in {viewerCurrency}
          </span>
          <input
            type="number"
            inputMode="decimal"
            min="0"
            step="any"
            value={maxPrice}
            onChange={(e): void => setMaxPrice(readMaxPrice(e.target.value))}
            placeholder="Max price / min"
            className={`${controlClass} w-full pr-14`}
          />
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-neutral-500">
            {viewerCurrency}
          </span>
        </label>

        <select
          value={sort}
          onChange={(e): void => setSort(e.target.value as SortKey)}
          aria-label="Sort by"
          className={controlClass}
        >
          {SORT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      <div className="mb-4 flex items-center justify-between text-sm text-neutral-400">
        <p>
          {visible.length} {visible.length === 1 ? "girl" : "girls"}
          {filtering && ` of ${hosts.length}`}
        </p>
        {filtering && (
          <button
            type="button"
            onClick={clearFilters}
            className="inline-flex items-center gap-1 text-rose-300 underline hover:text-rose-200"
          >
            <X className="h-3.5 w-3.5" aria-hidden />
            Clear filters
          </button>
        )}
      </div>

      {visible.length === 0 ? (
        <p className="py-12 text-center text-neutral-400">
          No one matches those filters.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {visible.map((h) => (
            <HostCard
              key={h._id}
              // Convex returns null for "no photo"; HostCard expects undefined
              host={{ ...h, avatarUrl: h.avatarUrl ?? undefined }}
            />
          ))}
        </div>
      )}
    </main>
  );
}

// useSearchParams needs a Suspense boundary for Next's production build.
export default function HostsPage() {
  return (
    <Suspense fallback={<p className="p-8">Loading…</p>}>
      <HostsList />
    </Suspense>
  );
}
