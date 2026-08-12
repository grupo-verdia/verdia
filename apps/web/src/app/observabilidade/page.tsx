import { CLASSES } from "@/lib/domain";
import { loadObservabilityStats } from "@/lib/observabilidade";

export const dynamic = "force-dynamic";

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

export default async function ObservabilidadePage() {
  const stats = await loadObservabilityStats();
  const total = stats.capturasProcessed;

  return (
    <>
      <div className="page-head">
        <div>
          <div className="eyebrow">QUALIDADE</div>
          <h1 className="page-title">Observabilidade</h1>
          <p className="page-subtitle">
            Contadores das capturas persistidas e métricas de avaliação do
            modelo quando disponíveis.
          </p>
        </div>
      </div>

      <div className="grid metric-grid">
        <div className="card">
          <div className="kpi-label">Capturas</div>
          <div className="metric-big">{stats.capturasProcessed}</div>
          <div className="kpi-note">processadas</div>
        </div>
        {CLASSES.map((classe) => {
          const value = stats.predictionsByClasse[classe];
          const pct = total ? Math.round((value / total) * 100) : 0;
          return (
            <div className="card" key={classe}>
              <div className="kpi-label">Classe {classe}</div>
              <div className="metric-big">{value}</div>
              <div className="kpi-note">{pct}% do total</div>
            </div>
          );
        })}
      </div>

      <div className="grid dashboard-grid" style={{ marginTop: 16 }}>
        <section className="card" aria-labelledby="classe-heading">
          <h2 id="classe-heading" className="section-title">
            Predições por classe
          </h2>
          {CLASSES.map((classe) => {
            const value = stats.predictionsByClasse[classe];
            const pct = total ? Math.round((value / total) * 100) : 0;
            return (
              <div key={classe} style={{ marginBottom: 16 }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: 12,
                  }}
                >
                  <span>{classe}</span>
                  <span className="muted">
                    {value} · {pct}%
                  </span>
                </div>
                <div className="bar">
                  <span style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </section>

        <section className="card" aria-labelledby="eval-heading">
          <h2 id="eval-heading" className="section-title">
            Acurácia do modelo
          </h2>
          {stats.eval.status === "pending" ? (
            <p className="muted" style={{ margin: 0, fontSize: 13 }}>
              Métricas de avaliação pendentes — nenhuma métrica configurada
              neste ambiente. Defina <code>EVAL_METRICS_JSON</code> quando o
              relatório offline estiver pronto.
            </p>
          ) : (
            <div>
              {typeof stats.eval.accuracy === "number" ? (
                <div style={{ marginBottom: 12 }}>
                  <div className="kpi-label">Exact-match</div>
                  <div className="metric-big">
                    {formatPercent(stats.eval.accuracy)}
                  </div>
                </div>
              ) : null}
              {typeof stats.eval.ordinalMae === "number" ? (
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    borderBottom: "1px solid #173029",
                    padding: "12px 0",
                    fontSize: 12,
                  }}
                >
                  <span className="muted">MAE ordinal (rank)</span>
                  <b>{stats.eval.ordinalMae.toFixed(2)}</b>
                </div>
              ) : null}
              {typeof stats.eval.sampleCount === "number" ? (
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    borderBottom: "1px solid #173029",
                    padding: "12px 0",
                    fontSize: 12,
                  }}
                >
                  <span className="muted">Amostras avaliadas</span>
                  <b>{stats.eval.sampleCount}</b>
                </div>
              ) : null}
              {stats.eval.evaluatedAt ? (
                <p className="muted" style={{ marginTop: 12, fontSize: 11 }}>
                  Avaliado em{" "}
                  {new Date(stats.eval.evaluatedAt).toLocaleString("pt-BR")}
                </p>
              ) : null}
            </div>
          )}
        </section>
      </div>
    </>
  );
}
