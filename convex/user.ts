// convex/user.ts
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { normalizeAppearance } from "@/lib/appearance";
import { requireCurrentUser } from "./lib/auth";
import { validateLocale } from "./lib/timezones";

export const createOrGet = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized – no identity found");
    }

    const clerkId = identity.subject;
    const existing = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", clerkId))
      .first();
    if (existing) return existing;

    const email = typeof identity.email === "string" ? identity.email : "";
    const name =
      typeof identity.name === "string"
        ? identity.name
        : typeof identity.givenName === "string"
          ? identity.givenName
          : "Unknown User";
    const imageUrl =
      typeof identity.pictureUrl === "string"
        ? identity.pictureUrl
        : typeof identity.picture === "string"
          ? identity.picture
          : undefined;

    // First account ever created becomes admin. Check + insert happen in the
    // same mutation, and Convex serializes conflicting writes, so two
    // simultaneous sign-ups cannot both win.
    const existingAdmin = await ctx.db
      .query("users")
      .withIndex("by_role", (q) => q.eq("role", "admin"))
      .first();

    // country + timezone are NOT set here: the person picks them on the
    // choose-role step (chooseAccountType). Until then RouteGuard sends
    // them to the locale step.
    const userId = await ctx.db.insert("users", {
      clerkId,
      email,
      name,
      imageUrl,
      role: existingAdmin ? ("user" as const) : ("admin" as const),
      createdAt: Date.now(),
    });
    return await ctx.db.get(userId);
  },
});

export const getMe = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    return (
      (await ctx.db
        .query("users")
        .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
        .first()) ?? null
    );
  },
});

export const setAppearance = mutation({
  args: {
    appearance: v.object({
      accent: v.string(),
      rainMode: v.string(),
      rainDensity: v.number(),
      rainSpeed: v.number(),
      rainOpacity: v.number(),
      glow: v.boolean(),
    }),
  },
  handler: async (ctx, { appearance }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const existing = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();
    if (!existing) throw new Error("User not found");

    await ctx.db.patch(existing._id, {
      appearance: normalizeAppearance(appearance),
    });
  },
});

/**
 * Change my country + time zone (settings page, or the RouteGuard safety net
 * for old accounts).
 *
 * If I am a host, her host row is kept in step, and when her ZONE changes her
 * one-day overrides are deleted: they are keyed by local day index, which
 * means something different in the new zone. Weekly hours are wall-clock
 * hours, so they follow her zone on their own. Existing bookings are UTC
 * instants and stay valid.
 */
export const setLocale = mutation({
  args: { country: v.string(), timezone: v.string() },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);
    const { country, timezone } = validateLocale(args.country, args.timezone);

    await ctx.db.patch(user._id, { country, timezone });

    let clearedOverrides = 0;
    const host = await ctx.db
      .query("hosts")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .unique();

    if (host) {
      const zoneChanged = host.timezone !== timezone;
      await ctx.db.patch(host._id, { country, timezone });

      if (zoneChanged) {
        const overrides = await ctx.db
          .query("hostDayOverrides")
          .withIndex("by_host", (q) => q.eq("hostId", host._id))
          .collect();
        for (const o of overrides) await ctx.db.delete(o._id);
        clearedOverrides = overrides.length;
      }
    }

    return { country, timezone, clearedOverrides };
  },
});
