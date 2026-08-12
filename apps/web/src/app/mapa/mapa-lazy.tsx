"use client";

import nextDynamic from "next/dynamic";

import type { MapTrecho } from "@/lib/mapa";

// Leaflet reads `window` at module load; Next requires a dynamic import callback for ssr:false.
const MapaClient = nextDynamic(
  // eslint-disable-next-line no-restricted-syntax -- next/dynamic requires import() for ssr:false Leaflet client
  () => import("@/app/mapa/mapa-client").then((mod) => mod.MapaClient),
  {
    ssr: false,
    loading: () => (
      <div
        className="mapa-host"
        style={{
          display: "grid",
          placeItems: "center",
          color: "var(--muted)",
        }}
      >
        Carregando mapa…
      </div>
    ),
  },
);

type MapaLazyProps = {
  trechos: MapTrecho[];
  planOrdemById?: Readonly<Record<string, number>>;
};

export function MapaLazy({ trechos, planOrdemById }: MapaLazyProps) {
  return <MapaClient trechos={trechos} planOrdemById={planOrdemById} />;
}
