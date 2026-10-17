"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Locale, LocalePicker } from "../components/LocalePicker";

export default function ChooseRolePage() {
  const router = useRouter();
  const choose = useMutation(api.hostAccess.chooseAccountType);
  const [locale, setLocale] = useState<Locale | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function pick(type: "client" | "girl") {
    if (!locale) return;
    setError(null);
    setBusy(true);
    try {
      await choose({ type, ...locale });
      router.push(type === "client" ? "/hosts" : "/become-a-host");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
      setBusy(false);
    }
  }

  const disabled = busy || !locale;

  return (
    <main className="mx-auto max-w-2xl space-y-6 p-6">
      <h1 className="text-3xl font-bold">How will you use this site?</h1>

      <section className="space-y-2 rounded-2xl border border-white/10 bg-white/5 p-5">
        <h2 className="text-lg font-semibold">Where are you?</h2>
        <p className="text-sm text-neutral-400">
          We use this to show call times in the right time zone.
        </p>
        <LocalePicker onChange={setLocale} />
      </section>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <div className="grid gap-4 sm:grid-cols-2">
        <button
          onClick={() => pick("client")}
          disabled={disabled}
          className="rounded-2xl border border-white/10 bg-white/5 p-6 text-left hover:bg-white/10 disabled:opacity-50"
        >
          <p className="text-xl font-semibold">I&apos;m a client</p>
          <p className="mt-2 text-sm text-neutral-400">
            Browse girls, book video calls and pay securely.
          </p>
        </button>
        <button
          onClick={() => pick("girl")}
          disabled={disabled}
          className="rounded-2xl border border-white/10 bg-white/5 p-6 text-left hover:bg-white/10 disabled:opacity-50"
        >
          <p className="text-xl font-semibold">I&apos;m a girl</p>
          <p className="mt-2 text-sm text-neutral-400">
            Apply to get paid for video calls. You&apos;ll need an access code
            from us, or you can apply for one.
          </p>
        </button>
      </div>
    </main>
  );
}
