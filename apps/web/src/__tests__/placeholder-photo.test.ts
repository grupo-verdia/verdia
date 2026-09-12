import { describe, expect, it } from "vitest";

import {
  isPlaceholderPhoto,
  LEGACY_RED_PLACEHOLDER_PNG_BYTES,
  PLACEHOLDER_PNG_BYTES,
} from "@/lib/photo/placeholder";

describe("Excel photo stand-in", () => {
  it("treats the transparent and the old red pixel as no photo", () => {
    expect(isPlaceholderPhoto(PLACEHOLDER_PNG_BYTES)).toBe(true);
    expect(isPlaceholderPhoto(LEGACY_RED_PLACEHOLDER_PNG_BYTES)).toBe(true);
  });

  it("leaves a real JPEG alone", () => {
    expect(isPlaceholderPhoto(Uint8Array.from([0xff, 0xd8, 0xff, 10, 20]))).toBe(
      false,
    );
  });
});
