// lib/watermark.ts
//
// Runs in the HOST's browser, before upload. It produces two JPEGs:
//   full    = the photo with her name small at the bottom (what buyers get)
//   preview = a heavily blurred version (what everyone else sees)
//
// Doing this in the browser means the un-watermarked original is never sent to
// or stored on the server, and it needs no server-side image library or fonts.

const MAX_FULL_SIDE = 1600; // longest side of the saved photo
const PREVIEW_SIDE = 480; // longest side of the preview
const BLUR_SAMPLE = 18; // preview is shrunk to this many px wide first

export type ProcessedPhoto = { full: Blob; preview: Blob };

function makeCanvas(w: number, h: number): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return c;
}

function toJpeg(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) =>
        blob ? resolve(blob) : reject(new Error("Could not process the image")),
      "image/jpeg",
      quality,
    );
  });
}

function fit(w: number, h: number, maxSide: number): [number, number] {
  const scale = Math.min(1, maxSide / Math.max(w, h));
  return [
    Math.max(1, Math.round(w * scale)),
    Math.max(1, Math.round(h * scale)),
  ];
}

function drawWatermark(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  name: string,
): void {
  const size = Math.max(14, Math.round(w * 0.03)); // small: ~3% of the width
  const pad = Math.round(size * 0.9);
  ctx.save();
  ctx.font = `600 ${size}px system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.shadowColor = "rgba(0,0,0,0.75)";
  ctx.shadowBlur = Math.round(size * 0.35);
  ctx.fillStyle = "rgba(255,255,255,0.88)";
  ctx.fillText(name, w / 2, h - pad);
  ctx.restore();
}

export async function processSecretPhoto(
  file: File,
  hostName: string,
): Promise<ProcessedPhoto> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Please choose an image file.");
  }
  let bitmap: ImageBitmap;
  try {
    // "from-image" respects the phone's rotation flag.
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    throw new Error("That image couldn't be read. Try a JPG or PNG.");
  }

  try {
    // 1. Full photo + watermark
    const [fw, fh] = fit(bitmap.width, bitmap.height, MAX_FULL_SIDE);
    const full = makeCanvas(fw, fh);
    const fctx = full.getContext("2d");
    if (!fctx) throw new Error("Your browser can't process images.");
    fctx.imageSmoothingQuality = "high";
    fctx.drawImage(bitmap, 0, 0, fw, fh);
    drawWatermark(fctx, fw, fh, hostName);

    // 2. Preview: shrink to a tiny image, then stretch it back up. The detail
    // is gone for good (it can't be un-blurred), and it works in every browser
    // (ctx.filter = "blur()" is not supported in Safari).
    const [pw, ph] = fit(bitmap.width, bitmap.height, PREVIEW_SIDE);
    const tinyW = BLUR_SAMPLE;
    const tinyH = Math.max(1, Math.round((BLUR_SAMPLE * ph) / pw));
    const tiny = makeCanvas(tinyW, tinyH);
    const tctx = tiny.getContext("2d");
    const preview = makeCanvas(pw, ph);
    const pctx = preview.getContext("2d");
    if (!tctx || !pctx) throw new Error("Your browser can't process images.");
    tctx.imageSmoothingQuality = "high";
    tctx.drawImage(bitmap, 0, 0, tinyW, tinyH);
    pctx.imageSmoothingEnabled = true;
    pctx.imageSmoothingQuality = "high";
    pctx.drawImage(tiny, 0, 0, pw, ph);

    return {
      full: await toJpeg(full, 0.86),
      preview: await toJpeg(preview, 0.7),
    };
  } finally {
    bitmap.close();
  }
}
