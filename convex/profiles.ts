import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireCurrentUser } from "./lib/auth";
import { distanceKm } from "./lib/geo";
import type { Doc, Id } from "./_generated/dataModel";

const genderValidator = v.union(
  v.literal("male"),
  v.literal("female"),
  v.literal("non_binary"),
);

const STARTING_COINS = 100;

const photoValidator = v.object({ url: v.string(), publicId: v.string() });
export interface ProfilePhoto {
  url: string;
  publicId: string;
}

// Used by the "join" form: creates a profile on first submit, updates it on
// every subsequent edit from Settings.
export const createOrUpdateProfile = mutation({
  args: {
    displayName: v.string(),
    age: v.number(),
    gender: genderValidator,
    seekingGenders: v.array(genderValidator),
    bio: v.string(),
    photos: v.array(photoValidator),
    city: v.string(),
    latitude: v.number(),
    longitude: v.number(),
  },
  handler: async (ctx, args): Promise<Id<"profiles">> => {
    const user = await requireCurrentUser(ctx);

    if (args.photos.length === 0) {
      throw new Error("Add at least one photo before continuing");
    }
    if (args.seekingGenders.length === 0) {
      throw new Error("Choose at least one preference for who you're seeking");
    }

    const existing = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        displayName: args.displayName,
        age: args.age,
        gender: args.gender,
        seekingGenders: args.seekingGenders,
        bio: args.bio,
        photos: args.photos,
        city: args.city,
        latitude: args.latitude,
        longitude: args.longitude,
        isOnboarded: true,
        lastActiveAt: Date.now(),
      });
      return existing._id;
    }

    return await ctx.db.insert("profiles", {
      userId: user._id,
      displayName: args.displayName,
      age: args.age,
      gender: args.gender,
      seekingGenders: args.seekingGenders,
      bio: args.bio,
      photos: args.photos,
      city: args.city,
      latitude: args.latitude,
      longitude: args.longitude,
      coins: STARTING_COINS,
      isOnboarded: true,
      lastActiveAt: Date.now(),
    });
  },
});

export const getMyProfile = query({
  args: {},
  handler: async (ctx): Promise<Doc<"profiles"> | null> => {
    const user = await requireCurrentUser(ctx);
    return await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();
  },
});

export const getProfileByUserId = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args): Promise<Doc<"profiles"> | null> => {
    await requireCurrentUser(ctx); // must be signed in to view portfolios
    return await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();
  },
});

export interface DiscoverResult {
  profile: Doc<"profiles">;
  distanceKm: number;
}

// Wraps the results with whether the caller even has a profile yet, so the
// client can tell "you haven't onboarded" apart from "no matches nearby"
// instead of the query just throwing on a brand-new account.
export interface DiscoverResponse {
  hasProfile: boolean;
  results: DiscoverResult[];
}

// Powers the Discover / search page: candidates whose gender matches what I'm
// seeking, who are also seeking my gender, within an optional radius.
export const searchProfiles = query({
  args: {
    maxDistanceKm: v.optional(v.number()),
    minAge: v.optional(v.number()),
    maxAge: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<DiscoverResponse> => {
    const user = await requireCurrentUser(ctx);

    const myProfile = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();

    if (!myProfile) {
      return { hasProfile: false, results: [] };
    }

    const candidates: Doc<"profiles">[] = [];
    for (const wantedGender of myProfile.seekingGenders) {
      const rows = await ctx.db
        .query("profiles")
        .withIndex("by_gender", (q) => q.eq("gender", wantedGender))
        .collect();
      candidates.push(...rows);
    }

    const seen = new Set<string>();
    const results: DiscoverResult[] = [];

    for (const candidate of candidates) {
      if (candidate.userId === myProfile.userId) continue;
      if (seen.has(candidate._id)) continue;
      seen.add(candidate._id);

      // Mutual preference: they must also be seeking my gender.
      if (!candidate.seekingGenders.includes(myProfile.gender)) continue;

      if (args.minAge !== undefined && candidate.age < args.minAge) continue;
      if (args.maxAge !== undefined && candidate.age > args.maxAge) continue;

      const km = distanceKm(
        myProfile.latitude,
        myProfile.longitude,
        candidate.latitude,
        candidate.longitude,
      );

      if (args.maxDistanceKm !== undefined && km > args.maxDistanceKm) {
        continue;
      }

      results.push({ profile: candidate, distanceKm: km });
    }

    results.sort((a, b) => a.distanceKm - b.distanceKm);
    return { hasProfile: true, results };
  },
});

// Minimum gap between real writes, so extra tabs / focus events don't
// hammer the database or re-trigger every subscribed query needlessly.
const PRESENCE_WRITE_THROTTLE_MS = 30_000;

// Called by the client heartbeat (see hooks/usePresenceHeartbeat.ts).
export const touchPresence = mutation({
  args: {},
  handler: async (ctx): Promise<void> => {
    const user = await requireCurrentUser(ctx);
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();
    if (!profile) return; // not onboarded yet, nothing to mark

    const now = Date.now();
    if (now - profile.lastActiveAt < PRESENCE_WRITE_THROTTLE_MS) return;

    await ctx.db.patch(profile._id, { lastActiveAt: now });
  },
});
