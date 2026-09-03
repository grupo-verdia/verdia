import { DataAutoRefresh } from "@/components/data-auto-refresh";
import { ObservabilidadeLive } from "@/app/observabilidade/observabilidade-live";
import { loadDashboardCapturas } from "@/lib/dashboard";
import { listMotivaRodovias } from "@/lib/rodovias";

export const dynamic = "force-dynamic";

export default async function ObservabilidadePage() {
  const [capturas, rodovias] = await Promise.all([
    loadDashboardCapturas(),
    Promise.resolve(listMotivaRodovias()),
  ]);

  return (
    <>
      <DataAutoRefresh />
      <div className="page-head">
        <div>
          <h1 className="page-title">Observabilidade</h1>
          <p className="page-subtitle">
            Confiança do modelo, falhas e correções.
          </p>
        </div>
      </div>
      <ObservabilidadeLive
        initialCapturas={capturas}
        initialRodovias={rodovias}
      />
    </>
  );
}
