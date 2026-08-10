import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { createCaptura, overrideCaptura, localPersistenceInfo } from "@/lib/verdia-store";

export const runtime = "nodejs";

const normalize = (value: unknown) =>
  String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .trim();

function get(row: Record<string, unknown>, ...names: string[]) {
  const entries = Object.entries(row);
  const wanted = names.map(normalize);
  const found = entries.find(([key]) => wanted.includes(normalize(key)));
  return found?.[1] ?? null;
}

function num(value: unknown) {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const text = String(value ?? "").replace(",", ".").replace(/[^0-9.-]/g, "");
  if (!text) return null;
  const n = Number(text);
  return Number.isFinite(n) ? n : null;
}

function dateIso(value: unknown) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString();
  if (typeof value === "number") {
    const date = XLSX.SSF.parse_date_code(value);
    if (date) return new Date(Date.UTC(date.y, date.m - 1, date.d, date.H, date.M, Math.floor(date.S))).toISOString();
  }
  const text = String(value ?? "").trim();
  if (!text) return new Date().toISOString();
  const br = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
  if (br) {
    const [, d, m, y, h = "0", min = "0", sec = "0"] = br;
    return new Date(Date.UTC(Number(y), Number(m) - 1, Number(d), Number(h), Number(min), Number(sec))).toISOString();
  }
  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
}

function validClasse(value: unknown) {
  const c = normalize(value);
  if (c === "baixa") return "baixa" as const;
  if (c === "media") return "média" as const;
  if (c === "alta") return "alta" as const;
  return null;
}

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get("file");
    const rodoviaId = form.get("rodoviaId");
    if (!(file instanceof File) || typeof rodoviaId !== "string" || !rodoviaId) {
      return NextResponse.json({ error: "Arquivo e rodovia são obrigatórios." }, { status: 400 });
    }

    const wb = XLSX.read(Buffer.from(await file.arrayBuffer()), { type: "buffer", cellDates: true });
    const firstName = wb.SheetNames[0];
    if (!firstName) return NextResponse.json({ error: "A planilha não possui nenhuma aba." }, { status: 400 });
    const sheet = wb.Sheets[firstName];
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: null, raw: true }) as Record<string, unknown>[];
    if (!rows.length) return NextResponse.json({ error: "A planilha está vazia." }, { status: 400 });

    let imported = 0;
    const errors: { linha: number; motivo: string }[] = [];

    for (let index = 0; index < rows.length; index++) {
      const row = rows[index];
      const line = index + 2;
      const lat = num(get(row, "Latitude", "Lat"));
      const lon = num(get(row, "Longitude", "Lon", "Lng"));
      if (lat === null || lon === null) {
        errors.push({ linha: line, motivo: "Latitude/Longitude ausentes ou inválidas." });
        continue;
      }

      const aiClasse = validClasse(get(row, "IA - classe", "IA classe", "Classe IA"));
      const classeFinal = validClasse(get(row, "Classe final", "ClasseFinal", "Severidade", "Urgencia"));
      const decisao = normalize(get(row, "Origem decisão", "Decisao", "Origem"));
      const aiConfidence = num(get(row, "IA - confiança", "IA confiança", "Confiança IA", "Confianca IA"));
      const alturaCm = num(get(row, "Altura (cm)", "Altura", "Altura cm"));

      try {
        const captura = await createCaptura({
          rodoviaId,
          trechoId: typeof get(row, "Trecho", "Trecho ID") === "string" ? String(get(row, "Trecho", "Trecho ID")) : null,
          lat,
          lon,
          capturedAt: dateIso(get(row, "Data/hora", "Data Hora", "Data", "Timestamp")),
          km: num(get(row, "KM", "Km", "Quilometro")),
          sentido: get(row, "Sentido") ? String(get(row, "Sentido")) : null,
          alturaCm,
          aiClasse,
          aiConfidence: aiConfidence !== null && aiConfidence > 1 ? aiConfidence / 100 : aiConfidence,
          modelVersion: get(row, "Modelo", "Versão Modelo", "Versao Modelo") ? String(get(row, "Modelo", "Versão Modelo", "Versao Modelo")) : null,
          inferenceError: get(row, "Erro inferência", "Erro inferencia") ? String(get(row, "Erro inferência", "Erro inferencia")) : null,
        });

        if (classeFinal && (classeFinal !== captura.classeFinal || decisao === "manual")) {
          await overrideCaptura(captura.id, {
            classeFinal,
            alturaCm,
            motivo: String(get(row, "Motivo override", "Motivo", "Justificativa") || "Correção importada da planilha.").trim(),
          });
        }
        imported++;
      } catch (error) {
        errors.push({ linha: line, motivo: error instanceof Error ? error.message : "Falha ao importar registro." });
      }
    }

    const persistence = await localPersistenceInfo();
    return NextResponse.json({
      ok: true,
      imported,
      received: rows.length,
      errors,
      message: `${imported} de ${rows.length} registros importados para a rodovia selecionada.`,
      source: persistence.source,
      persistedCount: persistence.count,
      storagePath: persistence.path,
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Falha ao importar Excel." }, { status: 500 });
  }
}
