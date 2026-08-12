/** Ordinal vegetation-height class: baixa < média < alta. */
export type Classe = "baixa" | "média" | "alta";

/** Maintenance priority of a trecho, driven primarily by classe. */
export type Severidade = "baixa" | "média" | "alta";

export type Captura = {
  id: string;
  trechoId: string;
  storageKey: string;
  lat: number;
  lon: number;
  capturedAt: string;
  classe: Classe | null;
  confidence: number | null;
  modelVersion: string | null;
  /** Set when inference failed; captura is still persisted for visibility. */
  inferenceError: string | null;
  /** Optional Motiva rodovia id (Excel / Planejamento). */
  rodoviaId: string | null;
  /** Optional roadside km marker from spreadsheet / ops. */
  km: number | null;
  /** Optional traffic direction label. */
  sentido: string | null;
  /** Estimated grass height in cm (Motiva bands: <10 / 10–30 / >30). */
  alturaCm: number | null;
};

/** Motiva roadside grass bands (cm), mirrored from services/ai labels. */
export const MOTIVA_BAIXA_MAX_EXCLUSIVE_CM = 10;
export const MOTIVA_MEDIA_MAX_INCLUSIVE_CM = 30;

/**
 * Map estimated height to classe using Motiva bands:
 * h < 10 → baixa; 10 ≤ h ≤ 30 → média; h > 30 → alta.
 */
export function classeFromAlturaCm(alturaCm: number | null): Classe | null {
  if (alturaCm === null || Number.isNaN(alturaCm)) {
    return null;
  }
  if (alturaCm < MOTIVA_BAIXA_MAX_EXCLUSIVE_CM) {
    return "baixa";
  }
  if (alturaCm <= MOTIVA_MEDIA_MAX_INCLUSIVE_CM) {
    return "média";
  }
  return "alta";
}

/** Motiva’s current manual-analysis constant for roadside stretch length. */
export const DEFAULT_TRECHO_LENGTH_METERS = 500;

export type Trecho = {
  id: string;
  severidade: Severidade;
  /** Stored roadside length in meters; defaults to Motiva’s 500 m constant. */
  lengthMeters: number;
};

export const CLASSES: readonly Classe[] = ["baixa", "média", "alta"] as const;

export function isClasse(value: unknown): value is Classe {
  return typeof value === "string" && (CLASSES as readonly string[]).includes(value);
}

/** Severidade follows classe (alta first); null classe → baixa. */
export function severidadeFromClasse(classe: Classe | null): Severidade {
  switch (classe) {
    case "alta":
      return "alta";
    case "média":
      return "média";
    case "baixa":
      return "baixa";
    case null:
      return "baixa";
    default: {
      const _exhaustive: never = classe;
      return _exhaustive;
    }
  }
}

const CLASSE_RANK: Record<Classe, number> = {
  baixa: 0,
  média: 1,
  alta: 2,
};

/** Highest classe among capturas drives trecho severidade. */
export function severidadeFromClasses(classes: Array<Classe | null>): Severidade {
  let best: Classe | null = null;
  for (const classe of classes) {
    if (classe === null) {
      continue;
    }
    if (best === null || CLASSE_RANK[classe] > CLASSE_RANK[best]) {
      best = classe;
    }
  }
  return severidadeFromClasse(best);
}
