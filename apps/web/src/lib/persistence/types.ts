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
  /** Optional segmentação overlay bytes (PNG); not used to decide classe. */
  overlayBytes?: Uint8Array | null;
  overlayContentType?: string | null;
};

export type CapturaStore = {
  createCaptura(input: CreateCapturaInput): Promise<Captura>;
  listCapturas(): Promise<Captura[]>;
  getCaptura(id: string): Promise<Captura | null>;
  getStoredBytes(storageKey: string): Promise<Uint8Array | null>;
  getTrecho(id: string): Promise<Trecho | null>;
};
