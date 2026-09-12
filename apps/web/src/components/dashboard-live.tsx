"use client";

import Link from "next/link";
import { useState } from "react";

import { CapturaThumb } from "@/components/captura-thumb";
import { MapLegend } from "@/components/map-legend";
import { MapaOperacional } from "@/components/mapa-operacional";
import { useOperationalData } from "@/components/operational-live";
import { capturaStatus, StatusPill } from "@/components/status-pill";
import type { Captura } from "@/lib/domain";
import { isClassificationPending } from "@/lib/domain";
import { formatConfianca } from "@/lib/planejamento";
import {
  comparePrazoOrder,
  isPrazoThisWeek,
  prazoUntilCut,
  type Prazo,
} from "@/lib/prazo";
import type { Rodovia } from "@/lib/rodovias";

function Kpi({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="card">
      <div className="kpi-label">{label}</div>
      <div className="kpi-value">{value}</div>
    </div>
  );
}

function dueThisWeek(
  capturas: Captura[],
  now: Date,
): Array<{ captura: Captura; prazo: Prazo }> {
  return capturas
    .filter((c) => !isClassificationPending(c) && !c.inferenceError)
    .map((captura) => {
      const prazo = prazoUntilCut(captura, now);
      if (!prazo || !isPrazoThisWeek(prazo.dias)) {
        return null;
      }
      return { captura, prazo };
    })
    .filter((row): row is { captura: Captura; prazo: Prazo } => row != null)
    .sort((a, b) =>
      comparePrazoOrder(
        { ...a.captura, prazoDias: a.prazo.dias },
        { ...b.captura, prazoDias: b.prazo.dias },
      ),
    );
}

