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
  OverrideCapturaInput,
} from "@/lib/persistence/types";
import { listMotivaRodovias } from "@/lib/rodovias";

export function createMemoryStore(): CapturaStore {
  const trechos = new Map<string, Trecho>();
  const capturas = new Map<string, Captura>();
  const objects = new Map<string, Uint8Array>();

  const store: CapturaStore = {
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
        overrideMotivo: null,
        overrideAt: null,
      };
      capturas.set(id, captura);
      return captura;
    },

    async listCapturas(filter?: ListCapturasFilter): Promise<Captura[]> {
      let rows = [...capturas.values()];
      if (filter?.rodoviaId && filter.rodoviaId !== "todas") {
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

    async overrideCaptura(
      id: string,
      input: OverrideCapturaInput,
    ): Promise<Captura> {
      const existing = capturas.get(id);
      if (!existing) {
        throw new Error("captura not found");
      }
      const updated: Captura = {
        ...existing,
        classe: input.classe,
        overrideMotivo: input.motivo,
        overrideAt: new Date().toISOString(),
      };
      capturas.set(id, updated);
      const trecho = trechos.get(existing.trechoId);
      if (trecho) {
        trechos.set(existing.trechoId, {
          ...trecho,
          severidade: severidadeFromClasse(input.classe),
        });
      }
      return updated;
    },

    async clearCapturas(rodoviaId: string): Promise<number> {
      const toRemove = [...capturas.values()].filter((captura) =>
        rodoviaId === "todas" ? true : captura.rodoviaId === rodoviaId,
      );
      for (const captura of toRemove) {
        capturas.delete(captura.id);
        objects.delete(captura.storageKey);
        trechos.delete(captura.trechoId);
      }
      return toRemove.length;
    },
  };

  return store;
}
