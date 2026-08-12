import * as XLSX from "xlsx";

import { classeFromAlturaCm, type Captura, type Classe } from "@/lib/domain";
import type { CreateCapturaInput } from "@/lib/persistence/types";

/** Hard caps for POST /api/capturas/import (memory + storage safety). */
export const MAX_IMPORT_BYTES = 2 * 1024 * 1024;
export const MAX_IMPORT_ROWS = 1000;

/** Minimal 1×1 transparent PNG when Excel rows have no image. */
export const PLACEHOLDER_PNG_BYTES = Uint8Array.from(
  Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
    "base64",
  ),
);

export type CapturaRowError = { row: number; message: string };

export type CapturaImportDraft = {
  row: number;
  input: CreateCapturaInput;
};

export type ParseCapturasWorkbookResult =
  | { ok: true; drafts: CapturaImportDraft[]; errors: CapturaRowError[] }
  | { ok: false; errors: CapturaRowError[] };

type SheetRow = Record<string, unknown>;

export function normalizeHeader(name: string): string {
  return name
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[_/]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Read the first matching column (by normalized header alias). */
export function get(row: SheetRow, ...names: string[]): unknown {
  const byHeader = new Map<string, unknown>();
  for (const [key, value] of Object.entries(row)) {
    byHeader.set(normalizeHeader(key), value);
  }
  for (const name of names) {
    const key = normalizeHeader(name);
    if (!byHeader.has(key)) {
      continue;
    }
    const value = byHeader.get(key);
    if (value === null || value === undefined || value === "") {
      continue;
    }
    return value;
  }
  return undefined;
}

export function parseNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const trimmed = value.trim().replace(",", ".");
    if (trimmed.length === 0) {
      return null;
    }
    const n = Number(trimmed);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

export function parseClasse(value: unknown): Classe | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  if (typeof value !== "string" && typeof value !== "number") {
    return null;
  }
  const normalized = normalizeHeader(String(value));
  switch (normalized) {
    case "baixa":
      return "baixa";
    case "media":
      return "média";
    case "alta":
      return "alta";
    default:
      return null;
  }
}

/** Confidence in 0–1; values > 1 are treated as percentages. */
export function parseConfidence(value: unknown): number | null {
  const n = parseNumber(value);
  if (n === null) {
    return null;
  }
  return n > 1 ? n / 100 : n;
}

export function parseDate(value: unknown): string | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString();
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return excelSerialToIso(value);
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed.length === 0) {
      return null;
    }
    const ms = Date.parse(trimmed);
    if (!Number.isNaN(ms)) {
      return new Date(ms).toISOString();
    }
  }
  return null;
}

/** Excel serial days since 1899-12-30 (SheetJS / Lotus 1900 convention). */
function excelSerialToIso(serial: number): string | null {
  const ms = Date.UTC(1899, 11, 30) + serial * 24 * 60 * 60 * 1000;
  const date = new Date(ms);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date.toISOString();
}

