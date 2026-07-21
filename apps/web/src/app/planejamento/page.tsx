import Link from "next/link";

import { MapaLazy } from "@/app/mapa/mapa-lazy";
import { SEVERIDADE_MARKER } from "@/lib/mapa";
import { loadPlanTrechos } from "@/lib/planejamento";

export const dynamic = "force-dynamic";

export default async function PlanejamentoPage() {
  const plan = await loadPlanTrechos();
  const planOrdemById = Object.fromEntries(
    plan.map((trecho) => [trecho.id, trecho.ordem]),
  );

  return (
    <main
      style={{
        minHeight: "100vh",
        fontFamily: "var(--font-geist-sans), sans-serif",
        padding: "1.5rem",
        maxWidth: "64rem",
        margin: "0 auto",
      }}
    >
      <p style={{ margin: "0 0 1rem" }}>
        <Link href="/" style={{ color: "#246", textDecoration: "underline" }}>
          ← Dashboard
        </Link>
      </p>

      <h1 style={{ margin: "0 0 0.35rem", fontSize: "2rem" }}>
        Planejamento heurístico
      </h1>
      <p style={{ margin: "0 0 1.5rem", color: "#444" }}>
        Fila de manutenção por severidade (alta → média → baixa), derivada da
        classe das capturas persistidas — sem otimizador de rotas.
      </p>

      {plan.length === 0 ? (
        <p style={{ margin: "0 0 1rem", color: "#666" }}>
          Nenhum trecho no plano. Persista capturas pelo simulador ou pelo
          dashboard.
        </p>
      ) : (
        <>
          <section
            style={{ marginBottom: "1.5rem" }}
            aria-labelledby="fila-heading"
          >
            <h2
              id="fila-heading"
              style={{ margin: "0 0 0.75rem", fontSize: "1.15rem" }}
            >
              Fila por severidade
            </h2>
            <ol
              style={{
                listStyle: "none",
                margin: 0,
                padding: 0,
                display: "flex",
                flexDirection: "column",
                gap: "0.65rem",
              }}
            >
              {plan.map((trecho) => (
                <li
                  key={trecho.id}
                  style={{
                    display: "flex",
                    gap: "0.75rem",
                    alignItems: "flex-start",
                    borderTop: "1px solid #ddd",
                    paddingTop: "0.65rem",
                  }}
                >
                  <span
                    style={{
                      flexShrink: 0,
                      width: "1.75rem",
                      height: "1.75rem",
                      borderRadius: "999px",
                      background: "#111",
                      color: "#fff",
                      fontWeight: 700,
                      fontSize: "0.85rem",
                      display: "grid",
                      placeItems: "center",
                    }}
                    aria-label={`Ordem ${trecho.ordem}`}
                  >
                    {trecho.ordem}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600 }}>
                      Severidade: {trecho.severidade}
                      <span
                        aria-hidden
                        style={{
                          display: "inline-block",
                          width: SEVERIDADE_MARKER[trecho.severidade].radius,
                          height: SEVERIDADE_MARKER[trecho.severidade].radius,
                          borderRadius: "50%",
                          background:
                            SEVERIDADE_MARKER[trecho.severidade].color,
                          marginLeft: "0.5rem",
                          verticalAlign: "middle",
                        }}
                      />
                    </div>
                    <div style={{ color: "#444", fontSize: "0.95rem" }}>
                      Trecho {trecho.id.slice(0, 8)}… · {trecho.capturaCount}{" "}
                      captura{trecho.capturaCount === 1 ? "" : "s"} · GPS{" "}
                      {trecho.lat.toFixed(5)}, {trecho.lon.toFixed(5)}
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          </section>

          <section aria-labelledby="mapa-plano-heading">
            <h2
              id="mapa-plano-heading"
              style={{ margin: "0 0 0.5rem", fontSize: "1.15rem" }}
            >
              Plano no mapa
            </h2>
            <p style={{ margin: "0 0 0.75rem", color: "#666", fontSize: "0.9rem" }}>
              Trechos do plano atual destacados com anel e ordem na fila.
            </p>
            <MapaLazy trechos={plan} planOrdemById={planOrdemById} />
          </section>
        </>
      )}
    </main>
  );
}
