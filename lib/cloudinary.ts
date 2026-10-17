// "use node";

// // Thin wrapper around Cloudinary's REST API using signed requests, so we
// // never need the Cloudinary SDK. Two functions only: upload and delete.
// // Both are plain helpers (not Convex functions) -- they're imported by
// // actions in *Actions.ts / uploads.ts files, which is where the "use node"
// // runtime requirement actually comes from (we need node:crypto for the
// // signature).

// import crypto from "node:crypto";

// function getConfig(): {
//   cloudName: string;
//   apiKey: string;
//   apiSecret: string;
// } {
//   // Convex functions only see variables set on the Convex deployment (via
//   // `npx convex env set`), never the Next.js .env.local file.
//   const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
//   const apiKey = process.env.CLOUDINARY_API_KEY;
//   const apiSecret = process.env.CLOUDINARY_API_SECRET;

//   const missing: string[] = [];
//   if (!cloudName) missing.push("CLOUDINARY_CLOUD_NAME");
//   if (!apiKey) missing.push("CLOUDINARY_API_KEY");
//   if (!apiSecret) missing.push("CLOUDINARY_API_SECRET");
//   if (missing.length > 0 || !cloudName || !apiKey || !apiSecret) {
//     throw new Error(
//       `Missing Cloudinary env vars on this Convex deployment: ${missing.join(", ")}. Run "npx convex env set <NAME> <value>" for each.`,
//     );
//   }
//   return { cloudName, apiKey, apiSecret };
// }

// // Cloudinary signs requests by sorting all params (except file/api_key/
// // signature itself) alphabetically, joining as "key=value&key=value", and
// // SHA-1 hashing that string with the API secret appended.
// function sign(
//   params: Record<string, string | number>,
//   apiSecret: string,
// ): string {
//   const toSign = Object.keys(params)
//     .sort()
//     .map((key) => `${key}=${params[key]}`)
//     .join("&");
//   return crypto
//     .createHash("sha1")
//     .update(toSign + apiSecret)
//     .digest("hex");
// }

// export interface CloudinaryImage {
//   url: string;
//   publicId: string;
// }

// /**
//  * Uploads an image to Cloudinary.
//  * @param imageDataUri A data URI (e.g. "data:image/jpeg;base64,...") or a
//  *   remote https:// URL -- Cloudinary's upload endpoint accepts both.
//  * @param folder Cloudinary folder to organize uploads, e.g. "profile-photos".
//  */
// export async function uploadImageToCloudinary(
//   imageDataUri: string,
//   folder: string,
// ): Promise<CloudinaryImage> {
//   const { cloudName, apiKey, apiSecret } = getConfig();
//   const timestamp = Math.floor(Date.now() / 1000);
//   const signature = sign({ folder, timestamp }, apiSecret);

//   const form = new FormData();
//   form.append("file", imageDataUri);
//   form.append("api_key", apiKey);
//   form.append("timestamp", String(timestamp));
//   form.append("folder", folder);
//   form.append("signature", signature);

//   const res = await fetch(
//     `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
//     { method: "POST", body: form },
//   );

//   if (!res.ok) {
//     const text = await res.text();
//     throw new Error(`Cloudinary upload failed (${res.status}): ${text}`);
//   }

//   const json = (await res.json()) as { secure_url: string; public_id: string };
//   return { url: json.secure_url, publicId: json.public_id };
// }

// /**
//  * Deletes an image from Cloudinary by its public_id. Treats "not found"
//  * as success, since that just means the asset is already gone -- callers
//  * (e.g. a remove-photo flow) shouldn't fail just because cleanup already
//  * happened once before.
//  */
// export async function deleteImageFromCloudinary(
//   publicId: string,
// ): Promise<void> {
//   const { cloudName, apiKey, apiSecret } = getConfig();
//   const timestamp = Math.floor(Date.now() / 1000);
//   const signature = sign({ public_id: publicId, timestamp }, apiSecret);

//   const body = new URLSearchParams({
//     public_id: publicId,
//     api_key: apiKey,
//     timestamp: String(timestamp),
//     signature,
//   });

//   const res = await fetch(
//     `https://api.cloudinary.com/v1_1/${cloudName}/image/destroy`,
//     {
//       method: "POST",
//       headers: { "Content-Type": "application/x-www-form-urlencoded" },
//       body,
//     },
//   );

