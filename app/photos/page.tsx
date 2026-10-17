"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useQuery } from "convex/react";
import { Loader2, X } from "lucide-react";

import { api } from "@/convex/_generated/api";

// rose-* follows the chosen accent; "accent-card" adds the themed border + glow.

// Shown after Paystack sends the buyer back (?order=...). The photos unlock
// when the webhook confirms the payment, which can take a few seconds.
function PaymentStatus(): React.JSX.Element | null {
  const orderId = useSearchParams().get("order");
  const order = useQuery(
    api.secretPhotos.getMyOrder,
    orderId ? { orderId } : "skip",
  );
  if (!orderId || order === undefined || order === null) return null;

  if (order.status === "paid") {
    return (
      <p
        role="status"
        className="rounded-lg bg-green-500/10 p-3 text-sm text-green-300"
      >
        Payment received. Your{" "}
        {order.photoCount === 1 ? "photo is" : "photos are"} unlocked below.
      </p>
    );
  }
  return (
    <p
      role="status"
      className="accent-card flex items-center gap-2 rounded-xl border bg-zinc-900/70 p-3 text-sm text-neutral-200"
    >
      <Loader2 className="h-4 w-4 animate-spin text-rose-400" />
      Confirming your payment… this page updates by itself.
    </p>
  );
}

export default function MyPhotosPage(): React.JSX.Element {
  const photos = useQuery(api.secretPhotos.listPurchased);
  const [openId, setOpenId] = useState<string | null>(null);

  const open = useMemo(
    () => photos?.find((p) => p._id === openId) ?? null,
    [photos, openId],
  );

  // Close the viewer with Escape.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenId(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (photos === undefined) {
    return <Loader2 className="mx-auto mt-16 animate-spin text-rose-400" />;
  }

  // Group by girl so a bundle shows up together.
  const groups = new Map<string, { name: string; items: typeof photos }>();
  for (const p of photos) {
    const g = groups.get(p.hostId) ?? { name: p.hostName, items: [] };
    g.items.push(p);
    groups.set(p.hostId, g);
  }

  return (
    <main className="mx-auto max-w-3xl space-y-6 p-4 pb-16 text-white">
      <header>
        <h1 className="text-2xl font-semibold">My Photos</h1>
        <p className="text-sm text-neutral-300">
          Photos you&apos;ve unlocked, saved here for later. Each one carries
          the girl&apos;s name.
        </p>
      </header>

      <Suspense fallback={null}>
        <PaymentStatus />
      </Suspense>

      {photos.length === 0 ? (
        <div className="accent-card space-y-2 rounded-xl border bg-zinc-900/70 p-4 text-sm text-neutral-200">
          <p>You haven&apos;t unlocked any photos yet.</p>
          <Link href="/hosts" className="text-rose-300 hover:underline">
            Browse girls
          </Link>
        </div>
      ) : (
        [...groups.entries()].map(([hostId, g]) => (
          <section key={hostId} className="space-y-3">
            <div className="flex items-baseline justify-between">
              <h2 className="text-lg font-semibold">{g.name}</h2>
              <Link
                href={`/hosts/${hostId}`}
                className="text-sm text-rose-300 hover:underline"
              >
                View profile
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {g.items.map((p) => (
                <button
                  key={p._id}
                  type="button"
                  onClick={() => setOpenId(p._id)}
                  className="accent-card overflow-hidden rounded-xl border bg-zinc-900/70 p-2 text-left transition hover:bg-rose-600/10"
                >
                  {p.url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={p.url}
                      alt={`Photo from ${p.hostName}`}
                      className="aspect-[3/4] w-full rounded-lg object-cover"
                      draggable={false}
                    />
                  ) : (
                    <div className="aspect-[3/4] w-full rounded-lg bg-neutral-800" />
                  )}
                  <p className="mt-2 text-xs text-neutral-400">
                    Unlocked {new Date(p.purchasedAt).toLocaleDateString()}
                  </p>
                </button>
              ))}
            </div>
          </section>
        ))
      )}

      {/* Full-size viewer */}
      {open && open.url && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Photo from ${open.hostName}`}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          onClick={() => setOpenId(null)}
        >
          <button
            type="button"
            aria-label="Close"
            onClick={() => setOpenId(null)}
            className="accent-card absolute right-4 top-4 rounded-full border bg-zinc-900/80 p-2 text-white"
          >
            <X size={18} />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={open.url}
            alt={`Photo from ${open.hostName}`}
            className="max-h-full max-w-full rounded-lg object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </main>
  );
}
