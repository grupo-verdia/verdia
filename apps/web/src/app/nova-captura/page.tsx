import { DataAutoRefresh } from "@/components/data-auto-refresh";
import { NovaCapturaForm } from "@/components/nova-captura-form";
import { listMotivaRodovias } from "@/lib/rodovias";

export const dynamic = "force-dynamic";

export default function NovaCapturaPage() {
  const rodovias = listMotivaRodovias();

  return (
    <>
      <DataAutoRefresh />
      <div className="page-head">
        <div>
          <h1 className="page-title">Nova captura</h1>
          <p className="page-subtitle">
            Fotos da vegetação na margem. GPS do arquivo, ou latitude e
            longitude se faltar.
          </p>
        </div>
      </div>
      <NovaCapturaForm rodovias={rodovias} />
    </>
  );
}
