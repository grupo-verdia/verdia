import type { Classe } from "@/lib/domain";

export type SampleCaptura = {
  id: string;
  imageBytes: Uint8Array;
  contentType: string;
  lat: number;
  lon: number;
  capturedAt: string;
};

export type InferSuccess = {
  ok: true;
  classe: Classe;
  confidence: number;
  modelVersion: string;
};

export type InferFailure = {
  ok: false;
  error: string;
};

export type InferResult = InferSuccess | InferFailure;

export type PersistInput = {
  sample: SampleCaptura;
  classe: Classe | null;
  confidence: number | null;
  modelVersion: string | null;
  inferenceError: string | null;
};

export type PersistResult =
  | { ok: true; capturaId: string }
  | { ok: false; error: string };

export type InferClient = {
  infer(sample: SampleCaptura): Promise<InferResult>;
};

export type PersistClient = {
  persist(input: PersistInput): Promise<PersistResult>;
};

export type IngestOk = {
  sampleId: string;
  status: "ok";
  capturaId: string;
  classe: Classe;
};

export type IngestInferenceFailed = {
  sampleId: string;
  status: "inference_failed";
  error: string;
  capturaId?: string;
};

export type IngestPersistFailed = {
  sampleId: string;
  status: "persist_failed";
  error: string;
};

export type IngestItemResult =
  | IngestOk
  | IngestInferenceFailed
  | IngestPersistFailed;

export type SimuladorReport = {
  results: IngestItemResult[];
};

export async function runSimulador(
  samples: SampleCaptura[],
  deps: { infer: InferClient; persist: PersistClient },
): Promise<SimuladorReport> {
  const results: IngestItemResult[] = [];

  for (const sample of samples) {
    const prediction = await deps.infer.infer(sample);

    const persistInput: PersistInput = prediction.ok
      ? {
          sample,
          classe: prediction.classe,
          confidence: prediction.confidence,
          modelVersion: prediction.modelVersion,
          inferenceError: null,
        }
      : {
          sample,
          classe: null,
          confidence: null,
          modelVersion: null,
          inferenceError: prediction.error,
        };

    const persisted = await deps.persist.persist(persistInput);

    if (!prediction.ok) {
      if (!persisted.ok) {
        results.push({
          sampleId: sample.id,
          status: "inference_failed",
          error: `${prediction.error} (also failed to persist: ${persisted.error})`,
        });
      } else {
        results.push({
          sampleId: sample.id,
          status: "inference_failed",
          error: prediction.error,
          capturaId: persisted.capturaId,
        });
      }
      continue;
    }

    if (!persisted.ok) {
      results.push({
        sampleId: sample.id,
        status: "persist_failed",
        error: persisted.error,
      });
      continue;
    }

    results.push({
      sampleId: sample.id,
      status: "ok",
      capturaId: persisted.capturaId,
      classe: prediction.classe,
    });
  }

  return { results };
}
