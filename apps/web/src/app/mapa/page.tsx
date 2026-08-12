import Link from "next/link";

import { MapaLazy } from "@/app/mapa/mapa-lazy";
import type { Severidade } from "@/lib/domain";
import {
  loadMapTrechos,
  parseSeveridadeFilter,
  SEVERIDADE_MARKER,
} from "@/lib/mapa";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{ severidade?: string }>;
};

const FILTERS: Array<{ value: Severidade | undefined; label: string }> = [
  { value: undefined, label: "Todos" },
  { value: "alta", label: "Só alta" },
  { value: "média", label: "Só média" },
  { value: "baixa", label: "Só baixa" },
];

export default async function MapaPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const severidade = parseSeveridadeFilter(params.severidade);
  const trechos = await loadMapTrechos(
    severidade ? { severidade } : {},
  );

  return (
    <>
      <div className="page-head">
        <div>
          <div className="eyebrow">GEOSPATIAL</div>
          <h1 className="page-title">Mapa de trechos</h1>
          <p className="page-subtitle">
            Posições a partir de lat/lon das capturas; severidade pela classe
            ordinal (alta em destaque).
          </p>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="toolbar">
          <nav aria-label="Filtro por severidade" className="toolbar">
            {FILTERS.map((filter) => {
              const href =
                filter.value === undefined
                  ? "/mapa"
                  : `/mapa?severidade=${encodeURIComponent(filter.value)}`;
              const active = filter.value === severidade;
              return (
                <Link
                  key={filter.label}
                  href={href}
                  className={`btn${active ? " btn-primary" : ""}`}
                >
                  {filter.label}
                </Link>
              );
            })}
          </nav>
          <ul className="legend" style={{ listStyle: "none", margin: 0, padding: 0 }}>
            {(Object.keys(SEVERIDADE_MARKER) as Severidade[]).map((key) => (
              <li key={key}>
                <i
                  style={{
                    background: SEVERIDADE_MARKER[key].color,
                    width: SEVERIDADE_MARKER[key].radius,
                    height: SEVERIDADE_MARKER[key].radius,
                  }}
                />
                {key}
              </li>
            ))}
          </ul>
        </div>
        <p className="muted" style={{ marginTop: 12, fontSize: 12 }}>
          {trechos.length === 0
            ? `Nenhum trecho para exibir${severidade ? ` com severidade ${severidade}` : ""}.`
            : `${trechos.length} trecho${trechos.length === 1 ? "" : "s"} no mapa${
                severidade ? ` (filtro: ${severidade})` : ""
              }.`}
        </p>
      </div>

      <div className="card map-card">
        <div className="map-box map-page">
          <MapaLazy trechos={trechos} />
        </div>
      </div>
    </>
  );
}
