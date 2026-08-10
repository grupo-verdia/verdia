export type Severidade = "baixa" | "média" | "alta";
export type Classe = Severidade;

export type Rodovia = {
  id: string;
  codigo: string;
  nome: string;
  concessionaria: string;
  extensaoKm: number | null;
  limiteAtencaoCm: number;
  limiteCriticoCm: number;
  ativo: boolean;
};

export type Captura = {
  id: string;
  rodoviaId: string;
  trechoId: string | null;
  storageKey: string;
  lat: number;
  lon: number;
  capturedAt: string;
  km: number | null;
  sentido: string | null;
  alturaCm: number | null;
  aiClasse: Classe | null;
  aiConfidence: number | null;
  modelVersion: string | null;
  classeFinal: Classe | null;
  decisaoOrigem: "ia" | "manual";
  overrideMotivo: string | null;
  overrideAt: string | null;
  inferenceError: string | null;
};

export type DashboardStats = {
  capturas: number;
  pendentes: number;
  altas: number;
  medias: number;
  baixas: number;
  coberturaRodovias: number;
  confiancaMedia: number | null;
};

export function classeFromAltura(alturaCm: number | null, rodovia: Rodovia): Classe | null {
  if (alturaCm === null || Number.isNaN(alturaCm)) return null;
  if (alturaCm > rodovia.limiteCriticoCm) return "alta";
  if (alturaCm > rodovia.limiteAtencaoCm) return "média";
  return "baixa";
}

export function severityLabel(value: Severidade) {
  return value === "alta" ? "Alta" : value === "média" ? "Média" : "Baixa";
}
