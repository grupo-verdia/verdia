import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { promises as fs } from "node:fs";
import path from "node:path";
import { classeFromAltura, type Captura, type Rodovia, type DashboardStats, type Classe } from "@/lib/verdia-domain";

export type CreateCaptureInput = Omit<Captura, "id" | "storageKey" | "classeFinal" | "decisaoOrigem" | "overrideMotivo" | "overrideAt"> & {
  imageBytes?: Uint8Array;
  contentType?: string;
};

export type OverrideInput = { classeFinal: Classe; alturaCm?: number | null; motivo: string };

const memory = {
  rodovias: new Map<string, Rodovia>(),
  capturas: new Map<string, Captura>(),
  images: new Map<string, Uint8Array>(),
  loaded: false,
};

let loadPromise: Promise<void> | null = null;

// Fallback local persistente para desenvolvimento sem Supabase.
// Assim, trocar de rota, atualizar a página ou ocorrer um HMR não apaga as capturas importadas.
const localDataPath = process.env.VERDIA_LOCAL_DATA_PATH ? path.resolve(process.env.VERDIA_LOCAL_DATA_PATH) : path.join(process.cwd(), ".data", "verdia-local.json");

async function loadLocalData() {
  if (memory.loaded) return;
  if (loadPromise) return loadPromise;
  loadPromise = (async () => {
    seedMemory();
    try {
      const raw = await fs.readFile(localDataPath, "utf8");
      const parsed = JSON.parse(raw) as { capturas?: Captura[] };
      if (Array.isArray(parsed.capturas)) {
        for (const capture of parsed.capturas) {
          if (capture && typeof capture.id === "string") memory.capturas.set(capture.id, capture);
        }
      }
    } catch {
      // Primeiro uso: o arquivo ainda não existe.
    }
    memory.loaded = true;
  })().finally(() => { loadPromise = null; });
  return loadPromise;
}

let savePromise: Promise<void> = Promise.resolve();
async function persistLocalData() {
  savePromise = savePromise.then(async () => {
    await fs.mkdir(path.dirname(localDataPath), { recursive: true });
    const payload = JSON.stringify({ version: 1, capturas: [...memory.capturas.values()] }, null, 2);
    const tmp = `${localDataPath}.tmp`;
    await fs.writeFile(tmp, payload, "utf8");
    await fs.rename(tmp, localDataPath);
  });
  return savePromise;
}

const demoRodovias: Rodovia[] = [
  { id: "sp-330", codigo: "SP-330", nome: "Rodovia Anhanguera", concessionaria: "Motiva | AutoBAn", extensaoKm: 147.04, limiteAtencaoCm: 30, limiteCriticoCm: 60, ativo: true },
  { id: "sp-348", codigo: "SP-348", nome: "Rodovia dos Bandeirantes", concessionaria: "Motiva | AutoBAn", extensaoKm: 159.67, limiteAtencaoCm: 30, limiteCriticoCm: 60, ativo: true },
  { id: "sp-300", codigo: "SP-300", nome: "Rodovia Dom Gabriel Paulino Bueno Couto", concessionaria: "Motiva | AutoBAn", extensaoKm: 2.6, limiteAtencaoCm: 30, limiteCriticoCm: 60, ativo: true },
  { id: "spi-102-330", codigo: "SPI-102/330", nome: "Rodovia Adalberto Panzan", concessionaria: "Motiva | AutoBAn", extensaoKm: 7.54, limiteAtencaoCm: 30, limiteCriticoCm: 60, ativo: true },
  { id: "sp-280", codigo: "SP-280", nome: "Rodovia Castello Branco", concessionaria: "Motiva | SPVias", extensaoKm: null, limiteAtencaoCm: 30, limiteCriticoCm: 60, ativo: true },
  { id: "sp-127", codigo: "SP-127", nome: "Rodovia Antônio Romano Schincariol / Francisco da Silva Pontes", concessionaria: "Motiva | SPVias", extensaoKm: null, limiteAtencaoCm: 30, limiteCriticoCm: 60, ativo: true },
  { id: "sp-255", codigo: "SP-255", nome: "Rodovia João Mellão", concessionaria: "Motiva | SPVias", extensaoKm: null, limiteAtencaoCm: 30, limiteCriticoCm: 60, ativo: true },
  { id: "sp-258", codigo: "SP-258", nome: "Rodovia Francisco Alves Negrão", concessionaria: "Motiva | SPVias", extensaoKm: null, limiteAtencaoCm: 30, limiteCriticoCm: 60, ativo: true },
  { id: "sp-270", codigo: "SP-270", nome: "Rodovia Raposo Tavares", concessionaria: "Motiva | SPVias", extensaoKm: null, limiteAtencaoCm: 30, limiteCriticoCm: 60, ativo: true },
  { id: "sp-021", codigo: "SP-021", nome: "Rodoanel Mário Covas — Trecho Oeste", concessionaria: "Motiva | Rodoanel", extensaoKm: null, limiteAtencaoCm: 30, limiteCriticoCm: 60, ativo: true },
  { id: "br-116", codigo: "BR-116", nome: "Rodovia Presidente Dutra", concessionaria: "Motiva | RioSP", extensaoKm: null, limiteAtencaoCm: 30, limiteCriticoCm: 60, ativo: true },
  { id: "br-101", codigo: "BR-101", nome: "Rodovia Rio-Santos", concessionaria: "Motiva | RioSP", extensaoKm: null, limiteAtencaoCm: 30, limiteCriticoCm: 60, ativo: true },
];

