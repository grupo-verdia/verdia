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
  OverrideCapturaInput,
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
  override_motivo: string | null;
  override_at: string | null;
};

const BUCKET = "capturas";

const CAPTURA_SELECT =
  "id, trecho_id, storage_key, lat, lon, captured_at, classe, confidence, model_version, inference_error, rodovia_id, km, sentido, altura_cm, override_motivo, override_at";

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
    overrideMotivo: row.override_motivo ?? null,
    overrideAt: row.override_at ?? null,
  };
}

async function createCaptura(
  client: SupabaseClient,
  input: CreateCapturaInput,
): Promise<Captura> {
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
      override_motivo: null,
      override_at: null,
    })
    .select(CAPTURA_SELECT)
    .single();
  if (insertError || !row) {
    throw new Error(
      `failed to insert captura: ${insertError?.message ?? "unknown"}`,
    );
  }

  return rowToCaptura(row as CapturaRow);
}

async function listCapturas(
  client: SupabaseClient,
  filter?: ListCapturasFilter,
): Promise<Captura[]> {
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
}

async function getCaptura(
  client: SupabaseClient,
  id: string,
): Promise<Captura | null> {
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
}

async function overrideCaptura(
  client: SupabaseClient,
  id: string,
  input: OverrideCapturaInput,
): Promise<Captura> {
  const existing = await getCaptura(client, id);
  if (!existing) {
    throw new Error("captura not found");
  }
  const overrideAt = new Date().toISOString();
  const { data, error } = await client
    .from("capturas")
    .update({
      classe: input.classe,
      override_motivo: input.motivo,
      override_at: overrideAt,
    })
    .eq("id", id)
    .select(CAPTURA_SELECT)
    .single();
  if (error || !data) {
    throw new Error(
      `failed to override captura: ${error?.message ?? "unknown"}`,
    );
  }
  await client
    .from("trechos")
    .update({ severidade: severidadeFromClasse(input.classe) })
    .eq("id", existing.trechoId);
  return rowToCaptura(data as CapturaRow);
}

async function clearCapturas(
  client: SupabaseClient,
  rodoviaId: string,
): Promise<number> {
  let query = client.from("capturas").select("id, trecho_id, storage_key");
  if (rodoviaId !== "todas") {
    query = query.eq("rodovia_id", rodoviaId);
  }
  const { data, error } = await query;
  if (error) {
    throw new Error(`failed to list capturas for clear: ${error.message}`);
  }
  const rows =
    (data as Array<{
      id: string;
      trecho_id: string;
      storage_key: string;
    }> | null) ?? [];
  if (rows.length === 0) {
    return 0;
  }

  const ids = rows.map((row) => row.id);
  const trechoIds = [...new Set(rows.map((row) => row.trecho_id))];
  const storageKeys = rows.map((row) => row.storage_key);

  const { error: deleteCapturasError } = await client
    .from("capturas")
    .delete()
    .in("id", ids);
  if (deleteCapturasError) {
    throw new Error(
      `failed to delete capturas: ${deleteCapturasError.message}`,
    );
  }

  if (trechoIds.length > 0) {
    await client.from("trechos").delete().in("id", trechoIds);
  }
  if (storageKeys.length > 0) {
    await client.storage.from(BUCKET).remove(storageKeys);
  }
  return rows.length;
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
    createCaptura: (input) => createCaptura(client, input),
    listCapturas: (filter) => listCapturas(client, filter),
    getCaptura: (id) => getCaptura(client, id),
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
      return listMotivaRodovias();
    },
    overrideCaptura: (id, input) => overrideCaptura(client, id, input),
    clearCapturas: (rodoviaId) => clearCapturas(client, rodoviaId),
  };
}
