import {
  action,
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { getCurrentUser, requireAdmin, requireCurrentUser } from "./lib/auth";
import { validateLocale } from "./lib/timezones";
import { assertValidIdImage } from "./idDocuments";

const CODE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // a code works for 7 days
const MAX_ATTEMPTS = 5;
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // no 0, O, 1, I, L

function normalizeCode(input: string): string {
  return input.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

// The code is never stored, only this hash (salted with the application id).
async function hashCode(
  applicationId: string,
  rawCode: string,
): Promise<string> {
  const data = new TextEncoder().encode(`${applicationId}:${rawCode}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

// ───────────── Step 1: client or girl ─────────────

export const chooseAccountType = mutation({
  args: {
    type: v.union(v.literal("client"), v.literal("girl")),
    // Captured in the same step as client vs girl, so nobody can finish
    // onboarding without a country and a time zone.
    country: v.string(),
    timezone: v.string(),
  },
  handler: async (ctx, { type, country, timezone }): Promise<null> => {
    const user = await requireCurrentUser(ctx);
    if (user.role !== "user") {
      throw new Error("Your account type is already set");
    }
    const locale = validateLocale(country, timezone);
    await ctx.db.patch(user._id, { onboardingChoice: type, ...locale });
    return null;
  },
});

// ───────────── Step 2: application ─────────────

// Her own latest application. Never returns the code hash.
export const myApplication = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return null;
    const app = await ctx.db
      .query("hostApplications")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .first();
    if (!app) return null;
    return {
      status: app.status,
      note: app.note ?? null,
      // Her own sign-up answers, used to pre-fill the host profile form.
      fullName: app.fullName,
      message: app.message,
      codeExpired:
        app.status === "approved" &&
        !!app.codeExpiresAt &&
        Date.now() > app.codeExpiresAt,
    };
  },
});

export const submitApplication = mutation({
  args: {
    fullName: v.string(),
    contact: v.optional(v.string()),
    message: v.string(),
    // Uploaded first via idDocuments.generateIdUploadUrl, private storage.
    idDocumentId: v.id("_storage"),
    selfieId: v.id("_storage"),
  },
  handler: async (ctx, args): Promise<null> => {
    const user = await requireCurrentUser(ctx);
    if (user.role !== "user" || user.onboardingChoice !== "girl") {
      throw new Error("Choose the host account type first");
    }

    const existing = await ctx.db
      .query("hostApplications")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .first();
    if (
      existing &&
      (existing.status === "pending" || existing.status === "approved")
    ) {
      throw new Error("You already have an application in progress");
    }

    const fullName = args.fullName.trim();
    const contact = args.contact?.trim();
    const message = args.message.trim();
    if (fullName.length < 3 || fullName.length > 80) {
      throw new Error("Enter your full name as it appears on your ID");
    }
    if (contact && contact.length > 40) throw new Error("Contact is too long");
    if (message.length > 500)
      throw new Error("Message must be 500 characters or fewer");

    // Both photos must exist in storage and be real, reasonably sized images.
    await assertValidIdImage(ctx, args.idDocumentId);
    await assertValidIdImage(ctx, args.selfieId);

    await ctx.db.insert("hostApplications", {
      userId: user._id,
      fullName,
      contact: contact || undefined,
      message,
      status: "pending",
      codeAttempts: 0,
      createdAt: Date.now(),
      idDocumentId: args.idDocumentId,
      selfieId: args.selfieId,
    });
    return null;
  },
});

// ───────────── Step 3: admin ─────────────

export const listApplications = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const pending = await ctx.db
      .query("hostApplications")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .collect();
    const approved = await ctx.db
      .query("hostApplications")
      .withIndex("by_status", (q) => q.eq("status", "approved"))
      .collect();

    return await Promise.all(
      [...pending, ...approved].map(async (a) => {
        const user = await ctx.db.get(a.userId);
        return {
          _id: a._id,
          status: a.status,
          fullName: a.fullName,
          contact: a.contact ?? null,
          message: a.message,
          email: user?.email ?? "",
          idChecked: a.idChecked ?? false,
          // true when she uploaded both photos (older applications may not have)
          idUploaded: !!a.idDocumentId && !!a.selfieId,
          codeExpiresAt: a.codeExpiresAt ?? null,
          createdAt: a.createdAt,
        };
      }),
    );
  },
});

export const rejectApplication = mutation({
  args: {
    applicationId: v.id("hostApplications"),
    note: v.optional(v.string()),
  },
  handler: async (ctx, { applicationId, note }): Promise<null> => {
    await requireAdmin(ctx);
    const app = await ctx.db.get(applicationId);
    if (!app) throw new Error("Application not found");
    if (app.status !== "pending" && app.status !== "approved") {
      throw new Error("This application can't be rejected any more");
    }

    // Don't keep ID photos of people we turned down.
    if (app.idDocumentId) await ctx.storage.delete(app.idDocumentId);
    if (app.selfieId) await ctx.storage.delete(app.selfieId);

    await ctx.db.patch(applicationId, {
      status: "rejected",
      note: note?.trim().slice(0, 200) || undefined,
      codeHash: undefined,
      codeExpiresAt: undefined,
      idDocumentId: undefined,
      selfieId: undefined,
      decidedAt: Date.now(),
    });
    return null;
  },
});

export const isAdminClerk = internalQuery({
  args: { clerkId: v.string() },
  handler: async (ctx, { clerkId }): Promise<boolean> => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", clerkId))
      .first();
    return user?.role === "admin";
  },
});

export const storeCode = internalMutation({
  args: {
    applicationId: v.id("hostApplications"),
    codeHash: v.string(),
    expiresAt: v.number(),
  },
  handler: async (
    ctx,
    { applicationId, codeHash, expiresAt },
  ): Promise<null> => {
    const app = await ctx.db.get(applicationId);
    if (!app) throw new Error("Application not found");
    if (app.status !== "pending" && app.status !== "approved") {
      throw new Error("This application can't get a code");
    }
    // The admin has reviewed her ID. Delete the photos from storage now so we
    // don't hold on to sensitive documents (and don't pay to store them).
    // idChecked + decidedAt remain as the record that the check happened.
    if (app.idDocumentId) await ctx.storage.delete(app.idDocumentId);
    if (app.selfieId) await ctx.storage.delete(app.selfieId);

    await ctx.db.patch(applicationId, {
      status: "approved",
      idChecked: true,
      codeHash,
      codeExpiresAt: expiresAt,
      codeAttempts: 0,
      idDocumentId: undefined,
      selfieId: undefined,
      decidedAt: Date.now(),
    });
    return null;
  },
});

// Approves the application (or re-issues a lost/expired code) and returns the
// code ONCE. It is generated in an action so the randomness is real.
export const issueCode = action({
  args: { applicationId: v.id("hostApplications"), idChecked: v.boolean() },
  handler: async (ctx, { applicationId, idChecked }): Promise<string> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not signed in");
    const isAdmin = await ctx.runQuery(internal.hostAccess.isAdminClerk, {
      clerkId: identity.subject,
    });
    if (!isAdmin) throw new Error("Forbidden – admin only");
    if (!idChecked) throw new Error("Confirm the ID check first");

    const bytes = new Uint8Array(8);
    crypto.getRandomValues(bytes);
    let raw = "";
    for (const b of bytes) raw += ALPHABET[b % ALPHABET.length];

    await ctx.runMutation(internal.hostAccess.storeCode, {
      applicationId,
      codeHash: await hashCode(applicationId, raw),
      expiresAt: Date.now() + CODE_TTL_MS,
    });

    return `${raw.slice(0, 4)}-${raw.slice(4)}`;
  },
});

// ───────────── Step 4: she enters the code ─────────────

// Returns a result instead of throwing on a wrong code, because a thrown error
// would roll back the attempt counter.
export const activateWithCode = mutation({
  args: { code: v.string() },
  handler: async (
    ctx,
    { code },
  ): Promise<{ ok: true } | { ok: false; reason: string }> => {
    const user = await requireCurrentUser(ctx);
    if (user.role === "host") return { ok: true };
    if (user.role !== "user")
      return { ok: false, reason: "Not available for this account" };

    const app = await ctx.db
      .query("hostApplications")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .first();

    if (
      !app ||
      app.status !== "approved" ||
      !app.codeHash ||
      !app.codeExpiresAt
    ) {
      return {
        ok: false,
        reason: "No access code has been issued for your account yet.",
      };
    }
    if (Date.now() > app.codeExpiresAt) {
      return {
        ok: false,
        reason: "This code has expired. Ask the admin for a new one.",
      };
    }
    if (app.codeAttempts >= MAX_ATTEMPTS) {
      return {
        ok: false,
        reason: "Too many wrong attempts. Ask the admin for a new code.",
      };
    }

    const given = await hashCode(app._id, normalizeCode(code));
    if (!safeEqual(given, app.codeHash)) {
      const used = app.codeAttempts + 1;
      await ctx.db.patch(app._id, { codeAttempts: used });
      const left = MAX_ATTEMPTS - used;
      return {
        ok: false,
        reason:
          left > 0
            ? `That code isn't right. ${left} ${left === 1 ? "try" : "tries"} left.`
            : "Too many wrong attempts. Ask the admin for a new code.",
      };
    }

    // Success: single-use. Wipe the hash and switch her to the girl side.
    await ctx.db.patch(app._id, {
      status: "activated",
      codeHash: undefined,
      codeExpiresAt: undefined,
    });
    await ctx.db.patch(user._id, { role: "host" });
    return { ok: true };
  },
});
