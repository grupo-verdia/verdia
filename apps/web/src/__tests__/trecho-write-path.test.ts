import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it } from "vitest";

import { POST as createCaptura } from "@/app/api/capturas/route";
import { GET as fetchTrecho } from "@/app/api/trechos/[id]/route";
import { DEFAULT_TRECHO_LENGTH_METERS } from "@/lib/domain";
import { createMemoryStore } from "@/lib/persistence";
import { resetVerdiaStoreForTests } from "@/lib/verdia-store";

const baseInput = {
  lat: -23.55,
  lon: -46.63,
  capturedAt: "2026-07-20T12:00:00.000Z",
  classe: "alta" as const,
  confidence: 0.9,
  modelVersion: "stub-0.1",
  imageBytes: new Uint8Array([1, 2, 3]),
  contentType: "image/jpeg",
};

function postBody(overrides: Record<string, unknown> = {}) {
  return {
    lat: -23.55,
    lon: -46.63,
    capturedAt: "2026-07-20T12:00:00.000Z",
    classe: "alta",
    confidence: 0.9,
    modelVersion: "stub-0.1",
    imageBase64: Buffer.from("fake-image").toString("base64"),
    contentType: "image/jpeg",
    ...overrides,
  };
}

describe("trecho write path (1 captura = 1 trecho @ 500 m)", () => {
  beforeEach(async () => {
    process.env.VERDIA_LOCAL_DATA_PATH = path.join(
      mkdtempSync(path.join(tmpdir(), "verdia-test-")),
      "data.json",
    );
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_SECRET_KEY;
    await resetVerdiaStoreForTests();
  });

  it("createCaptura always creates a new trecho at the Motiva 500 m default", async () => {
    const store = createMemoryStore();

    const captura = await store.createCaptura(baseInput);

    const trecho = await store.getTrecho(captura.trechoId);
    expect(trecho).not.toBeNull();
    expect(trecho?.lengthMeters).toBe(500);
    expect(DEFAULT_TRECHO_LENGTH_METERS).toBe(500);
  });

  it("createCaptura always creates exactly one new trecho per captura (1:1)", async () => {
    const store = createMemoryStore();

    const first = await store.createCaptura(baseInput);
    const second = await store.createCaptura({
      ...baseInput,
      capturedAt: "2026-07-20T13:00:00.000Z",
      classe: "baixa",
    });

    expect(first.trechoId).not.toBe(second.trechoId);

    const firstTrecho = await store.getTrecho(first.trechoId);
    const secondTrecho = await store.getTrecho(second.trechoId);
    expect(firstTrecho?.lengthMeters).toBe(500);
    expect(secondTrecho?.lengthMeters).toBe(500);
  });

  it("POST /api/capturas keeps an explicit trechoId from the spreadsheet row", async () => {
    const first = await createCaptura(
      new NextRequest("http://localhost:3000/api/capturas", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(postBody()),
      }),
    );
    expect(first.status).toBe(201);
    const firstBody = (await first.json()) as { trechoId: string };

    const second = await createCaptura(
      new NextRequest("http://localhost:3000/api/capturas", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(
          postBody({
            trechoId: firstBody.trechoId,
            capturedAt: "2026-07-20T13:00:00.000Z",
            imageBase64: Buffer.from("other").toString("base64"),
          }),
        ),
      }),
    );

    expect(second.status).toBe(201);
    const secondBody = (await second.json()) as { trechoId: string };
    expect(secondBody.trechoId).toBe(firstBody.trechoId);
  });

  it("POST /api/capturas creates a distinct 500 m trecho for each captura", async () => {
    const first = await createCaptura(
      new NextRequest("http://localhost:3000/api/capturas", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(postBody()),
      }),
    );
    const second = await createCaptura(
      new NextRequest("http://localhost:3000/api/capturas", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(
          postBody({
            capturedAt: "2026-07-20T13:00:00.000Z",
            classe: "baixa",
            imageBase64: Buffer.from("other").toString("base64"),
          }),
        ),
      }),
    );

    expect(first.status).toBe(201);
    expect(second.status).toBe(201);
    const firstBody = (await first.json()) as { trechoId: string };
    const secondBody = (await second.json()) as { trechoId: string };
    expect(firstBody.trechoId).not.toBe(secondBody.trechoId);

    const trechoResponse = await fetchTrecho(
      new NextRequest(`http://localhost:3000/api/trechos/${firstBody.trechoId}`),
      { params: Promise.resolve({ id: firstBody.trechoId }) },
    );
    expect(trechoResponse.status).toBe(200);
    const trecho = (await trechoResponse.json()) as {
      id: string;
      lengthMeters: number;
    };
    expect(trecho.id).toBe(firstBody.trechoId);
    expect(trecho.lengthMeters).toBe(500);
  });
});
