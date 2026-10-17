import { mutation, query, type MutationCtx } from "./_generated/server";
import { v } from "convex/values";
import { requireAdmin, requireCurrentUser } from "./lib/auth";

const ALLOWED = ["image/jpeg", "image/png", "image/webp"];
const MAX_BYTES = 8 * 1024 * 1024; // 8 MB

// Step 1 of the upload: a one-time URL the browser POSTs the file to.
// Files land in Convex storage, which is private. They are only ever
// shown to admins, through getApplicationIdUrls below.
export const generateIdUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await requireCurrentUser(ctx);
    if (user.role !== "user" || user.onboardingChoice !== "girl") {
      throw new Error("Only host applicants can upload ID documents");
    }
    return await ctx.storage.generateUploadUrl();
  },
});

// Call from submitApplication for each uploaded file.
export async function assertValidIdImage(
  ctx: MutationCtx,
  storageId: import("./_generated/dataModel").Id<"_storage">,
) {
  const meta = await ctx.db.system.get(storageId);
  if (!meta)
    throw new Error("Upload not found. Please upload the photo again.");
  if (!ALLOWED.includes(meta.contentType ?? "")) {
    await ctx.storage.delete(storageId);
    throw new Error("Upload a JPG, PNG or WebP photo.");
  }
  if (meta.size > MAX_BYTES) {
    await ctx.storage.delete(storageId);
    throw new Error("Photo is too large (8 MB max).");
  }
}

// Admin only. Returns links to view her ID and selfie while reviewing.
// Don't share these links, and don't render them anywhere but the admin page.
export const getApplicationIdUrls = query({
  args: { applicationId: v.id("hostApplications") },
  handler: async (ctx, { applicationId }) => {
    await requireAdmin(ctx);
    const app = await ctx.db.get(applicationId);
    if (!app) return null;
    return {
      idUrl: app.idDocumentId
        ? await ctx.storage.getUrl(app.idDocumentId)
        : null,
      selfieUrl: app.selfieId ? await ctx.storage.getUrl(app.selfieId) : null,
    };
  },
});
