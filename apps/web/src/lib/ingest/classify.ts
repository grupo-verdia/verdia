import { classeFromAlturaCm, type Classe } from "@/lib/domain";

/** Result of vegetation classification (stub today; HTTP VLM later). */
export type ClassifyResult = {
  classe: Classe | null;
  alturaCm: number | null;
  confidence: number;
  modelVersion: string;
  inferenceError: string | null;
  fake: boolean;
};

const STUB_MODEL = "stub-vlm-0.1";

/**
 * Offline stub mirroring `services/ai` fake filename heuristics.
 * Swap body for HTTP Inference API when it lands (`VLM_INFERENCE_URL`).
 */
export function classifyImageStub(filename: string): ClassifyResult {
  const stem = filename.replace(/\.[^.]+$/, "").toLowerCase();
  const parts = new Set(stem.split(/[_\-\s.]+/).filter(Boolean));

  if (parts.has("na") || parts.has("null")) {
    return {
      classe: null,
      alturaCm: null,
      confidence: 0.5,
      modelVersion: STUB_MODEL,
      inferenceError: null,
      fake: true,
    };
  }

  let minCm: number;
  let maxCm: number;
  let confidence: number;
  if (parts.has("alta")) {
    minCm = 40;
    maxCm = 60;
    confidence = 0.7;
  } else if (parts.has("media") || parts.has("média")) {
    minCm = 15;
    maxCm = 25;
    confidence = 0.65;
  } else if (parts.has("baixa")) {
    minCm = 3;
    maxCm = 8;
    confidence = 0.7;
  } else {
    minCm = 15;
    maxCm = 25;
    confidence = 0.4;
  }

  const alturaCm = (minCm + maxCm) / 2;
  return {
    classe: classeFromAlturaCm(alturaCm),
    alturaCm,
    confidence,
    modelVersion: STUB_MODEL,
    inferenceError: null,
    fake: true,
  };
}

/**
 * Classify one image. Uses stub until Inference API is wired.
 * Optional `VLM_INFERENCE_URL` is reserved for the future HTTP path.
 */
export async function classifyForIngest(
  filename: string,
): Promise<ClassifyResult> {
  const inferenceUrl = process.env.VLM_INFERENCE_URL?.trim();
  if (inferenceUrl) {
    return {
      classe: null,
      alturaCm: null,
      confidence: 0,
      modelVersion: "pending-http",
      inferenceError:
        "Inference API URL set but HTTP client not wired yet; use stub path.",
      fake: false,
    };
  }
  return classifyImageStub(filename);
}
