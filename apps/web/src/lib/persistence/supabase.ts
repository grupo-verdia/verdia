import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import {
  severidadeFromClasse,
  severidadeFromClasses,
  type Captura,
  type Classe,
  type Severidade,
  type Trecho,
} from "@/lib/domain";
import type { CapturaStore, CreateCapturaInput } from "@/lib/persistence/types";

type TrechoRow = {
  id: string;
  severidade: Severidade;
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
};

const BUCKET = "capturas";

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
  };
}

export function createSupabaseStore(options: {
  url: string;
  serviceRoleKey: string;
  client?: SupabaseClient;
}): CapturaStore {
  const client =
    options.client ??
    createClient(options.url, options.serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

  async function refreshTrechoSeveridade(trechoId: string): Promise<void> {
    const { data, error } = await client
      .from("capturas")
      .select("classe")
      .eq("trecho_id", trechoId);
    if (error) {
      throw new Error(`failed to load capturas for trecho: ${error.message}`);
    }
    const severidade = severidadeFromClasses(
      (data ?? []).map((row) => row.classe as Classe | null),
    );
    const { error: updateError } = await client
      .from("trechos")
      .update({ severidade })
      .eq("id", trechoId);
    if (updateError) {
      throw new Error(`failed to update trecho severidade: ${updateError.message}`);
    }
  }

  return {
    async createCaptura(input: CreateCapturaInput): Promise<Captura> {
      let trechoId = input.trechoId;
      if (trechoId) {
        const { data, error } = await client
          .from("trechos")
          .select("id")
          .eq("id", trechoId)
          .maybeSingle();
        if (error) {
          throw new Error(`failed to load trecho: ${error.message}`);
        }
        if (!data) {
          throw new Error(`trecho not found: ${trechoId}`);
        }
      } else {
        const { data, error } = await client
          .from("trechos")
          .insert({ severidade: severidadeFromClasse(input.classe) })
          .select("id")
          .single();
        if (error || !data) {
          throw new Error(`failed to create trecho: ${error?.message ?? "unknown"}`);
        }
        trechoId = data.id as string;
      }

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
        })
        .select(
          "id, trecho_id, storage_key, lat, lon, captured_at, classe, confidence, model_version, inference_error",
        )
        .single();
      if (insertError || !row) {
        throw new Error(
          `failed to insert captura: ${insertError?.message ?? "unknown"}`,
        );
      }

      await refreshTrechoSeveridade(trechoId);
      return rowToCaptura(row as CapturaRow);
    },

    async listCapturas(): Promise<Captura[]> {
      const { data, error } = await client
        .from("capturas")
        .select(
          "id, trecho_id, storage_key, lat, lon, captured_at, classe, confidence, model_version, inference_error",
        )
        .order("captured_at", { ascending: false });
      if (error) {
        throw new Error(`failed to list capturas: ${error.message}`);
      }
      return (data as CapturaRow[] | null)?.map(rowToCaptura) ?? [];
    },

    async getTrecho(id: string): Promise<Trecho | null> {
      const { data, error } = await client
        .from("trechos")
        .select("id, severidade")
        .eq("id", id)
        .maybeSingle();
      if (error) {
        throw new Error(`failed to load trecho: ${error.message}`);
      }
      if (!data) {
        return null;
      }
      const row = data as TrechoRow;
      return { id: row.id, severidade: row.severidade };
    },
  };
}
