import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it } from "vitest";

import { GET as listCapturas, POST as createCaptura } from "@/app/api/capturas/route";
import { GET as fetchTrecho } from "@/app/api/trechos/[id]/route";
import { loadDashboardCapturas } from "@/lib/dashboard";
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

  it("associates capturas to a trecho whose severidade follows the highest classe", async () => {
    const first = await createCaptura(
      new NextRequest("http://localhost:3000/api/capturas", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          lat: -23.55,
          lon: -46.63,
          capturedAt: "2026-07-20T10:00:00.000Z",
          classe: "baixa",
          confidence: 0.8,
          modelVersion: "stub-0.1",
          imageBase64: Buffer.from("a").toString("base64"),
          contentType: "image/jpeg",
        }),
      }),
    );
    expect(first.status).toBe(201);
    const firstBody = (await first.json()) as { id: string; trechoId: string };

    const second = await createCaptura(
      new NextRequest("http://localhost:3000/api/capturas", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          trechoId: firstBody.trechoId,
          lat: -23.56,
          lon: -46.64,
          capturedAt: "2026-07-20T11:00:00.000Z",
          classe: "alta",
          confidence: 0.95,
          modelVersion: "stub-0.1",
          imageBase64: Buffer.from("b").toString("base64"),
          contentType: "image/jpeg",
        }),
      }),
    );
    expect(second.status).toBe(201);

    const trechoResponse = await fetchTrecho(
      new NextRequest(
        `http://localhost:3000/api/trechos/${firstBody.trechoId}`,
      ),
      { params: Promise.resolve({ id: firstBody.trechoId }) },
    );
    expect(trechoResponse.status).toBe(200);
    const trecho = (await trechoResponse.json()) as {
      id: string;
      severidade: string;
    };
    expect(trecho.id).toBe(firstBody.trechoId);
    expect(trecho.severidade).toBe("alta");
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
