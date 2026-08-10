import { AppShell } from "@/components/app-shell";
import { DataAutoRefresh } from "@/components/data-auto-refresh";
import { listCapturas, listRodovias } from "@/lib/verdia-store";

import { PlanejamentoLive } from "./planejamento-live";

export const dynamic = "force-dynamic";

export default async function Planejamento() {
  const [capturas, rodovias] = await Promise.all([
    listCapturas(),
    listRodovias(),
  ]);

  return (
    <AppShell>
      <DataAutoRefresh />
      <div className="page-head">
        <div>
          <div className="eyebrow">MANUTENÇÃO</div>
          <h1 className="page-title">Fila de prioridades</h1>
          <p className="page-subtitle">
            Ordenação operacional por severidade com os campos da planilha:
            Ordem, Rodovia, KM, Altura, Severidade e Confiança.
          </p>
        </div>
      </div>
      <PlanejamentoLive
        initialCapturas={capturas}
        initialRodovias={rodovias}
      />
    </AppShell>
  );
}
