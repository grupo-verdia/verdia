import { randomUUID } from "node:crypto";

import {
  severidadeFromClasse,
  severidadeFromClasses,
  type Captura,
  type Trecho,
} from "@/lib/domain";
import type { CapturaStore, CreateCapturaInput } from "@/lib/persistence/types";

export function createMemoryStore(): CapturaStore {
  const trechos = new Map<string, Trecho>();
  const capturas = new Map<string, Captura>();
  const images = new Map<string, Uint8Array>();

  async function refreshTrechoSeveridade(trechoId: string): Promise<void> {
    const trecho = trechos.get(trechoId);
    if (!trecho) {
      return;
    }
    const classes = [...capturas.values()]
      .filter((captura) => captura.trechoId === trechoId)
      .map((captura) => captura.classe);
    trechos.set(trechoId, {
      ...trecho,
      severidade: severidadeFromClasses(classes),
    });
  }

  return {
    async createCaptura(input: CreateCapturaInput): Promise<Captura> {
      let trechoId = input.trechoId;
      if (trechoId) {
        if (!trechos.has(trechoId)) {
          throw new Error(`trecho not found: ${trechoId}`);
        }
      } else {
        trechoId = randomUUID();
        trechos.set(trechoId, {
          id: trechoId,
          severidade: severidadeFromClasse(input.classe),
        });
      }

      const id = randomUUID();
      const storageKey = `capturas/${id}.bin`;
      images.set(storageKey, input.imageBytes);

      const captura: Captura = {
        id,
        trechoId,
        storageKey,
        lat: input.lat,
        lon: input.lon,
        capturedAt: input.capturedAt,
        classe: input.classe,
        confidence: input.confidence,
        modelVersion: input.modelVersion,
      };
      capturas.set(id, captura);
      await refreshTrechoSeveridade(trechoId);
      return captura;
    },

    async listCapturas(): Promise<Captura[]> {
      return [...capturas.values()].sort((a, b) =>
        a.capturedAt < b.capturedAt ? 1 : a.capturedAt > b.capturedAt ? -1 : 0,
      );
    },

    async getTrecho(id: string): Promise<Trecho | null> {
      return trechos.get(id) ?? null;
    },
  };
}
