import { randomUUID } from "node:crypto";

import {
  DEFAULT_TRECHO_LENGTH_METERS,
  severidadeFromClasse,
  type Captura,
  type Trecho,
} from "@/lib/domain";
import type {
  CapturaStore,
  CreateCapturaInput,
  ListCapturasFilter,
} from "@/lib/persistence/types";
import { listMotivaRodovias } from "@/lib/rodovias";

export function createMemoryStore(): CapturaStore {
  const trechos = new Map<string, Trecho>();
  const capturas = new Map<string, Captura>();
  const objects = new Map<string, Uint8Array>();

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
        inferenceError: input.inferenceError ?? null,
        rodoviaId: input.rodoviaId ?? null,
        km: input.km ?? null,
        sentido: input.sentido ?? null,
        alturaCm: input.alturaCm ?? null,
      };
      capturas.set(id, captura);
      return captura;
    },

    async listCapturas(filter?: ListCapturasFilter): Promise<Captura[]> {
      let rows = [...capturas.values()];
      if (filter?.rodoviaId) {
        rows = rows.filter((captura) => captura.rodoviaId === filter.rodoviaId);
      }
      return rows.sort((a, b) =>
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

    async listRodovias() {
      return listMotivaRodovias();
    },
  };
}
