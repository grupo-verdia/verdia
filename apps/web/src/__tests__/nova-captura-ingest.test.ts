import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { POST as ingestCaptura } from "@/app/api/capturas/ingest/route";
import { POST as classifyCaptura } from "@/app/api/capturas/[id]/classify/route";
import { loadDashboardCapturas } from "@/lib/dashboard";
import {
  CLASSIFIER_UNAVAILABLE,
  classifyForIngest,
} from "@/lib/ingest/classify";
import { sniffImageContentType } from "@/lib/ingest/image-type";
import {
  MAX_UPLOAD_BYTES,
  isWithinUploadLimit,
  needsShrink,
  targetDimensions,
} from "@/lib/ingest/prepare-upload";
import { readGeotagFromImage } from "@/lib/ingest/exif-gps";
import { resolveGeotag } from "@/lib/ingest/resolve-geotag";
import {
  createMemoryStore,
  getCapturaStore,
  setCapturaStore,
} from "@/lib/persistence";

function ingestBody(overrides: Record<string, unknown> = {}) {
  return {
    lat: -23.55,
    lon: -46.63,
    capturedAt: "2026-08-14T12:00:00.000Z",
    imageBase64: Buffer.from("fake-roadside").toString("base64"),
    contentType: "image/jpeg",
    filename: "campo.jpg",
    rodoviaId: "sp-330",
    km: 12.5,
    sentido: "Norte",
    ...overrides,
  };
}

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

  it("errors when no classifier is configured", async () => {
    const result = await classifyForIngest({
      filename: "campo.jpg",
      imageBytes: new Uint8Array([1]),
      contentType: "image/jpeg",
    });
    expect(result.classe).toBeNull();
    expect(result.fake).toBe(false);
    expect(result.inferenceError).toBe(CLASSIFIER_UNAVAILABLE);
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
  it("returns null without GPS", async () => {
    const geotag = await readGeotagFromImage(Buffer.from("not-an-image"));
    expect(geotag).toBeNull();
  });
});

