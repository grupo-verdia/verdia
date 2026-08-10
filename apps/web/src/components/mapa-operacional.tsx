"use client";

import dynamic from "next/dynamic";
import type { Captura, Rodovia } from "@/lib/verdia-domain";

const MapaOperacionalClient = dynamic(
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
}: {
  capturas: Captura[];
  rodovias: Rodovia[];
  height?: string;
}) {
  return <MapaOperacionalClient capturas={capturas} rodovias={rodovias} height={height} />;
}
