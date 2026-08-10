import type { Captura as LegacyCaptura } from "@/lib/domain";
import {
  getCaptura,
  getCapturaImageBytes,
  listCapturas,
} from "@/lib/verdia-store";
import type { Captura as VerdiaCaptura } from "@/lib/verdia-domain";

export type CapturaDetail = {
  captura: LegacyCaptura & { overlayStorageKey?: string | null };
  photoBytes: Uint8Array;
  overlayBytes: Uint8Array | null;
};

function toLegacy(captura: VerdiaCaptura): LegacyCaptura & {
  overlayStorageKey?: string | null;
} {
  return {
    id: captura.id,
    trechoId: captura.trechoId ?? captura.id,
    storageKey: captura.storageKey,
    lat: captura.lat,
    lon: captura.lon,
    capturedAt: captura.capturedAt,
    classe: captura.classeFinal ?? captura.aiClasse,
    confidence: captura.aiConfidence,
    modelVersion: captura.modelVersion,
    inferenceError: captura.inferenceError,
    overlayStorageKey: null,
  };
}

/** Product read surface: capturas visible on the password-gated dashboard. */
export async function loadDashboardCapturas(): Promise<LegacyCaptura[]> {
  const capturas = await listCapturas();
  return capturas.map(toLegacy);
}

/** Product read surface: captura detail with photo bytes when available. */
export async function loadCapturaDetail(
  id: string,
): Promise<CapturaDetail | null> {
  const captura = await getCaptura(id);
  if (!captura) return null;

  const photoBytes =
    (await getCapturaImageBytes(captura.storageKey)) ?? new Uint8Array();

  return {
    captura: toLegacy(captura),
    photoBytes,
    overlayBytes: null,
  };
}
