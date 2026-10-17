"use client";

import { useState } from "react";
import { useAction, useConvexAuth, useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { ApplicationIdPhotos } from "@/app/components/ApplicationIdPhotos";
import { currencyForCountry, formatMoney } from "@/convex/lib/currency";

export default function AdminPage(): React.JSX.Element {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const isAdmin = useQuery(api.admin.amIAdmin, isAuthenticated ? {} : "skip");
  // Only ask once we know she's an admin. The server enforces this too.
  const applications = useQuery(
    api.hostAccess.listApplications,
    isAdmin ? {} : "skip",
  );
  const pendingHosts = useQuery(
    api.admin.listPendingHosts,
    isAdmin ? {} : "skip",
  );
  const activeHosts = useQuery(
    api.admin.listApprovedHosts,
    isAdmin ? {} : "skip",
  );
  const fx = useQuery(api.fx.getRates);

  const issueCode = useAction(api.hostAccess.issueCode);
  const rejectApplication = useMutation(api.hostAccess.rejectApplication);
  const approveHost = useMutation(api.admin.approveHost);
  const suspendHost = useMutation(api.admin.suspendHost);

  const [idChecked, setIdChecked] = useState<Record<string, boolean>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  // The code is shown once, right after it's generated.
  const [issued, setIssued] = useState<{ name: string; code: string } | null>(
    null,
  );

  if (isLoading || (isAuthenticated && isAdmin === undefined)) {
    return <p className="p-6 text-sm opacity-70">Loading…</p>;
  }
  if (!isAuthenticated) return <p className="p-6 text-sm">Please sign in.</p>;
  if (!isAdmin) {
    return (
      <p className="p-6 text-sm">You don&apos;t have access to this page.</p>
    );
  }

  async function run(id: string, fn: () => Promise<unknown>, ok: string) {
    setBusyId(id);
    try {
      await fn();
      toast.success(ok);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusyId(null);
    }
  }

  async function onSuspend(hostId: Id<"hosts">, name: string): Promise<void> {
    if (
      !window.confirm(
        `Suspend ${name}? She will go offline and can't take bookings.`,
      )
    ) {
      return;
    }
    await run(hostId, () => suspendHost({ hostId }), "Host suspended");
  }

  async function onIssue(
    applicationId: Id<"hostApplications">,
    name: string,
    alreadyChecked: boolean,
  ) {
    await run(
      applicationId,
      async () => {
        const code = await issueCode({
          applicationId,
          idChecked: alreadyChecked || !!idChecked[applicationId],
        });
        setIssued({ name, code });
      },
      "Code generated",
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8 p-4">
      <h1 className="text-2xl font-bold">Approve girls</h1>

      {issued && (
        <div className="space-y-2 rounded-xl border border-green-500/40 bg-green-500/10 p-4">
          <p className="text-sm">
            Access code for <strong>{issued.name}</strong>. This is the only
            time it is shown. Send it to her privately.
          </p>
          <p className="font-mono text-3xl tracking-widest">{issued.code}</p>
          <div className="flex gap-2">
            <button
              className="rounded-lg border px-3 py-1 text-sm"
              onClick={() => {
                void navigator.clipboard.writeText(issued.code);
                toast.success("Copied");
              }}
            >
              Copy
            </button>
            <button
              className="rounded-lg border px-3 py-1 text-sm"
              onClick={() => setIssued(null)}
            >
              Done
            </button>
          </div>
          <p className="text-xs opacity-70">
            It works once, expires in 7 days, and locks after 5 wrong tries.
          </p>
        </div>
      )}

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Applications</h2>
        {applications === undefined && (
          <p className="text-sm opacity-70">Loading…</p>
        )}
        {applications?.length === 0 && (
          <p className="text-sm opacity-70">No applications waiting.</p>
        )}
        {applications?.map((a) => (
          <div key={a._id} className="space-y-3 rounded-xl border p-4">
            <div>
              <p className="font-semibold">{a.fullName}</p>
              <p className="text-xs opacity-70">
                {a.email}
                {a.contact ? ` · ${a.contact}` : ""}
              </p>
              {a.message && <p className="mt-1 text-sm">{a.message}</p>}
              <p className="mt-1 text-xs">
                {a.status === "pending"
                  ? "Waiting for review"
                  : `Approved, waiting for her to enter the code${
                      a.codeExpiresAt
                        ? ` (expires ${new Date(a.codeExpiresAt).toLocaleDateString()})`
                        : ""
                    }`}
              </p>
            </div>

            {/* ID photo + selfie, only while she's waiting for review.
                They are deleted automatically once you approve. */}
            {a.status === "pending" && (
              <ApplicationIdPhotos
                applicationId={a._id}
                uploaded={a.idUploaded}
              />
            )}

            {a.status === "pending" && (
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={!!idChecked[a._id]}
                  onChange={(e) =>
                    setIdChecked((s) => ({ ...s, [a._id]: e.target.checked }))
                  }
                />
                I have checked her ID and she is 18 or older
              </label>
            )}

            <div className="flex gap-2">
              <button
                disabled={
                  busyId === a._id ||
                  (a.status === "pending" && !idChecked[a._id])
                }
                onClick={() => onIssue(a._id, a.fullName, a.idChecked)}
                className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
              >
                {a.status === "pending"
                  ? "Approve & generate code"
                  : "New code"}
              </button>
              <button
                disabled={busyId === a._id}
                onClick={() =>
                  run(
                    a._id,
                    () => rejectApplication({ applicationId: a._id }),
                    "Application rejected",
                  )
                }
                className="rounded-lg border px-4 py-2 text-sm disabled:opacity-40"
              >
                Reject
              </button>
            </div>
          </div>
        ))}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Active girls</h2>
        {activeHosts === undefined && (
          <p className="text-sm opacity-70">Loading…</p>
        )}
        {activeHosts?.length === 0 && (
          <p className="text-sm opacity-70">No active girls yet.</p>
        )}
        {activeHosts?.map((h) => {
          const currency = currencyForCountry(h.country, fx?.rates);
          return (
            <div
              key={h._id}
              className="flex items-center justify-between gap-3 rounded-xl border p-4"
            >
              <div className="min-w-0">
                <p className="truncate font-semibold">
                  {h.displayName}
                  <span
                    className={`ml-2 text-xs font-normal ${
                      h.isOnline ? "text-green-500" : "opacity-60"
                    }`}
                  >
                    {h.isOnline ? "Online" : "Offline"}
                  </span>
                </p>
                <p className="truncate text-xs opacity-70">{h.email}</p>
                <p className="text-xs">
                  {formatMoney(h.ratePerMinuteCents, currency)}/min · Bank:{" "}
                  {h.payoutReady
                    ? `set up (ending ${h.bankLast4 ?? "????"})`
                    : "NOT set up yet"}
                </p>
              </div>
              <button
                disabled={busyId === h._id}
                onClick={() => void onSuspend(h._id, h.displayName)}
                className="shrink-0 rounded-lg border border-rose-500/50 px-4 py-2 text-sm text-rose-500 disabled:opacity-40"
              >
                Suspend
              </button>
            </div>
          );
        })}
      </section>

      {pendingHosts && pendingHosts.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">
            Older profiles waiting for approval
          </h2>
          {pendingHosts.map((h) => (
            <div key={h._id} className="space-y-3 rounded-xl border p-4">
              <div>
                <p className="font-semibold">{h.displayName}</p>
                <p className="text-xs opacity-70">{h.email}</p>
                <p className="text-xs">
                  Bank:{" "}
                  {h.payoutReady
                    ? `set up (ending ${h.bankLast4 ?? "????"})`
                    : "NOT set up yet"}
                </p>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={!!idChecked[h._id]}
                  onChange={(e) =>
                    setIdChecked((s) => ({ ...s, [h._id]: e.target.checked }))
                  }
                />
                I have checked her ID and she is 18 or older
              </label>
              <div className="flex gap-2">
                <button
                  disabled={
                    busyId === h._id || !idChecked[h._id] || !h.payoutReady
                  }
                  onClick={() =>
                    run(
                      h._id,
                      () => approveHost({ hostId: h._id, idChecked: true }),
                      "Host approved",
                    )
                  }
                  className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
                >
                  Approve
                </button>
                <button
                  disabled={busyId === h._id}
                  onClick={() =>
                    run(
                      h._id,
                      () => suspendHost({ hostId: h._id }),
                      "Host suspended",
                    )
                  }
                  className="rounded-lg border px-4 py-2 text-sm disabled:opacity-40"
                >
                  Suspend
                </button>
              </div>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
