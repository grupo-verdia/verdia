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
    <main
      style={{
        minHeight: "100vh",
        fontFamily: "var(--font-geist-sans), sans-serif",
        padding: "1.5rem",
        maxWidth: "64rem",
        margin: "0 auto",
      }}
    >
      <p style={{ margin: "0 0 1rem" }}>
        <Link href="/" style={{ color: "#246", textDecoration: "underline" }}>
          ← Dashboard
        </Link>
      </p>

      <h1 style={{ margin: "0 0 0.35rem", fontSize: "2rem" }}>
        Mapa de trechos
      </h1>
      <p style={{ margin: "0 0 1rem", color: "#444" }}>
        Posições a partir de lat/lon das capturas; severidade pela classe ordinal
        (alta em destaque).
      </p>

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "0.75rem",
          alignItems: "center",
          marginBottom: "1rem",
        }}
      >
        <nav aria-label="Filtro por severidade" style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
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
                style={{
                  padding: "0.35rem 0.65rem",
                  textDecoration: "none",
                  color: active ? "#fff" : "#222",
                  background: active ? "#222" : "#eee",
                  border: "1px solid #ccc",
                  fontSize: "0.9rem",
                }}
              >
                {filter.label}
              </Link>
            );
          })}
        </nav>

        <ul
          style={{
            listStyle: "none",
            margin: 0,
            padding: 0,
            display: "flex",
            gap: "0.75rem",
            fontSize: "0.85rem",
            color: "#444",
          }}
        >
          {(Object.keys(SEVERIDADE_MARKER) as Severidade[]).map((key) => (
            <li key={key} style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
              <span
                aria-hidden
                style={{
                  width: SEVERIDADE_MARKER[key].radius,
                  height: SEVERIDADE_MARKER[key].radius,
                  borderRadius: "50%",
                  background: SEVERIDADE_MARKER[key].color,
                  display: "inline-block",
                }}
              />
              {key}
            </li>
          ))}
        </ul>
      </div>

      {trechos.length === 0 ? (
        <p style={{ margin: "0 0 1rem", color: "#666" }}>
          Nenhum trecho para exibir
          {severidade ? ` com severidade ${severidade}` : ""}. Persista capturas
          pelo simulador ou pelo dashboard.
        </p>
      ) : (
        <p style={{ margin: "0 0 0.75rem", color: "#666", fontSize: "0.9rem" }}>
          {trechos.length} trecho{trechos.length === 1 ? "" : "s"} no mapa
          {severidade ? ` (filtro: ${severidade})` : ""}.
        </p>
      )}

      <MapaLazy trechos={trechos} />
    </main>
  );
}
