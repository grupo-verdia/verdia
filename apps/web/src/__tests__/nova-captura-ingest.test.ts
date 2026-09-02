import { readFileSync } from "node:fs";
import { join } from "node:path";

import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { POST as ingestCaptura } from "@/app/api/capturas/ingest/route";
import { loadDashboardCapturas } from "@/lib/dashboard";
import {
  classifyForIngest,
  classifyImageStub,
} from "@/lib/ingest/classify";
import { readGeotagFromImage } from "@/lib/ingest/exif-gps";
import { resolveGeotag } from "@/lib/ingest/resolve-geotag";
import {
  createMemoryStore,
  setCapturaStore,
} from "@/lib/persistence";

function ingestBody(overrides: Record<string, unknown> = {}) {
  return {
    lat: -23.55,
    lon: -46.63,
    capturedAt: "2026-08-14T12:00:00.000Z",
    imageBase64: Buffer.from("fake-roadside").toString("base64"),
    contentType: "image/jpeg",
    filename: "trecho_alta.jpg",
    rodoviaId: "sp-330",
    km: 12.5,
    sentido: "Norte",
    ...overrides,
  };
}

describe("classifyImageStub", () => {
  it("maps filename hints to Motiva classes", () => {
    expect(classifyImageStub("bordo_alta.jpg").classe).toBe("alta");
    expect(classifyImageStub("bordo_media.jpg").classe).toBe("média");
    expect(classifyImageStub("bordo_baixa.jpg").classe).toBe("baixa");
    expect(classifyImageStub("bordo_na.jpg").classe).toBeNull();
    expect(classifyImageStub("sem_hint.jpg").classe).toBe("média");
  });

  it("includes a short justificativa for the upload report", () => {
    const alta = classifyImageStub("bordo_alta.jpg");
    expect(alta.justificativa).toMatch(/prioridade/i);
    expect(classifyImageStub("bordo_na.jpg").justificativa).toMatch(/vegetação/i);
  });
});

describe("classifyForIngest HTTP", () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
    delete process.env.VLM_INFERENCE_URL;
    delete process.env.GOOGLE_API_KEY;
    vi.restoreAllMocks();
  });

  it("calls Inference API when VLM_INFERENCE_URL is set", async () => {
    process.env.VLM_INFERENCE_URL = "http://ai.test:8000";
    globalThis.fetch = vi.fn(async () =>
      Response.json({
        classe: "baixa",
        altura_cm: 5.5,
        confidence: 0.82,
        model_version: "gemma-test",
        fake: false,
        vegetacao_visivel: true,
        justificativa: "ok",
      }),
    ) as typeof fetch;

    const result = await classifyForIngest({
      filename: "campo.jpg",
      imageBytes: new Uint8Array([1, 2, 3]),
      contentType: "image/jpeg",
    });
    expect(result.classe).toBe("baixa");
    expect(result.alturaCm).toBe(5.5);
    expect(result.modelVersion).toBe("gemma-test");
    expect(result.fake).toBe(false);
    expect(globalThis.fetch).toHaveBeenCalledWith(
      "http://ai.test:8000/v1/classify",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("records inferenceError when Inference API fails", async () => {
    process.env.VLM_INFERENCE_URL = "http://ai.test:8000";
    globalThis.fetch = vi.fn(async () =>
      Response.json({ detail: "GOOGLE_API_KEY is required" }, { status: 502 }),
    ) as typeof fetch;

    const result = await classifyForIngest({
      filename: "campo.jpg",
      imageBytes: new Uint8Array([1]),
      contentType: "image/jpeg",
    });
    expect(result.classe).toBeNull();
    expect(result.inferenceError).toContain("GOOGLE_API_KEY");
  });
});

describe("resolveGeotag", () => {
  it("prefers EXIF over manual values", () => {
    const resolved = resolveGeotag(
      { lat: -23.5, lon: -46.6, capturedAt: "2026-08-14T12:00:00.000Z" },
      { lat: "1", lon: "2" },
    );
    expect(resolved.ok).toBe(true);
    if (resolved.ok) {
      expect(resolved.value.lat).toBe(-23.5);
      expect(resolved.value.lon).toBe(-46.6);
    }
  });

  it("uses manual lat/lon when EXIF is missing", () => {
    const resolved = resolveGeotag(null, { lat: "-23,55", lon: "-46.63" });
    expect(resolved.ok).toBe(true);
    if (resolved.ok) {
      expect(resolved.value.lat).toBeCloseTo(-23.55, 5);
      expect(resolved.value.lon).toBeCloseTo(-46.63, 5);
    }
  });

  it("rejects when EXIF and manual are both missing", () => {
    const resolved = resolveGeotag(null, { lat: "", lon: "" });
    expect(resolved.ok).toBe(false);
  });

  it("rejects out-of-range manual coordinates", () => {
    const resolved = resolveGeotag(null, { lat: "99", lon: "0" });
    expect(resolved.ok).toBe(false);
  });
});

describe("readGeotagFromImage", () => {
  it("reads lat/lon from a geotagged JPEG fixture", async () => {
    const bytes = readFileSync(
      join(process.cwd(), "fixtures/geotagged-sample.jpg"),
    );
    const geotag = await readGeotagFromImage(bytes);
    expect(geotag).not.toBeNull();
    expect(geotag!.lat).toBeCloseTo(-23.55, 3);
    expect(geotag!.lon).toBeCloseTo(-46.63, 3);
    expect(Number.isNaN(Date.parse(geotag!.capturedAt))).toBe(false);
  });

  it("returns null without GPS", async () => {
    const geotag = await readGeotagFromImage(Buffer.from("not-an-image"));
    expect(geotag).toBeNull();
  });
});

describe("POST /api/capturas/ingest", () => {
  beforeEach(() => {
    setCapturaStore(createMemoryStore());
    delete process.env.VLM_INFERENCE_URL;
    delete process.env.GOOGLE_API_KEY;
  });

  it("classifies, persists, and feeds dashboard indices", async () => {
    const response = await ingestCaptura(
      new NextRequest("http://localhost:3000/api/capturas/ingest", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(ingestBody()),
      }),
    );
    expect(response.status).toBe(201);
    const body = (await response.json()) as {
      captura: {
        id: string;
        classe: string | null;
        alturaCm: number | null;
        rodoviaId: string | null;
        km: number | null;
      };
      classification: { fake: boolean; justificativa: string | null };
    };
    expect(body.captura.classe).toBe("alta");
    expect(body.captura.alturaCm).toBe(50);
    expect(body.captura.rodoviaId).toBe("sp-330");
    expect(body.captura.km).toBe(12.5);
    expect(body.classification.fake).toBe(true);
    expect(body.classification.justificativa).toMatch(/prioridade/i);

    const dashboard = await loadDashboardCapturas();
    expect(dashboard).toHaveLength(1);
    expect(dashboard[0]?.id).toBe(body.captura.id);
    expect(dashboard[0]?.classe).toBe("alta");
  });

  it("rejects missing GPS fields", async () => {
    const response = await ingestCaptura(
      new NextRequest("http://localhost:3000/api/capturas/ingest", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(ingestBody({ lat: undefined, lon: undefined })),
      }),
    );
    expect(response.status).toBe(400);
  });

  it("rejects unknown rodovia", async () => {
    const response = await ingestCaptura(
      new NextRequest("http://localhost:3000/api/capturas/ingest", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(ingestBody({ rodoviaId: "nao-existe" })),
      }),
    );
    expect(response.status).toBe(400);
  });
});
