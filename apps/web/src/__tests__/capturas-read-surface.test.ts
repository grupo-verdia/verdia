import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it } from "vitest";

import { GET as listCapturas, POST as createCaptura } from "@/app/api/capturas/route";
import { GET as fetchTrecho } from "@/app/api/trechos/[id]/route";
import { loadCapturaDetail, loadDashboardCapturas } from "@/lib/dashboard";
import {
  createMemoryStore,
  getCapturaStore,
  setCapturaStore,
} from "@/lib/persistence";
import { runSimulador } from "@/lib/simulador";

describe("capturas product read surface", () => {
  beforeEach(() => {
    setCapturaStore(createMemoryStore());
  });

  it("lists a captura with its classe after BFF write", async () => {
    const writeRequest = new NextRequest("http://localhost:3000/api/capturas", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        lat: -23.55,
        lon: -46.63,
        capturedAt: "2026-07-20T12:00:00.000Z",
        classe: "alta",
        confidence: 0.91,
        modelVersion: "stub-0.1",
        imageBase64: Buffer.from("fake-image").toString("base64"),
        contentType: "image/jpeg",
      }),
    });

    const writeResponse = await createCaptura(writeRequest);
    expect(writeResponse.status).toBe(201);
    const written = (await writeResponse.json()) as {
      id: string;
      classe: string;
      storageKey: string;
    };
    expect(written.classe).toBe("alta");
    expect(written.storageKey).toBeTruthy();

    const listResponse = await listCapturas();
    expect(listResponse.status).toBe(200);
    const body = (await listResponse.json()) as {
      capturas: Array<{ id: string; classe: string | null }>;
    };
    expect(body.capturas).toHaveLength(1);
    expect(body.capturas[0]?.id).toBe(written.id);
    expect(body.capturas[0]?.classe).toBe("alta");
  });

  it("creates a trecho whose severidade follows the captura classe", async () => {
    const response = await createCaptura(
      new NextRequest("http://localhost:3000/api/capturas", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          lat: -23.55,
          lon: -46.63,
          capturedAt: "2026-07-20T10:00:00.000Z",
          classe: "alta",
          confidence: 0.95,
          modelVersion: "stub-0.1",
          imageBase64: Buffer.from("a").toString("base64"),
          contentType: "image/jpeg",
        }),
      }),
    );
    expect(response.status).toBe(201);
    const body = (await response.json()) as { id: string; trechoId: string };

    const trechoResponse = await fetchTrecho(
      new NextRequest(`http://localhost:3000/api/trechos/${body.trechoId}`),
      { params: Promise.resolve({ id: body.trechoId }) },
    );
    expect(trechoResponse.status).toBe(200);
    const trecho = (await trechoResponse.json()) as {
      id: string;
      severidade: string;
      lengthMeters: number;
    };
    expect(trecho.id).toBe(body.trechoId);
    expect(trecho.severidade).toBe("alta");
    expect(trecho.lengthMeters).toBe(500);
  });

  it("exposes persisted capturas with classe on the dashboard read path", async () => {
    const writeResponse = await createCaptura(
      new NextRequest("http://localhost:3000/api/capturas", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          lat: -22.9,
          lon: -43.2,
          capturedAt: "2026-07-20T15:00:00.000Z",
          classe: "média",
          confidence: 0.7,
          modelVersion: "stub-0.1",
          imageBase64: Buffer.from("dash").toString("base64"),
          contentType: "image/jpeg",
        }),
      }),
    );
    expect(writeResponse.status).toBe(201);

    const capturas = await loadDashboardCapturas();
    expect(capturas).toHaveLength(1);
    expect(capturas[0]?.classe).toBe("média");
  });

  it("shows segmentação overlay alongside photo on captura detail without replacing classe", async () => {
    const photoBytes = new Uint8Array([10, 20, 30]);
    const overlayBytes = new Uint8Array([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
    ]);

    const writeResponse = await createCaptura(
      new NextRequest("http://localhost:3000/api/capturas", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          lat: -23.55,
          lon: -46.63,
          capturedAt: "2026-07-20T18:00:00.000Z",
          classe: "alta",
          confidence: 0.88,
          modelVersion: "stub-0.1",
          imageBase64: Buffer.from(photoBytes).toString("base64"),
          contentType: "image/jpeg",
          overlayBase64: Buffer.from(overlayBytes).toString("base64"),
          overlayContentType: "image/png",
        }),
      }),
    );
    expect(writeResponse.status).toBe(201);
    const written = (await writeResponse.json()) as {
      id: string;
      classe: string;
      overlayStorageKey: string | null;
    };
    expect(written.classe).toBe("alta");
    expect(written.overlayStorageKey).toBeTruthy();

    const detail = await loadCapturaDetail(written.id);
    expect(detail).not.toBeNull();
    expect(detail?.captura.classe).toBe("alta");
    expect(detail?.captura.overlayStorageKey).toBeTruthy();
    expect(detail?.photoBytes).toEqual(photoBytes);
    expect(detail?.overlayBytes).toEqual(overlayBytes);
    // Overlay is visualization only — classe remains the ordinal prediction field.
    expect(detail?.captura.classe).not.toBeNull();
  });

  it("lists captura from simulador ingest path with classe on the dashboard", async () => {
    const store = getCapturaStore();

    const report = await runSimulador(
      [
        {
          id: "sample-ok",
          imageBytes: new Uint8Array([9, 9, 9]),
          contentType: "image/png",
          lat: -23.55,
          lon: -46.63,
          capturedAt: "2026-07-20T16:00:00.000Z",
        },
      ],
      {
        infer: {
          async infer() {
            return {
              ok: true,
              classe: "baixa",
              confidence: 0.6,
              modelVersion: "stub-0.1",
              overlayPngBytes: new Uint8Array([0x89, 0x50]),
            };
          },
        },
        persist: {
          async persist(input) {
            const captura = await store.createCaptura({
              lat: input.sample.lat,
              lon: input.sample.lon,
              capturedAt: input.sample.capturedAt,
              classe: input.classe,
              confidence: input.confidence,
              modelVersion: input.modelVersion,
              inferenceError: input.inferenceError,
              imageBytes: input.sample.imageBytes,
              contentType: input.sample.contentType,
              overlayBytes: input.overlayPngBytes,
              overlayContentType: input.overlayPngBytes ? "image/png" : null,
            });
            return { ok: true, capturaId: captura.id };
          },
        },
      },
    );

    expect(report.results[0]?.status).toBe("ok");

    const capturas = await loadDashboardCapturas();
    expect(capturas).toHaveLength(1);
    expect(capturas[0]?.classe).toBe("baixa");
    expect(capturas[0]?.inferenceError).toBeNull();
  });

  it("surfaces failed inference error on the dashboard read path", async () => {
    const store = getCapturaStore();

    await runSimulador(
      [
        {
          id: "sample-fail",
          imageBytes: new Uint8Array([1]),
          contentType: "image/png",
          lat: -23.5,
          lon: -46.6,
          capturedAt: "2026-07-20T17:00:00.000Z",
        },
      ],
      {
        infer: {
          async infer() {
            return { ok: false, error: "timeout talking to Inference API" };
          },
        },
        persist: {
          async persist(input) {
            const captura = await store.createCaptura({
              lat: input.sample.lat,
              lon: input.sample.lon,
              capturedAt: input.sample.capturedAt,
              classe: input.classe,
              confidence: input.confidence,
              modelVersion: input.modelVersion,
              inferenceError: input.inferenceError,
              imageBytes: input.sample.imageBytes,
              contentType: input.sample.contentType,
              overlayBytes: input.overlayPngBytes,
              overlayContentType: input.overlayPngBytes ? "image/png" : null,
            });
            return { ok: true, capturaId: captura.id };
          },
        },
      },
    );

    const capturas = await loadDashboardCapturas();
    expect(capturas).toHaveLength(1);
    expect(capturas[0]?.classe).toBeNull();
    expect(capturas[0]?.inferenceError).toBe("timeout talking to Inference API");
  });
});
