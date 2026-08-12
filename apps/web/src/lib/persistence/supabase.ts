import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import {
  DEFAULT_TRECHO_LENGTH_METERS,
  severidadeFromClasse,
  type Captura,
  type Classe,
  type Severidade,
  type Trecho,
} from "@/lib/domain";
import type {
  CapturaStore,
  CreateCapturaInput,
  ListCapturasFilter,
} from "@/lib/persistence/types";
import { listMotivaRodovias } from "@/lib/rodovias";

type TrechoRow = {
  id: string;
  severidade: Severidade;
  length_meters: number;
};

type CapturaRow = {
  id: string;
  trecho_id: string;
  storage_key: string;
  lat: number;
  lon: number;
  captured_at: string;
  classe: Classe | null;
  confidence: number | null;
  model_version: string | null;
  inference_error: string | null;
  rodovia_id: string | null;
  km: number | null;
  sentido: string | null;
  altura_cm: number | null;
};

const BUCKET = "capturas";

const CAPTURA_SELECT =
  "id, trecho_id, storage_key, lat, lon, captured_at, classe, confidence, model_version, inference_error, rodovia_id, km, sentido, altura_cm";

function rowToCaptura(row: CapturaRow): Captura {
  return {
    id: row.id,
    trechoId: row.trecho_id,
    storageKey: row.storage_key,
    lat: row.lat,
    lon: row.lon,
    capturedAt: row.captured_at,
    classe: row.classe,
    confidence: row.confidence,
    modelVersion: row.model_version,
    inferenceError: row.inference_error,
    rodoviaId: row.rodovia_id,
    km: row.km,
    sentido: row.sentido,
    alturaCm: row.altura_cm,
  };
}

export function createSupabaseStore(options: {
  url: string;
  secretKey: string;
  client?: SupabaseClient;
}): CapturaStore {
  const client =
    options.client ??
    createClient(options.url, options.secretKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

  return {
    async createCaptura(input: CreateCapturaInput): Promise<Captura> {
      const { data, error } = await client
        .from("trechos")
        .insert({
          severidade: severidadeFromClasse(input.classe),
          length_meters: DEFAULT_TRECHO_LENGTH_METERS,
        })
        .select("id")
        .single();
      if (error || !data) {
        throw new Error(`failed to create trecho: ${error?.message ?? "unknown"}`);
      }
      const trechoId = data.id as string;

      const id = crypto.randomUUID();
      const storageKey = `${id}.bin`;
      const { error: uploadError } = await client.storage
        .from(BUCKET)
        .upload(storageKey, input.imageBytes, {
          contentType: input.contentType,
          upsert: false,
        });
      if (uploadError) {
        throw new Error(`failed to upload image: ${uploadError.message}`);
      }

      const { data: row, error: insertError } = await client
        .from("capturas")
        .insert({
          id,
          trecho_id: trechoId,
          storage_key: storageKey,
          lat: input.lat,
          lon: input.lon,
          captured_at: input.capturedAt,
          classe: input.classe,
          confidence: input.confidence,
          model_version: input.modelVersion,
          inference_error: input.inferenceError ?? null,
          rodovia_id: input.rodoviaId ?? null,
          km: input.km ?? null,
          sentido: input.sentido ?? null,
          altura_cm: input.alturaCm ?? null,
        })
        .select(CAPTURA_SELECT)
        .single();
      if (insertError || !row) {
        throw new Error(
          `failed to insert captura: ${insertError?.message ?? "unknown"}`,
        );
      }

      return rowToCaptura(row as CapturaRow);
    },

    async listCapturas(filter?: ListCapturasFilter): Promise<Captura[]> {
      let query = client
        .from("capturas")
        .select(CAPTURA_SELECT)
        .order("captured_at", { ascending: false });
      if (filter?.rodoviaId) {
        query = query.eq("rodovia_id", filter.rodoviaId);
      }
      const { data, error } = await query;
      if (error) {
        throw new Error(`failed to list capturas: ${error.message}`);
      }
      return (data as CapturaRow[] | null)?.map(rowToCaptura) ?? [];
    },

    async getCaptura(id: string): Promise<Captura | null> {
      const { data, error } = await client
        .from("capturas")
        .select(CAPTURA_SELECT)
        .eq("id", id)
        .maybeSingle();
      if (error) {
        throw new Error(`failed to load captura: ${error.message}`);
      }
      if (!data) {
        return null;
      }
      return rowToCaptura(data as CapturaRow);
    },

    async getStoredBytes(storageKey: string): Promise<Uint8Array | null> {
      const { data, error } = await client.storage
        .from(BUCKET)
        .download(storageKey);
      if (error || !data) {
        return null;
      }
      const buffer = await data.arrayBuffer();
      return new Uint8Array(buffer);
    },

    async getTrecho(id: string): Promise<Trecho | null> {
      const { data, error } = await client
        .from("trechos")
        .select("id, severidade, length_meters")
        .eq("id", id)
        .maybeSingle();
      if (error) {
        throw new Error(`failed to load trecho: ${error.message}`);
      }
      if (!data) {
        return null;
      }
      const row = data as TrechoRow;
      return {
        id: row.id,
        severidade: row.severidade,
        lengthMeters: row.length_meters,
      };
    },

    async listRodovias() {
      // Catalog stays code-seeded until a rodovias table lands; remote ALTER-only for now.
      return listMotivaRodovias();
    },
  };
}
