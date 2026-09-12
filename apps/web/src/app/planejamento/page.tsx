import Link from "next/link";

import { CapturaThumb } from "@/components/captura-thumb";
import { MapLegend } from "@/components/map-legend";
import { MapaOperacional } from "@/components/mapa-operacional";
import { RodoviasCards } from "@/components/rodovias-cards";
import { StatusPill } from "@/components/status-pill";
import { loadDashboardCapturas } from "@/lib/dashboard";
import {
  formatAlturaCm,
  formatConfianca,
  formatPrazo,
  loadPlanTrechos,
  planPrazoSummary,
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
  const { cortarAgora, estaSemana } = planPrazoSummary(plan);

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="page-title">Fila de prioridades</h1>
          <p className="page-subtitle">Ordem pelo prazo até 30 cm.</p>
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
              Fila por prazo
            </h2>
            <p className="muted" style={{ fontSize: 12, marginTop: -8, marginBottom: 14 }}>
              Cortar agora: {cortarAgora}. Esta semana: {estaSemana}.
            </p>
            <div className="table-wrap plan-table">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Ordem</th>
                    <th>Foto</th>
                    <th>Rodovia</th>
                    <th>KM</th>
                    <th>Altura</th>
                    <th>Prazo</th>
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
                      <td>
                        <CapturaThumb id={trecho.capturaId} />
                      </td>
                      <td>{trecho.rodoviaCodigo ?? "—"}</td>
                      <td>{trecho.km === null ? "—" : trecho.km}</td>
                      <td>{formatAlturaCm(trecho.alturaCm)}</td>
                      <td>{formatPrazo(trecho.prazoLabel)}</td>
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
            <div className="plan-cards">
              <RodoviasCards
                cards={plan.map((trecho) => ({
                  id: trecho.capturaId,
                  ordem: trecho.ordem,
                  ordemLabel: `#${trecho.ordem}`,
                  rodovia: trecho.rodoviaCodigo ?? "—",
                  km: trecho.km === null ? "—" : String(trecho.km),
                  altura: formatAlturaCm(trecho.alturaCm),
                  prazo: formatPrazo(trecho.prazoLabel),
                  severidade: trecho.severidade,
                  confianca: formatConfianca(trecho.confidence),
                }))}
                emptyHint={
                  <>
                    Nenhum trecho no plano. Cadastre dados em{" "}
                    <Link href="/rodovias">Rodovias</Link> ou envie fotos em{" "}
                    <Link href="/nova-captura">Nova captura</Link>.
                  </>
                }
              />
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
                  Anel e número marcam a ordem na fila. A cor segue a classe.
                  Clique na bolinha para ver a foto.
                </p>
              </div>
              <MapLegend />
            </div>
            <div className="map-box map-box-plan">
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
