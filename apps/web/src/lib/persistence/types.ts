import type { Captura, Classe, Trecho } from "@/lib/domain";

export type CreateCapturaInput = {
  trechoId?: string;
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
  getTrecho(id: string): Promise<Trecho | null>;
};
