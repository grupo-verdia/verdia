import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it } from "vitest";
import * as XLSX from "xlsx";

import { GET as exportCapturas } from "@/app/api/capturas/export/route";
import { POST as importCapturas } from "@/app/api/capturas/import/route";
import { GET as templateCapturas } from "@/app/api/capturas/template/route";
import { GET as listCapturas } from "@/app/api/capturas/route";
import {
  buildCapturasTemplate,
  CAPTURAS_SHEET_COLUMNS,
  MAX_IMPORT_BYTES,
  MAX_IMPORT_ROWS,
} from "@/lib/excel/capturas-xlsx";
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

async function postImport(
  fileBytes: Uint8Array,
  rodoviaId: string,
  filename = "capturas.xlsx",
) {
  const form = new FormData();
  form.set(
    "file",
    new File([Buffer.from(fileBytes)], filename, {
      type: filename.endsWith(".csv")
        ? "text/csv"
        : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
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

  it("accepts Motiva codigo SP-330 as rodoviaId on import", async () => {
    const bytes = buildWorkbook([
      {
        Latitude: -23.55,
        Longitude: -46.63,
        KM: 1,
        "Altura (cm)": 12,
        Confiança: 0.8,
      },
    ]);
    const response = await postImport(bytes, "SP-330");
    expect(response.status).toBe(200);
    const body = (await response.json()) as {
      imported: number;
      capturas: Array<{ rodoviaId: string | null }>;
    };
    expect(body.imported).toBe(1);
    expect(body.capturas[0]?.rodoviaId).toBe("sp-330");
  });

  it("accepts SPI-102/330 codigo as rodoviaId on import", async () => {
    const bytes = buildWorkbook([
      {
        Latitude: -23.4,
        Longitude: -46.9,
        KM: 2,
        "Altura (cm)": 8,
        Confiança: 0.9,
      },
    ]);
    const response = await postImport(bytes, "SPI-102/330");
    expect(response.status).toBe(200);
    const body = (await response.json()) as {
      imported: number;
      capturas: Array<{ rodoviaId: string | null }>;
    };
    expect(body.imported).toBe(1);
    expect(body.capturas[0]?.rodoviaId).toBe("spi-102-330");
  });

  it("imports template rows using the Rodovia column (incl. rodoviaId=todas)", async () => {
    const bytes = buildCapturasTemplate();
    const response = await postImport(bytes, "todas");
    expect(response.status).toBe(200);
    const body = (await response.json()) as {
      imported: number;
      errors: unknown[];
      capturas?: Array<{ rodoviaId: string | null }>;
    };
    expect(body.imported).toBeGreaterThanOrEqual(6);
    expect(body.errors).toHaveLength(0);
    expect(Array.isArray(body.capturas)).toBe(true);
    expect(body.capturas?.length).toBe(body.imported);

    const listResponse = await listCapturas();
    const listed = (await listResponse.json()) as {
      capturas: Array<{ rodoviaId: string | null }>;
    };
    const ids = new Set(listed.capturas.map((c) => c.rodoviaId));
    expect(ids.has("sp-330")).toBe(true);
    expect(ids.has("sp-348")).toBe(true);
  });

  it("rejects oversized uploads before parsing", async () => {
    const oversized = new Uint8Array(MAX_IMPORT_BYTES + 1);
    const response = await postImport(oversized, "sp-330");
    expect(response.status).toBe(400);
    const body = (await response.json()) as { error: string };
    expect(body.error).toMatch(/exceeds/i);
  });

  it("rejects workbooks with too many data rows", async () => {
    const rows = Array.from({ length: MAX_IMPORT_ROWS + 1 }, (_, index) => ({
      Latitude: -23.55,
      Longitude: -46.63,
      KM: index,
      "Altura (cm)": 10,
      Confiança: 0.5,
    }));
    const bytes = buildWorkbook(rows);
    const response = await postImport(bytes, "sp-330");
    expect(response.status).toBe(400);
    const body = (await response.json()) as {
      imported: number;
      errors: Array<{ message: string }>;
    };
    expect(body.imported).toBe(0);
    expect(body.errors.some((error) => /rows/i.test(error.message))).toBe(true);
  });

  it("rejects non-Excel filenames on import", async () => {
    const bytes = buildWorkbook([
      {
        Latitude: -23.55,
        Longitude: -46.63,
        KM: 1,
        "Altura (cm)": 10,
        Confiança: 0.5,
      },
    ]);
    const response = await postImport(bytes, "sp-330", "capturas.csv");
    expect(response.status).toBe(400);
    const body = (await response.json()) as { error: string };
    expect(body.error).toMatch(/excel/i);
  });

  it("exports all capturas when rodoviaId=todas", async () => {
    const first = buildWorkbook([
      {
        Latitude: -23.55,
        Longitude: -46.63,
        KM: 10,
        "Altura (cm)": 12,
        Confiança: 0.85,
      },
    ]);
    const second = buildWorkbook([
      {
        Latitude: -23.4,
        Longitude: -46.8,
        KM: 20,
        "Altura (cm)": 40,
        Confiança: 0.9,
      },
    ]);
    expect((await postImport(first, "sp-330")).status).toBe(200);
    expect((await postImport(second, "sp-348")).status).toBe(200);

    const exportResponse = await exportCapturas(
      new NextRequest(
        "http://localhost:3000/api/capturas/export?rodoviaId=todas",
      ),
    );
    expect(exportResponse.status).toBe(200);
    expect(exportResponse.headers.get("content-disposition")).toMatch(
      /capturas-todas\.xlsx/i,
    );
    const contentType = exportResponse.headers.get("content-type") ?? "";
    expect(
      contentType.includes(
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      ),
    ).toBe(true);

    const exported = new Uint8Array(await exportResponse.arrayBuffer());
    const workbook = XLSX.read(exported, { type: "array" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]!];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet!);
    expect(rows).toHaveLength(2);
  });

  it("serves a Motiva template workbook with expected headers", async () => {
    const response = await templateCapturas();
    expect(response.status).toBe(200);
    expect(response.headers.get("content-disposition")).toMatch(
      /verdia-capturas-template\.xlsx/i,
    );

    const bytes = new Uint8Array(await response.arrayBuffer());
    expect(bytes.byteLength).toBeGreaterThan(0);

    const fromBuilder = buildCapturasTemplate();
    expect(fromBuilder.byteLength).toBeGreaterThan(0);

    const workbook = XLSX.read(bytes, { type: "array" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]!];
    const headerRow = XLSX.utils.sheet_to_json<unknown[]>(sheet!, {
      header: 1,
    })[0] as unknown[];
    expect(headerRow).toEqual([...CAPTURAS_SHEET_COLUMNS]);

    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet!);
    expect(rows.length).toBeGreaterThanOrEqual(1);
  });

  it("seeds Motiva template rows into the memory store for the demo", async () => {
    const store = createMemoryStore({ seedDemo: true });
    const rows = await store.listCapturas();
    expect(rows.length).toBeGreaterThanOrEqual(6);
    const ids = new Set(rows.map((row) => row.rodoviaId));
    expect(ids.has("sp-330")).toBe(true);
    expect(ids.has("sp-348")).toBe(true);
  });

  it("lists all capturas when rodoviaId=todas", async () => {
    const bytes = buildCapturasTemplate();
    expect((await postImport(bytes, "todas")).status).toBe(200);

    const response = await listCapturas(
      new NextRequest("http://localhost:3000/api/capturas?rodoviaId=todas"),
    );
    expect(response.status).toBe(200);
    const listed = (await response.json()) as {
      capturas: Array<{ rodoviaId: string | null }>;
    };
    expect(listed.capturas.length).toBeGreaterThanOrEqual(6);
  });

  it("rejects HTML saved with an .xlsx filename", async () => {
    const html = new TextEncoder().encode("<!DOCTYPE html><html><body>not excel</body></html>");
    const response = await postImport(html, "todas", "verdia-teste-rodovias.xlsx");
    expect(response.status).toBe(400);
    const body = (await response.json()) as { error: string };
    expect(body.error).toMatch(/valid Excel/i);
  });

  it("returns created capturas in the import payload", async () => {
    const bytes = buildWorkbook([
      {
        Latitude: -23.55,
        Longitude: -46.63,
        KM: 11.1,
        "Altura (cm)": 41,
        Confiança: 0.9,
        Rodovia: "SP-330",
      },
    ]);
    const response = await postImport(bytes, "todas");
    expect(response.status).toBe(200);
    const body = (await response.json()) as {
      imported: number;
      capturas: Array<{ id: string; km: number | null; rodoviaId: string | null }>;
    };
    expect(body.imported).toBe(1);
    expect(body.capturas).toHaveLength(1);
    expect(body.capturas[0]?.km).toBe(11.1);
    expect(body.capturas[0]?.rodoviaId).toBe("sp-330");
    expect(body.capturas[0]?.id).toBeTruthy();
  });
});
