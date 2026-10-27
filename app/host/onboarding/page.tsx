"use client";

import { useEffect, useRef, useState } from "react";
import { useAction, useMutation, useQuery } from "convex/react";

import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import {
  CHARGE_CURRENCY,
  convertMinor,
  currencyForCountry,
  currencySymbol,
  formatMoney,
  fromMinor,
  limitsFor,
  minorDigits,
  toMinor,
} from "@/convex/lib/currency";
import { isValidTronAddress } from "@/convex/lib/tronAddress";
import { WalletSetupGuide } from "@/app/components/host/WalletSetupGuide";

// Rate limits are defined in rand and converted to her currency (same numbers
// as convex/hosts.ts).
const MIN_RATE_BASE = 500; // R5 per minute
const MAX_RATE_BASE = 10000; // R100 per minute

const MAX_AVATAR_BYTES = 5 * 1024 * 1024;

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : "Something went wrong";
}

// rose-* is remapped to the chosen accent in globals.css, so everything below
// follows the theme. Glow comes from the "accent-card" class (needs data-glow="on").

// Each section sits in a themed card: accent border + glow.
const card = "accent-card space-y-4 rounded-2xl border bg-zinc-900/60 p-5";

// Fields get a quiet accent border (no glow, there are too many of them) and
// a stronger accent ring on focus.
const field =
  "w-full rounded-lg border border-rose-500/40 bg-neutral-900 p-2 text-white placeholder:text-neutral-500 focus:border-rose-400 focus:outline-none focus:ring-2 focus:ring-rose-500";

const button =
  "rounded-xl bg-rose-600 px-5 py-2.5 font-semibold text-white transition-colors hover:bg-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-400 focus:ring-offset-2 focus:ring-offset-black disabled:opacity-50 disabled:hover:bg-rose-600";

// Native checkbox ticked in the accent colour.
const checkbox = "mt-1 accent-rose-500";

