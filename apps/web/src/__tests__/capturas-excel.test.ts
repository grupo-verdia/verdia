import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it } from "vitest";
import * as XLSX from "xlsx";

import { GET as exportCapturas } from "@/app/api/capturas/export/route";
import { POST as importCapturas } from "@/app/api/capturas/import/route";
import { GET as listCapturas } from "@/app/api/capturas/route";
import { createMemoryStore, setCapturaStore } from "@/lib/persistence";

function buildWorkbook(rows: Record<string, unknown>[]): Uint8Array {
  const sheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, "Capturas");
  // SheetJS `type: "array"` returns ArrayBuffer in Node; Uint8Array.from(ab) is empty.
  const written = XLSX.write(workbook, {
    type: "array",
    bookType: "xlsx",
  }) as ArrayBuffer | number[] | Uint8Array;
  if (written instanceof Uint8Array) {
    return written;
  }
  if (written instanceof ArrayBuffer) {
    return new Uint8Array(written);
  }
  return Uint8Array.from(written);
}

async function postImport(fileBytes: Uint8Array, rodoviaId: string) {
  const form = new FormData();
  form.set(
    "file",
    new File([Buffer.from(fileBytes)], "capturas.xlsx", {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
  );
  form.set("rodoviaId", rodoviaId);

  return importCapturas(
    new NextRequest("http://localhost:3000/api/capturas/import", {
      method: "POST",
      body: form,
    }),
  );
}

describe("capturas Excel import/export", () => {
  beforeEach(() => {
    setCapturaStore(createMemoryStore());
  });

  it("imports rows with rodoviaId/km/alturaCm and derives classe from altura", async () => {
    const bytes = buildWorkbook([
      {
        Latitude: -23.55,
        Longitude: -46.63,
        KM: 12.5,
        "Altura (cm)": 35,
        Confiança: 0.9,
      },
      {
        Latitude: -23.56,
        Longitude: -46.64,
        KM: 13,
        "Altura (cm)": 15,
        Confiança: 0.8,
      },
    ]);

    const response = await postImport(bytes, "sp-330");
    expect(response.status).toBe(200);
    const body = (await response.json()) as {
      imported: number;
      received: number;
      errors: unknown[];
    };
    expect(body.imported).toBe(2);
    expect(body.errors).toHaveLength(0);

    const listResponse = await listCapturas();
    expect(listResponse.status).toBe(200);
    const listed = (await listResponse.json()) as {
      capturas: Array<{
        rodoviaId: string | null;
        km: number | null;
        alturaCm: number | null;
        classe: string | null;
        trechoId: string;
      }>;
    };
    expect(listed.capturas).toHaveLength(2);
    expect(listed.capturas.every((c) => c.rodoviaId === "sp-330")).toBe(true);
    expect(listed.capturas.map((c) => c.km).sort()).toEqual([12.5, 13]);
    expect(listed.capturas.map((c) => c.alturaCm).sort()).toEqual([15, 35]);
    expect(
      listed.capturas.find((c) => c.alturaCm === 35)?.classe,
    ).toBe("alta");
    expect(
      listed.capturas.find((c) => c.alturaCm === 15)?.classe,
    ).toBe("média");

    const trechoIds = new Set(listed.capturas.map((c) => c.trechoId));
    expect(trechoIds.size).toBe(2);
  });

  it("reports missing lat as a row error while importing valid rows", async () => {
    const bytes = buildWorkbook([
      {
        Latitude: null,
        Longitude: -46.63,
        KM: 1,
        "Altura (cm)": 20,
        Confiança: 0.5,
      },
      {
        Latitude: -23.55,
        Longitude: -46.63,
        KM: 2,
        "Altura (cm)": 25,
        Confiança: 0.7,
      },
    ]);

    const response = await postImport(bytes, "sp-330");
    expect(response.status).toBe(200);
    const body = (await response.json()) as {
      imported: number;
      received: number;
      errors: Array<{ row: number; message: string }>;
    };
    expect(body.imported).toBe(1);
    expect(body.errors.length).toBeGreaterThanOrEqual(1);
    expect(body.errors.some((e) => /lat/i.test(e.message))).toBe(true);

    const listResponse = await listCapturas();
    const listed = (await listResponse.json()) as {
      capturas: Array<{ km: number | null }>;
    };
    expect(listed.capturas).toHaveLength(1);
    expect(listed.capturas[0]?.km).toBe(2);
  });

  it("exports capturas for a rodovia as an xlsx attachment", async () => {
    const bytes = buildWorkbook([
      {
        Latitude: -23.55,
        Longitude: -46.63,
        KM: 10,
        "Altura (cm)": 12,
        Confiança: 0.85,
      },
    ]);
    const importResponse = await postImport(bytes, "sp-330");
    expect(importResponse.status).toBe(200);

    const exportResponse = await exportCapturas(
      new NextRequest(
        "http://localhost:3000/api/capturas/export?rodoviaId=sp-330",
      ),
    );
    expect(exportResponse.status).toBe(200);
    const contentType = exportResponse.headers.get("content-type") ?? "";
    expect(
      contentType.includes(
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      ) || contentType.includes("application/octet-stream"),
    ).toBe(true);
    expect(exportResponse.headers.get("content-disposition")).toMatch(
      /attachment/i,
    );
  });

  it("rejects unknown rodoviaId with 400", async () => {
    const bytes = buildWorkbook([
      {
        Latitude: -23.55,
        Longitude: -46.63,
        KM: 1,
        "Altura (cm)": 10,
        Confiança: 0.5,
      },
    ]);

    const response = await postImport(bytes, "not-a-rodovia");
    expect(response.status).toBe(400);
    const body = (await response.json()) as { error: string };
    expect(body.error).toMatch(/rodoviaId/i);
  });
});
