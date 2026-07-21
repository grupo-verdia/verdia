import type { Severidade } from "@/lib/domain";
import { loadMapTrechos, type MapTrecho } from "@/lib/mapa";

/** Trecho in the heuristic maintenance queue (ordered by severidade). */
export type PlanTrecho = MapTrecho & {
  /** 1-based position in the plan (alta first). */
  ordem: number;
};

/** Higher rank = higher maintenance priority (alta first). */
const SEVERIDADE_PLAN_RANK: Record<Severidade, number> = {
  alta: 2,
  média: 1,
  baixa: 0,
};

/**
 * Product read surface: heuristic plan — trechos ordered by severidade
 * (alta → média → baixa), driven by classe via persisted capturas.
 */
export async function loadPlanTrechos(): Promise<PlanTrecho[]> {
  const trechos = await loadMapTrechos();

  trechos.sort((a, b) => {
    const rankDiff =
      SEVERIDADE_PLAN_RANK[b.severidade] - SEVERIDADE_PLAN_RANK[a.severidade];
    if (rankDiff !== 0) {
      return rankDiff;
    }
    return a.id.localeCompare(b.id);
  });

  return trechos.map((trecho, index) => ({
    ...trecho,
    ordem: index + 1,
  }));
}
