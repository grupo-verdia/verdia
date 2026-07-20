import {
  severidadeFromClasses,
  type Classe,
  type Severidade,
} from "@/lib/domain";
import { getCapturaStore } from "@/lib/persistence";

/** Trecho positioned from captura lat/lon averages (no PostGIS). */
export type MapTrecho = {
  id: string;
  lat: number;
  lon: number;
  severidade: Severidade;
  capturaCount: number;
};

export type LoadMapTrechosOptions = {
  /** When set, only trechos with this severidade are returned. */
  severidade?: Severidade;
};

/** Marker colors by severidade — alta is visually emphatic for demos. */
export const SEVERIDADE_MARKER: Record<
  Severidade,
  { color: string; radius: number; label: string }
> = {
  baixa: { color: "#2f6b3a", radius: 10, label: "baixa" },
  média: { color: "#c47a12", radius: 12, label: "média" },
  alta: { color: "#b42318", radius: 16, label: "alta" },
};

export function parseSeveridadeFilter(
  value: string | undefined,
): Severidade | undefined {
  switch (value) {
    case "baixa":
    case "média":
    case "alta":
      return value;
    case undefined:
    case "":
      return undefined;
    default:
      return undefined;
  }
}

type TrechoPositionAggregate = {
  latSum: number;
  lonSum: number;
  count: number;
  classes: Array<Classe | null>;
};

/** Product read surface: trechos for the password-gated geospatial map. */
export async function loadMapTrechos(
  options: LoadMapTrechosOptions = {},
): Promise<MapTrecho[]> {
  const capturas = await getCapturaStore().listCapturas();

  const byTrecho = new Map<string, TrechoPositionAggregate>();

  for (const captura of capturas) {
    const existing = byTrecho.get(captura.trechoId);
    if (existing) {
      existing.latSum += captura.lat;
      existing.lonSum += captura.lon;
      existing.count += 1;
      existing.classes.push(captura.classe);
    } else {
      byTrecho.set(captura.trechoId, {
        latSum: captura.lat,
        lonSum: captura.lon,
        count: 1,
        classes: [captura.classe],
      });
    }
  }

  const trechos: MapTrecho[] = [...byTrecho.entries()].map(([id, agg]) => ({
    id,
    lat: agg.latSum / agg.count,
    lon: agg.lonSum / agg.count,
    severidade: severidadeFromClasses(agg.classes),
    capturaCount: agg.count,
  }));

  trechos.sort((a, b) => a.id.localeCompare(b.id));

  if (options.severidade) {
    return trechos.filter((trecho) => trecho.severidade === options.severidade);
  }

  return trechos;
}
