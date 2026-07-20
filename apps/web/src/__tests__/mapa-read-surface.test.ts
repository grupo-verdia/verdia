import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it } from "vitest";

import { POST as createCaptura } from "@/app/api/capturas/route";
import { loadMapTrechos } from "@/lib/mapa";
import { createMemoryStore, setCapturaStore } from "@/lib/persistence";
import { proxy } from "@/proxy";
import { POST as login } from "@/app/api/auth/login/route";
import { SESSION_COOKIE } from "@/lib/auth";

describe("mapa product read surface", () => {
  beforeEach(() => {
    setCapturaStore(createMemoryStore());
    process.env.DEMO_PASSWORD = "verdia-demo";
  });

  it("exposes trechos at lat/lon with severidade from persisted capturas", async () => {
    const alta = await createCaptura(
      new NextRequest("http://localhost:3000/api/capturas", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          lat: -23.55,
          lon: -46.63,
          capturedAt: "2026-07-20T10:00:00.000Z",
          classe: "alta",
          confidence: 0.9,
          modelVersion: "stub-0.1",
          imageBase64: Buffer.from("alta").toString("base64"),
          contentType: "image/jpeg",
        }),
      }),
    );
    expect(alta.status).toBe(201);
    const altaBody = (await alta.json()) as { trechoId: string };

    const baixa = await createCaptura(
      new NextRequest("http://localhost:3000/api/capturas", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          lat: -22.9,
          lon: -43.2,
          capturedAt: "2026-07-20T11:00:00.000Z",
          classe: "baixa",
          confidence: 0.7,
          modelVersion: "stub-0.1",
          imageBase64: Buffer.from("baixa").toString("base64"),
          contentType: "image/jpeg",
        }),
      }),
    );
    expect(baixa.status).toBe(201);
    const baixaBody = (await baixa.json()) as { trechoId: string };

    const trechos = await loadMapTrechos();
    expect(trechos).toHaveLength(2);

    const altaTrecho = trechos.find((t) => t.id === altaBody.trechoId);
    const baixaTrecho = trechos.find((t) => t.id === baixaBody.trechoId);
    expect(altaTrecho).toEqual({
      id: altaBody.trechoId,
      lat: -23.55,
      lon: -46.63,
      severidade: "alta",
      capturaCount: 1,
    });
    expect(baixaTrecho).toEqual({
      id: baixaBody.trechoId,
      lat: -22.9,
      lon: -43.2,
      severidade: "baixa",
      capturaCount: 1,
    });
  });

  it("averages captura lat/lon for a trecho without requiring PostGIS", async () => {
    const first = await createCaptura(
      new NextRequest("http://localhost:3000/api/capturas", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          lat: -23.5,
          lon: -46.6,
          capturedAt: "2026-07-20T10:00:00.000Z",
          classe: "média",
          confidence: 0.8,
          modelVersion: "stub-0.1",
          imageBase64: Buffer.from("a").toString("base64"),
          contentType: "image/jpeg",
        }),
      }),
    );
    const firstBody = (await first.json()) as { trechoId: string };

    await createCaptura(
      new NextRequest("http://localhost:3000/api/capturas", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          trechoId: firstBody.trechoId,
          lat: -23.7,
          lon: -46.8,
          capturedAt: "2026-07-20T11:00:00.000Z",
          classe: "baixa",
          confidence: 0.6,
          modelVersion: "stub-0.1",
          imageBase64: Buffer.from("b").toString("base64"),
          contentType: "image/jpeg",
        }),
      }),
    );

    const trechos = await loadMapTrechos();
    expect(trechos).toHaveLength(1);
    expect(trechos[0]).toMatchObject({
      id: firstBody.trechoId,
      lat: -23.6,
      lon: -46.7,
      severidade: "média",
      capturaCount: 2,
    });
  });

  it("can focus the map read path on alta trechos", async () => {
    await createCaptura(
      new NextRequest("http://localhost:3000/api/capturas", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          lat: -23.55,
          lon: -46.63,
          capturedAt: "2026-07-20T10:00:00.000Z",
          classe: "alta",
          confidence: 0.9,
          modelVersion: "stub-0.1",
          imageBase64: Buffer.from("alta").toString("base64"),
          contentType: "image/jpeg",
        }),
      }),
    );
    await createCaptura(
      new NextRequest("http://localhost:3000/api/capturas", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          lat: -22.9,
          lon: -43.2,
          capturedAt: "2026-07-20T11:00:00.000Z",
          classe: "baixa",
          confidence: 0.7,
          modelVersion: "stub-0.1",
          imageBase64: Buffer.from("baixa").toString("base64"),
          contentType: "image/jpeg",
        }),
      }),
    );

    const altaOnly = await loadMapTrechos({ severidade: "alta" });
    expect(altaOnly).toHaveLength(1);
    expect(altaOnly[0]?.severidade).toBe("alta");
  });

  it("blocks unauthenticated access to /mapa", async () => {
    const request = new NextRequest("http://localhost:3000/mapa");
    const response = await proxy(request);

    expect(response.status).toBe(307);
    expect(new URL(response.headers.get("location")!).pathname).toBe("/login");
  });

  it("grants access to /mapa after the shared password", async () => {
    const loginResponse = await login(
      new NextRequest("http://localhost:3000/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password: "verdia-demo" }),
      }),
    );
    const session = loginResponse.cookies.get(SESSION_COOKIE);
    expect(session?.value).toBeTruthy();

    const response = await proxy(
      new NextRequest("http://localhost:3000/mapa", {
        headers: { cookie: `${SESSION_COOKIE}=${session!.value}` },
      }),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("location")).toBeNull();
  });
});
