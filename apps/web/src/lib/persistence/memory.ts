import { randomUUID } from "node:crypto";

import {
  DEFAULT_TRECHO_LENGTH_METERS,
  severidadeFromClasse,
  severidadeFromClasses,
  type Captura,
  type Trecho,
} from "@/lib/domain";
import type { CapturaStore, CreateCapturaInput } from "@/lib/persistence/types";

export function createMemoryStore(): CapturaStore {
  const trechos = new Map<string, Trecho>();
  const capturas = new Map<string, Captura>();
  const objects = new Map<string, Uint8Array>();

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
      const trechoId = randomUUID();
      trechos.set(trechoId, {
        id: trechoId,
        severidade: severidadeFromClasse(input.classe),
        lengthMeters: DEFAULT_TRECHO_LENGTH_METERS,
      });

      const id = randomUUID();
      const storageKey = `capturas/${id}.bin`;
      objects.set(storageKey, input.imageBytes);

      let overlayStorageKey: string | null = null;
      if (input.overlayBytes && input.overlayBytes.byteLength > 0) {
        overlayStorageKey = `capturas/${id}-overlay.png`;
        objects.set(overlayStorageKey, input.overlayBytes);
      }

      const captura: Captura = {
        id,
        trechoId,
        storageKey,
        overlayStorageKey,
        lat: input.lat,
        lon: input.lon,
        capturedAt: input.capturedAt,
        classe: input.classe,
        confidence: input.confidence,
        modelVersion: input.modelVersion,
        inferenceError: input.inferenceError ?? null,
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

    async getCaptura(id: string): Promise<Captura | null> {
      return capturas.get(id) ?? null;
    },

    async getStoredBytes(storageKey: string): Promise<Uint8Array | null> {
      return objects.get(storageKey) ?? null;
    },

    async getTrecho(id: string): Promise<Trecho | null> {
      return trechos.get(id) ?? null;
    },
  };
}
