import { DataAutoRefresh } from "@/components/data-auto-refresh";
import { MapLegend } from "@/components/map-legend";
import { MapaLive } from "@/app/mapa/mapa-live";
import { loadDashboardCapturas } from "@/lib/dashboard";
import { listMotivaRodovias } from "@/lib/rodovias";

export const dynamic = "force-dynamic";

export default async function MapaPage() {
  const [capturas, rodovias] = await Promise.all([
    loadDashboardCapturas(),
    Promise.resolve(listMotivaRodovias()),
  ]);

  return (
    <>
      <DataAutoRefresh />
      <div className="page-head">
        <div>
          <h1 className="page-title">Mapa</h1>
          <p className="page-subtitle">
            Localização das capturas por classe.
          </p>
        </div>
      </div>
      <section className="map-full">
        <MapLegend />
        <MapaLive initialCapturas={capturas} initialRodovias={rodovias} />
      </section>
    </>
  );
}
