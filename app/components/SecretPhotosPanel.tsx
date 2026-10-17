"use client";

import { useState } from "react";
import Link from "next/link";
import { useAction, useMutation, useQuery } from "convex/react";
import { Check, Lock } from "lucide-react";

import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useMoney } from "@/hooks/useMoney";

// rose-* follows the chosen accent; "accent-card" adds the themed border + glow.
const solidBtn =
  "rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-rose-500 disabled:opacity-50 disabled:hover:bg-rose-600";
const outlineBtn =
  "rounded-lg border border-rose-500/60 px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-rose-600/20 disabled:opacity-50";

function errorMessage(err: unknown): string {
  if (err instanceof Error) {
    const m = err.message.match(/Uncaught Error: (.*?)(?:\n|$)/);
    return m?.[1] ?? err.message;
  }
  return "Something went wrong";
}

/**
 * Shown on a girl's profile, to CLIENTS only (the page decides that).
 * Blurred previews for everyone; a photo shows in full once it's been paid for.
 * Paying works like a booking: create an order, then go to Paystack. The
 * photos unlock when the webhook confirms the payment (see /photos).
 */
export function SecretPhotosPanel({
  hostId,
  hostName,
}: {
  hostId: Id<"hosts">;
  hostName: string;
}): React.JSX.Element | null {
  const data = useQuery(api.secretPhotos.listForHost, { hostId });
  // Her prices are in HER currency; show() writes them in the viewer's.
  const { show } = useMoney();
  const createPhotoOrder = useMutation(api.secretPhotos.createPhotoOrder);
  const createBundleOrder = useMutation(api.secretPhotos.createBundleOrder);
  const initCheckout = useAction(api.secretPhotoPayments.initCheckout);

  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [error, setError] = useState("");

  if (!data || data.photos.length === 0) return null; // nothing for sale
  const { photos, bundle, currency } = data;

  async function pay(
    key: string,
    makeOrder: () => Promise<Id<"secretPhotoOrders">>,
  ) {
    setBusyKey(key);
    setError("");
    try {
      const orderId = await makeOrder();
      const url = await initCheckout({ orderId });
      window.location.href = url; // off to Paystack
    } catch (e) {
      setError(errorMessage(e));
      setBusyKey(null);
    }
  }

  return (
    <section className="accent-card space-y-4 rounded-2xl border bg-zinc-900/60 p-5">
      <div>
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <Lock size={16} className="text-rose-300" />
          {hostName}&apos;s secret photos
        </h2>
        <p className="text-sm text-neutral-400">
          Pay securely with Paystack. Unlocked photos are saved in{" "}
          <Link href="/photos" className="text-rose-300 underline">
            My Photos
          </Link>
          .
        </p>
      </div>

      {/* Bundle offer */}
      {bundle && (
        <div className="accent-card flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-rose-600/10 p-3">
          <div>
            <p className="font-semibold">
              Unlock {bundle.photoCount === photos.length ? "all" : "the rest"}{" "}
              ({bundle.photoCount} photo{bundle.photoCount === 1 ? "" : "s"})
            </p>
            <p className="text-sm text-neutral-300">
              <span className="font-semibold text-rose-300">
                {show(bundle.priceCents, currency)}
              </span>
              {bundle.individualCents > bundle.priceCents && (
                <>
                  {" "}
                  <span className="text-neutral-500 line-through">
                    {show(bundle.individualCents, currency)}
                  </span>{" "}
                  · save{" "}
                  {show(bundle.individualCents - bundle.priceCents, currency)}
                </>
              )}
            </p>
          </div>
          <button
            type="button"
            className={solidBtn}
            disabled={busyKey !== null}
            onClick={() => pay("bundle", () => createBundleOrder({ hostId }))}
          >
            {busyKey === "bundle"
              ? "Redirecting…"
              : `Buy bundle · ${show(bundle.priceCents, currency)}`}
          </button>
        </div>
      )}

      {error && (
        <p
          role="alert"
          className="rounded-lg bg-red-500/10 p-3 text-sm text-red-300"
        >
          {error}
        </p>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {photos.map((p) => {
          const key = `photo:${p._id}`;
          return (
            <div
              key={p._id}
              className="accent-card space-y-2 rounded-xl border bg-zinc-900/70 p-2"
            >
              <div className="relative aspect-[3/4] overflow-hidden rounded-lg bg-neutral-800">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={(p.owned ? p.fullUrl : p.previewUrl) ?? undefined}
                  alt={p.owned ? `${hostName}'s photo` : "Blurred preview"}
                  className="h-full w-full object-cover"
                  draggable={false}
                />
                {!p.owned && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                    <Lock className="text-white/90" size={28} />
                  </div>
                )}
              </div>

              {p.owned ? (
                <p className="flex items-center justify-center gap-1 py-1 text-sm font-semibold text-green-300">
                  <Check size={14} />
                  Unlocked
                </p>
              ) : (
                <button
                  type="button"
                  className={`${outlineBtn} w-full`}
                  disabled={busyKey !== null}
                  onClick={() =>
                    pay(key, () => createPhotoOrder({ photoId: p._id }))
                  }
                >
                  {busyKey === key
                    ? "Redirecting…"
                    : `Unlock · ${show(p.priceCents, currency)}`}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
