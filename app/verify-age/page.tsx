"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

// Only allow redirects to paths on this site ("/hosts", not "//evil.com" or "https://...")
function safeNext(raw: string | null): string {
  if (
    raw &&
    raw.startsWith("/") &&
    !raw.startsWith("//") &&
    !raw.includes("\\")
  ) {
    return raw;
  }
  return "/hosts";
}

function VerifyAge() {
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNext(params.get("next"));

  const status = useQuery(api.ageVerification.myAgeStatus);
  const confirmAdult = useMutation(api.ageVerification.confirmAdult);

  const [dob, setDob] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (status === undefined) return <p className="p-8">Loading…</p>;
  if (status === null) return <p className="p-8">Please sign in first.</p>;

  if (status.ageVerified) {
    return (
      <main className="mx-auto max-w-md space-y-4 p-8">
        <p className="text-green-300">You&apos;re verified as 18+.</p>
        <button
          onClick={() => router.push(next)}
          className="rounded-xl bg-pink-600 px-5 py-2 font-semibold"
        >
          Continue
        </button>
      </main>
    );
  }

  async function onConfirm() {
    setError(null);
    if (!dob) return setError("Enter your date of birth");
    if (!agreed) return setError("Please confirm the statement below");
    setBusy(true);
    try {
      await confirmAdult({ dateOfBirth: dob });
      router.push(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto max-w-md space-y-4 p-8">
      <h1 className="text-2xl font-bold">Confirm you&apos;re 18 or older</h1>
      <p className="text-sm text-neutral-300">
        This site is for adults only. Enter your date of birth to continue. We
        don&apos;t store it.
      </p>

      <input
        type="date"
        value={dob}
        onChange={(e) => setDob(e.target.value)}
        className="w-full rounded-lg bg-neutral-900 p-2"
      />

      <label className="flex items-start gap-2 text-sm">
        <input
          type="checkbox"
          checked={agreed}
          onChange={(e) => setAgreed(e.target.checked)}
          className="mt-1"
        />
        I confirm that I am 18 or older and that the date I entered is true.
      </label>

      {error && <p className="text-sm text-red-400">{error}</p>}
      <button
        onClick={onConfirm}
        disabled={busy}
        className="w-full rounded-xl bg-pink-600 py-3 font-semibold disabled:opacity-50"
      >
        {busy ? "Checking…" : "Confirm"}
      </button>
    </main>
  );
}

export default function VerifyAgePage() {
  return (
    <Suspense fallback={<p className="p-8">Loading…</p>}>
      <VerifyAge />
    </Suspense>
  );
}
