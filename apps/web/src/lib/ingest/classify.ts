import { isClasse, type Classe } from "@/lib/domain";
import { classifyViaGoogle } from "@/lib/ingest/classify-google";

/** Result of vegetation classification (Google or Python HTTP). */
export type ClassifyResult = {
  classe: Classe | null;
  alturaCm: number | null;
  confidence: number;
  modelVersion: string;
  inferenceError: string | null;
  fake: boolean;
  /** Short AI rationale shown on the upload report. */
  justificativa: string | null;
};

export type ClassifyImageInput = {
  filename: string;
  imageBytes: Uint8Array;
  contentType: string;
};

export const CLASSIFIER_UNAVAILABLE =
  "Classificador de vegetação não configurado.";

type VlmHttpBody = {
  classe?: unknown;
  altura_cm?: unknown;
  confidence?: unknown;
  model_version?: unknown;
  fake?: unknown;
  justificativa?: unknown;
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
  const justificativa =
    typeof body.justificativa === "string" && body.justificativa.trim()
      ? body.justificativa.trim()
      : null;
  return {
    classe,
    alturaCm,
    confidence: body.confidence,
    modelVersion: body.model_version,
    inferenceError: null,
    fake: body.fake === true,
    justificativa,
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

function failedClassification(message: string): ClassifyResult {
  return {
    classe: null,
    alturaCm: null,
    confidence: 0,
    modelVersion: "inference-error",
    inferenceError: message,
    fake: false,
    justificativa: null,
  };
}

/** Google key, else Python HTTP, else error. */
export async function classifyForIngest(
  input: ClassifyImageInput,
): Promise<ClassifyResult> {
  const apiKey = process.env.GOOGLE_API_KEY?.trim();
  if (apiKey) {
    try {
      return await classifyViaGoogle(input, apiKey);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "inference request failed";
      return failedClassification(message);
    }
  }
  const inferenceUrl = process.env.VLM_INFERENCE_URL?.trim();
  if (!inferenceUrl) {
    return failedClassification(CLASSIFIER_UNAVAILABLE);
  }
  try {
    return await classifyViaHttp(inferenceUrl, input);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "inference request failed";
    return failedClassification(message);
  }
}
