import { describe, expect, it } from "vitest";

import { resolveSupabaseConfig } from "@/lib/persistence";

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
