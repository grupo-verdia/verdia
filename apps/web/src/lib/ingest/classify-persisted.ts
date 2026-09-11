import {
  isClassificationPending,
  type Captura,
} from "@/lib/domain";
import { classifyForIngest } from "@/lib/ingest/classify";
import {
  extensionForContentType,
  sniffImageContentType,
} from "@/lib/ingest/image-type";
import { getCapturaStore } from "@/lib/persistence";

/** Skip if already classified with no error. Retry if the last run failed. */
export async function classifyPersistedCaptura(id: string): Promise<Captura> {
  const store = getCapturaStore();
  const captura = await store.getCaptura(id);
  if (!captura) {
    throw new Error("captura not found");
  }
  if (captura.overrideAt) {
    if (!isClassificationPending(captura)) {
      return captura;
    }
    return store.applyClassification(id, {
      classe: captura.classe,
      confidence: captura.confidence ?? 0,
      modelVersion: captura.modelVersion ?? "manual",
      inferenceError: null,
      alturaCm: captura.alturaCm,
    });
  }
  if (!isClassificationPending(captura) && !captura.inferenceError) {
    return captura;
  }

  const imageBytes = await store.getStoredBytes(captura.storageKey);
  if (!imageBytes) {
    throw new Error("missing photo bytes");
  }

  const contentType = sniffImageContentType(imageBytes);
  const verdict = await classifyForIngest({
    filename: `${id}.${extensionForContentType(contentType)}`,
    imageBytes,
    contentType,
  });
  return store.applyClassification(id, {
    classe: verdict.classe,
    confidence: verdict.confidence,
    modelVersion: verdict.modelVersion,
    inferenceError: verdict.inferenceError,
    alturaCm: verdict.alturaCm,
  });
}
