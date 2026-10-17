"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Locale, LocalePicker } from "../components/LocalePicker";

export default function SetLocalePage() {
  const router = useRouter();
  const setLocale = useMutation(api.user.setLocale);
  const [locale, setLocaleValue] = useState<Locale | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    if (!locale) return;
    setError(null);
    setBusy(true);
    try {
      await setLocale(locale);
      router.replace("/"); // RouteGuard sends them to the right home
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto max-w-md space-y-6 p-6">
      <h1 className="text-2xl font-bold">Where are you?</h1>
      <p className="text-sm text-neutral-400">
        Call times are shown in your time zone alongside the other
        person&apos;s, so we need to know yours before you continue.
      </p>
      <LocalePicker onChange={setLocaleValue} />
      {error && <p className="text-sm text-red-400">{error}</p>}
      <button
        onClick={save}
        disabled={busy || !locale}
        className="w-full rounded-xl bg-white/10 p-3 font-semibold hover:bg-white/20 disabled:opacity-50"
      >
        {busy ? "Saving…" : "Continue"}
      </button>
    </main>
  );
}
