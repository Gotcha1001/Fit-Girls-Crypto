"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { IdUploadField } from "@/app/components/IdUploadField";

const field =
  "w-full rounded-lg bg-neutral-900 p-2 focus:outline-none focus:ring-2 focus:ring-pink-600";

export default function BecomeAHostPage() {
  const router = useRouter();
  const app = useQuery(api.hostAccess.myApplication);
  const submit = useMutation(api.hostAccess.submitApplication);
  const activate = useMutation(api.hostAccess.activateWithCode);

  const [code, setCode] = useState("");
  const [codeError, setCodeError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [fullName, setFullName] = useState("");
  const [contact, setContact] = useState("");
  const [message, setMessage] = useState("");
  const [over18, setOver18] = useState(false);
  const [idDoc, setIdDoc] = useState<Id<"_storage"> | null>(null);
  const [selfie, setSelfie] = useState<Id<"_storage"> | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  if (app === undefined) return <p className="p-8">Loading…</p>;

  const status = app?.status ?? null;
  const showCode =
    status === null || status === "approved" || status === "rejected";
  const showForm = status === null || status === "rejected";

  async function onActivate(e: React.FormEvent) {
    e.preventDefault();
    setCodeError(null);
    setBusy(true);
    try {
      const res = await activate({ code });
      if (res.ok) {
        router.push("/host/onboarding");
        return;
      }
      setCodeError(res.reason);
    } catch (err) {
      setCodeError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  async function onApply(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    if (!idDoc || !selfie) {
      return setFormError(
        "Upload both your ID photo and your selfie holding it.",
      );
    }
    setBusy(true);
    try {
      await submit({
        fullName,
        contact: contact || undefined,
        message,
        idDocumentId: idDoc,
        selfieId: selfie,
      });
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto max-w-lg space-y-8 p-6">
      <h1 className="text-3xl font-bold">Host access</h1>

      {status === "pending" && (
        <p className="rounded-lg bg-yellow-500/10 p-4 text-yellow-300">
          Your application is being reviewed. Once it&apos;s approved,
          we&apos;ll send you an access code. Come back here to enter it.
        </p>
      )}
      {status === "approved" && (
        <p className="rounded-lg bg-green-500/10 p-4 text-green-300">
          You&apos;re approved. Enter the access code we sent you below.
          {app?.codeExpired &&
            " Your code has expired, so ask us for a new one."}
        </p>
      )}
      {status === "rejected" && (
        <p className="rounded-lg bg-red-500/10 p-4 text-red-300">
          Your last application wasn&apos;t approved.
          {app?.note ? ` Note: ${app.note}` : ""} You can apply again below.
        </p>
      )}

      {showCode && (
        <form onSubmit={onActivate} className="space-y-3">
          <h2 className="text-lg font-semibold">I have an access code</h2>
          <input
            className={`${field} font-mono tracking-widest`}
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="XXXX-XXXX"
            maxLength={12}
            autoComplete="off"
            required
          />
          {codeError && <p className="text-sm text-red-400">{codeError}</p>}
          <button
            disabled={busy || code.trim().length < 8}
            className="w-full rounded-xl bg-pink-600 py-3 font-semibold disabled:opacity-50"
          >
            Activate
          </button>
        </form>
      )}

      {showForm && (
        <form onSubmit={onApply} className="space-y-3">
          <h2 className="text-lg font-semibold">No code? Apply for one</h2>
          <label className="block text-sm">
            Full name (as on your ID)
            <input
              className={`${field} mt-1`}
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              maxLength={80}
              required
            />
          </label>
          <label className="block text-sm">
            WhatsApp or phone (optional)
            <input
              className={`${field} mt-1`}
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              maxLength={40}
            />
          </label>
          <label className="block text-sm">
            Tell us a little about yourself
            <textarea
              className={`${field} mt-1`}
              rows={4}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={500}
            />
          </label>

          <IdUploadField
            label="Photo of your ID or passport"
            hint="The whole document, with all details readable."
            onUploaded={setIdDoc}
          />
          <IdUploadField
            label="Selfie holding your ID"
            hint="Your face and the ID in the same photo."
            onUploaded={setSelfie}
          />
          <p className="text-xs text-neutral-400">
            Only our admin team can see these photos. They&apos;re deleted if
            your application isn&apos;t approved.
          </p>

          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              checked={over18}
              onChange={(e) => setOver18(e.target.checked)}
              className="mt-1"
            />
            I am 18 or older, and I understand I must pass an ID check before I
            can take bookings.
          </label>
          {formError && <p className="text-sm text-red-400">{formError}</p>}
          <button
            disabled={busy || !over18 || !idDoc || !selfie}
            className="w-full rounded-xl bg-pink-600 py-3 font-semibold disabled:opacity-50"
          >
            Submit application
          </button>
        </form>
      )}
    </main>
  );
}
