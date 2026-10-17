"use client";

import Link from "next/link";
import { formatTime } from "@/convex/lib/schedule";
import { currencyForCountry } from "@/convex/lib/currency";
import { useNow } from "@/hooks/useNow";
import { useMoney } from "@/hooks/useMoney";

type Props = {
  host: {
    _id: string;
    displayName: string;
    avatarUrl?: string;
    bio?: string | null;
    ratePerMinuteCents: number;
    minMinutes: number;
    country?: string | null;
    timezone?: string | null;
  };
};

/** "ZA" -> 🇿🇦 (regional-indicator letters). */
function flagOf(code: string): string {
  return code
    .toUpperCase()
    .replace(/./g, (c) => String.fromCodePoint(127397 + c.charCodeAt(0)));
}

export function HostCard({ host }: Props) {
  const now = useNow(60_000);
  // Her rate is in her currency (from her country); show it in the viewer's.
  const { show } = useMoney();
  const hostCurrency = currencyForCountry(host.country);

  return (
    <Link
      href={`/hosts/${host._id}`}
      className="accent-card group overflow-hidden rounded-2xl border bg-white/5"
    >
      <div className="aspect-[3/4] overflow-hidden bg-neutral-800">
        {host.avatarUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={host.avatarUrl}
            alt={host.displayName}
            className="h-full w-full object-cover transition group-hover:scale-105"
          />
        )}
      </div>
      <div className="p-4">
        <h3 className="flex items-center gap-3 font-semibold">
          {host.country && (
            <span title={host.country}>{flagOf(host.country)}</span>
          )}
          <span className="truncate">{host.displayName}</span>
        </h3>
        <p className="text-sm text-neutral-400">
          {show(host.ratePerMinuteCents, hostCurrency)}/min
        </p>
        {host.bio && (
          <p className="mt-2 line-clamp-3 text-sm text-neutral-300">
            {host.bio}
          </p>
        )}
        {host.timezone && (
          <p className="mt-2 text-xs text-neutral-500">
            Her time {formatTime(now, host.timezone)}
          </p>
        )}
      </div>
    </Link>
  );
}
