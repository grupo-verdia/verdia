"use client";

import Link from "next/link";

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

function roadLabel(captura: Captura, rodovias: Rodovia[]) {
  const road = rodovias.find((r) => r.id === captura.rodoviaId);
  return `${road?.codigo ?? captura.rodoviaId ?? "Sem rodovia"} · KM ${captura.km?.toFixed(1) ?? "—"}`;
}

function WeekDueList({
  rows,
  rodovias,
}: {
  rows: Array<{ captura: Captura; prazo: Prazo }>;
  rodovias: Rodovia[];
}) {
  return (
    <section className="card">
      <h2 className="section-title">Cortar nesta semana</h2>
      <div className="alert-list">
        {rows.length ? (
          rows.map(({ captura, prazo }) => {
            const status = capturaStatus(captura);
            return (
              <Link
                className="alert"
                href={`/capturas/${captura.id}`}
                key={captura.id}
              >
                <CapturaThumb id={captura.id} />
                <div className="alert-main">
                  <div className="alert-title">{roadLabel(captura, rodovias)}</div>
                  <div className="alert-meta">{prazo.label}</div>
                </div>
                <StatusPill value={status.value} label={status.label} />
              </Link>
            );
          })
        ) : (
          <div className="empty">Nenhum trecho para cortar nesta semana.</div>
        )}
      </div>
    </section>
  );
}

function RecentCapturasList({
  capturas,
  rodovias,
}: {
  capturas: Captura[];
  rodovias: Rodovia[];
}) {
  return (
    <section className="card">
      <h2 className="section-title">Últimas capturas</h2>
      <div className="alert-list">
        {capturas.length ? (
          capturas.map((captura) => {
            const status = capturaStatus(captura);
            return (
              <Link
                className="alert"
                href={`/capturas/${captura.id}`}
                key={captura.id}
              >
                <CapturaThumb id={captura.id} />
                <div className="alert-main">
                  <div className="alert-title">{roadLabel(captura, rodovias)}</div>
                  <div className="alert-meta">
                    {captura.alturaCm ?? "—"} cm
                    {captura.sentido ? ` · ${captura.sentido}` : ""}
                  </div>
                </div>
                <StatusPill value={status.value} label={status.label} />
              </Link>
            );
          })
        ) : (
          <div className="empty">Nenhuma captura ainda.</div>
        )}
      </div>
    </section>
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
              <span className="muted" style={{ fontSize: 11 }}>
                Clique na bolinha para ver a foto
              </span>
            </div>
            <MapLegend />
          </div>
          <div className="map-box">
            <MapaOperacional capturas={capturas} rodovias={rodovias} />
          </div>
        </section>

        <div className="grid">
          <WeekDueList rows={weekDue} rodovias={rodovias} />
          <RecentCapturasList capturas={recentes} rodovias={rodovias} />
        </div>
      </div>
    </>
  );
}
