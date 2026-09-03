import Link from "next/link";

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
          <h1 className="page-title">Monitoramento de vegetação</h1>
          <p className="page-subtitle">
            Capturas classificadas e prioridade de manutenção.
          </p>
        </div>
        <div className="toolbar">
          <Link className="btn btn-primary" href="/mapa">
            Abrir mapa
          </Link>
        </div>
      </div>
      <DashboardLive initialCapturas={capturas} initialRodovias={rodovias} />
    </>
  );
}
