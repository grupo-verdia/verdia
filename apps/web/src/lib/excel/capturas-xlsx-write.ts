import * as XLSX from "xlsx";

import type { Captura } from "@/lib/domain";

/** Canonical column order for export / blank Motiva template. */
export const CAPTURAS_SHEET_COLUMNS = [
  "Latitude",
  "Longitude",
  "Data/hora",
  "KM",
  "Sentido",
  "Altura (cm)",
  "IA - classe",
  "IA - confiança",
  "Modelo",
  "Erro inferência",
  "Rodovia",
] as const;

type CapturasSheetRow = {
  Latitude: number | null;
  Longitude: number | null;
  "Data/hora": string | null;
  KM: number | null;
  Sentido: string | null;
  "Altura (cm)": number | null;
  "IA - classe": string | null;
  "IA - confiança": number | null;
  Modelo: string | null;
  "Erro inferência": string | null;
  Rodovia: string | null;
};

function writeCapturasSheet(rows: CapturasSheetRow[]): Uint8Array {
  const sheet = XLSX.utils.json_to_sheet(rows, {
    header: [...CAPTURAS_SHEET_COLUMNS],
  });
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

export function buildCapturasWorkbook(
  capturas: Captura[],
  rodoviaCodigoById: Readonly<Record<string, string>>,
): Uint8Array {
  const exportRows: CapturasSheetRow[] = capturas.map((captura) => {
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
  return writeCapturasSheet(exportRows);
}

const TEMPLATE_SAMPLE_AT = "2026-08-12T12:00:00.000Z";

const TEMPLATE_ROWS: CapturasSheetRow[] = [
  {
    Latitude: -23.396,
    Longitude: -46.812,
    "Data/hora": TEMPLATE_SAMPLE_AT,
    KM: 25.0,
    Sentido: "Norte",
    "Altura (cm)": 8,
    "IA - classe": "baixa",
    "IA - confiança": 0.92,
    Modelo: "template-v1",
    "Erro inferência": null,
    Rodovia: "SP-330",
  },
  {
    Latitude: -23.186,
    Longitude: -46.884,
    "Data/hora": TEMPLATE_SAMPLE_AT,
    KM: 48.5,
    Sentido: "Norte",
    "Altura (cm)": 18,
    "IA - classe": "média",
    "IA - confiança": 0.88,
    Modelo: "template-v1",
    "Erro inferência": null,
    Rodovia: "SP-330",
  },
  {
    Latitude: -22.905,
    Longitude: -47.062,
    "Data/hora": TEMPLATE_SAMPLE_AT,
    KM: 95.0,
    Sentido: "Sul",
    "Altura (cm)": 36,
    "IA - classe": "alta",
    "IA - confiança": 0.91,
    Modelo: "template-v1",
    "Erro inferência": null,
    Rodovia: "SP-330",
  },
  {
    Latitude: -23.35,
    Longitude: -46.84,
    "Data/hora": TEMPLATE_SAMPLE_AT,
    KM: 30.0,
    Sentido: "Norte",
    "Altura (cm)": 12,
    "IA - classe": "média",
    "IA - confiança": 0.85,
    Modelo: "template-v1",
    "Erro inferência": null,
    Rodovia: "SP-348",
  },
  {
    Latitude: -23.05,
    Longitude: -47.0,
    "Data/hora": TEMPLATE_SAMPLE_AT,
    KM: 72.0,
    Sentido: "Sul",
    "Altura (cm)": 42,
    "IA - classe": "alta",
    "IA - confiança": 0.87,
    Modelo: "template-v1",
    "Erro inferência": null,
    Rodovia: "SP-348",
  },
  {
    Latitude: -23.45,
    Longitude: -46.55,
    "Data/hora": TEMPLATE_SAMPLE_AT,
    KM: 210.0,
    Sentido: "Rio",
    "Altura (cm)": 22,
    "IA - classe": "média",
    "IA - confiança": 0.8,
    Modelo: "template-v1",
    "Erro inferência": null,
    Rodovia: "BR-116",
  },
  {
    Latitude: -23.48,
    Longitude: -46.72,
    "Data/hora": TEMPLATE_SAMPLE_AT,
    KM: 18.0,
    Sentido: "Oeste",
    "Altura (cm)": 5,
    "IA - classe": "baixa",
    "IA - confiança": 0.94,
    Modelo: "template-v1",
    "Erro inferência": null,
    Rodovia: "SP-021",
  },
  {
    Latitude: -23.52,
    Longitude: -47.45,
    "Data/hora": TEMPLATE_SAMPLE_AT,
    KM: 55.0,
    Sentido: "Oeste",
    "Altura (cm)": 28,
    "IA - classe": "média",
    "IA - confiança": 0.83,
    Modelo: "template-v1",
    "Erro inferência": null,
    Rodovia: "SP-280",
  },
];

/** Motiva sample workbook for import demos (Rodovia column selects the corridor). */
export function buildCapturasTemplate(): Uint8Array {
  return writeCapturasSheet(TEMPLATE_ROWS);
}
