import { DataAutoRefresh } from "@/components/data-auto-refresh";
import { NovaCapturaForm } from "@/components/nova-captura-form";
import { loadDashboardCapturas } from "@/lib/dashboard";
import { listMotivaRodovias } from "@/lib/rodovias";

export const dynamic = "force-dynamic";

export default async function NovaCapturaPage() {
  const rodovias = listMotivaRodovias();
  const capturas = await loadDashboardCapturas();

  return (
    <>
      <DataAutoRefresh />
      <div className="page-head">
        <div>
          <h1 className="page-title">Nova captura</h1>
          <p className="page-subtitle">
            Envie o lote. A classificação continua depois. Sem GPS no arquivo,
            a foto fica de fora, a menos que você informe latitude e longitude.
          </p>
        </div>
      </div>
      <NovaCapturaForm rodovias={rodovias} initialCapturas={capturas} />
    </>
  );
}
