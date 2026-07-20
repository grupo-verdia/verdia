import Link from "next/link";

import { CLASSES } from "@/lib/domain";
import { loadObservabilityStats } from "@/lib/observabilidade";

export const dynamic = "force-dynamic";

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

export default async function ObservabilidadePage() {
  const stats = await loadObservabilityStats();

  return (
    <main
      style={{
        minHeight: "100vh",
        fontFamily: "var(--font-geist-sans), sans-serif",
        padding: "1.5rem",
        maxWidth: "48rem",
        margin: "0 auto",
      }}
    >
      <p style={{ margin: "0 0 1rem" }}>
        <Link href="/" style={{ color: "#246", textDecoration: "underline" }}>
          ← Dashboard
        </Link>
      </p>

      <h1 style={{ margin: "0 0 0.35rem", fontSize: "2rem" }}>
        Observabilidade
      </h1>
      <p style={{ margin: "0 0 1.5rem", color: "#444" }}>
        Contadores lean das capturas persistidas e métricas de avaliação do
        modelo quando disponíveis.
      </p>

      <section style={{ marginBottom: "1.5rem" }} aria-labelledby="capturas-heading">
        <h2 id="capturas-heading" style={{ margin: "0 0 0.5rem", fontSize: "1.15rem" }}>
          Capturas processadas
        </h2>
        <p style={{ margin: 0, fontSize: "2rem", fontWeight: 600 }}>
          {stats.capturasProcessed}
        </p>
      </section>

      <section style={{ marginBottom: "1.5rem" }} aria-labelledby="classe-heading">
        <h2 id="classe-heading" style={{ margin: "0 0 0.5rem", fontSize: "1.15rem" }}>
          Predições por classe
        </h2>
        <ul
          style={{
            listStyle: "none",
            margin: 0,
            padding: 0,
            display: "flex",
            flexDirection: "column",
            gap: "0.5rem",
          }}
        >
          {CLASSES.map((classe) => (
            <li
              key={classe}
              style={{
                display: "flex",
                justifyContent: "space-between",
                borderTop: "1px solid #ddd",
                paddingTop: "0.5rem",
              }}
            >
              <span>{classe}</span>
              <span style={{ fontWeight: 600 }}>
                {stats.predictionsByClasse[classe]}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="eval-heading">
        <h2 id="eval-heading" style={{ margin: "0 0 0.5rem", fontSize: "1.15rem" }}>
          Acurácia do modelo
        </h2>
        {stats.eval.status === "pending" ? (
          <p style={{ margin: 0, color: "#666" }}>
            Métricas de avaliação pendentes — nenhuma métrica configurada neste
            ambiente. Defina <code>EVAL_METRICS_JSON</code> quando o relatório
            offline estiver pronto.
          </p>
        ) : (
          <div style={{ color: "#222" }}>
            {typeof stats.eval.accuracy === "number" ? (
              <p style={{ margin: "0 0 0.35rem", fontSize: "1.5rem", fontWeight: 600 }}>
                {formatPercent(stats.eval.accuracy)}
                <span style={{ fontSize: "0.95rem", fontWeight: 400, color: "#444" }}>
                  {" "}
                  exact-match
                </span>
              </p>
            ) : null}
            {typeof stats.eval.ordinalMae === "number" ? (
              <p
                style={{
                  margin: "0 0 0.35rem",
                  fontSize:
                    typeof stats.eval.accuracy === "number" ? "1rem" : "1.5rem",
                  fontWeight:
                    typeof stats.eval.accuracy === "number" ? 400 : 600,
                  color: "#444",
                }}
              >
                MAE ordinal (rank): {stats.eval.ordinalMae.toFixed(2)}
              </p>
            ) : null}
            {typeof stats.eval.sampleCount === "number" ? (
              <p style={{ margin: "0 0 0.35rem", color: "#666", fontSize: "0.9rem" }}>
                {stats.eval.sampleCount} amostras avaliadas
              </p>
            ) : null}
            {stats.eval.evaluatedAt ? (
              <p style={{ margin: 0, color: "#666", fontSize: "0.85rem" }}>
                Avaliado em{" "}
                {new Date(stats.eval.evaluatedAt).toLocaleString("pt-BR")}
              </p>
            ) : null}
          </div>
        )}
      </section>
    </main>
  );
}
