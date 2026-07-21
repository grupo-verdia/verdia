"use client";

import nextDynamic from "next/dynamic";

import type { MapTrecho } from "@/lib/mapa";

// Leaflet reads `window` at module load; Next requires a dynamic import callback for ssr:false.
const MapaClient = nextDynamic(
  () => import("@/app/mapa/mapa-client").then((mod) => mod.MapaClient),
  {
    ssr: false,
    loading: () => (
      <div
        style={{
          width: "100%",
          height: "min(70vh, 36rem)",
          border: "1px solid #ccc",
          background: "#e8e8e8",
          display: "grid",
          placeItems: "center",
          color: "#666",
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
