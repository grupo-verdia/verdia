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
          <div className="eyebrow">CENTRO DE OPERAÇÕES · MOTIVA</div>
          <h1 className="page-title">Monitoramento de vegetação</h1>
          <p className="page-subtitle">
            Visão operacional das capturas realizadas pelo veículo, classificação
            da IA e prioridades de manutenção.
          </p>
        </div>
        <div className="toolbar">
          <Link className="btn" href="/rodovias">
            Gerenciar dados
          </Link>
          <Link className="btn btn-primary" href="/mapa">
            Abrir mapa
          </Link>
        </div>
      </div>
      <DashboardLive initialCapturas={capturas} initialRodovias={rodovias} />
    </>
  );
}
