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
          <div className="eyebrow">MODEL OPS · QUALIDADE DE DADOS</div>
          <h1 className="page-title">Observabilidade</h1>
          <p className="page-subtitle">
            Acompanhe volume, confiança, falhas de inferência e intervenção
            humana.
          </p>
        </div>
      </div>
      <ObservabilidadeLive
        initialCapturas={capturas}
        initialRodovias={rodovias}
      />
      <div className="card" style={{ marginTop: 16 }}>
        <h2 className="section-title">Pipeline operacional</h2>
        <div className="alert-list">
          <div className="alert">
            <b style={{ fontFamily: "var(--font-mono)", color: "#e9ff3b" }}>
              01
            </b>
            <div className="alert-main">
              <div className="alert-title">Captura</div>
              <div className="alert-meta">
                Imagem/vídeo + GPS + timestamp + sentido + quilômetro.
              </div>
            </div>
          </div>
          <div className="alert">
            <b style={{ fontFamily: "var(--font-mono)", color: "#e9ff3b" }}>
              02
            </b>
            <div className="alert-main">
              <div className="alert-title">Inferência</div>
              <div className="alert-meta">
                Modelo estima altura e classifica severidade.
              </div>
            </div>
          </div>
          <div className="alert">
            <b style={{ fontFamily: "var(--font-mono)", color: "#e9ff3b" }}>
              03
            </b>
            <div className="alert-main">
              <div className="alert-title">Validação</div>
              <div className="alert-meta">
                Baixa confiança ou exceção entra para revisão humana.
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
