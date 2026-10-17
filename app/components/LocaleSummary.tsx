"use client";

import Link from "next/link";
import { useUserContext } from "@/app/context/UserContext";
import { COUNTRIES } from "@/convex/lib/timezones";
import { tzLabel } from "@/convex/lib/schedule";
import { useNow } from "@/hooks/useNow";

export function LocaleSummary() {
  const me = useUserContext();
  const now = useNow(60_000);
  if (!me?.timezone) return null;
  const name =
    COUNTRIES.find((c) => c.code === me.country)?.name ?? me.country ?? "";
  return (
    <p className="text-sm text-neutral-400">
      Your location: <span className="text-neutral-200">{name}</span> ·{" "}
      {tzLabel(me.timezone, now)}{" "}
      <Link href="/settings#locale" className="underline">
        change
      </Link>
    </p>
  );
}
