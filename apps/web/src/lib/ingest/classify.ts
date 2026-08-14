import { classeFromAlturaCm, isClasse, type Classe } from "@/lib/domain";

/** Result of vegetation classification (VLM HTTP or local stub). */
export type ClassifyResult = {
  classe: Classe | null;
  alturaCm: number | null;
  confidence: number;
  modelVersion: string;
  inferenceError: string | null;
  fake: boolean;
};

export type ClassifyImageInput = {
  filename: string;
  imageBytes: Uint8Array;
  contentType: string;
};

const STUB_MODEL = "stub-vlm-0.1";

/**
 * Offline stub mirroring `services/ai` fake filename heuristics.
 * Used when `VLM_INFERENCE_URL` is unset (local UI without AI process).
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

type VlmHttpBody = {
  classe?: unknown;
  altura_cm?: unknown;
  confidence?: unknown;
  model_version?: unknown;
  fake?: unknown;
  detail?: unknown;
};

function parseHttpVerdict(body: VlmHttpBody): ClassifyResult {
  const classe =
    body.classe === null || body.classe === undefined
      ? null
      : isClasse(body.classe)
        ? body.classe
        : undefined;
  if (classe === undefined) {
    throw new Error("invalid classe from inference API");
  }
  if (typeof body.confidence !== "number" || !Number.isFinite(body.confidence)) {
    throw new Error("invalid confidence from inference API");
  }
  if (typeof body.model_version !== "string" || !body.model_version) {
    throw new Error("invalid model_version from inference API");
  }
  const alturaCm =
    body.altura_cm === null || body.altura_cm === undefined
      ? null
      : typeof body.altura_cm === "number" && Number.isFinite(body.altura_cm)
        ? body.altura_cm
        : undefined;
  if (alturaCm === undefined) {
    throw new Error("invalid altura_cm from inference API");
  }
  return {
    classe,
    alturaCm,
    confidence: body.confidence,
    modelVersion: body.model_version,
    inferenceError: null,
    fake: body.fake === true,
  };
}

async function classifyViaHttp(
  baseUrl: string,
  input: ClassifyImageInput,
): Promise<ClassifyResult> {
  const url = `${baseUrl.replace(/\/$/, "")}/v1/classify`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      image_base64: Buffer.from(input.imageBytes).toString("base64"),
      content_type: input.contentType,
      filename: input.filename,
    }),
  });
  let body: VlmHttpBody = {};
  try {
    body = (await response.json()) as VlmHttpBody;
  } catch {
    body = {};
  }
  if (!response.ok) {
    const detail =
      typeof body.detail === "string"
        ? body.detail
        : `inference HTTP ${response.status}`;
    throw new Error(detail);
  }
  return parseHttpVerdict(body);
}

/**
 * Classify one image for Nova captura.
 * Prefers `VLM_INFERENCE_URL` (services/ai HTTP). Falls back to stub when unset.
 * On HTTP failure, returns null classe + inferenceError so the captura still persists.
 */
export async function classifyForIngest(
  input: ClassifyImageInput,
): Promise<ClassifyResult> {
  const inferenceUrl = process.env.VLM_INFERENCE_URL?.trim();
  if (!inferenceUrl) {
    return classifyImageStub(input.filename);
  }
  try {
    return await classifyViaHttp(inferenceUrl, input);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "inference request failed";
    return {
      classe: null,
      alturaCm: null,
      confidence: 0,
      modelVersion: "inference-error",
      inferenceError: message,
      fake: false,
    };
  }
}
