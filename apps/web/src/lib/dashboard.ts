import type { Captura } from "@/lib/domain";
import { getCapturaStore } from "@/lib/persistence";

export type CapturaDetail = {
  captura: Captura;
  photoBytes: Uint8Array;
  overlayBytes: Uint8Array | null;
};

/** Product read surface: capturas visible on the password-gated dashboard. */
export async function loadDashboardCapturas(): Promise<Captura[]> {
  return getCapturaStore().listCapturas();
}

/** Product read surface: captura detail with photo + optional segmentação overlay. */
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

  let overlayBytes: Uint8Array | null = null;
  if (captura.overlayStorageKey) {
    overlayBytes = await store.getStoredBytes(captura.overlayStorageKey);
  }

  return { captura, photoBytes, overlayBytes };
}
