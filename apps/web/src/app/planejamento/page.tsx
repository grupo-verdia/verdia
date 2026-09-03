import Link from "next/link";

import { MapLegend } from "@/components/map-legend";
import { MapaOperacional } from "@/components/mapa-operacional";
import { StatusPill } from "@/components/status-pill";
import { loadDashboardCapturas } from "@/lib/dashboard";
import {
  formatAlturaCm,
  formatConfianca,
  loadPlanTrechos,
} from "@/lib/planejamento";
import { listMotivaRodovias } from "@/lib/rodovias";

export const dynamic = "force-dynamic";

export default async function PlanejamentoPage() {
  const [plan, capturas, rodovias] = await Promise.all([
    loadPlanTrechos(),
    loadDashboardCapturas(),
    Promise.resolve(listMotivaRodovias()),
  ]);
  const planOrdemById = Object.fromEntries(
    plan.map((trecho) => [trecho.id, trecho.ordem]),
  );

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="page-title">Fila de prioridades</h1>
          <p className="page-subtitle">Trechos na ordem de manutenção.</p>
        </div>
      </div>

      {plan.length === 0 ? (
        <div className="card">
          <div className="empty">
            Nenhum trecho no plano. Cadastre dados em{" "}
            <Link href="/rodovias">Rodovias</Link> ou envie fotos em{" "}
            <Link href="/nova-captura">Nova captura</Link>.
          </div>
        </div>
      ) : (
        <>
          <section className="card" aria-labelledby="fila-heading">
            <h2 id="fila-heading" className="section-title">
              Fila por severidade
            </h2>
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Ordem</th>
                    <th>Rodovia</th>
                    <th>KM</th>
                    <th>Altura</th>
                    <th>Severidade</th>
                    <th>Confiança</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {plan.map((trecho) => (
                    <tr key={trecho.capturaId}>
                      <td>
                        <b>#{trecho.ordem}</b>
                      </td>
                      <td>{trecho.rodoviaCodigo ?? "—"}</td>
                      <td>{trecho.km === null ? "—" : trecho.km}</td>
                      <td>{formatAlturaCm(trecho.alturaCm)}</td>
                      <td>
                        <StatusPill value={trecho.severidade} />
                      </td>
                      <td>{formatConfianca(trecho.confidence)}</td>
                      <td>
                        <Link className="btn" href={`/capturas/${trecho.capturaId}`}>
                          Abrir
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section
            className="card map-card"
            style={{ marginTop: 16 }}
            aria-labelledby="mapa-plano-heading"
          >
            <div className="map-card-head">
              <div>
                <h2 id="mapa-plano-heading" className="section-title">
                  Plano no mapa
                </h2>
                <p className="muted" style={{ fontSize: 12 }}>
                  Anel e número marcam a ordem na fila.
                </p>
              </div>
              <MapLegend />
            </div>
            <div className="map-box" style={{ height: "min(70vh, 36rem)" }}>
              <MapaOperacional
                capturas={capturas}
                rodovias={rodovias}
                planOrdemById={planOrdemById}
                height="100%"
              />
            </div>
          </section>
        </>
      )}
    </>
  );
}
