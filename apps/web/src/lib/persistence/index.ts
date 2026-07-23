import { createMemoryStore } from "@/lib/persistence/memory";
import type { CapturaStore } from "@/lib/persistence/types";
import { createSupabaseStore } from "@/lib/persistence/supabase";

export type { CapturaStore, CreateCapturaInput } from "@/lib/persistence/types";
export { createMemoryStore } from "@/lib/persistence/memory";

export type SupabaseConfig = {
  url: string;
  secretKey: string;
};

let store: CapturaStore | null = null;

export function setCapturaStore(next: CapturaStore): void {
  store = next;
}

export function resetCapturaStore(): void {
  store = null;
}

/** Requires SUPABASE_URL + SUPABASE_SECRET_KEY (sb_secret_…). */
export function resolveSupabaseConfig(
  env: Record<string, string | undefined> = process.env,
): SupabaseConfig | null {
  const url = env.SUPABASE_URL;
  const secretKey = env.SUPABASE_SECRET_KEY;
  if (!url || !secretKey) {
    return null;
  }
  return { url, secretKey };
}

function createStoreFromEnv(): CapturaStore {
  const config = resolveSupabaseConfig();
  if (config) {
    return createSupabaseStore(config);
  }
  return createMemoryStore();
}

export function getCapturaStore(): CapturaStore {
  if (!store) {
    store = createStoreFromEnv();
  }
  return store;
}
