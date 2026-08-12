import Link from "next/link";

import { MapaLazy } from "@/app/mapa/mapa-lazy";
import { PlanejamentoExcelToolbar } from "@/components/planejamento-excel-toolbar";
import { StatusPill } from "@/components/status-pill";
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
    <>
      <div className="page-head">
        <div>
          <div className="eyebrow">MANUTENÇÃO</div>
          <h1 className="page-title">Fila de prioridades</h1>
          <p className="page-subtitle">
            Ordenação por severidade (alta → média → baixa), depois rodovia e
            KM — derivada das capturas persistidas.
          </p>
        </div>
      </div>

      <PlanejamentoExcelToolbar rodovias={rodovias} />

      {plan.length === 0 ? (
        <div className="card">
          <div className="empty">
            Nenhum trecho no plano. Importe um Excel acima, use{" "}
            <Link href="/rodovias">Rodovias e planilhas</Link>, ou persista
            capturas via <code>POST /api/capturas</code>.
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

          <section className="card" style={{ marginTop: 16 }} aria-labelledby="mapa-plano-heading">
            <h2 id="mapa-plano-heading" className="section-title">
              Plano no mapa
            </h2>
            <p className="muted" style={{ marginBottom: 12, fontSize: 12 }}>
              Trechos do plano atual destacados com anel e ordem na fila.
            </p>
            <MapaLazy trechos={plan} planOrdemById={planOrdemById} />
          </section>
        </>
      )}
    </>
  );
}
