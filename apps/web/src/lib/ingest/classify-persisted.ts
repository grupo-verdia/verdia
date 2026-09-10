import {
  isClassificationPending,
  type Captura,
} from "@/lib/domain";
import { classifyForIngest } from "@/lib/ingest/classify";
import { getCapturaStore } from "@/lib/persistence";

/** Run the VLM on a captura that was already saved. Skips a successful result. */
export async function classifyPersistedCaptura(id: string): Promise<Captura> {
  const store = getCapturaStore();
  const captura = await store.getCaptura(id);
  if (!captura) {
    throw new Error("captura not found");
  }
  if (!isClassificationPending(captura) && !captura.inferenceError) {
    return captura;
  }

  const imageBytes = await store.getStoredBytes(captura.storageKey);
  if (!imageBytes) {
    throw new Error("missing photo bytes");
  }

  const verdict = await classifyForIngest({
    filename: `${id}.jpg`,
    imageBytes,
    contentType: "image/jpeg",
  });
  return store.applyClassification(id, {
    classe: verdict.classe,
    confidence: verdict.confidence,
    modelVersion: verdict.modelVersion,
    inferenceError: verdict.inferenceError,
    alturaCm: verdict.alturaCm,
  });
}
