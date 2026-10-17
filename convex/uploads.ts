"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";
import { internal } from "./_generated/api";
import {
  uploadImageToCloudinary,
  deleteImageFromCloudinary,
  type CloudinaryImage,
} from "../lib/cloudinary";

const PROFILE_PHOTOS_FOLDER = "spark/profile-photos";

// Client resizes the photo to a JPEG data URI first (see lib/imageResize.ts)
// and calls this action instead of talking to Cloudinary directly, so the
// API key/secret never reach the browser.
export const uploadProfilePhoto = action({
  args: { imageDataUri: v.string() },
  handler: async (ctx, args): Promise<CloudinaryImage> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized – no signed-in user found");

    const image = await uploadImageToCloudinary(
      args.imageDataUri,
      PROFILE_PHOTOS_FOLDER,
    );

    // Record ownership immediately so this photo can be deleted later even
    // if the profile itself hasn't been saved yet (mid-onboarding).
    await ctx.runMutation(internal.assets.recordAsset, {
      publicId: image.publicId,
    });

    return image;
  },
});

// Called when a user removes a photo (either mid-edit before saving, or by
// replacing it later) so orphaned assets don't pile up in Cloudinary.
// Verifies the caller actually owns this publicId before deleting anything.
export const deleteProfilePhoto = action({
  args: { publicId: v.string() },
  handler: async (ctx, args): Promise<void> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized – no signed-in user found");

    const owns = await ctx.runQuery(internal.assets.assertOwnsAsset, {
      publicId: args.publicId,
    });
    if (!owns) {
      throw new Error("You can only delete photos you uploaded yourself");
    }

    await deleteImageFromCloudinary(args.publicId);
    await ctx.runMutation(internal.assets.removeAssetRecord, {
      publicId: args.publicId,
    });
  },
});