export function DashboardLive({
  initialCapturas,
  initialRodovias,
}: {
  initialCapturas: Captura[];
  initialRodovias: Rodovia[];
}) {
  const { capturas, rodovias } = useOperationalData(
    initialCapturas,
    initialRodovias,
  );

  const [selectedCapturaId, setSelectedCapturaId] = useState<string | null>(
    null,
  );
  const [recentesOpen, setRecentesOpen] = useState(true);
  const [cortarOpen, setCortarOpen] = useState(true);

  const pending = capturas.filter(isClassificationPending).length;
  const altas = capturas.filter(
    (c) => !isClassificationPending(c) && c.classe === "alta",
  ).length;
  const medias = capturas.filter(
    (c) => !isClassificationPending(c) && c.classe === "média",
  ).length;
  const baixas = capturas.filter(
    (c) => !isClassificationPending(c) && c.classe === "baixa",
  ).length;
  const conf = capturas
    .map((c) => c.confidence)
    .filter((v): v is number => typeof v === "number");
  const avg = conf.length
    ? conf.reduce((sum, value) => sum + value, 0) / conf.length
    : null;
  const recentes = [...capturas]
    .sort(
      (a, b) =>
        new Date(b.capturedAt).getTime() - new Date(a.capturedAt).getTime(),
    )
    .slice(0, 8);
  const weekDue = dueThisWeek(capturas, new Date());

  return (
    <>
      <div className="grid kpis">
        <Kpi label="Capturas" value={capturas.length} />
        <Kpi label="Na fila" value={pending} />
        <Kpi label="Alta" value={altas} />
        <Kpi label="Média" value={medias} />
        <Kpi label="Baixa" value={baixas} />
        <Kpi
          label="Confiança média"
          value={avg === null ? "—" : formatConfianca(avg)}
        />
      </div>

      <div className="grid dashboard-grid">
        <section className="card map-card">
          <div className="map-card-head">
            <div>
              <h2 className="section-title">Mapa</h2>
            </div>
            <MapLegend />
          </div>
          <div className="map-box">
            <MapaOperacional
              capturas={capturas}
              rodovias={rodovias}
              selectedCapturaId={selectedCapturaId}
            />
          </div>
        </section>

        <div className="grid">
          <section className="card">
            <button
              type="button"
              className="section-title-row"
              onClick={() => setCortarOpen((open) => !open)}
              aria-expanded={cortarOpen}
            >
              <h2 className="section-title">Cortar nesta semana</h2>
            </button>
            <span className="muted" style={{ fontSize: 11, marginTop: -10, display: "block", marginBottom: 12 }}>
              Selecione o trecho para ver no mapa
            </span>
            <hr className="section-divider" style={{ fontSize: 9, marginTop: -5, display: "block", marginBottom: 10 }} />
            {cortarOpen && (
              <div className="alert-list">
                {weekDue.length ? (
                  weekDue.map(({ captura, prazo }) => {
                    const road = rodovias.find((r) => r.id === captura.rodoviaId);
                    const status = capturaStatus(captura);
                    const selected = captura.id === selectedCapturaId;
                    return (
                      <div
                        className={[
                          "alert",
                          "alert-clickable",
                          status.value ? `alert-severity-${status.value}` : null,
                          selected ? "alert-selected" : null,
                        ]
                          .filter(Boolean)
                          .join(" ")}
                        key={captura.id}
                        role="button"
                        tabIndex={0}
                        aria-pressed={selected}
                        onClick={() => setSelectedCapturaId(captura.id)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            setSelectedCapturaId(captura.id);
                          }
                        }}
                      >
                        <CapturaThumb id={captura.id} />
                        <div className="alert-main">
                          <div className="alert-title">
                            {road?.codigo ?? captura.rodoviaId ?? "Sem rodovia"} ·
                            KM {captura.km?.toFixed(1) ?? "—"}
                          </div>
                          <div className="alert-meta">{prazo.label}</div>
                        </div>
                        <StatusPill value={status.value} label={status.label} />
                        <Link
                          className="alert-detail-link"
                          href={`/capturas/${captura.id}`}
                          aria-label="Ver detalhes da captura"
                          onClick={(event) => event.stopPropagation()}
                        >
                          →
                        </Link>
                      </div>
                    );
                  })
                ) : (
                  <div className="empty">Nenhum trecho para cortar nesta semana.</div>
                )}
              </div>
            )}
          </section>

          <section className="card">
            <button
              type="button"
              className="section-title-row"
              onClick={() => setRecentesOpen((open) => !open)}
              aria-expanded={recentesOpen}
            >
              <h2 className="section-title">Últimas capturas</h2>
              <span
                className={`chevron${recentesOpen ? " chevron-open" : ""}`}
                aria-hidden="true"
              >
                ▾
              </span>
            </button>
            <hr className="section-divider" style={{ fontSize: 9, marginTop: -5, display: "block", marginBottom: 10 }} />
            {recentesOpen && (
              <div className="alert-list">
                {recentes.length ? (
                  recentes.map((captura) => {
                    const road = rodovias.find((r) => r.id === captura.rodoviaId);
                    const status = capturaStatus(captura);
                    const selected = captura.id === selectedCapturaId;
                    return (
                      <div
                        className={[
                          "alert",
                          "alert-clickable",
                          status.value ? `alert-severity-${status.value}` : null,
                          selected ? "alert-selected" : null,
                        ]
                          .filter(Boolean)
                          .join(" ")}
                        key={captura.id}
                        role="button"
                        tabIndex={0}
                        aria-pressed={selected}
                        onClick={() => setSelectedCapturaId(captura.id)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            setSelectedCapturaId(captura.id);
                          }
                        }}
                      >
                        <CapturaThumb id={captura.id} />
                        <div className="alert-main">
                          <div className="alert-title">
                            {road?.codigo ?? captura.rodoviaId ?? "Sem rodovia"} ·
                            KM {captura.km?.toFixed(1) ?? "—"}
                          </div>
                          <div className="alert-meta">
                            {captura.alturaCm ?? "—"} cm
                            {captura.sentido ? ` · ${captura.sentido}` : ""}
                          </div>
                        </div>
                        <StatusPill value={status.value} label={status.label} />
                        <Link
                          className="alert-detail-link"
                          href={`/capturas/${captura.id}`}
                          aria-label="Ver detalhes da captura"
                          onClick={(event) => event.stopPropagation()}
                        >
                          →
                        </Link>
                      </div>
                    );
                  })
                ) : (
                  <div className="empty">Nenhuma captura ainda.</div>
                )}
              </div>
            )}
          </section>
        </div>
      </div>
    </>
  );
}
