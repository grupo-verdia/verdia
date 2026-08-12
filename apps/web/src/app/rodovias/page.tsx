import { DataAutoRefresh } from "@/components/data-auto-refresh";
import { RodoviasClient } from "@/components/rodovias-client";
import { loadDashboardCapturas } from "@/lib/dashboard";
import { listMotivaRodovias } from "@/lib/rodovias";

export const dynamic = "force-dynamic";

export default async function RodoviasPage() {
  const [rodovias, capturas] = await Promise.all([
    Promise.resolve(listMotivaRodovias()),
    loadDashboardCapturas(),
  ]);

  return (
    <>
      <DataAutoRefresh />
      <div className="page-head">
        <div>
          <div className="eyebrow">DADOS OPERACIONAIS</div>
          <h1 className="page-title">Rodovias & planilhas</h1>
          <p className="page-subtitle">
            Uma visão tabular por rodovia, com importação/exportação Excel e
            correção humana das previsões.
          </p>
        </div>
      </div>
      <RodoviasClient rodovias={rodovias} capturas={capturas} />
    </>
  );
}
