import { describe, expect, it } from "vitest";

import {
  getCapturaStore,
  resetCapturaStore,
  resolveSupabaseConfig,
} from "@/lib/persistence";

describe("resolveSupabaseConfig", () => {
  it("resolves url and secret key", () => {
    expect(
      resolveSupabaseConfig({
        SUPABASE_URL: "https://example.supabase.co",
        SUPABASE_SECRET_KEY: "sb_secret_new",
      }),
    ).toEqual({
      url: "https://example.supabase.co",
      secretKey: "sb_secret_new",
    });
  });

  it("ignores the legacy service_role key", () => {
    expect(
      resolveSupabaseConfig({
        SUPABASE_URL: "https://example.supabase.co",
        SUPABASE_SERVICE_ROLE_KEY: "legacy-jwt",
      }),
    ).toBeNull();
  });

  it("returns null when url or key is missing", () => {
    expect(
      resolveSupabaseConfig({
        SUPABASE_SECRET_KEY: "sb_secret_new",
      }),
    ).toBeNull();

    expect(
      resolveSupabaseConfig({
        SUPABASE_URL: "https://example.supabase.co",
      }),
    ).toBeNull();
  });
});

describe("getCapturaStore", () => {
  it("throws when Supabase env is missing", () => {
    resetCapturaStore();
    const previousUrl = process.env.SUPABASE_URL;
    const previousKey = process.env.SUPABASE_SECRET_KEY;
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_SECRET_KEY;
    try {
      expect(() => getCapturaStore()).toThrow(/Supabase is required/);
    } finally {
      if (previousUrl === undefined) {
        delete process.env.SUPABASE_URL;
      } else {
        process.env.SUPABASE_URL = previousUrl;
      }
      if (previousKey === undefined) {
        delete process.env.SUPABASE_SECRET_KEY;
      } else {
        process.env.SUPABASE_SECRET_KEY = previousKey;
      }
      resetCapturaStore();
    }
  });
});
