import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentUser, requireCurrentUser } from "./lib/auth";

const MIN_AGE = 18;
const MAX_AGE = 120;

// Used by /verify-age. `ageVerified` is derived from ageConfirmedAt.
export const myAgeStatus = query({
  args: {},
  handler: async (ctx): Promise<{ ageVerified: boolean } | null> => {
    const user = await getCurrentUser(ctx);
    if (!user) return null;
    return { ageVerified: !!user.ageConfirmedAt };
  },
});

// Checks the date of birth on the server, records only a timestamp, and
// discards the date itself. createBooking requires ageConfirmedAt.
export const confirmAdult = mutation({
  args: { dateOfBirth: v.string() }, // "YYYY-MM-DD" from <input type="date">
  handler: async (ctx, { dateOfBirth }): Promise<null> => {
    const user = await requireCurrentUser(ctx);

    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateOfBirth);
    if (!m) throw new Error("Enter a valid date of birth");
    const year = Number(m[1]);
    const month = Number(m[2]);
    const day = Number(m[3]);

    // Reject impossible dates like 2000-02-31
    const probe = new Date(Date.UTC(year, month - 1, day));
    if (
      probe.getUTCFullYear() !== year ||
      probe.getUTCMonth() !== month - 1 ||
      probe.getUTCDate() !== day
    ) {
      throw new Error("Enter a valid date of birth");
    }

    const now = new Date();
    let age = now.getUTCFullYear() - year;
    const hadBirthday =
      now.getUTCMonth() + 1 > month ||
      (now.getUTCMonth() + 1 === month && now.getUTCDate() >= day);
    if (!hadBirthday) age -= 1;

    if (probe.getTime() > now.getTime() || age > MAX_AGE) {
      throw new Error("Enter a valid date of birth");
    }
    if (age < MIN_AGE) {
      throw new Error("You must be 18 or older to use this site");
    }

    await ctx.db.patch(user._id, { ageConfirmedAt: Date.now() });
    return null;
  },
});
