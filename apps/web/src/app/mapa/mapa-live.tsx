"use client";
import { MapaOperacional } from "@/components/mapa-operacional";
import { useOperationalData } from "@/components/operational-live";
import type { Captura, Rodovia } from "@/lib/verdia-domain";

export function MapaLive({ initialCapturas, initialRodovias }: { initialCapturas: Captura[]; initialRodovias: Rodovia[] }) {
  const { capturas, rodovias } = useOperationalData(initialCapturas, initialRodovias);
  return <MapaOperacional capturas={capturas} rodovias={rodovias} />;
}
