"use client";

import nextDynamic from "next/dynamic";

import type { Captura } from "@/lib/domain";
import type { Rodovia } from "@/lib/rodovias";

// Leaflet reads `window` at module load; Next requires a dynamic import callback for ssr:false.
const MapaOperacionalClient = nextDynamic(
  // eslint-disable-next-line no-restricted-syntax -- next/dynamic requires import() for ssr:false Leaflet client
  () => import("./mapa-operacional-client").then((mod) => mod.MapaOperacionalClient),
  {
    ssr: false,
    loading: () => (
      <div
        style={{
          width: "100%",
          height: "100%",
          minHeight: 320,
          display: "grid",
          placeItems: "center",
          background: "#0d1b18",
          color: "#8da49d",
          borderRadius: 12,
        }}
      >
        Carregando mapa...
      </div>
    ),
  },
);

export function MapaOperacional({
  capturas,
  rodovias,
  height = "100%",
  planOrdemById,
}: {
  capturas: Captura[];
  rodovias: Rodovia[];
  height?: string;
  planOrdemById?: Readonly<Record<string, number>>;
}) {
  return (
    <MapaOperacionalClient
      capturas={capturas}
      rodovias={rodovias}
      height={height}
      planOrdemById={planOrdemById}
    />
  );
}
