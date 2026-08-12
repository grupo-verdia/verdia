import { DashboardLive } from "@/components/dashboard-live";
import { DataAutoRefresh } from "@/components/data-auto-refresh";
import { loadDashboardCapturas } from "@/lib/dashboard";
import { listMotivaRodovias } from "@/lib/rodovias";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [capturas, rodovias] = await Promise.all([
    loadDashboardCapturas(),
    Promise.resolve(listMotivaRodovias()),
  ]);

  return (
    <>
      <DataAutoRefresh />
      <div className="page-head">
        <div>
          <div className="eyebrow">OPERAÇÃO</div>
          <h1 className="page-title">Visão geral</h1>
          <p className="page-subtitle">
            Prioridades de vegetação à beira da rodovia a partir das capturas
            persistidas e planilhas importadas.
          </p>
        </div>
      </div>
      <DashboardLive initialCapturas={capturas} initialRodovias={rodovias} />
    </>
  );
}
