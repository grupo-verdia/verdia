import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it } from "vitest";

import { POST as createCaptura } from "@/app/api/capturas/route";
import { GET as getCapturaPhoto } from "@/app/api/capturas/[id]/photo/route";
import { capturaPhotoPath } from "@/lib/captura-photo";
import { capturaMapPopupHtml } from "@/lib/mapa-popup";
import type { Captura } from "@/lib/domain";
import { createMemoryStore, setCapturaStore } from "@/lib/persistence";
import {
  LEGACY_RED_PLACEHOLDER_PNG_BYTES,
  NO_IMAGE_HREF,
} from "@/lib/photo/placeholder";
import { isTheme, otherTheme } from "@/lib/theme";

const JPEG_BYTES = Uint8Array.from([0xff, 0xd8, 0xff, 0x00]);

function sampleCaptura(over: Partial<Captura> = {}): Captura {
  return {
    id: "cap-1",
    trechoId: "trecho-1",
    storageKey: "cap-1.bin",
    lat: -23.55,
    lon: -46.63,
    capturedAt: "2026-07-20T12:00:00.000Z",
    classe: "alta",
    confidence: 0.91,
    modelVersion: "stub-0.1",
    inferenceError: null,
    rodoviaId: "sp-330",
    km: 18.2,
    sentido: "Norte",
    alturaCm: 35,
    overrideMotivo: null,
    overrideAt: null,
    classifiedAt: "2026-07-20T12:01:00.000Z",
    ...over,
  };
}

describe("captura photo URL", () => {
  it("points at the authenticated photo route", () => {
    expect(capturaPhotoPath("abc/def")).toBe("/api/capturas/abc%2Fdef/photo");
  });
});

describe("GET /api/capturas/:id/photo", () => {
  beforeEach(() => {
    setCapturaStore(createMemoryStore());
  });

  it("returns the stored JPEG", async () => {
    const write = await createCaptura(
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
          imageBase64: Buffer.from(JPEG_BYTES).toString("base64"),
          contentType: "image/jpeg",
        }),
      }),
    );
    expect(write.status).toBe(201);
    const written = (await write.json()) as { id: string };

    const response = await getCapturaPhoto(
      new NextRequest(`http://localhost:3000/api/capturas/${written.id}/photo`),
      { params: Promise.resolve({ id: written.id }) },
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("image/jpeg");
    const bytes = new Uint8Array(await response.arrayBuffer());
    expect(bytes).toEqual(JPEG_BYTES);
  });

  it("returns 404 when the captura is missing", async () => {
    const response = await getCapturaPhoto(
      new NextRequest("http://localhost:3000/api/capturas/missing/photo"),
      { params: Promise.resolve({ id: "missing" }) },
    );
    expect(response.status).toBe(404);
  });

  it("redirects Excel stand-ins to Sem imagem", async () => {
    const write = await createCaptura(
      new NextRequest("http://localhost:3000/api/capturas", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          lat: -23.55,
          lon: -46.63,
          capturedAt: "2026-07-20T18:30:00.000Z",
          classe: "alta",
          confidence: 0.88,
          modelVersion: "teste-verdia",
          imageBase64: Buffer.from(LEGACY_RED_PLACEHOLDER_PNG_BYTES).toString(
            "base64",
          ),
          contentType: "image/png",
        }),
      }),
    );
    expect(write.status).toBe(201);
    const written = (await write.json()) as { id: string };

    const response = await getCapturaPhoto(
      new NextRequest(`http://localhost:3000/api/capturas/${written.id}/photo`),
      { params: Promise.resolve({ id: written.id }) },
    );
    expect(response.status).toBe(307);
    expect(new URL(response.headers.get("location")!).pathname).toBe(
      NO_IMAGE_HREF,
    );
  });
});

describe("map popup", () => {
  it("includes the photo next to the captura stats", () => {
    const html = capturaMapPopupHtml(sampleCaptura(), "SP-330", 3);
    expect(html).toContain('src="/api/capturas/cap-1/photo"');
    expect(html).toContain("SP-330");
    expect(html).toContain("KM 18.2");
    expect(html).toContain("Altura: 35 cm");
    expect(html).toContain("Classe: Alta");
    expect(html).toContain("Plano: ordem <b>3</b>");
    expect(html).toContain('href="/capturas/cap-1"');
  });

  it("escapes rodovia labels from the catalog text", () => {
    const html = capturaMapPopupHtml(sampleCaptura(), '<b>x</b>', undefined);
    expect(html).toContain("&lt;b&gt;x&lt;/b&gt;");
    expect(html).not.toContain("<b>x</b>");
  });
});

describe("theme helpers", () => {
  it("treats only claro and escuro as themes", () => {
    expect(isTheme("light")).toBe(true);
    expect(isTheme("dark")).toBe(true);
    expect(isTheme("system")).toBe(false);
  });

  it("flips between claro and escuro", () => {
    expect(otherTheme("dark")).toBe("light");
    expect(otherTheme("light")).toBe("dark");
  });
});