function seedMemory() {
  if (memory.rodovias.size) return;
  demoRodovias.forEach((r: Rodovia) => memory.rodovias.set(r.id, r));
}

function useSupabase(): SupabaseClient | null {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export async function listRodovias(): Promise<Rodovia[]> {
  const db = useSupabase();
  if (!db) { await loadLocalData(); return [...memory.rodovias.values()]; }
  const { data, error } = await db.from("rodovias").select("id,codigo,nome,concessionaria,extensao_km,limite_atencao_cm,limite_critico_cm,ativo").eq("ativo", true).order("codigo");
  if (error) throw new Error(error.message);
  return (data ?? []).map((r: any) => ({ id: r.id, codigo: r.codigo, nome: r.nome, concessionaria: r.concessionaria, extensaoKm: r.extensao_km, limiteAtencaoCm: r.limite_atencao_cm, limiteCriticoCm: r.limite_critico_cm, ativo: r.ativo }));
}

export async function getRodovia(id: string): Promise<Rodovia | null> {
  const rows = await listRodovias();
  return rows.find((r) => r.id === id) ?? null;
}

function rowToCapture(r: any): Captura {
  return {
    id: r.id, rodoviaId: r.rodovia_id, trechoId: r.trecho_id, storageKey: r.storage_key, lat: r.lat, lon: r.lon,
    capturedAt: r.captured_at, km: r.km, sentido: r.sentido, alturaCm: r.altura_cm, aiClasse: r.ai_classe,
    aiConfidence: r.ai_confidence, modelVersion: r.model_version, classeFinal: r.classe_final,
    decisaoOrigem: r.decisao_origem, overrideMotivo: r.override_motivo, overrideAt: r.override_at, inferenceError: r.inference_error,
  };
}

export async function listCapturas(rodoviaId?: string): Promise<Captura[]> {
  const db = useSupabase();
  if (!db) {
    await loadLocalData();
    return [...memory.capturas.values()].filter((c) => !rodoviaId || c.rodoviaId === rodoviaId).sort((a,b) => b.capturedAt.localeCompare(a.capturedAt));
  }
  let query = db.from("capturas").select("*").order("captured_at", { ascending: false });
  if (rodoviaId) query = query.eq("rodovia_id", rodoviaId);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []).map(rowToCapture);
}

export async function getCaptura(id: string): Promise<Captura | null> {
  const db = useSupabase();
  if (!db) { await loadLocalData(); return memory.capturas.get(id) ?? null; }
  const { data, error } = await db.from("capturas").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  return data ? rowToCapture(data) : null;
}

