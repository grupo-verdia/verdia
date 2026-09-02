import type { Captura } from "@/lib/domain";
import { getCapturaStore } from "@/lib/persistence";

export type CapturaDetail = {
  captura: Captura;
  photoBytes: Uint8Array;
};

/** Capturas listed on the dashboard. */
export async function loadDashboardCapturas(): Promise<Captura[]> {
  return getCapturaStore().listCapturas();
}

/** Captura detail with photo. */
export async function loadCapturaDetail(
  id: string,
): Promise<CapturaDetail | null> {
  const store = getCapturaStore();
  const captura = await store.getCaptura(id);
  if (!captura) {
    return null;
  }

  const photoBytes = await store.getStoredBytes(captura.storageKey);
  if (!photoBytes) {
    throw new Error(`missing photo bytes for captura ${id}`);
  }

  return { captura, photoBytes };
}
