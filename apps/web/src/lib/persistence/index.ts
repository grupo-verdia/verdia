import { createMemoryStore } from "@/lib/persistence/memory";
import type { CapturaStore } from "@/lib/persistence/types";
import { createSupabaseStore } from "@/lib/persistence/supabase";

export type { CapturaStore, CreateCapturaInput } from "@/lib/persistence/types";
export { createMemoryStore } from "@/lib/persistence/memory";

let store: CapturaStore | null = null;

export function setCapturaStore(next: CapturaStore): void {
  store = next;
}

export function resetCapturaStore(): void {
  store = null;
}

function createStoreFromEnv(): CapturaStore {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (url && key) {
    return createSupabaseStore({ url, serviceRoleKey: key });
  }
  return createMemoryStore();
}

export function getCapturaStore(): CapturaStore {
  if (!store) {
    store = createStoreFromEnv();
  }
  return store;
}
