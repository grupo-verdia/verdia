import { classeFromAlturaCm, isClasse, type Classe } from "@/lib/domain";
import { classifyViaGoogle } from "@/lib/ingest/classify-google";

/** Result of vegetation classification (Google, Python HTTP, or stub). */
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

const STUB_MODEL = "stub-vlm-0.1";

function stubJustificativa(classe: Classe | null): string {
  switch (classe) {
    case "alta":
      return "Vegetação alta na margem da rodovia; prioridade de intervenção elevada.";
    case "média":
      return "Altura intermediária da grama; acompanhar o ciclo de manutenção.";
    case "baixa":
      return "Vegetação baixa, dentro do controle operacional.";
    case null:
      return "Faixa lateral sem vegetação visível ou não classificável.";
    default: {
      const _exhaustive: never = classe;
      return _exhaustive;
    }
  }
}

/**
 * Offline stub mirroring `services/ai` fake filename heuristics.
 * Used when Google and `VLM_INFERENCE_URL` are both unset.
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
      justificativa: stubJustificativa(null),
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
  const classe = classeFromAlturaCm(alturaCm);
  return {
    classe,
    alturaCm,
    confidence,
    modelVersion: STUB_MODEL,
    inferenceError: null,
    fake: true,
    justificativa: stubJustificativa(classe),
  };
}

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
      : stubJustificativa(classe);
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

/** Google key, else Python HTTP, else filename stub. */
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
    return classifyImageStub(input.filename);
  }
  try {
    return await classifyViaHttp(inferenceUrl, input);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "inference request failed";
    return failedClassification(message);
  }
}
