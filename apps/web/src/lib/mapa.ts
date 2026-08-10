import { classeFromAltura, type Classe, type Severidade } from "@/lib/verdia-domain";
import { listCapturas } from "@/lib/verdia-store";

export type MapTrecho = {
  id: string;
  lat: number;
  lon: number;
  severidade: Severidade;
  capturaCount: number;
};

export type LoadMapTrechosOptions = { severidade?: Severidade };

export const SEVERIDADE_MARKER: Record<Severidade, { color: string; radius: number; label: string }> = {
  baixa: { color: "#2f6b3a", radius: 10, label: "baixa" },
  média: { color: "#c47a12", radius: 12, label: "média" },
  alta: { color: "#b42318", radius: 16, label: "alta" },
};

export function parseSeveridadeFilter(value: string | undefined): Severidade | undefined {
  return value === "baixa" || value === "média" || value === "alta" ? value : undefined;
}

export async function loadMapTrechos(options: LoadMapTrechosOptions = {}): Promise<MapTrecho[]> {
  const capturas = await listCapturas();
  const groups = new Map<string, { lat: number; lon: number; count: number; classes: Array<Classe | null> }>();
  for (const c of capturas) {
    const id = c.trechoId ?? c.id;
    const g = groups.get(id);
    if (g) { g.lat += c.lat; g.lon += c.lon; g.count++; g.classes.push(c.classeFinal); }
    else groups.set(id, { lat: c.lat, lon: c.lon, count: 1, classes: [c.classeFinal] });
  }
  const rank = (classes: Array<Classe | null>): Severidade => {
    if (classes.includes("alta")) return "alta";
    if (classes.includes("média")) return "média";
    return "baixa";
  };
  const trechos = [...groups.entries()].map(([id, g]) => ({ id, lat: g.lat/g.count, lon: g.lon/g.count, severidade: rank(g.classes), capturaCount: g.count }));
  return options.severidade ? trechos.filter(t => t.severidade === options.severidade) : trechos;
}
