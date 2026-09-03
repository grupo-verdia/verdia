"use client";

import Link from "next/link";

import { MapLegend } from "@/components/map-legend";
import { MapaOperacional } from "@/components/mapa-operacional";
import { useOperationalData } from "@/components/operational-live";
import { StatusPill } from "@/components/status-pill";
import type { Captura } from "@/lib/domain";
import { formatConfianca } from "@/lib/planejamento";
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

  const altas = capturas.filter((c) => c.classe === "alta").length;
  const medias = capturas.filter((c) => c.classe === "média").length;
  const baixas = capturas.filter((c) => c.classe === "baixa").length;
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

  return (
    <>
      <div className="grid kpis">
        <Kpi label="Capturas" value={capturas.length} />
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
              <span className="muted" style={{ fontSize: 11 }}>
                Cada ponto representa uma captura
              </span>
            </div>
            <MapLegend />
          </div>
          <div className="map-box">
            <MapaOperacional capturas={capturas} rodovias={rodovias} />
          </div>
        </section>

        <section className="card">
          <h2 className="section-title">Últimas capturas</h2>
          <div className="alert-list">
            {recentes.length ? (
              recentes.map((captura) => {
                const road = rodovias.find((r) => r.id === captura.rodoviaId);
                return (
                  <Link
                    className="alert"
                    href={`/capturas/${captura.id}`}
                    key={captura.id}
                  >
                    <span className="alert-dot" />
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
                    <StatusPill value={captura.classe} />
                  </Link>
                );
              })
            ) : (
              <div className="empty">Nenhuma captura ainda.</div>
            )}
          </div>
        </section>
      </div>
    </>
  );
}
