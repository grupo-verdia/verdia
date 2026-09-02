import { severidadeFromClasse, type Severidade } from "@/lib/domain";
import type { MapTrecho } from "@/lib/mapa";
import { getCapturaStore } from "@/lib/persistence";
import { getRodoviaById } from "@/lib/rodovias";

/** Trecho in the heuristic maintenance queue (severidade → rodovia → km). */
export type PlanTrecho = MapTrecho & {
  /** 1-based position in the plan (alta first). */
  ordem: number;
  /** Same as `id` — captura’s trecho (1:1 with captura in current product). */
  trechoId: string;
  rodoviaId: string | null;
  rodoviaCodigo: string | null;
  rodoviaNome: string | null;
  km: number | null;
  alturaCm: number | null;
  confidence: number | null;
  capturaId: string;
};

/** Higher rank = higher maintenance priority (alta first). */
const SEVERIDADE_PLAN_RANK: Record<Severidade, number> = {
  alta: 2,
  média: 1,
  baixa: 0,
};

function compareNullsLastString(a: string | null, b: string | null): number {
  if (a === null && b === null) {
    return 0;
  }
  if (a === null) {
    return 1;
  }
  if (b === null) {
    return -1;
  }
  return a.localeCompare(b);
}

function compareKmNullsLast(a: number | null, b: number | null): number {
  if (a === null && b === null) {
    return 0;
  }
  if (a === null) {
    return 1;
  }
  if (b === null) {
    return -1;
  }
  return a - b;
}

/**
 * Maintenance queue: one row per captura, ordered by severidade
 * (alta → média → baixa), then rodovia, then km (nulls last).
 */
export async function loadPlanTrechos(): Promise<PlanTrecho[]> {
  const capturas = await getCapturaStore().listCapturas();

  const rows: Omit<PlanTrecho, "ordem">[] = capturas.map((captura) => {
    const rodovia = captura.rodoviaId
      ? getRodoviaById(captura.rodoviaId)
      : null;

    return {
      id: captura.trechoId,
      trechoId: captura.trechoId,
      lat: captura.lat,
      lon: captura.lon,
      severidade: severidadeFromClasse(captura.classe),
      capturaCount: 1,
      rodoviaId: captura.rodoviaId,
      rodoviaCodigo: rodovia?.codigo ?? null,
      rodoviaNome: rodovia?.nome ?? null,
      km: captura.km,
      alturaCm: captura.alturaCm,
      confidence: captura.confidence,
      capturaId: captura.id,
    };
  });

  rows.sort((a, b) => {
    const rankDiff =
      SEVERIDADE_PLAN_RANK[b.severidade] - SEVERIDADE_PLAN_RANK[a.severidade];
    if (rankDiff !== 0) {
      return rankDiff;
    }
    const rodoviaDiff = compareNullsLastString(a.rodoviaId, b.rodoviaId);
    if (rodoviaDiff !== 0) {
      return rodoviaDiff;
    }
    const kmDiff = compareKmNullsLast(a.km, b.km);
    if (kmDiff !== 0) {
      return kmDiff;
    }
    return a.id.localeCompare(b.id);
  });

  return rows.map((trecho, index) => ({
    ...trecho,
    ordem: index + 1,
  }));
}

export function formatAlturaCm(alturaCm: number | null): string {
  if (alturaCm === null || Number.isNaN(alturaCm)) {
    return "—";
  }
  return `${alturaCm} cm`;
}

/** Display confidence as percent; values ≤ 1 are treated as 0–1 fractions. */
export function formatConfianca(confidence: number | null): string {
  if (confidence === null || Number.isNaN(confidence)) {
    return "—";
  }
  const pct = confidence <= 1 ? confidence * 100 : confidence;
  return `${Math.round(pct)}%`;
}
