import { createMemoryStore } from "@/lib/persistence/memory";
import type { CapturaStore } from "@/lib/persistence/types";
import { createSupabaseStore } from "@/lib/persistence/supabase";

export type { CapturaStore, CreateCapturaInput } from "@/lib/persistence/types";
export { createMemoryStore } from "@/lib/persistence/memory";

export type SupabaseConfig = {
  url: string;
  secretKey: string;
};

/**
 * Next.js can load this module twice (RSC vs Route Handlers). Keep one store on
 * globalThis so Excel import writes are visible to Planejamento / Rodovias reads.
 */
const globalForCapturaStore = globalThis as typeof globalThis & {
  __verdiaCapturaStore?: CapturaStore | null;
};

export function setCapturaStore(next: CapturaStore): void {
  globalForCapturaStore.__verdiaCapturaStore = next;
}

export function resetCapturaStore(): void {
  globalForCapturaStore.__verdiaCapturaStore = null;
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
  return createMemoryStore({ seedDemo: true });
}

export function getCapturaStore(): CapturaStore {
  if (!globalForCapturaStore.__verdiaCapturaStore) {
    globalForCapturaStore.__verdiaCapturaStore = createStoreFromEnv();
  }
  return globalForCapturaStore.__verdiaCapturaStore;
}
