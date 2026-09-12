/**
 * Nova captura posts photos as base64 inside JSON, and the hosted function caps
 * a request body at 4.5 MB. Base64 inflates bytes by ~4/3, so anything above
 * WIRE_BUDGET_BYTES is re-encoded in the browser before upload. The operator can
 * pick photos up to MAX_UPLOAD_BYTES.
 */
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
export const MAX_UPLOAD_LABEL = "10 MB";
export const WIRE_BUDGET_BYTES = 3 * 1024 * 1024;

const MAX_EDGE_PX = 2400;
const QUALITY_STEPS = [0.82, 0.7, 0.55];

export function isWithinUploadLimit(file: { size: number }): boolean {
  return file.size <= MAX_UPLOAD_BYTES;
}

export function needsShrink(file: { size: number }): boolean {
  return file.size > WIRE_BUDGET_BYTES;
}

/** Keeps the aspect ratio and caps the longest edge, enough for the VLM. */
export function targetDimensions(
  width: number,
  height: number,
  maxEdge: number = MAX_EDGE_PX,
): { width: number; height: number } {
  const longest = Math.max(width, height);
  if (longest <= maxEdge || longest === 0) {
    return { width, height };
  }
  const scale = maxEdge / longest;
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

function toBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), "image/jpeg", quality);
  });
}

async function shrink(file: File): Promise<Blob | null> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const size = targetDimensions(bitmap.width, bitmap.height);
  const canvas = document.createElement("canvas");
  canvas.width = size.width;
  canvas.height = size.height;
  const context = canvas.getContext("2d");
  if (!context) {
    bitmap.close();
    return null;
  }
  context.drawImage(bitmap, 0, 0, size.width, size.height);
  bitmap.close();

  let smallest: Blob | null = null;
  for (const quality of QUALITY_STEPS) {
    const blob = await toBlob(canvas, quality);
    if (!blob) {
      break;
    }
    smallest = blob;
    if (blob.size <= WIRE_BUDGET_BYTES) {
      break;
    }
  }
  return smallest;
}

/** Bytes sent to /api/capturas/ingest. EXIF is read from the original file first. */
export async function prepareUpload(
  file: File,
): Promise<{ bytes: Blob; contentType: string }> {
  const original = { bytes: file as Blob, contentType: file.type || "image/jpeg" };
  if (!needsShrink(file) || typeof createImageBitmap !== "function") {
    return original;
  }
  try {
    const blob = await shrink(file);
    if (blob && blob.size < file.size) {
      return { bytes: blob, contentType: "image/jpeg" };
    }
  } catch {
    // Browser cannot decode this format: send the file as it came.
  }
  return original;
}
