import { afterEach, describe, expect, it, vi } from "vitest";

import { classifyForIngest } from "@/lib/ingest/classify";
import { parseGoogleVerdict } from "@/lib/ingest/classify-google";

function googleJsonBody(payload: Record<string, unknown>) {
  return {
    candidates: [
      { content: { parts: [{ text: JSON.stringify(payload) }] } },
    ],
  };
}

describe("parseGoogleVerdict", () => {
  it("maps Motiva height bands to classe", () => {
    const baixa = parseGoogleVerdict(
      JSON.stringify({
        vegetacao_visivel: true,
        justificativa: "Textura: lisa. Invasão de borda: nítida. Sombras: ausentes.",
        altura_estimada_cm: { min: 3, max: 8 },
        confianca_declarada: 0.8,
      }),
      "gemma-test",
    );
    expect(baixa.classe).toBe("baixa");
    expect(baixa.alturaCm).toBe(5.5);
    expect(baixa.fake).toBe(false);
    expect(baixa.modelVersion).toBe("gemma-test");
  });

  it("returns null classe when vegetation is not visible", () => {
    const result = parseGoogleVerdict(
      JSON.stringify({
        vegetacao_visivel: false,
        justificativa: "Faixa sem grama visível.",
        altura_estimada_cm: null,
        confianca_declarada: 0.4,
      }),
      "gemma-test",
    );
    expect(result.classe).toBeNull();
    expect(result.alturaCm).toBeNull();
  });
});

describe("classifyForIngest Google", () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
    delete process.env.GOOGLE_API_KEY;
    delete process.env.VLM_INFERENCE_URL;
    delete process.env.VLM_MODEL;
    vi.restoreAllMocks();
  });

  it("calls Google AI Studio when GOOGLE_API_KEY is set", async () => {
    process.env.GOOGLE_API_KEY = "test-key";
    globalThis.fetch = vi.fn(async () =>
      Response.json(
        googleJsonBody({
          vegetacao_visivel: true,
          justificativa: "Textura: caótica. Invasão de borda: engolindo a pista.",
          altura_estimada_cm: { min: 40, max: 50 },
          confianca_declarada: 0.9,
        }),
      ),
    ) as typeof fetch;

    const result = await classifyForIngest({
      filename: "campo.jpg",
      imageBytes: new Uint8Array([1, 2, 3]),
      contentType: "image/jpeg",
    });
    expect(result.classe).toBe("alta");
    expect(result.alturaCm).toBe(45);
    expect(result.fake).toBe(false);
    expect(result.justificativa).toMatch(/caótica/);
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    const [url, init] = vi.mocked(globalThis.fetch).mock.calls[0] ?? [];
    expect(String(url)).toContain("generativelanguage.googleapis.com");
    expect(String(url)).toContain("gemma-4-26b-a4b-it");
    expect((init as RequestInit | undefined)?.headers).toMatchObject({
      "x-goog-api-key": "test-key",
    });
  });

  it("prefers Google over VLM_INFERENCE_URL", async () => {
    process.env.GOOGLE_API_KEY = "test-key";
    process.env.VLM_INFERENCE_URL = "http://ai.test:8000";
    globalThis.fetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("ai.test")) {
        throw new Error("Python HTTP should not be called");
      }
      return Response.json(
        googleJsonBody({
          vegetacao_visivel: true,
          justificativa: "ok",
          altura_estimada_cm: { min: 4, max: 6 },
          confianca_declarada: 0.7,
        }),
      );
    }) as typeof fetch;

    const result = await classifyForIngest({
      filename: "campo.jpg",
      imageBytes: new Uint8Array([1]),
      contentType: "image/jpeg",
    });
    expect(result.classe).toBe("baixa");
  });

  it("records inferenceError when Google fails", async () => {
    process.env.GOOGLE_API_KEY = "test-key";
    globalThis.fetch = vi.fn(async () =>
      Response.json(
        { error: { message: "API key not valid" } },
        { status: 400 },
      ),
    ) as typeof fetch;

    const result = await classifyForIngest({
      filename: "campo.jpg",
      imageBytes: new Uint8Array([1]),
      contentType: "image/jpeg",
    });
    expect(result.classe).toBeNull();
    expect(result.inferenceError).toContain("API key not valid");
  });
});
