"use client";

import { useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { Loader2, Lock, Trash2 } from "lucide-react";

import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { processSecretPhoto } from "@/lib/watermark";
import {
  currencySymbol,
  formatMoney,
  fromMinor,
  minorDigits,
  toMinor,
} from "@/convex/lib/currency";

// Keep these in step with convex/secretPhotos.ts. Prices are typed in HER
// currency (chosen by her country) and stored in that currency's minor units.
// The allowed range comes from the server, already converted to her currency.
const MAX_PHOTOS = 5;
const MIN_BUNDLE_PHOTOS = 2;
const HOST_SHARE_PCT = 80; // she keeps 80%, the platform 20%
const MAX_SOURCE_BYTES = 15 * 1024 * 1024;

// rose-* follows the chosen accent; "accent-card" adds the themed border + glow.
const card = "accent-card space-y-4 rounded-2xl border bg-zinc-900/60 p-5";
const field =
  "rounded-lg border border-rose-500/40 bg-neutral-900 p-2 text-white placeholder:text-neutral-500 focus:border-rose-400 focus:outline-none focus:ring-2 focus:ring-rose-500";
const solidBtn =
  "rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-rose-500 disabled:opacity-50 disabled:hover:bg-rose-600";
const ghostBtn =
  "rounded-lg border border-rose-500/50 px-3 py-1.5 text-xs text-white transition-colors hover:bg-rose-600/20 disabled:opacity-50";

function errorMessage(err: unknown): string {
  if (err instanceof Error) {
    // Convex wraps server errors; show just the readable part.
    const m = err.message.match(/Uncaught Error: (.*?)(?:\n|$)/);
    return m?.[1] ?? err.message;
  }
  return "Something went wrong";
}

function PhotoTile({
  id,
  url,
  currency,
  priceCents,
  sales,
  earnedCents,
  onError,
}: {
  id: Id<"secretPhotos">;
  url: string | null;
  currency: string;
  priceCents: number;
  sales: number;
  earnedCents: number;
  onError: (msg: string) => void;
}): React.JSX.Element {
  const updatePrice = useMutation(api.secretPhotos.updatePrice);
  const remove = useMutation(api.secretPhotos.remove);
  const [value, setValue] = useState(fromMinor(priceCents, currency));
  const [busy, setBusy] = useState(false);
  const dirty = toMinor(value, currency) !== priceCents;

  async function save() {
    setBusy(true);
    onError("");
    try {
      await updatePrice({ photoId: id, priceCents: toMinor(value, currency) });
    } catch (e) {
      onError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  async function del() {
    if (
      !window.confirm(
        "Delete this photo? Anyone who already bought it keeps their copy.",
      )
    )
      return;
    setBusy(true);
    onError("");
    try {
      await remove({ photoId: id });
    } catch (e) {
      onError(errorMessage(e));
      setBusy(false);
    }
  }

  return (
    <div className="accent-card space-y-3 rounded-xl border bg-zinc-900/70 p-3">
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url}
          alt="Your secret photo"
          className="aspect-[3/4] w-full rounded-lg object-cover"
        />
      ) : (
        <div className="flex aspect-[3/4] w-full items-center justify-center rounded-lg bg-neutral-800 text-xs text-neutral-400">
          Loading…
        </div>
      )}

      <div className="flex items-center gap-2">
        <span className="shrink-0 text-sm font-semibold text-rose-300">
          {currencySymbol(currency)}
        </span>
        <input
          type="number"
          min={0}
          step={1 / 10 ** minorDigits(currency)}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          aria-label={`Price in ${currency}`}
          className={`${field} w-full py-1 text-sm`}
        />
        <button
          type="button"
          onClick={save}
          disabled={busy || !dirty}
          className={ghostBtn}
        >
          Save
        </button>
      </div>

      <div className="flex items-center justify-between text-xs text-neutral-400">
        <span>
          {sales} sold · you earned {formatMoney(earnedCents, currency)}
        </span>
        <button
          type="button"
          onClick={del}
          disabled={busy}
          className="flex items-center gap-1 text-red-300 hover:text-red-200 disabled:opacity-50"
        >
          <Trash2 size={13} />
          Delete
        </button>
      </div>
    </div>
  );
}

