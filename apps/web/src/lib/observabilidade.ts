import type { Classe } from "@/lib/domain";
import { getCapturaStore } from "@/lib/persistence";

/** Exact-match accuracy and/or ordinal distance (mean absolute rank error). */
export type EvalMetrics = {
  /** Exact-match accuracy in [0, 1]; optional if ordinalMae is present. */
  accuracy?: number;
  /** Mean absolute error on ordinal ranks (baixa=0, média=1, alta=2); lower is better. */
  ordinalMae?: number;
  sampleCount?: number;
  evaluatedAt?: string;
};

export type EvalSurface =
  | { status: "pending" }
  | ({ status: "available" } & EvalMetrics);

export type ObservabilityStats = {
  capturasProcessed: number;
  predictionsByClasse: Record<Classe, number>;
  eval: EvalSurface;
};

let evalMetricsOverride: EvalMetrics | null | undefined = undefined;

/** Inject eval metrics for tests; pass null to force the pending state. */
export function setEvalMetrics(metrics: EvalMetrics | null): void {
  evalMetricsOverride = metrics;
}

export function resetEvalMetrics(): void {
  evalMetricsOverride = undefined;
}

function emptyClasseCounts(): Record<Classe, number> {
  return { baixa: 0, média: 0, alta: 0 };
}

function hasUsableMetric(metrics: Partial<EvalMetrics>): metrics is EvalMetrics {
  return (
    typeof metrics.accuracy === "number" ||
    typeof metrics.ordinalMae === "number"
  );
}

function parseEvalMetrics(raw: string): EvalMetrics | null {
  try {
    const parsed = JSON.parse(raw) as Partial<EvalMetrics>;
    if (!hasUsableMetric(parsed)) {
      return null;
    }
    return {
      ...(typeof parsed.accuracy === "number"
        ? { accuracy: parsed.accuracy }
        : {}),
      ...(typeof parsed.ordinalMae === "number"
        ? { ordinalMae: parsed.ordinalMae }
        : {}),
      ...(typeof parsed.sampleCount === "number"
        ? { sampleCount: parsed.sampleCount }
        : {}),
      ...(typeof parsed.evaluatedAt === "string"
        ? { evaluatedAt: parsed.evaluatedAt }
        : {}),
    };
  } catch {
    return null;
  }
}

function resolveEvalMetrics(): EvalMetrics | null {
  if (evalMetricsOverride !== undefined) {
    return evalMetricsOverride;
  }

  const raw = process.env.EVAL_METRICS_JSON;
  if (!raw) {
    return null;
  }

  return parseEvalMetrics(raw);
}

/** Product read surface: lean counters + accuracy for the observability view. */
export async function loadObservabilityStats(): Promise<ObservabilityStats> {
  const capturas = await getCapturaStore().listCapturas();
  const predictionsByClasse = emptyClasseCounts();

  for (const captura of capturas) {
    if (captura.classe !== null) {
      predictionsByClasse[captura.classe] += 1;
    }
  }

  const metrics = resolveEvalMetrics();
  const evalSurface: EvalSurface =
    metrics === null
      ? { status: "pending" }
      : { status: "available", ...metrics };

  return {
    capturasProcessed: capturas.length,
    predictionsByClasse,
    eval: evalSurface,
  };
}
