import { readFileSync } from "node:fs";
import { join } from "node:path";

import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it } from "vitest";

import { POST as ingestCaptura } from "@/app/api/capturas/ingest/route";
import { loadDashboardCapturas } from "@/lib/dashboard";
import { classifyImageStub } from "@/lib/ingest/classify";
import { readGeotagFromImage } from "@/lib/ingest/exif-gps";
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
      classification: { fake: boolean };
    };
    expect(body.captura.classe).toBe("alta");
    expect(body.captura.alturaCm).toBe(50);
    expect(body.captura.rodoviaId).toBe("sp-330");
    expect(body.captura.km).toBe(12.5);
    expect(body.classification.fake).toBe(true);

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
