// Client-side only. Downsizes a picked photo and returns a JPEG data URI.
//
// Why: the image travels browser -> Convex action -> Cloudinary, and Convex
// caps action arguments at 8 MiB. A raw phone photo (5-12 MB, +33% as base64)
// would blow past that. 1280px on the long edge is plenty for a profile photo
// and usually lands around 150-300 KB.

const MAX_INPUT_BYTES = 25 * 1024 * 1024; // refuse absurd files before decoding

export async function fileToResizedDataUri(
  file: File,
  maxEdge = 1280,
  quality = 0.85,
): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Please choose an image file.");
  }
  if (file.size > MAX_INPUT_BYTES) {
    throw new Error("That image is over 25 MB. Please pick a smaller one.");
  }

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error("Couldn't read that image. Try a JPG or PNG.");
  }

  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    throw new Error("Your browser couldn't process that image.");
  }
  // JPEG has no transparency; paint white first so photos with transparent
  // corners (rare, but PNG uploads happen) don't go black.
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  return canvas.toDataURL("image/jpeg", quality);
}