export async function overrideCaptura(id: string, input: OverrideInput): Promise<Captura> {
  const now = new Date().toISOString();
  const current = await getCaptura(id);
  if (!current) throw new Error("Captura não encontrada");
  const db = useSupabase();
  if (!db) {
    const updated = { ...current, classeFinal: input.classeFinal, alturaCm: input.alturaCm ?? current.alturaCm, decisaoOrigem: "manual" as const, overrideMotivo: input.motivo, overrideAt: now };
    memory.capturas.set(id, updated); await persistLocalData(); return updated;
  }
  const { error: auditError } = await db.from("captura_overrides").insert({ captura_id: id, classe_anterior: current.classeFinal, classe_nova: input.classeFinal, altura_cm_nova: input.alturaCm ?? current.alturaCm, motivo: input.motivo });
  if (auditError) throw new Error(auditError.message);
  const { data, error } = await db.from("capturas").update({ classe_final: input.classeFinal, altura_cm: input.alturaCm ?? current.alturaCm, decisao_origem: "manual", override_motivo: input.motivo, override_at: now }).eq("id", id).select("*").single();
  if (error || !data) throw new Error(error?.message ?? "Falha ao sobrescrever previsão");
  return rowToCapture(data);
}

export async function createCaptura(input: CreateCaptureInput): Promise<Captura> {
  const id = crypto.randomUUID();
  const rodovia = await getRodovia(input.rodoviaId);
  if (!rodovia) throw new Error("Rodovia não encontrada");
  const classeFinal = input.aiClasse ?? classeFromAltura(input.alturaCm, rodovia);
  const storageKey = `capturas/${id}.bin`;
  const capture: Captura = { id, storageKey, rodoviaId: input.rodoviaId, trechoId: input.trechoId, lat: input.lat, lon: input.lon, capturedAt: input.capturedAt, km: input.km, sentido: input.sentido, alturaCm: input.alturaCm, aiClasse: input.aiClasse, aiConfidence: input.aiConfidence, modelVersion: input.modelVersion, classeFinal, decisaoOrigem: "ia", overrideMotivo: null, overrideAt: null, inferenceError: input.inferenceError };
  const db = useSupabase();
  if (!db) { await loadLocalData(); memory.capturas.set(id, capture); if (input.imageBytes) memory.images.set(storageKey, input.imageBytes); await persistLocalData(); return capture; }
  if (input.imageBytes) {
    const { error } = await db.storage.from("capturas").upload(storageKey, input.imageBytes, { contentType: input.contentType ?? "image/jpeg", upsert: false });
    if (error) throw new Error(error.message);
  }
  const { data, error } = await db.from("capturas").insert({ id, rodovia_id: input.rodoviaId, trecho_id: input.trechoId, storage_key: storageKey, lat: input.lat, lon: input.lon, captured_at: input.capturedAt, km: input.km, sentido: input.sentido, altura_cm: input.alturaCm, ai_classe: input.aiClasse, ai_confidence: input.aiConfidence, model_version: input.modelVersion, classe_final: classeFinal, decisao_origem: "ia", inference_error: input.inferenceError }).select("*").single();
  if (error || !data) throw new Error(error?.message ?? "Falha ao persistir captura");
  return rowToCapture(data);
}

export async function dashboardStats(): Promise<DashboardStats> {
  const [rodovias, capturas] = await Promise.all([listRodovias(), listCapturas()]);
  const stats = { capturas: capturas.length, pendentes: capturas.filter((c) => !c.classeFinal || c.inferenceError).length, altas: capturas.filter((c) => c.classeFinal === "alta").length, medias: capturas.filter((c) => c.classeFinal === "média").length, baixas: capturas.filter((c) => c.classeFinal === "baixa").length, coberturaRodovias: rodovias.length ? new Set(capturas.map((c) => c.rodoviaId)).size / rodovias.length : 0, confiancaMedia: null as number | null };
  const conf = capturas.map((c) => c.aiConfidence).filter((v): v is number => typeof v === "number");
  if (conf.length) stats.confiancaMedia = conf.reduce((a,b) => a+b, 0) / conf.length;
  return stats;
}

export async function localPersistenceInfo() {
  const db = useSupabase();
  if (db) return { source: "supabase" as const, path: null, count: (await listCapturas()).length };
  await loadLocalData();
  return { source: "local" as const, path: localDataPath, count: memory.capturas.size };
}
