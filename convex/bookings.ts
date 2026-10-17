// convex/bookings.ts
import {
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { split } from "./lib/fees";
import { getCurrentUser, requireCurrentUser } from "./lib/auth";
import type { Id } from "./_generated/dataModel";
import {
  GAP_MINUTES,
  GAP_MS,
  MAX_CALL_MINUTES,
  MIN_MS,
  dayIndexOf,
  isSlotBookable,
  isValidTimeZone,
  lastBookableDay,
} from "./lib/schedule";
import { clashesWithGap, fitsInRuns, isOnGrid, openRuns } from "./lib/slots";
import {
  bookingEnd,
  holdsSlot,
  loadWeekly,
  requireHostTz,
  workingHoursOn,
} from "./lib/availability";
import { loadRates } from "./lib/fxRates";
import {
  CHARGE_CURRENCY,
  convertMinor,
  currencyForCountry,
} from "./lib/currency";

const MAX_MINUTES = MAX_CALL_MINUTES; // longest allowed booking; keeps the overlap lookback exact
const PENDING_EXPIRY_MS = 15 * MIN_MS;

export const createBooking = mutation({
  args: { hostId: v.id("hosts"), startsAt: v.number(), minutes: v.number() },
  handler: async (ctx, { hostId, startsAt, minutes }) => {
    const guest = await requireCurrentUser(ctx);

    // Clients only, enforced server-side (the page guard is just for UX).
    if (guest.role !== "user" || guest.onboardingChoice !== "client") {
      throw new Error("Only client accounts can book a call");
    }
    // Age gate, enforced server-side (not just by a redirect)
    if (!guest.ageConfirmedAt) throw new Error("Age verification required");
    // The client's zone is snapshotted on the booking (receipts, reminders).
    if (!guest.timezone || !isValidTimeZone(guest.timezone)) {
      throw new Error("Please set your time zone before booking");
    }

    if (!Number.isInteger(minutes) || minutes <= 0 || minutes > MAX_MINUTES) {
      throw new Error(`Duration must be 1-${MAX_MINUTES} minutes`);
    }

    // ── host first: every "day" and "hour" below is in HER zone ──
    const host = await ctx.db.get(hostId);
    if (
      !host ||
      host.status !== "approved" ||
      host.kycStatus !== "verified" ||
      !host.payoutAccountRef
    ) {
      throw new Error("Host unavailable");
    }
    const tz = requireHostTz(host);
    if (minutes < host.minMinutes) throw new Error("Below minimum duration");

    // ── time rules ──
    const now = Date.now();
    if (!Number.isFinite(startsAt) || !isOnGrid(startsAt)) {
      throw new Error("Start time must be on a 5-minute mark");
    }
    if (!isSlotBookable(startsAt, now)) {
      throw new Error("Bookings close 1 hour before the start time");
    }
    if (dayIndexOf(startsAt, tz) > lastBookableDay(now, tz)) {
      throw new Error("That date is too far ahead");
    }

    // No self-booking
    if (host.userId === guest._id) throw new Error("You can't book yourself");

    // Host-side block list
    const blocked = await ctx.db
      .query("blocks")
      .withIndex("by_host_user", (q) =>
        q.eq("hostId", hostId).eq("blockedUserId", guest._id),
      )
      .first();
    if (blocked) throw new Error("Host unavailable");

    const endsAt = startsAt + minutes * MIN_MS;

    // ── must be inside her working hours (one unbroken run, her local day) ──
    const dayIndex = dayIndexOf(startsAt, tz);
    const weekly = await loadWeekly(ctx, hostId);
    const hours = await workingHoursOn(ctx, hostId, weekly, dayIndex);
    if (!fitsInRuns(startsAt, endsAt, openRuns(dayIndex, [...hours], tz))) {
      throw new Error("That call doesn't fit inside her working hours");
    }

    // ── no overlap, and a GAP_MINUTES break on both sides ──
    // Pure UTC maths: no zone needed from here on.
    // A booking can only matter if it starts within MAX minutes + gap before
    // our start, or before our end + gap.
    const nearby = await ctx.db
      .query("bookings")
      .withIndex("by_host_time", (q) =>
        q
          .eq("hostId", hostId)
          .gte("startsAt", startsAt - (MAX_MINUTES * MIN_MS + GAP_MS))
          .lt("startsAt", endsAt + GAP_MS),
      )
      .collect();

    let clash = false;
    for (const b of nearby) {
      if (!holdsSlot(b.status)) continue; // cancelled / expired / refunded
      if (
        !clashesWithGap(startsAt, endsAt, [
          { startsAt: b.startsAt, endsAt: bookingEnd(b) },
        ])
      ) {
        continue;
      }
      // The guest's own unpaid attempt (e.g. they closed the payment tab)
      // must not block a retry. Release it and carry on.
      if (b.status === "pending_payment" && b.guestId === guest._id) {
        await ctx.db.patch(b._id, { status: "cancelled" });
        continue;
      }
      clash = true;
    }
    if (clash) {
      throw new Error(
        `Time slot taken (she keeps a ${GAP_MINUTES}-minute break between calls)`,
      );
    }

    // Price is always computed here from the host's rate, never from the browser
    // Her rate is in HER currency. The gateway charges in CHARGE_CURRENCY, so
    // convert once here and keep both numbers on the booking.
    const rates = await loadRates(ctx);
    const hostCurrency = currencyForCountry(host.country, rates);
    const priceMinor = host.ratePerMinuteCents * minutes;
    const amountCents = convertMinor(
      priceMinor,
      hostCurrency,
      CHARGE_CURRENCY,
      rates,
    );
    const fees = split(amountCents);

    const bookingId = await ctx.db.insert("bookings", {
      hostId,
      guestId: guest._id,
      startsAt,
      endsAt,
      minutes,
      amountCents,
      ...fees,
      status: "pending_payment",
      // Snapshots: stay correct even if either person changes zone later.
      hostTimezone: tz,
      guestTimezone: guest.timezone,
    });

    // Release the slot if payment doesn't arrive
    await ctx.scheduler.runAfter(
      PENDING_EXPIRY_MS,
      internal.bookings.expireIfUnpaid,
      { bookingId },
    );

    return bookingId;
  },
});

export const expireIfUnpaid = internalMutation({
  args: { bookingId: v.id("bookings") },
  handler: async (ctx, { bookingId }) => {
    const booking = await ctx.db.get(bookingId);
    if (booking && booking.status === "pending_payment") {
      await ctx.db.patch(bookingId, { status: "expired" });
    }
  },
});

// Called only by the initCheckout action, which passes the caller's Clerk ID
// (identity.subject) so ownership can be verified here.
export const getForCheckout = internalQuery({
  args: { bookingId: v.id("bookings"), clerkId: v.string() },
  handler: async (ctx, { bookingId, clerkId }) => {
    const booking = await ctx.db.get(bookingId);
    if (!booking) throw new Error("Booking not found");
    if (booking.status !== "pending_payment") {
      throw new Error("Booking is not awaiting payment");
    }
    const guest = await ctx.db.get(booking.guestId);
    if (!guest) throw new Error("Guest not found");
    if (guest.clerkId !== clerkId) throw new Error("Not your booking");
    const host = await ctx.db.get(booking.hostId);
    if (!host) throw new Error("Host not found");
    if (host.status !== "approved") throw new Error("Host unavailable");
    if (!host.payoutAccountRef) throw new Error("Host has no payout account");

    return {
      hostId: host._id,
      payerId: guest._id,
      guestEmail: guest.email,
      hostSubaccountCode: host.payoutAccountRef,
      amountCents: booking.amountCents,
      platformFeeCents: booking.platformFeeCents,
    };
  },
});

export const getMine = query({
  // string, not v.id: a malformed ID in the URL should show "not found", not crash
  args: { bookingId: v.string() },
  handler: async (ctx, { bookingId: rawId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const bookingId = ctx.db.normalizeId("bookings", rawId);
    if (!bookingId) return null;

    const booking = await ctx.db.get(bookingId);
    if (!booking) return null;

    const guest = await ctx.db.get(booking.guestId);
    const host = await ctx.db.get(booking.hostId);
    if (!guest || !host) return null;
    const hostUser = await ctx.db.get(host.userId);

    // only the guest or the host may view
    const isGuest = guest.clerkId === identity.subject;
    const isHost = hostUser?.clerkId === identity.subject;
    if (!isGuest && !isHost) return null;

    // Once paid, expose the call session so the page can show "Join call"
    const session = await ctx.db
      .query("callSessions")
      .withIndex("by_booking", (q) => q.eq("bookingId", bookingId))
      .first();

    return {
      ...booking,
      // The zones the booking was made in; fall back to the current zone for
      // bookings that predate the snapshot fields.
      hostTimezone: booking.hostTimezone ?? host.timezone ?? null,
      guestTimezone: booking.guestTimezone ?? guest.timezone ?? null,
      hostName: host.displayName,
      isGuest,
      isHost,
      callSessionId: session?._id ?? null,
    };
  },
});

const LIST_LIMIT = 100;
const MIN_MS_LIST = 60_000;

// "My Bookings": bookings the caller made as a guest, plus (if she is a host)
// bookings other people made with her. Cancelled and expired attempts are
// hidden to avoid clutter from abandoned payments. Never returns emails.
export const listMine = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return null;

    const callSessionFor = async (bookingId: Id<"bookings">) => {
      const s = await ctx.db
        .query("callSessions")
        .withIndex("by_booking", (q) => q.eq("bookingId", bookingId))
        .first();
      return s?._id ?? null;
    };

    const visible = (status: string) =>
      status !== "cancelled" && status !== "expired";

    // ── As guest ──
    const guestRows = await ctx.db
      .query("bookings")
      .withIndex("by_guest", (q) => q.eq("guestId", user._id))
      .order("desc")
      .take(LIST_LIMIT);

    const asGuest = await Promise.all(
      guestRows
        .filter((b) => visible(b.status))
        .map(async (b) => {
          const host = await ctx.db.get(b.hostId);
          return {
            _id: b._id,
            startsAt: b.startsAt,
            endsAt: b.endsAt ?? b.startsAt + b.minutes * MIN_MS_LIST,
            minutes: b.minutes,
            status: b.status,
            amountCents: b.amountCents,
            otherName: host?.displayName ?? "Host",
            hostTimezone: b.hostTimezone ?? host?.timezone ?? null,
            guestTimezone: b.guestTimezone ?? user.timezone ?? null,
            callSessionId:
              b.status === "paid" ? await callSessionFor(b._id) : null,
          };
        }),
    );

    // ── As host ──
    const myHost = await ctx.db
      .query("hosts")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .unique();

    const asHost = myHost
      ? await Promise.all(
          (
            await ctx.db
              .query("bookings")
              .withIndex("by_host", (q) => q.eq("hostId", myHost._id))
              .order("desc")
              .take(LIST_LIMIT)
          )
            .filter((b) => visible(b.status))
            .map(async (b) => {
              const guest = await ctx.db.get(b.guestId);
              return {
                _id: b._id,
                startsAt: b.startsAt,
                endsAt: b.endsAt ?? b.startsAt + b.minutes * MIN_MS_LIST,
                minutes: b.minutes,
                status: b.status,
                hostShareCents: b.hostShareCents, // what she earns
                otherName: guest?.name ?? "Guest",
                hostTimezone: b.hostTimezone ?? myHost.timezone ?? null,
                guestTimezone: b.guestTimezone ?? guest?.timezone ?? null,
                callSessionId:
                  b.status === "paid" ? await callSessionFor(b._id) : null,
              };
            }),
        )
      : [];

    return { asGuest, asHost, isHost: !!myHost };
  },
});
