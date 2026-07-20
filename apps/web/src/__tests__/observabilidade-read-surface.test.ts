import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it } from "vitest";

import { POST as createCaptura } from "@/app/api/capturas/route";
import { POST as login } from "@/app/api/auth/login/route";
import { SESSION_COOKIE } from "@/lib/auth";
import {
  loadObservabilityStats,
  resetEvalMetrics,
  setEvalMetrics,
} from "@/lib/observabilidade";
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
  return response;
}

describe("observabilidade product read surface", () => {
  beforeEach(() => {
    setCapturaStore(createMemoryStore());
    resetEvalMetrics();
    process.env.DEMO_PASSWORD = "verdia-demo";
  });

  it("counts processed capturas from persisted data", async () => {
    await seedCaptura({
      lat: -23.55,
      lon: -46.63,
      capturedAt: "2026-07-20T10:00:00.000Z",
      classe: "alta",
      confidence: 0.9,
      modelVersion: "stub-0.1",
      imageBase64: Buffer.from("alta").toString("base64"),
      contentType: "image/jpeg",
    });
    await seedCaptura({
      lat: -22.9,
      lon: -43.2,
      capturedAt: "2026-07-20T11:00:00.000Z",
      classe: "baixa",
      confidence: 0.7,
      modelVersion: "stub-0.1",
      imageBase64: Buffer.from("baixa").toString("base64"),
      contentType: "image/jpeg",
    });

    const stats = await loadObservabilityStats();
    expect(stats.capturasProcessed).toBe(2);
  });

  it("exposes predictions-by-classe counters from persisted capturas", async () => {
    await seedCaptura({
      lat: -23.55,
      lon: -46.63,
      capturedAt: "2026-07-20T10:00:00.000Z",
      classe: "alta",
      confidence: 0.9,
      modelVersion: "stub-0.1",
      imageBase64: Buffer.from("a").toString("base64"),
      contentType: "image/jpeg",
    });
    await seedCaptura({
      lat: -22.9,
      lon: -43.2,
      capturedAt: "2026-07-20T11:00:00.000Z",
      classe: "alta",
      confidence: 0.8,
      modelVersion: "stub-0.1",
      imageBase64: Buffer.from("b").toString("base64"),
      contentType: "image/jpeg",
    });
    await seedCaptura({
      lat: -15.8,
      lon: -47.9,
      capturedAt: "2026-07-20T12:00:00.000Z",
      classe: "média",
      confidence: 0.75,
      modelVersion: "stub-0.1",
      imageBase64: Buffer.from("c").toString("base64"),
      contentType: "image/jpeg",
    });
    await seedCaptura({
      lat: -12.9,
      lon: -38.5,
      capturedAt: "2026-07-20T13:00:00.000Z",
      classe: null,
      confidence: null,
      modelVersion: null,
      inferenceError: "timeout",
      imageBase64: Buffer.from("d").toString("base64"),
      contentType: "image/jpeg",
    });

    const stats = await loadObservabilityStats();
    expect(stats.predictionsByClasse).toEqual({
      baixa: 0,
      média: 1,
      alta: 2,
    });
    expect(stats.capturasProcessed).toBe(4);
  });

  it("surfaces a clear pending state when eval metrics are absent", async () => {
    const stats = await loadObservabilityStats();
    expect(stats.eval).toEqual({ status: "pending" });
  });

  it("surfaces accuracy when eval metrics exist", async () => {
    setEvalMetrics({
      accuracy: 0.82,
      ordinalMae: 0.31,
      sampleCount: 40,
      evaluatedAt: "2026-07-20T09:00:00.000Z",
    });

    const stats = await loadObservabilityStats();
    expect(stats.eval).toEqual({
      status: "available",
      accuracy: 0.82,
      ordinalMae: 0.31,
      sampleCount: 40,
      evaluatedAt: "2026-07-20T09:00:00.000Z",
    });
  });

  it("surfaces ordinal-aware metric when accuracy is absent", async () => {
    setEvalMetrics({ ordinalMae: 0.28, sampleCount: 25 });

    const stats = await loadObservabilityStats();
    expect(stats.eval).toEqual({
      status: "available",
      ordinalMae: 0.28,
      sampleCount: 25,
    });
  });

  it("blocks unauthenticated access to /observabilidade", async () => {
    const request = new NextRequest("http://localhost:3000/observabilidade");
    const response = await proxy(request);

    expect(response.status).toBe(307);
    expect(new URL(response.headers.get("location")!).pathname).toBe("/login");
  });

  it("grants access to /observabilidade after the shared password", async () => {
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
      new NextRequest("http://localhost:3000/observabilidade", {
        headers: { cookie: `${SESSION_COOKIE}=${session!.value}` },
      }),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("location")).toBeNull();
  });
});
