import type { Captura, Classe, Trecho } from "@/lib/domain";
import type { Rodovia } from "@/lib/rodovias";

export type CreateCapturaInput = {
  lat: number;
  lon: number;
  capturedAt: string;
  classe: Classe | null;
  confidence: number | null;
  modelVersion: string | null;
  inferenceError?: string | null;
  imageBytes: Uint8Array;
  contentType: string;
  /** Optional Motiva rodovia catalog id. */
  rodoviaId?: string | null;
  km?: number | null;
  sentido?: string | null;
  alturaCm?: number | null;
};

export type ListCapturasFilter = {
  rodoviaId?: string;
};

export type CapturaStore = {
  createCaptura(input: CreateCapturaInput): Promise<Captura>;
  listCapturas(filter?: ListCapturasFilter): Promise<Captura[]>;
  getCaptura(id: string): Promise<Captura | null>;
  getStoredBytes(storageKey: string): Promise<Uint8Array | null>;
  getTrecho(id: string): Promise<Trecho | null>;
  listRodovias(): Promise<Rodovia[]>;
};