function draftFromRow(
  row: SheetRow,
  rodoviaId: string,
): { ok: true; draft: CreateCapturaInput } | { ok: false; message: string } {
  const lat = parseNumber(get(row, "Latitude", "Lat"));
  const lon = parseNumber(get(row, "Longitude", "Lon", "Lng"));
  if (lat === null || lon === null) {
    return { ok: false, message: "lat and lon are required" };
  }

  const capturedRaw = get(row, "Data/hora", "Data Hora", "Data", "Timestamp");
  const capturedAt = parseDate(capturedRaw) ?? new Date().toISOString();

  const alturaCm = parseNumber(get(row, "Altura (cm)", "Altura", "Altura cm"));
  const classeRaw = get(row, "IA - classe", "IA classe", "Classe IA", "Classe", "Severidade");
  let classe: Classe | null = null;
  if (classeRaw !== undefined) {
    classe = parseClasse(classeRaw);
    if (classe === null && String(classeRaw).trim() !== "") {
      return {
        ok: false,
        message: "classe must be baixa, média, or alta",
      };
    }
  } else if (alturaCm !== null) {
    classe = classeFromAlturaCm(alturaCm);
  }

  const confidence = parseConfidence(
    get(row, "IA - confiança", "Confiança IA", "Confianca", "Confiança"),
  );

  const modelRaw = get(row, "Modelo", "Versão Modelo");
  const modelVersion =
    modelRaw === undefined || modelRaw === null || modelRaw === ""
      ? null
      : String(modelRaw);

  const errRaw = get(row, "Erro inferência");
  const inferenceError =
    errRaw === undefined || errRaw === null || errRaw === "" ? null : String(errRaw);

  const km = parseNumber(get(row, "KM", "Km", "Quilometro"));
  const sentidoRaw = get(row, "Sentido");
  const sentido =
    sentidoRaw === undefined || sentidoRaw === null || sentidoRaw === ""
      ? null
      : String(sentidoRaw);

  return {
    ok: true,
    draft: {
      lat,
      lon,
      capturedAt,
      classe,
      confidence,
      modelVersion,
      inferenceError,
      imageBytes: PLACEHOLDER_PNG_BYTES,
      contentType: "image/png",
      rodoviaId,
      km,
      sentido,
      alturaCm,
    },
  };
}

export function parseCapturasWorkbook(
  buffer: ArrayBuffer | Uint8Array,
  rodoviaId: string,
): ParseCapturasWorkbookResult {
  const data = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let workbook: XLSX.WorkBook;
  try {
    workbook = XLSX.read(data, { type: "array", cellDates: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "invalid workbook";
    return { ok: false, errors: [{ row: 0, message }] };
  }

  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    return { ok: false, errors: [{ row: 0, message: "workbook has no sheets" }] };
  }
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) {
    return { ok: false, errors: [{ row: 0, message: "workbook has no sheets" }] };
  }

  const rows = XLSX.utils.sheet_to_json<SheetRow>(sheet, {
    defval: null,
    raw: true,
  });

  if (rows.length > MAX_IMPORT_ROWS) {
    return {
      ok: false,
      errors: [
        {
          row: 0,
          message: `workbook exceeds ${MAX_IMPORT_ROWS} data rows`,
        },
      ],
    };
  }

  const drafts: CapturaImportDraft[] = [];
  const errors: CapturaRowError[] = [];

  for (let i = 0; i < rows.length; i++) {
    const excelRow = i + 2;
    const row = rows[i];
    if (!row) {
      continue;
    }
    const parsed = draftFromRow(row, rodoviaId);
    if (!parsed.ok) {
      errors.push({ row: excelRow, message: parsed.message });
      continue;
    }
    drafts.push({ row: excelRow, input: parsed.draft });
  }

  return { ok: true, drafts, errors };
}

export function buildCapturasWorkbook(
  capturas: Captura[],
  rodoviaCodigoById: Readonly<Record<string, string>>,
): Uint8Array {
  const exportRows = capturas.map((captura) => {
    const rodoviaCodigo =
      captura.rodoviaId !== null
        ? (rodoviaCodigoById[captura.rodoviaId] ?? captura.rodoviaId)
        : null;
    return {
      Latitude: captura.lat,
      Longitude: captura.lon,
      "Data/hora": captura.capturedAt,
      KM: captura.km,
      Sentido: captura.sentido,
      "Altura (cm)": captura.alturaCm,
      "IA - classe": captura.classe,
      "IA - confiança": captura.confidence,
      Modelo: captura.modelVersion,
      "Erro inferência": captura.inferenceError,
      Rodovia: rodoviaCodigo,
    };
  });

  const sheet = XLSX.utils.json_to_sheet(exportRows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, "Capturas");
  // SheetJS may return number[], Uint8Array, or ArrayBuffer depending on runtime.
  const written: unknown = XLSX.write(workbook, {
    type: "array",
    bookType: "xlsx",
  });
  if (written instanceof Uint8Array) {
    return written;
  }
  if (written instanceof ArrayBuffer) {
    return new Uint8Array(written);
  }
  if (Array.isArray(written)) {
    return Uint8Array.from(written as number[]);
  }
  throw new Error("unexpected xlsx write output");
}