export default function HostPhotosPage(): React.JSX.Element {
  const host = useQuery(api.hosts.getMyHost);
  const data = useQuery(api.secretPhotos.listMine);
  const prepareUpload = useMutation(api.secretPhotos.prepareUpload);
  const addPhoto = useMutation(api.secretPhotos.add);
  const setBundlePrice = useMutation(api.secretPhotos.setBundlePrice);

  const fileRef = useRef<HTMLInputElement>(null);
  const [price, setPrice] = useState("");
  const [bundleInput, setBundleInput] = useState<string | null>(null); // null = show saved value
  const [busy, setBusy] = useState(false);
  const [bundleBusy, setBundleBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState("");

  if (host === undefined || data === undefined) {
    return <Loader2 className="mx-auto mt-16 animate-spin text-rose-400" />;
  }
  if (host === null || data === null || !data.ready) {
    return (
      <main className="mx-auto max-w-xl p-6">
        <p className="accent-card rounded-xl border bg-zinc-900/60 p-4 text-sm text-neutral-200">
          Secret photos open up once your host profile is approved and your bank
          details are set up, so we can pay you.
        </p>
      </main>
    );
  }

  const { photos, bundlePriceCents, individualTotalCents, currency } = data;
  const photoLimits = data.photoLimits;
  const bundleLimits = data.bundleLimits;
  const money = (minor: number): string => formatMoney(minor, currency);
  const yourShare = (typed: string): string =>
    Number.isFinite(Number(typed)) && Number(typed) > 0
      ? money(Math.round((toMinor(typed, currency) * HOST_SHARE_PCT) / 100))
      : money(0);
  const full = photos.length >= MAX_PHOTOS;
  const canBundle = photos.length >= MIN_BUNDLE_PHOTOS;
  const savedBundle =
    bundlePriceCents === null ? "" : fromMinor(bundlePriceCents, currency);
  const bundleValue = bundleInput ?? savedBundle;
  const bundleDirty = bundleInput !== null && bundleInput !== savedBundle;

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !host) return;
    setError("");
    setDone("");

    const cents = toMinor(price, currency);
    if (!(cents >= photoLimits.min && cents <= photoLimits.max)) {
      setError(
        `Set a price between ${money(photoLimits.min)} and ${money(photoLimits.max)} first.`,
      );
      if (fileRef.current) fileRef.current.value = "";
      return;
    }
    if (file.size > MAX_SOURCE_BYTES) {
      setError("That image is over 15 MB. Please choose a smaller one.");
      if (fileRef.current) fileRef.current.value = "";
      return;
    }

    setBusy(true);
    try {
      // 1. Watermark + blurred preview, made right here in the browser.
      const { full: fullBlob, preview } = await processSecretPhoto(
        file,
        host.displayName,
      );
      // 2. Limit check, then two upload URLs.
      const { fullUploadUrl, previewUploadUrl } = await prepareUpload({});
      const [r1, r2] = await Promise.all([
        fetch(fullUploadUrl, {
          method: "POST",
          headers: { "Content-Type": "image/jpeg" },
          body: fullBlob,
        }),
        fetch(previewUploadUrl, {
          method: "POST",
          headers: { "Content-Type": "image/jpeg" },
          body: preview,
        }),
      ]);
      if (!r1.ok || !r2.ok) throw new Error("Upload failed. Please try again.");
      const a = (await r1.json()) as { storageId: Id<"_storage"> };
      const b = (await r2.json()) as { storageId: Id<"_storage"> };
      // 3. Save it.
      await addPhoto({
        fullStorageId: a.storageId,
        previewStorageId: b.storageId,
        priceCents: cents,
      });
      setDone("Photo added.");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function saveBundle(clear: boolean) {
    setError("");
    setDone("");
    setBundleBusy(true);
    try {
      await setBundlePrice({
        priceCents: clear ? null : toMinor(bundleValue, currency),
      });
      setBundleInput(null);
      setDone(clear ? "Bundle removed." : "Bundle price saved.");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBundleBusy(false);
    }
  }

  return (
    <main className="mx-auto max-w-3xl space-y-6 p-4 pb-16 text-white">
      <header className="accent-card space-y-1 rounded-xl border bg-zinc-900/60 p-4">
        <h1 className="flex items-center gap-2 text-xl font-semibold">
          <Lock size={18} className="text-rose-300" />
          Secret photos
        </h1>
        <p className="text-sm text-neutral-300">
          Sell up to {MAX_PHOTOS} photos. Clients see a blurred preview and pay
          to unlock the full photo. You keep {HOST_SHARE_PCT}% of every sale and
          the platform keeps {100 - HOST_SHARE_PCT}%, paid out like your
          bookings. Every photo gets your name, small, at the bottom, so it
          can&apos;t be passed around anonymously.
        </p>
      </header>

      {error && (
        <p
          role="alert"
          className="rounded-lg bg-red-500/10 p-3 text-sm text-red-300"
        >
          {error}
        </p>
      )}
      {done && (
        <p
          role="status"
          className="rounded-lg bg-green-500/10 p-3 text-sm text-green-300"
        >
          {done}
        </p>
      )}

      {/* Add a photo */}
      <section className={card}>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Add a photo</h2>
          <span className="rounded-full border border-rose-500/50 bg-rose-600/15 px-2.5 py-0.5 text-xs font-semibold text-rose-300">
            {photos.length} / {MAX_PHOTOS}
          </span>
        </div>

        {full ? (
          <p className="text-sm text-neutral-300">
            You&apos;ve reached the limit of {MAX_PHOTOS}. Delete a photo to add
            a new one.
          </p>
        ) : (
          <div className="flex flex-wrap items-end gap-4">
            <label className="block">
              <span className="mb-1 block text-sm font-medium">
                Price ({currency})
              </span>
              <input
                type="number"
                min={0}
                step={1 / 10 ** minorDigits(currency)}
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder={fromMinor(photoLimits.min, currency)}
                className={`${field} w-28`}
              />
              <span className="mt-1 block text-xs text-neutral-500">
                You get {yourShare(price)} · allowed {money(photoLimits.min)} to{" "}
                {money(photoLimits.max)}
              </span>
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium">Photo</span>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                onChange={onPick}
                disabled={busy}
                className="text-sm file:mr-3 file:cursor-pointer file:rounded-lg file:border-0 file:bg-rose-600 file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-white hover:file:bg-rose-500"
              />
            </label>
            {busy && (
              <span className="flex items-center gap-1.5 text-sm text-neutral-300">
                <Loader2 className="h-4 w-4 animate-spin text-rose-400" />
                Adding watermark and uploading…
              </span>
            )}
          </div>
        )}
        <p className="text-xs text-neutral-500">
          The watermark and blur are added on your device. The server only ever
          stores the watermarked photo and the blurred preview, never your
          original.
        </p>
      </section>

      {/* Bundle price */}
      <section className={card}>
        <h2 className="text-lg font-semibold">Photo bundle</h2>
        {!canBundle ? (
          <p className="text-sm text-neutral-300">
            Add at least {MIN_BUNDLE_PHOTOS} photos to offer a bundle price for
            all of them.
          </p>
        ) : (
          <>
            <p className="text-sm text-neutral-300">
              One price for all {photos.length} photos. Buying them one by one
              costs{" "}
              <span className="font-semibold text-rose-300">
                {money(individualTotalCents)}
              </span>
              , so a bundle price below that gives clients a saving. The bundle
              never costs a client more than buying the photos separately.
            </p>
            <div className="flex flex-wrap items-end gap-3">
              <label className="block">
                <span className="mb-1 block text-sm font-medium">
                  Bundle price ({currency})
                </span>
                <input
                  type="number"
                  min={0}
                  step={1 / 10 ** minorDigits(currency)}
                  value={bundleValue}
                  placeholder="No bundle"
                  onChange={(e) => setBundleInput(e.target.value)}
                  className={`${field} w-36`}
                />
                <span className="mt-1 block text-xs text-neutral-500">
                  You get {yourShare(bundleValue)} · up to{" "}
                  {money(bundleLimits.max)}
                </span>
              </label>
              <button
                type="button"
                className={solidBtn}
                disabled={bundleBusy || !bundleDirty || bundleValue === ""}
                onClick={() => saveBundle(false)}
              >
                Save bundle price
              </button>
              {bundlePriceCents !== null && (
                <button
                  type="button"
                  className={ghostBtn}
                  disabled={bundleBusy}
                  onClick={() => saveBundle(true)}
                >
                  Remove bundle
                </button>
              )}
            </div>
            {bundlePriceCents !== null &&
              bundlePriceCents >= individualTotalCents && (
                <p className="text-xs text-yellow-300">
                  This bundle isn&apos;t cheaper than the photos separately, so
                  clients won&apos;t get a saving from it.
                </p>
              )}
          </>
        )}
      </section>

      {/* Your photos */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Your photos</h2>
        {photos.length === 0 ? (
          <p className="accent-card rounded-xl border bg-zinc-900/60 p-4 text-sm text-neutral-300">
            No photos yet. Add your first one above.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {photos.map((p) => (
              <PhotoTile
                key={p._id}
                id={p._id}
                url={p.url}
                currency={currency}
                priceCents={p.priceCents}
                sales={p.sales}
                earnedCents={p.earnedCents}
                onError={setError}
              />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
