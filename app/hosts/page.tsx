"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { HostCard } from "@/app/components/HostCard";

export default function HostsPage() {
  const hosts = useQuery(api.hosts.listApproved);

  if (hosts === undefined) return <p className="p-8">Loading…</p>;
  if (hosts.length === 0) return <p className="p-8">No hosts available yet.</p>;

  return (
    <main className="mx-auto max-w-6xl p-6">
      <h1 className="mb-6 text-3xl font-bold">Book a video call</h1>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
        {hosts.map((h) => (
          <HostCard
            key={h._id}
            // Convex returns null for "no photo"; HostCard expects undefined
            host={{ ...h, avatarUrl: h.avatarUrl ?? undefined }}
          />
        ))}
      </div>
    </main>
  );
}
