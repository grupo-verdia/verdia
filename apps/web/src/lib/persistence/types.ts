import type { Captura, Classe, Trecho } from "@/lib/domain";

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
};

export type CapturaStore = {
  createCaptura(input: CreateCapturaInput): Promise<Captura>;
  listCapturas(): Promise<Captura[]>;
  getCaptura(id: string): Promise<Captura | null>;
  getStoredBytes(storageKey: string): Promise<Uint8Array | null>;
  getTrecho(id: string): Promise<Trecho | null>;
};