export default function HostOnboarding() {
  const host = useQuery(api.hosts.getMyHost);
  const app = useQuery(api.hostAccess.myApplication);
  const me = useQuery(api.user.getMe);
  const fx = useQuery(api.fx.getRates);
  const saveProfile = useMutation(api.hosts.saveProfile);
  const generateUploadUrl = useMutation(api.hosts.generateUploadUrl);
  const setAvatar = useMutation(api.hosts.setAvatar);

  const setupPayout = useAction(api.hostPayout.setupPayout);

  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [rateRand, setRateRand] = useState(""); // typed in HER currency
  const [over18, setOver18] = useState(false);

  const [wallet, setWallet] = useState("");
  const [walletConfirm, setWalletConfirm] = useState("");

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const prefilled = useRef(false);

  // Fill the form: from her saved profile if she has one, otherwise from what
  // she wrote when she applied. Runs once, so it never overwrites her typing.
  useEffect(() => {
    // Wait for her country and the exchange rates: they decide her currency.
    if (!me || !fx) return;
    const rates = fx.rates;
    const cur = currencyForCountry(host?.country ?? me.country, rates);
    if (host) {
      setDisplayName(host.displayName);
      setBio(host.bio);
      setRateRand(fromMinor(host.ratePerMinuteCents, cur));
      setOver18(true); // she already accepted the terms when she first saved
      prefilled.current = true;
    } else if (host === null && app && !prefilled.current) {
      setBio(app.message ?? "");
      // First name only: her full legal name must not become her public name.
      setDisplayName(app.fullName.trim().split(/\s+/)[0] ?? "");
      // Suggest about R10 a minute, written in her own currency.
      setRateRand(
        fromMinor(convertMinor(1000, CHARGE_CURRENCY, cur, rates), cur),
      );
      prefilled.current = true;
    }
  }, [host?._id, host === null, app?.fullName, me?.country, !!fx]);

  // Load banks once a profile exists

  if (host === undefined) return <p className="p-8">Loading…</p>;

  // Her currency comes from her country; she sets her rate in it.
  const rates = fx?.rates;
  const currency = currencyForCountry(host?.country ?? me?.country, rates);
  const rateLimits = rates
    ? limitsFor(MIN_RATE_BASE, MAX_RATE_BASE, currency, rates)
    : null;

  async function onSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setDone("");
    setBusy(true);
    try {
      await saveProfile({
        displayName,
        bio,
        ratePerMinuteCents: toMinor(rateRand, currency),
      });
      setDone("Profile saved.");
    } catch (err: unknown) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function onPickAvatar(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");
    setDone("");
    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file.");
      return;
    }
    if (file.size > MAX_AVATAR_BYTES) {
      setError("That image is over 5 MB. Please choose a smaller one.");
      return;
    }
    setBusy(true);
    try {
      const uploadUrl = await generateUploadUrl();
      const res = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!res.ok) throw new Error("Upload failed. Please try again.");
      const { storageId } = (await res.json()) as {
        storageId: Id<"_storage">;
      };
      await setAvatar({ storageId });
      setDone("Photo updated.");
    } catch (err: unknown) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function onSavePayout(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setDone("");
    const a = wallet.trim();
    if (a !== walletConfirm.trim()) {
      setError("The two wallet addresses don't match.");
      return;
    }
    if (!(await isValidTronAddress(a))) {
      setError(
        "That is not a valid TRON (TRC-20) address. It starts with a T.",
      );
      return;
    }
    setBusy(true);
    try {
      await setupPayout({ walletAddress: a });
      setWallet("");
      setWalletConfirm("");
      setDone("Payouts are set up.");
    } catch (err: unknown) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  function statusBanner(): {
    text: string;
    tone: "info" | "ok" | "warn";
  } | null {
    if (!host) {
      return {
        text: "Start by saving your profile. Then you can add a photo and your bank details.",
        tone: "info",
      };
    }
    if (host.status === "suspended") {
      return {
        text: "Your host account is suspended. Please contact support.",
        tone: "warn",
      };
    }
    if (host.status === "approved") {
      return { text: "You're approved and can take bookings.", tone: "ok" };
    }
    if (!host.payoutReady) {
      return {
        text: "Next step: add your USDT wallet address below. We can't review you until payouts are set up.",
        tone: "info",
      };
    }
    return {
      text: "All set. Your profile is waiting for an admin to check your ID and approve you.",
      tone: "info",
    };
  }

  const banner = statusBanner();

  return (
    <main className="mx-auto max-w-xl space-y-8 px-4 py-10 text-white">
      <header>
        <h1 className="text-2xl font-semibold">
          {host ? "Your host profile" : "Set up your host profile"}
        </h1>
        <p className="mt-2 text-neutral-400">
          You keep 80% of every booking and unlock, minus payment processing
          fees. The platform takes 20%. Your earnings are paid automatically in
          USDT (TRON / TRC-20) to your wallet, about 24 hours after each call,
          once you have $10 or more waiting.
        </p>
      </header>

      {banner && (
        <p
          role="status"
          className={`rounded-lg p-3 ${
            banner.tone === "ok"
              ? "bg-green-500/10 text-green-300"
              : banner.tone === "warn"
                ? "bg-yellow-500/10 text-yellow-300"
                : "accent-card border bg-zinc-900/60 text-rose-50"
          }`}
        >
          {banner.text}
        </p>
      )}

      {error && (
        <p role="alert" className="rounded-lg bg-red-500/10 p-3 text-red-300">
          {error}
        </p>
      )}

      {done && (
        <p
          role="status"
          className="rounded-lg bg-green-500/10 p-3 text-green-300"
        >
          {done}
        </p>
      )}

      <form onSubmit={onSaveProfile} className={card}>
        <h2 className="text-lg font-semibold">Your profile</h2>

        <label className="block">
          <span className="mb-1 block text-sm font-medium">Display name</span>
          <input
            className={field}
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            maxLength={40}
            required
          />
          <span className="mt-1 block text-xs text-neutral-500">
            This is the name clients see. You can change it any time.
          </span>
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-medium">Bio</span>
          <textarea
            className={field}
            rows={4}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            maxLength={500}
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-medium">
            Your rate ({currency} per minute)
          </span>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-rose-300">
              {currencySymbol(currency)}
            </span>
            <input
              className={field}
              type="number"
              min={0}
              step={1 / 10 ** minorDigits(currency)}
              value={rateRand}
              onChange={(e) => setRateRand(e.target.value)}
              required
            />
          </div>
          {rateLimits && (
            <span className="mt-1 block text-xs text-neutral-500">
              Allowed: {formatMoney(rateLimits.min, currency)} to{" "}
              {formatMoney(rateLimits.max, currency)} a minute. Clients in other
              countries see this converted into their own currency.
            </span>
          )}
        </label>

        <label className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            checked={over18}
            onChange={(e) => setOver18(e.target.checked)}
            className={checkbox}
          />
          <span>
            I am 18 or older and I accept the host terms. I understand I must
            pass an ID check before I can take bookings.
          </span>
        </label>

        <button className={button} disabled={busy || !over18}>
          Save profile
        </button>
      </form>

      <section className={card}>
        <h2 className="text-lg font-semibold">Your photo</h2>
        <div className="flex items-center gap-4">
          {host?.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={host.avatarUrl}
              alt="Your profile photo"
              className="accent-card h-20 w-20 rounded-full border-2 object-cover"
            />
          ) : (
            <div className="accent-card flex h-20 w-20 items-center justify-center rounded-full border-2 bg-neutral-800 text-xs text-neutral-400">
              No photo
            </div>
          )}
          <div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              onChange={onPickAvatar}
              disabled={busy || !host}
              className="text-sm file:mr-3 file:cursor-pointer file:rounded-lg file:border-0 file:bg-rose-600 file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-white hover:file:bg-rose-500"
            />
            <p className="mt-1 text-xs text-neutral-500">
              {host
                ? host.avatarUrl
                  ? "Choose a new photo to replace this one. JPG or PNG, up to 5 MB."
                  : "JPG or PNG, up to 5 MB."
                : "Save your profile first, then you can add a photo."}
            </p>
          </div>
        </div>
      </section>

      {host && (
        <section className={card}>
          <h2 className="text-lg font-semibold">Where we pay you</h2>
          {host.payoutReady ? (
            <p className="rounded-lg border border-rose-500/40 bg-rose-600/10 p-3">
              Payouts are sent automatically in USDT (TRC-20) to the wallet
              ending in <strong>{host.bankLast4}</strong>. To change it, contact
              support.
            </p>
          ) : (
            <form onSubmit={onSavePayout} className="space-y-4">
              <p className="text-sm text-neutral-400">
                Paste a{" "}
                <strong>
                  USDT wallet address on the TRON (TRC-20) network
                </strong>
                . It starts with a T. Sending to the wrong network or a wrong
                address cannot be undone, so check it with your wallet or
                exchange first.
              </p>
              <WalletSetupGuide compact />
              <label className="block">
                <span className="mb-1 block text-sm font-medium">
                  USDT wallet address (TRC-20)
                </span>
                <input
                  className={field}
                  value={wallet}
                  onChange={(e) => setWallet(e.target.value)}
                  autoComplete="off"
                  spellCheck={false}
                  placeholder="T…"
                  required
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-sm font-medium">
                  Confirm address
                </span>
                <input
                  className={field}
                  value={walletConfirm}
                  onChange={(e) => setWalletConfirm(e.target.value)}
                  autoComplete="off"
                  spellCheck={false}
                  required
                />
              </label>
              <button className={button} disabled={busy}>
                Save wallet
              </button>
            </form>
          )}
        </section>
      )}
    </main>
  );
}
