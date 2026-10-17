// convex/backfillLocale.ts
//
// ONE-OFF. Everyone who signed up before time zones existed was implicitly in
// South Africa, so they get ZA / Africa/Johannesburg. Run once after deploying
// the schema + functions, then delete this file:
//
//   npx convex run backfillLocale:users
//
// It pages through users, then chains into hosts on its own. Safe to run
// twice: it only fills rows that have no time zone yet.
import { internal } from "./_generated/api";
import { internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { LEGACY_TZ } from "./lib/schedule";

const LEGACY_COUNTRY = "ZA";
const PAGE = 100;

export const users = internalMutation({
  args: { cursor: v.optional(v.union(v.string(), v.null())) },
  handler: async (ctx, { cursor }) => {
    const page = await ctx.db
      .query("users")
      .paginate({ numItems: PAGE, cursor: cursor ?? null });

    let patched = 0;
    for (const u of page.page) {
      if (u.timezone && u.country) continue;
      await ctx.db.patch(u._id, {
        country: u.country ?? LEGACY_COUNTRY,
        timezone: u.timezone ?? LEGACY_TZ,
      });
      patched++;
    }

    if (page.isDone) {
      await ctx.scheduler.runAfter(0, internal.backfillLocale.hosts, {});
    } else {
      await ctx.scheduler.runAfter(0, internal.backfillLocale.users, {
        cursor: page.continueCursor,
      });
    }
    return { patched, done: page.isDone };
  },
});

export const hosts = internalMutation({
  args: { cursor: v.optional(v.union(v.string(), v.null())) },
  handler: async (ctx, { cursor }) => {
    const page = await ctx.db
      .query("hosts")
      .paginate({ numItems: PAGE, cursor: cursor ?? null });

    let patched = 0;
    for (const h of page.page) {
      if (h.timezone && h.country) continue;
      // Prefer her user's locale (already backfilled), else the legacy zone.
      const user = await ctx.db.get(h.userId);
      await ctx.db.patch(h._id, {
        country: h.country ?? user?.country ?? LEGACY_COUNTRY,
        timezone: h.timezone ?? user?.timezone ?? LEGACY_TZ,
      });
      patched++;
    }

    if (!page.isDone) {
      await ctx.scheduler.runAfter(0, internal.backfillLocale.hosts, {
        cursor: page.continueCursor,
      });
    }
    return { patched, done: page.isDone };
  },
});
