/** Tiny 1×1 PNG stored when Excel rows have no photo. */
export const PLACEHOLDER_PNG_BYTES = Uint8Array.from(
  Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVR42mNgAAIAAAUAAen63NgAAAAASUVORK5CYII=",
    "base64",
  ),
);

export const NO_IMAGE_HREF = "/sem-imagem.png";

/** True when the stored file is the Excel stand-in, not a roadside photo. */
export function isPlaceholderPhoto(bytes: Uint8Array): boolean {
  if (bytes.length < 24) {
    return false;
  }
  if (
    bytes[0] !== 0x89 ||
    bytes[1] !== 0x50 ||
    bytes[2] !== 0x4e ||
    bytes[3] !== 0x47
  ) {
    return false;
  }
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  return view.getUint32(16) === 1 && view.getUint32(20) === 1;
}