//   if (!res.ok) {
//     const text = await res.text();
//     throw new Error(`Cloudinary delete failed (${res.status}): ${text}`);
//   }

//   const json = (await res.json()) as { result: string };
//   if (json.result !== "ok" && json.result !== "not found") {
//     throw new Error(
//       `Cloudinary delete returned unexpected result: ${json.result}`,
//     );
//   }
// }
"use node";

// Thin wrapper around Cloudinary's REST API using signed requests, so we
// never need the Cloudinary SDK. Two functions only: upload and delete.
// Both are plain helpers (not Convex functions) -- they're imported by
// actions in *Actions.ts / uploads.ts files, which is where the "use node"
// runtime requirement actually comes from (we need node:crypto for the
// signature).

import crypto from "node:crypto";

function getConfig(): {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
} {
  // Convex functions only see variables set on the Convex deployment (via
  // `npx convex env set`), never the Next.js .env.local file -- regardless
  // of which of these two names you used when setting them.
  const cloudName =
    process.env.CLOUDINARY_CLOUD_NAME ??
    process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const apiKey =
    process.env.CLOUDINARY_API_KEY ??
    process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  const missing: string[] = [];
  if (!cloudName)
    missing.push(
      "CLOUDINARY_CLOUD_NAME (or NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME)",
    );
  if (!apiKey)
    missing.push("CLOUDINARY_API_KEY (or NEXT_PUBLIC_CLOUDINARY_API_KEY)");
  if (!apiSecret) missing.push("CLOUDINARY_API_SECRET");
  if (missing.length > 0 || !cloudName || !apiKey || !apiSecret) {
    throw new Error(
      `Missing Cloudinary env vars on this Convex deployment: ${missing.join(", ")}. Run "npx convex env set <NAME> <value>" for each -- .env.local is never read here.`,
    );
  }
  return { cloudName, apiKey, apiSecret };
}

// Cloudinary signs requests by sorting all params (except file/api_key/
// signature itself) alphabetically, joining as "key=value&key=value", and
// SHA-1 hashing that string with the API secret appended.
function sign(
  params: Record<string, string | number>,
  apiSecret: string,
): string {
  const toSign = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join("&");
  return crypto
    .createHash("sha1")
    .update(toSign + apiSecret)
    .digest("hex");
}

export interface CloudinaryImage {
  url: string;
  publicId: string;
}

/**
 * Uploads an image to Cloudinary.
 * @param imageDataUri A data URI (e.g. "data:image/jpeg;base64,...") or a
 *   remote https:// URL -- Cloudinary's upload endpoint accepts both.
 * @param folder Cloudinary folder to organize uploads, e.g. "profile-photos".
 */
export async function uploadImageToCloudinary(
  imageDataUri: string,
  folder: string,
): Promise<CloudinaryImage> {
  const { cloudName, apiKey, apiSecret } = getConfig();
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = sign({ folder, timestamp }, apiSecret);

  const form = new FormData();
  form.append("file", imageDataUri);
  form.append("api_key", apiKey);
  form.append("timestamp", String(timestamp));
  form.append("folder", folder);
  form.append("signature", signature);

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
    { method: "POST", body: form },
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Cloudinary upload failed (${res.status}): ${text}`);
  }

  const json = (await res.json()) as { secure_url: string; public_id: string };
  return { url: json.secure_url, publicId: json.public_id };
}

/**
 * Deletes an image from Cloudinary by its public_id. Treats "not found"
 * as success, since that just means the asset is already gone -- callers
 * (e.g. a remove-photo flow) shouldn't fail just because cleanup already
 * happened once before.
 */
export async function deleteImageFromCloudinary(
  publicId: string,
): Promise<void> {
  const { cloudName, apiKey, apiSecret } = getConfig();
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = sign({ public_id: publicId, timestamp }, apiSecret);

  const body = new URLSearchParams({
    public_id: publicId,
    api_key: apiKey,
    timestamp: String(timestamp),
    signature,
  });

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/image/destroy`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    },
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Cloudinary delete failed (${res.status}): ${text}`);
  }

  const json = (await res.json()) as { result: string };
  if (json.result !== "ok" && json.result !== "not found") {
    throw new Error(
      `Cloudinary delete returned unexpected result: ${json.result}`,
    );
  }
}
