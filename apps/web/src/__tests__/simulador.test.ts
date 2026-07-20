import { describe, expect, it } from "vitest";

import { runSimulador } from "@/lib/simulador";
import type {
  InferClient,
  PersistClient,
  SampleCaptura,
} from "@/lib/simulador";

const sample: SampleCaptura = {
  id: "route-001",
  imageBytes: new Uint8Array([1, 2, 3]),
  contentType: "image/png",
  lat: -23.55,
  lon: -46.63,
  capturedAt: "2026-07-20T12:00:00.000Z",
};

describe("simulador de ingestão orchestrator", () => {
  it("persists a successful inference with classe from the Inference API", async () => {
    const infer: InferClient = {
      async infer() {
        return {
          ok: true,
          classe: "alta",
          confidence: 0.91,
          modelVersion: "stub-0.1",
        };
      },
    };
    const persisted: Array<{
      classe: string | null;
      inferenceError: string | null;
    }> = [];
    const persist: PersistClient = {
      async persist(input) {
        persisted.push({
          classe: input.classe,
          inferenceError: input.inferenceError,
        });
        return { ok: true, capturaId: "cap-1" };
      },
    };

    const report = await runSimulador([sample], { infer, persist });

    expect(report.results).toEqual([
      {
        sampleId: "route-001",
        status: "ok",
        capturaId: "cap-1",
        classe: "alta",
      },
    ]);
    expect(persisted).toEqual([{ classe: "alta", inferenceError: null }]);
  });

  it("persists a failed inference with an error signal instead of dropping it", async () => {
    const infer: InferClient = {
      async infer() {
        return { ok: false, error: "Inference API unavailable" };
      },
    };
    const persisted: Array<{
      classe: string | null;
      inferenceError: string | null;
    }> = [];
    const persist: PersistClient = {
      async persist(input) {
        persisted.push({
          classe: input.classe,
          inferenceError: input.inferenceError,
        });
        return { ok: true, capturaId: "cap-err" };
      },
    };

    const report = await runSimulador([sample], { infer, persist });

    expect(report.results).toEqual([
      {
        sampleId: "route-001",
        status: "inference_failed",
        error: "Inference API unavailable",
        capturaId: "cap-err",
      },
    ]);
    expect(persisted).toEqual([
      { classe: null, inferenceError: "Inference API unavailable" },
    ]);
  });
});
