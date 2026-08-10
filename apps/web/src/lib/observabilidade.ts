import type { Classe } from "@/lib/verdia-domain";
import { listCapturas } from "@/lib/verdia-store";
export type EvalMetrics = { accuracy?: number; ordinalMae?: number; sampleCount?: number; evaluatedAt?: string };
export type EvalSurface = { status: "pending" } | ({ status: "available" } & EvalMetrics);
export type ObservabilityStats = { capturasProcessed: number; predictionsByClasse: Record<Classe, number>; eval: EvalSurface };
let evalMetricsOverride: EvalMetrics | null | undefined;
export function setEvalMetrics(metrics: EvalMetrics | null) { evalMetricsOverride = metrics; }
export function resetEvalMetrics() { evalMetricsOverride = undefined; }
function metricsFromEnv(): EvalMetrics | null {
  if (evalMetricsOverride !== undefined) return evalMetricsOverride;
  const raw = process.env.EVAL_METRICS_JSON; if (!raw) return null;
  try { const x = JSON.parse(raw); return typeof x.accuracy === "number" || typeof x.ordinalMae === "number" ? x : null; } catch { return null; }
}
export async function loadObservabilityStats(): Promise<ObservabilityStats> {
  const capturas = await listCapturas();
  const predictionsByClasse: Record<Classe, number> = { baixa: 0, média: 0, alta: 0 };
  for (const c of capturas) if (c.classeFinal) predictionsByClasse[c.classeFinal]++;
  const metrics = metricsFromEnv();
  return { capturasProcessed: capturas.length, predictionsByClasse, eval: metrics ? { status: "available", ...metrics } : { status: "pending" } };
}
