import type { Severidade } from "@/lib/verdia-domain";
import { loadMapTrechos, type MapTrecho } from "@/lib/mapa";
export type PlanTrecho = MapTrecho & { ordem: number };
const RANK: Record<Severidade, number> = { alta: 2, média: 1, baixa: 0 };
export async function loadPlanTrechos(): Promise<PlanTrecho[]> {
  const trechos = await loadMapTrechos();
  trechos.sort((a,b) => RANK[b.severidade] - RANK[a.severidade] || a.id.localeCompare(b.id));
  return trechos.map((t, i) => ({ ...t, ordem: i + 1 }));
}
