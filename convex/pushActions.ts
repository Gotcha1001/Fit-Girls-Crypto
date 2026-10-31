// convex/pushActions.ts
//
// Tells a host (by push notification) that someone just booked her.
// Triggered from lib/fulfilBooking.ts, which runs for BOTH Plisio and wallet payments.
import { internalAction, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";

type NotifyInfo = {
  hostUserId: Id<"users">;
  hostTimezone: string;
  startsAt: number;
  minutes: number;
};

// Everything the notifier needs, in one read.
export const getNotifyInfo = internalQuery({
  args: { bookingId: v.id("bookings") },
  handler: async (ctx, { bookingId }) => {
    const booking = await ctx.db.get(bookingId);
    if (!booking) return null;

    const host = await ctx.db.get(booking.hostId);
    if (!host) return null;

    return {
      hostUserId: host.userId,
      hostTimezone: booking.hostTimezone ?? host.timezone ?? "UTC",
      startsAt: booking.startsAt,
      minutes: booking.minutes,
    };
  },
});

function formatWhen(startsAt: number, timeZone: string): string {
  try {
    return new Intl.DateTimeFormat("en-ZA", {
      timeZone,
      weekday: "short",
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(new Date(startsAt));
  } catch {
    return new Date(startsAt).toISOString();
  }
}

export const notifyHostOfBooking = internalAction({
  args: { bookingId: v.id("bookings") },
  handler: async (ctx, { bookingId }): Promise<void> => {
    const info: NotifyInfo | null = await ctx.runQuery(
      internal.pushActions.getNotifyInfo,
      { bookingId },
    );
    if (!info) return;

    const subs = await ctx.runQuery(internal.pushSubscriptions.getAllForUser, {
      userId: info.hostUserId,
    });
    if (subs.length === 0) return; // she hasn't enabled notifications

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL;
    const secret = process.env.CRON_SECRET;
    if (!baseUrl || !secret) {
      console.error(
        "notifyHostOfBooking: set NEXT_PUBLIC_APP_URL and CRON_SECRET in the Convex dashboard env vars",
      );
      return;
    }

    const when = formatWhen(info.startsAt, info.hostTimezone);

    for (const sub of subs) {
      try {
        const res = await fetch(`${baseUrl}/api/push/send`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${secret}`,
          },
          body: JSON.stringify({
            subscription: sub.subscription,
            title: "💖 New booking!",
            body: `${info.minutes} min video call on ${when}`,
            url: "/bookings",
            tag: `booking-${bookingId}`,
          }),
        });

        if (res.status === 410 || res.status === 404) {
          await ctx.runMutation(internal.pushSubscriptions.removeExpired, {
            subscriptionId: sub._id,
          });
        } else if (!res.ok) {
          console.error(
            `Push failed (${res.status}) for subscription ${sub._id}`,
          );
        }
      } catch (err) {
        console.error("Push request error:", err);
      }
    }
  },
});
