"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useUserContext } from "@/app/context/UserContext";
import { COUNTRIES } from "@/convex/lib/timezones";
import { tzLabel } from "@/convex/lib/schedule";
import { useNow } from "@/hooks/useNow";
import { Locale, LocalePicker } from "./LocalePicker";

export function LocaleSettings() {
  const me = useUserContext();
  const now = useNow(60_000);
  const setLocale = useMutation(api.user.setLocale);

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Locale | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  if (!me) return null;

  const isHost = me.role === "host";
  const current: Locale | null =
    me.country && me.timezone
      ? { country: me.country, timezone: me.timezone }
      : null;
  const countryName =
    COUNTRIES.find((c) => c.code === me.country)?.name ?? me.country ?? "—";
  const unchanged =
    !!draft &&
    !!current &&
    draft.country === current.country &&
    draft.timezone === current.timezone;

  async function save() {
    if (!draft || unchanged) return;
    setBusy(true);
    setError(null);
    try {
      const res = await setLocale(draft);
      setEditing(false);
      setNotice(
        res.clearedOverrides > 0
          ? `Saved. ${res.clearedOverrides} one-day override${res.clearedOverrides === 1 ? " was" : "s were"} cleared.`
          : "Saved.",
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3 text-sm">
      {!editing ? (
        <>
          <p>
            <span className="font-semibold">{countryName}</span>
            {me.timezone && (
              <span className="text-slate-500 dark:text-stone-400">
                {" "}
                · {tzLabel(me.timezone, now)}
              </span>
            )}
          </p>
          {notice && <p className="text-emerald-500">{notice}</p>}
          <button
            type="button"
            onClick={() => {
              setNotice(null);
              setEditing(true);
            }}
            className="rounded-lg border px-3 py-1.5 text-xs font-medium"
          >
            Change
          </button>
        </>
      ) : (
        <>
          <LocalePicker onChange={setDraft} initial={current} />

          {isHost && !unchanged && draft && (
            <p className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-600 dark:text-amber-300">
              Changing your time zone clears your one-day overrides, because
              they&apos;re tied to your local calendar days. Your weekly hours
              keep the same clock times, now in the new zone. Existing bookings
              are not affected.
            </p>
          )}

          {error && <p className="text-red-500">{error}</p>}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={save}
              disabled={busy || !draft || unchanged}
              className="rounded-lg bg-pink-600 px-4 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
            >
              {busy ? "Saving…" : "Save"}
            </button>
            <button
              type="button"
              onClick={() => {
                setEditing(false);
                setError(null);
              }}
              className="rounded-lg border px-4 py-1.5 text-xs"
            >
              Cancel
            </button>
          </div>
        </>
      )}
    </div>
  );
}
