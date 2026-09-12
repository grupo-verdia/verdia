import { isClassificationPending, severidadeFromClasse } from "@/lib/domain";
import type { MapTrecho } from "@/lib/mapa";
import { getCapturaStore } from "@/lib/persistence";
import {
  comparePrazoOrder,
  countPrazoBuckets,
  prazoUntilCut,
} from "@/lib/prazo";
import { getRodoviaById } from "@/lib/rodovias";

/** Trecho in the maintenance queue (prazo → rodovia → km). */
export type PlanTrecho = MapTrecho & {
  /** 1-based position in the plan (shortest prazo first). */
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
  /** Days until projected height hits 30 cm. Null when there is no grass. */
  prazoDias: number | null;
  /** Portuguese label for the prazo column. */
  prazoLabel: string | null;
};

/**
 * Maintenance queue: one row per captura, ordered by prazo until 30 cm
 * (already over first), then rodovia, then km (nulls last).
 * Pass `now` in tests so the projection does not depend on the clock.
 */
export async function loadPlanTrechos(now: Date = new Date()): Promise<PlanTrecho[]> {
  const capturas = (await getCapturaStore().listCapturas()).filter(
    (captura) => !isClassificationPending(captura) && !captura.inferenceError,
  );

  const rows: Omit<PlanTrecho, "ordem">[] = capturas.map((captura) => {
    const rodovia = captura.rodoviaId
      ? getRodoviaById(captura.rodoviaId)
      : null;
    const prazo = prazoUntilCut(captura, now);

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
      prazoDias: prazo?.dias ?? null,
      prazoLabel: prazo?.label ?? null,
    };
  });

  rows.sort(comparePrazoOrder);

  return rows.map((trecho, index) => ({
    ...trecho,
    ordem: index + 1,
  }));
}

export function planPrazoSummary(plan: PlanTrecho[]): {
  cortarAgora: number;
  estaSemana: number;
} {
  return countPrazoBuckets(plan.map((trecho) => trecho.prazoDias));
}

export function formatAlturaCm(alturaCm: number | null): string {
  if (alturaCm === null || Number.isNaN(alturaCm)) {
    return "—";
  }
  return `${alturaCm} cm`;
}

export function formatPrazo(label: string | null): string {
  return label ?? "—";
}

/** Display confidence as percent; values ≤ 1 are treated as 0–1 fractions. */
export function formatConfianca(confidence: number | null): string {
  if (confidence === null || Number.isNaN(confidence)) {
    return "—";
  }
  const pct = confidence <= 1 ? confidence * 100 : confidence;
  return `${Math.round(pct)}%`;
}