describe("POST /api/capturas/ingest", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    setCapturaStore(createMemoryStore());
    delete process.env.VLM_INFERENCE_URL;
    delete process.env.GOOGLE_API_KEY;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("persists into the classification queue and feeds the dashboard", async () => {
    process.env.VLM_INFERENCE_URL = "http://ai.test:8000";

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
        rodoviaId: string | null;
        km: number | null;
        classifiedAt: string | null;
      };
    };
    expect(body.captura.rodoviaId).toBe("sp-330");
    expect(body.captura.km).toBe(12.5);
    expect(body.captura.classifiedAt).toBeNull();

    const dashboard = await loadDashboardCapturas();
    expect(dashboard).toHaveLength(1);
    expect(dashboard[0]?.id).toBe(body.captura.id);
  });

  it("rejects ingest when no classifier is configured", async () => {
    const response = await ingestCaptura(
      new NextRequest("http://localhost:3000/api/capturas/ingest", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(ingestBody()),
      }),
    );
    expect(response.status).toBe(503);
    const body = (await response.json()) as { error: string };
    expect(body.error).toBe(CLASSIFIER_UNAVAILABLE);
    expect(await loadDashboardCapturas()).toHaveLength(0);
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

  it("rejects an image above the upload limit", async () => {
    process.env.VLM_INFERENCE_URL = "http://ai.test:8000";
    const oversized = Buffer.alloc(MAX_UPLOAD_BYTES + 1, 1).toString("base64");
    const response = await ingestCaptura(
      new NextRequest("http://localhost:3000/api/capturas/ingest", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(ingestBody({ imageBase64: oversized })),
      }),
    );
    expect(response.status).toBe(413);
    expect(await loadDashboardCapturas()).toHaveLength(0);
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

describe("POST /api/capturas/:id/classify", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    setCapturaStore(createMemoryStore());
    delete process.env.GOOGLE_API_KEY;
    process.env.VLM_INFERENCE_URL = "http://ai.test:8000";
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    delete process.env.VLM_INFERENCE_URL;
    vi.restoreAllMocks();
  });

  it("classifies a captura saved first", async () => {
    const ingestResponse = await ingestCaptura(
      new NextRequest("http://localhost:3000/api/capturas/ingest", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(ingestBody()),
      }),
    );
    const ingested = (await ingestResponse.json()) as { captura: { id: string } };

    globalThis.fetch = vi.fn(async () =>
      Response.json({
        classe: "média",
        altura_cm: 20,
        confidence: 0.7,
        model_version: "gemma-test",
        fake: false,
        justificativa: "ok",
      }),
    ) as typeof fetch;

    const response = await classifyCaptura(
      new Request("http://localhost:3000/api/capturas/id/classify", {
        method: "POST",
      }),
      { params: Promise.resolve({ id: ingested.captura.id }) },
    );
    expect(response.status).toBe(200);
    const body = (await response.json()) as {
      captura: { classe: string | null; classifiedAt: string | null };
    };
    expect(body.captura.classe).toBe("média");
    expect(body.captura.classifiedAt).toBeTruthy();
  });

  it("sends PNG bytes as image/png, not jpeg", async () => {
    const png = new Uint8Array([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3,
    ]);
    const ingestResponse = await ingestCaptura(
      new NextRequest("http://localhost:3000/api/capturas/ingest", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(
          ingestBody({
            imageBase64: Buffer.from(png).toString("base64"),
            contentType: "image/png",
            filename: "campo.png",
          }),
        ),
      }),
    );
    const ingested = (await ingestResponse.json()) as { captura: { id: string } };

    globalThis.fetch = vi.fn(async (_url, init) => {
      const payload = JSON.parse(String(init?.body)) as { content_type?: string };
      expect(payload.content_type).toBe("image/png");
      return Response.json({
        classe: "baixa",
        altura_cm: 4,
        confidence: 0.6,
        model_version: "gemma-test",
        fake: false,
        justificativa: "ok",
      });
    }) as typeof fetch;

    const response = await classifyCaptura(
      new Request("http://localhost:3000/api/capturas/id/classify", {
        method: "POST",
      }),
      { params: Promise.resolve({ id: ingested.captura.id }) },
    );
    expect(response.status).toBe(200);
  });

  it("does not overwrite a human classe correction", async () => {
    const ingestResponse = await ingestCaptura(
      new NextRequest("http://localhost:3000/api/capturas/ingest", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(ingestBody()),
      }),
    );
    const ingested = (await ingestResponse.json()) as { captura: { id: string } };
    await getCapturaStore().overrideCaptura(ingested.captura.id, {
      classe: "alta",
      motivo: "Revisão de campo",
    });

    globalThis.fetch = vi.fn(async () =>
      Response.json({
        classe: "baixa",
        altura_cm: 4,
        confidence: 0.6,
        model_version: "gemma-test",
        fake: false,
        justificativa: "ok",
      }),
    ) as typeof fetch;

    const response = await classifyCaptura(
      new Request("http://localhost:3000/api/capturas/id/classify", {
        method: "POST",
      }),
      { params: Promise.resolve({ id: ingested.captura.id }) },
    );
    const body = (await response.json()) as {
      captura: {
        classe: string | null;
        classifiedAt: string | null;
        overrideMotivo: string | null;
      };
    };
    expect(response.status).toBe(200);
    expect(body.captura.classe).toBe("alta");
    expect(body.captura.overrideMotivo).toBe("Revisão de campo");
    expect(body.captura.classifiedAt).toBeTruthy();
  });
});

describe("upload sizing", () => {
  it("accepts photos up to 10 MB and refuses bigger ones", () => {
    expect(isWithinUploadLimit({ size: MAX_UPLOAD_BYTES })).toBe(true);
    expect(isWithinUploadLimit({ size: MAX_UPLOAD_BYTES + 1 })).toBe(false);
  });

  it("shrinks only what would blow the request body budget", () => {
    expect(needsShrink({ size: 2 * 1024 * 1024 })).toBe(false);
    expect(needsShrink({ size: 8 * 1024 * 1024 })).toBe(true);
  });

  it("caps the longest edge and keeps the aspect ratio", () => {
    expect(targetDimensions(4000, 3000, 2400)).toEqual({ width: 2400, height: 1800 });
    expect(targetDimensions(1600, 1200, 2400)).toEqual({ width: 1600, height: 1200 });
  });
});

describe("sniffImageContentType", () => {
  it("reads JPEG, PNG, and WebP magic bytes", () => {
    expect(sniffImageContentType(new Uint8Array([0xff, 0xd8, 0xff, 1]))).toBe(
      "image/jpeg",
    );
    expect(
      sniffImageContentType(
        new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      ),
    ).toBe("image/png");
    const webp = new Uint8Array(12);
    webp.set([0x52, 0x49, 0x46, 0x46], 0);
    webp.set([0x57, 0x45, 0x42, 0x50], 8);
    expect(sniffImageContentType(webp)).toBe("image/webp");
    expect(sniffImageContentType(new Uint8Array([1, 2, 3]))).toBe("image/jpeg");
  });
});
