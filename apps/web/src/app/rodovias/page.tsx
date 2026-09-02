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
          <h1 className="page-title">Rodovias e planilhas</h1>
          <p className="page-subtitle">
            Tabela por rodovia, com importação e exportação Excel e correção
            das previsões.
          </p>
        </div>
      </div>
      <RodoviasClient rodovias={rodovias} capturas={capturas} />
    </>
  );
}
