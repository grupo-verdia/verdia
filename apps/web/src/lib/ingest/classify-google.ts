import { classeFromAlturaCm } from "@/lib/domain";
import type { ClassifyImageInput, ClassifyResult } from "@/lib/ingest/classify";
import {
  DEFAULT_VLM_MODEL,
  VLM_RESPONSE_JSON_SCHEMA,
  VLM_SYSTEM_PROMPT,
  VLM_USER_PROMPT,
} from "@/lib/ingest/vlm-prompts";

const GOOGLE_GENERATE_URL =
  "https://generativelanguage.googleapis.com/v1beta/models";
/** Leave headroom under the ingest route's 60s maxDuration. */
const GOOGLE_TIMEOUT_MS = 50_000;

type GooglePart = { text?: string };
type GoogleGenerateResponse = {
  candidates?: Array<{ content?: { parts?: GooglePart[] } }>;
  error?: { message?: string };
};

type AlturaRange = { min: number; max: number };

type VlmJson = {
  vegetacao_visivel: boolean;
  justificativa: string;
  altura_estimada_cm: AlturaRange | null;
  confianca_declarada: number;
};

/**
 * Call Google AI Studio from the Next.js ingest path (Vercel or local).
 * Same model, prompts, and height→classe mapping as `services/ai`.
 */
export async function classifyViaGoogle(
  input: ClassifyImageInput,
  apiKey: string,
): Promise<ClassifyResult> {
  const model = (process.env.VLM_MODEL || DEFAULT_VLM_MODEL).trim();
  const imageBase64 = Buffer.from(input.imageBytes).toString("base64");
  const generate = () =>
    generateOnce({
      apiKey,
      model,
      imageBase64,
      mimeType: input.contentType,
    });

  let raw = await generate();
  try {
    return parseGoogleVerdict(raw, model);
  } catch {
    raw = await generate();
    return parseGoogleVerdict(raw, model);
  }
}

export function parseGoogleVerdict(raw: string, model: string): ClassifyResult {
  const payload = extractJsonObject(raw);
  delete payload.classe;
  const parsed = validateVlmJson(payload);
  const altura = parsed.altura_estimada_cm;
  const alturaCm =
    altura === null ? null : (altura.min + altura.max) / 2;
  const classe = parsed.vegetacao_visivel
    ? classeFromAlturaCm(alturaCm)
    : null;
  return {
    classe,
    alturaCm,
    confidence: parsed.confianca_declarada,
    modelVersion: model,
    inferenceError: null,
    fake: false,
    justificativa: parsed.justificativa,
  };
}

async function generateOnce(args: {
  apiKey: string;
  model: string;
  imageBase64: string;
  mimeType: string;
}): Promise<string> {
  const url = `${GOOGLE_GENERATE_URL}/${encodeURIComponent(args.model)}:generateContent`;
  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-goog-api-key": args.apiKey,
      },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: VLM_SYSTEM_PROMPT }] },
        contents: [
          {
            role: "user",
            parts: [
              { text: VLM_USER_PROMPT },
              {
                inlineData: {
                  mimeType: args.mimeType,
                  data: args.imageBase64,
                },
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.2,
          candidateCount: 1,
          responseMimeType: "application/json",
          responseJsonSchema: VLM_RESPONSE_JSON_SCHEMA,
        },
      }),
      signal: AbortSignal.timeout(GOOGLE_TIMEOUT_MS),
    });
  } catch (error) {
    if (error instanceof Error && error.name === "TimeoutError") {
      throw new Error("A classificação demorou demais. Tente de novo.");
    }
    throw error;
  }

  let body: GoogleGenerateResponse = {};
  try {
    body = (await response.json()) as GoogleGenerateResponse;
  } catch {
    body = {};
  }
  if (!response.ok) {
    const detail =
      typeof body.error?.message === "string" && body.error.message
        ? body.error.message
        : `Google VLM HTTP ${response.status}`;
    throw new Error(detail);
  }
  const text = body.candidates?.[0]?.content?.parts
    ?.map((part) => part.text ?? "")
    .join("")
    .trim();
  if (!text) {
    throw new Error("A IA não devolveu uma classificação.");
  }
  return text;
}

function extractJsonObject(raw: string): Record<string, unknown> {
  let text = raw.trim();
  if (text.startsWith("```")) {
    text = text.replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "");
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) {
      throw new Error("A IA devolveu um formato inválido.");
    }
    parsed = JSON.parse(match[0]);
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error("A IA devolveu um formato inválido.");
  }
  return parsed as Record<string, unknown>;
}

function validateVlmJson(payload: Record<string, unknown>): VlmJson {
  if (typeof payload.vegetacao_visivel !== "boolean") {
    throw new Error("A IA devolveu um formato inválido.");
  }
  if (
    typeof payload.justificativa !== "string" ||
    !payload.justificativa.trim()
  ) {
    throw new Error("A IA devolveu um formato inválido.");
  }
  if (
    typeof payload.confianca_declarada !== "number" ||
    !Number.isFinite(payload.confianca_declarada) ||
    payload.confianca_declarada < 0 ||
    payload.confianca_declarada > 1
  ) {
    throw new Error("A IA devolveu um formato inválido.");
  }
  return {
    vegetacao_visivel: payload.vegetacao_visivel,
    justificativa: payload.justificativa.trim(),
    altura_estimada_cm: parseAltura(payload.altura_estimada_cm),
    confianca_declarada: payload.confianca_declarada,
  };
}

function parseAltura(value: unknown): AlturaRange | null {
  if (value === null) {
    return null;
  }
  if (typeof value !== "object" || Array.isArray(value)) {
    throw new Error("A IA devolveu um formato inválido.");
  }
  const record = value as Record<string, unknown>;
  if (
    typeof record.min !== "number" ||
    typeof record.max !== "number" ||
    !Number.isFinite(record.min) ||
    !Number.isFinite(record.max) ||
    record.min > record.max
  ) {
    throw new Error("A IA devolveu um formato inválido.");
  }
  return { min: record.min, max: record.max };
}
