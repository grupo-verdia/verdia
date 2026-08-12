import Link from "next/link";

import { MapaLazy } from "@/app/mapa/mapa-lazy";
import { PlanejamentoExcelToolbar } from "@/components/planejamento-excel-toolbar";
import { SEVERIDADE_MARKER } from "@/lib/mapa";
import {
  formatAlturaCm,
  formatConfianca,
  loadPlanTrechos,
} from "@/lib/planejamento";
import { listMotivaRodovias } from "@/lib/rodovias";

export const dynamic = "force-dynamic";

export default async function PlanejamentoPage() {
  const plan = await loadPlanTrechos();
  const rodovias = listMotivaRodovias();
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
        Fila de manutenção por severidade (alta → média → baixa), depois KM —
        derivada das capturas persistidas, sem otimizador de rotas.
      </p>

      <PlanejamentoExcelToolbar rodovias={rodovias} />

      {plan.length === 0 ? (
        <p style={{ margin: "0 0 1rem", color: "#666" }}>
          Nenhum trecho no plano. Importe um Excel acima ou persista capturas via{" "}
          <code>POST /api/capturas</code>.
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
            <div style={{ overflowX: "auto" }}>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: "0.95rem",
                }}
              >
                <thead>
                  <tr style={{ textAlign: "left", borderBottom: "2px solid #ccc" }}>
                    <th style={{ padding: "0.4rem 0.5rem" }}>Ordem</th>
                    <th style={{ padding: "0.4rem 0.5rem" }}>Rodovia</th>
                    <th style={{ padding: "0.4rem 0.5rem" }}>KM</th>
                    <th style={{ padding: "0.4rem 0.5rem" }}>Altura</th>
                    <th style={{ padding: "0.4rem 0.5rem" }}>Severidade</th>
                    <th style={{ padding: "0.4rem 0.5rem" }}>Confiança</th>
                  </tr>
                </thead>
                <tbody>
                  {plan.map((trecho) => (
                    <tr
                      key={trecho.capturaId}
                      style={{ borderBottom: "1px solid #eee" }}
                    >
                      <td style={{ padding: "0.45rem 0.5rem", fontWeight: 600 }}>
                        {trecho.ordem}
                      </td>
                      <td style={{ padding: "0.45rem 0.5rem" }}>
                        {trecho.rodoviaCodigo ?? "—"}
                      </td>
                      <td style={{ padding: "0.45rem 0.5rem" }}>
                        {trecho.km === null ? "—" : trecho.km}
                      </td>
                      <td style={{ padding: "0.45rem 0.5rem" }}>
                        {formatAlturaCm(trecho.alturaCm)}
                      </td>
                      <td style={{ padding: "0.45rem 0.5rem" }}>
                        {trecho.severidade}
                        <span
                          aria-hidden
                          style={{
                            display: "inline-block",
                            width: SEVERIDADE_MARKER[trecho.severidade].radius,
                            height: SEVERIDADE_MARKER[trecho.severidade].radius,
                            borderRadius: "50%",
                            background:
                              SEVERIDADE_MARKER[trecho.severidade].color,
                            marginLeft: "0.45rem",
                            verticalAlign: "middle",
                          }}
                        />
                      </td>
                      <td style={{ padding: "0.45rem 0.5rem" }}>
                        {formatConfianca(trecho.confidence)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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
