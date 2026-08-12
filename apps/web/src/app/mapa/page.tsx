import { DataAutoRefresh } from "@/components/data-auto-refresh";
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
          <div className="eyebrow">GEOPROCESSAMENTO</div>
          <h1 className="page-title">Mapa operacional</h1>
          <p className="page-subtitle">
            Localização de cada captura, severidade detectada e referência de
            quilômetro.
          </p>
        </div>
        <div className="toolbar">
          <span className="status-pill baixa">● {capturas.length} capturas</span>
        </div>
      </div>
      <section className="map-full">
        <MapaLive initialCapturas={capturas} initialRodovias={rodovias} />
      </section>
    </>
  );
}
