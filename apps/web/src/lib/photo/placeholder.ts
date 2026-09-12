/** Tiny 1×1 transparent PNG stored when Excel rows have no photo. */
export const PLACEHOLDER_PNG_BYTES = Uint8Array.from(
  Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVR42mNgAAIAAAUAAen63NgAAAAASUVORK5CYII=",
    "base64",
  ),
);

/** Old Excel stand-in: 1×1 red. Still sitting on some imported capturas. */
export const LEGACY_RED_PLACEHOLDER_PNG_BYTES = Uint8Array.from(
  Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
    "base64",
  ),
);

export const NO_IMAGE_HREF = "/sem-imagem.png";

function sameBytes(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) {
    return false;
  }
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) {
      return false;
    }
  }
  return true;
}

function isOneByOnePng(bytes: Uint8Array): boolean {
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

/** True when the stored file is the Excel stand-in, not a roadside photo. */
export function isPlaceholderPhoto(bytes: Uint8Array): boolean {
  return (
    sameBytes(bytes, PLACEHOLDER_PNG_BYTES) ||
    sameBytes(bytes, LEGACY_RED_PLACEHOLDER_PNG_BYTES) ||
    isOneByOnePng(bytes)
  );
}
