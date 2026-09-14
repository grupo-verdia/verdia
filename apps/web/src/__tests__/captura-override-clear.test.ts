import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it } from "vitest";

import {
  DELETE as deleteCapturas,
  POST as createCaptura,
} from "@/app/api/capturas/route";
import {
  DELETE as deleteCaptura,
  PATCH as patchCaptura,
} from "@/app/api/capturas/[id]/route";
import { createMemoryStore, getCapturaStore, setCapturaStore } from "@/lib/persistence";

describe("captura override and clear", () => {
  beforeEach(() => {
    setCapturaStore(createMemoryStore());
  });

  it("PATCHes classe with motivo and records override metadata", async () => {
    const created = await createCaptura(
      new NextRequest("http://localhost:3000/api/capturas", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          lat: -23.55,
          lon: -46.63,
          capturedAt: "2026-07-20T12:00:00.000Z",
          classe: "baixa",
          confidence: 0.5,
          modelVersion: "stub-0.1",
          imageBase64: Buffer.from("img").toString("base64"),
          contentType: "image/jpeg",
          rodoviaId: "sp-270",
          km: 10,
        }),
      }),
    );
    expect(created.status).toBe(201);
    const body = (await created.json()) as { id: string };

    const patched = await patchCaptura(
      new NextRequest(`http://localhost:3000/api/capturas/${body.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          classeFinal: "alta",
          motivo: "Revisão de campo",
        }),
      }),
      { params: Promise.resolve({ id: body.id }) },
    );
    expect(patched.status).toBe(200);
    const updated = (await patched.json()) as {
      classe: string;
      overrideMotivo: string | null;
      overrideAt: string | null;
    };
    expect(updated.classe).toBe("alta");
    expect(updated.overrideMotivo).toBe("Revisão de campo");
    expect(updated.overrideAt).toBeTruthy();
  });

  it("clears inferenceError when classe is corrected", async () => {
    const store = getCapturaStore();
    const created = await store.createCaptura({
      lat: -23.55,
      lon: -46.63,
      capturedAt: "2026-07-20T12:00:00.000Z",
      classe: null,
      confidence: 0,
      modelVersion: "inference-error",
      inferenceError: "timeout",
      imageBytes: new Uint8Array([1]),
      contentType: "image/jpeg",
    });
    const updated = await store.overrideCaptura(created.id, {
      classe: "média",
      motivo: "Revisão de campo",
    });
    expect(updated.inferenceError).toBeNull();
    expect(updated.classe).toBe("média");
  });

  it("DELETEs capturas for a rodovia scope", async () => {
    await createCaptura(
      new NextRequest("http://localhost:3000/api/capturas", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          lat: -23.55,
          lon: -46.63,
          capturedAt: "2026-07-20T12:00:00.000Z",
          classe: "alta",
          confidence: 0.9,
          modelVersion: "stub-0.1",
          imageBase64: Buffer.from("a").toString("base64"),
          contentType: "image/jpeg",
          rodoviaId: "sp-270",
        }),
      }),
    );

    const cleared = await deleteCapturas(
      new NextRequest(
        "http://localhost:3000/api/capturas?rodoviaId=sp-270",
        { method: "DELETE" },
      ),
    );
    expect(cleared.status).toBe(200);
    const payload = (await cleared.json()) as { removed: number };
    expect(payload.removed).toBe(1);
    expect(await getCapturaStore().listCapturas()).toHaveLength(0);
  });

  it("DELETEs one captura and leaves the rest", async () => {
    const first = await createCaptura(
      new NextRequest("http://localhost:3000/api/capturas", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          lat: -23.55,
          lon: -46.63,
          capturedAt: "2026-07-20T12:00:00.000Z",
          classe: "alta",
          confidence: 0.9,
          modelVersion: "stub-0.1",
          imageBase64: Buffer.from("a").toString("base64"),
          contentType: "image/jpeg",
          rodoviaId: "sp-270",
        }),
      }),
    );
    const second = await createCaptura(
      new NextRequest("http://localhost:3000/api/capturas", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          lat: -23.56,
          lon: -46.64,
          capturedAt: "2026-07-20T13:00:00.000Z",
          classe: "baixa",
          confidence: 0.8,
          modelVersion: "stub-0.1",
          imageBase64: Buffer.from("b").toString("base64"),
          contentType: "image/jpeg",
          rodoviaId: "sp-330",
        }),
      }),
    );
    const keep = (await second.json()) as {
      id: string;
      trechoId: string;
      storageKey: string;
    };
    const remove = (await first.json()) as {
      id: string;
      trechoId: string;
      storageKey: string;
    };

    const deleted = await deleteCaptura(
      new NextRequest(`http://localhost:3000/api/capturas/${remove.id}`, {
        method: "DELETE",
      }),
      { params: Promise.resolve({ id: remove.id }) },
    );
    expect(deleted.status).toBe(200);

    const store = getCapturaStore();
    expect(await store.getCaptura(remove.id)).toBeNull();
    expect(await store.getTrecho(remove.trechoId)).toBeNull();
    expect(await store.getStoredBytes(remove.storageKey)).toBeNull();
    expect(await store.getCaptura(keep.id)).not.toBeNull();
    expect(await store.listCapturas()).toHaveLength(1);

    const missing = await deleteCaptura(
      new NextRequest("http://localhost:3000/api/capturas/missing", {
        method: "DELETE",
      }),
      { params: Promise.resolve({ id: "missing" }) },
    );
    expect(missing.status).toBe(404);
  });
});
