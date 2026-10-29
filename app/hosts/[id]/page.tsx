"use client";

// app/hosts/[id]/page.tsx
//
// Layout (desktop):
//   1. Photo (left) + name / bio (right)
//   2. Book a call: full width, so the hour cards fill the space under the photo
//   3. Secret photos (clients only)
//   4. Gifts (clients only)
// On mobile everything simply stacks in the same order.

import { useParams } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { tzLabel } from "@/convex/lib/schedule";
import { currencyForCountry } from "@/convex/lib/currency";
import { useNow } from "@/hooks/useNow";
import { useViewerTz } from "@/hooks/useViewerTz";
import { GiftPicker } from "@/app/components/GiftPicker";
import { DualClock } from "@/app/components/DualClock";
import { BookCallPanel } from "@/app/components/booking/BookCallPanel";
import { SecretPhotosPanel } from "@/app/components/SecretPhotosPanel";
import { RatingBadge } from "@/app/components/RateCallPanel";

export default function HostProfilePage() {
  const { id } = useParams<{ id: string }>();
  const host = useQuery(api.hosts.getPublic, { hostId: id });
  const me = useQuery(api.user.getMe);

  // Hooks must stay above the early returns below.
  const viewerTz = useViewerTz();
  const now = useNow(60_000);

  if (host === undefined) return <p className="p-8">Loading…</p>;
  if (host === null) return <p className="p-8">Host not found.</p>;

  // Only clients can send gifts and buy photos (the server enforces both too).
  const isClient = me?.role === "user" && me.onboardingChoice === "client";

  return (
    <main className="mx-auto max-w-6xl space-y-8 p-6">
      {/* 1. Profile: photo + name/bio side by side on desktop */}
      <section className="grid gap-6 md:grid-cols-[minmax(0,22rem)_1fr] md:items-start">
        {host.avatarUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={host.avatarUrl}
            alt={host.displayName}
            className="accent-card w-full rounded-2xl border"
          />
        )}
        <div>
          <h1 className="text-3xl font-bold">{host.displayName}</h1>
          <RatingBadge rating={host.rating} className="mt-1" />
          {host.bio && <p className="mt-2 text-neutral-300">{host.bio}</p>}
        </div>
      </section>

      {/* 2. Booking: full width under the photo */}
      <section>
        {host.timezone ? (
          <>
            <div className="mb-4 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <h2 className="mb-1 text-lg font-semibold">Book a call</h2>
                <p className="text-sm font-medium text-amber-300">
                  These are {host.displayName}&apos;s times (
                  {tzLabel(host.timezone, now)})
                </p>
              </div>
              <div className="md:w-80 md:shrink-0">
                <DualClock
                  primaryTz={host.timezone}
                  primaryLabel="Her time"
                  otherTz={viewerTz}
                  otherLabel="Your time"
                />
              </div>
            </div>
            <BookCallPanel
              hostId={host._id}
              hostTz={host.timezone}
              hostCurrency={currencyForCountry(host.country)}
              ratePerMinuteCents={host.ratePerMinuteCents}
              minMinutes={host.minMinutes}
            />
          </>
        ) : (
          <>
            <h2 className="mb-2 text-lg font-semibold">Book a call</h2>
            <p className="text-sm text-zinc-400">
              This host hasn&apos;t set her time zone yet, so booking isn&apos;t
              available.
            </p>
          </>
        )}
      </section>

      {/* 3. Secret photos. Renders nothing if she has none for sale. */}
      {isClient && (
        <section>
          <SecretPhotosPanel hostId={host._id} hostName={host.displayName} />
        </section>
      )}

      {/* 4. Gifts */}
      {isClient && (
        <section>
          <GiftPicker toUserId={host.userId} />
        </section>
      )}
    </main>
  );
}
