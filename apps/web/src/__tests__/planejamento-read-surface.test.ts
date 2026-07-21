import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it } from "vitest";

import { POST as createCaptura } from "@/app/api/capturas/route";
import { POST as login } from "@/app/api/auth/login/route";
import { SESSION_COOKIE } from "@/lib/auth";
import { loadPlanTrechos } from "@/lib/planejamento";
import { createMemoryStore, setCapturaStore } from "@/lib/persistence";
import { proxy } from "@/proxy";

async function seedCaptura(body: Record<string, unknown>) {
  const response = await createCaptura(
    new NextRequest("http://localhost:3000/api/capturas", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
  expect(response.status).toBe(201);
  return (await response.json()) as { trechoId: string };
}

describe("planejamento product read surface", () => {
  beforeEach(() => {
    setCapturaStore(createMemoryStore());
    process.env.DEMO_PASSWORD = "verdia-demo";
  });

  it("orders trechos by severidade alta → média → baixa from persisted capturas", async () => {
    const baixa = await seedCaptura({
      lat: -22.9,
      lon: -43.2,
      capturedAt: "2026-07-20T11:00:00.000Z",
      classe: "baixa",
      confidence: 0.7,
      modelVersion: "stub-0.1",
      imageBase64: Buffer.from("baixa").toString("base64"),
      contentType: "image/jpeg",
    });
    const media = await seedCaptura({
      lat: -23.0,
      lon: -46.0,
      capturedAt: "2026-07-20T12:00:00.000Z",
      classe: "média",
      confidence: 0.8,
      modelVersion: "stub-0.1",
      imageBase64: Buffer.from("media").toString("base64"),
      contentType: "image/jpeg",
    });
    const alta = await seedCaptura({
      lat: -23.55,
      lon: -46.63,
      capturedAt: "2026-07-20T10:00:00.000Z",
      classe: "alta",
      confidence: 0.9,
      modelVersion: "stub-0.1",
      imageBase64: Buffer.from("alta").toString("base64"),
      contentType: "image/jpeg",
    });

    const plan = await loadPlanTrechos();

    expect(plan.map((t) => t.id)).toEqual([
      alta.trechoId,
      media.trechoId,
      baixa.trechoId,
    ]);
    expect(plan.map((t) => t.severidade)).toEqual(["alta", "média", "baixa"]);
  });

  it("drives plan severidade from each captura’s classe (1:1 trecho)", async () => {
    const alta = await seedCaptura({
      lat: -23.5,
      lon: -46.6,
      capturedAt: "2026-07-20T10:00:00.000Z",
      classe: "alta",
      confidence: 0.9,
      modelVersion: "stub-0.1",
      imageBase64: Buffer.from("a").toString("base64"),
      contentType: "image/jpeg",
    });
    const baixa = await seedCaptura({
      lat: -22.9,
      lon: -43.2,
      capturedAt: "2026-07-20T12:00:00.000Z",
      classe: "baixa",
      confidence: 0.7,
      modelVersion: "stub-0.1",
      imageBase64: Buffer.from("c").toString("base64"),
      contentType: "image/jpeg",
    });

    const plan = await loadPlanTrechos();

    expect(plan).toHaveLength(2);
    expect(plan[0]).toMatchObject({
      id: alta.trechoId,
      severidade: "alta",
      ordem: 1,
    });
    expect(plan[1]).toMatchObject({
      id: baixa.trechoId,
      severidade: "baixa",
      ordem: 2,
    });
  });

  it("exposes the current plan as highlighted trecho ids for the map", async () => {
    const baixa = await seedCaptura({
      lat: -22.9,
      lon: -43.2,
      capturedAt: "2026-07-20T11:00:00.000Z",
      classe: "baixa",
      confidence: 0.7,
      modelVersion: "stub-0.1",
      imageBase64: Buffer.from("baixa").toString("base64"),
      contentType: "image/jpeg",
    });
    const alta = await seedCaptura({
      lat: -23.55,
      lon: -46.63,
      capturedAt: "2026-07-20T10:00:00.000Z",
      classe: "alta",
      confidence: 0.9,
      modelVersion: "stub-0.1",
      imageBase64: Buffer.from("alta").toString("base64"),
      contentType: "image/jpeg",
    });

    const plan = await loadPlanTrechos();
    const highlightedIds = plan.map((t) => t.id);

    expect(highlightedIds).toEqual([alta.trechoId, baixa.trechoId]);
    expect(plan.every((t) => typeof t.lat === "number" && typeof t.lon === "number")).toBe(
      true,
    );
  });

  it("blocks unauthenticated access to /planejamento", async () => {
    const request = new NextRequest("http://localhost:3000/planejamento");
    const response = await proxy(request);

    expect(response.status).toBe(307);
    expect(new URL(response.headers.get("location")!).pathname).toBe("/login");
  });

  it("grants access to /planejamento after the shared password", async () => {
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
      new NextRequest("http://localhost:3000/planejamento", {
        headers: { cookie: `${SESSION_COOKIE}=${session!.value}` },
      }),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("location")).toBeNull();
  });
});
