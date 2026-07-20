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
};

export type Trecho = {
  id: string;
  severidade: Severidade;
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
