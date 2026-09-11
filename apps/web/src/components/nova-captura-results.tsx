"use client";

import Link from "next/link";

import { capturaStatus, StatusPill } from "@/components/status-pill";
import type { Captura } from "@/lib/domain";
import { isClassificationPending, severidadeFromClasse } from "@/lib/domain";

export type BatchReport = {
  uploaded: Captura[];
  failed: Array<{ name: string; message: string }>;
  skipped: number;
};

function priorityLabel(captura: Captura): string {
  if (isClassificationPending(captura)) {
    return "Na fila";
  }
  const severidade = severidadeFromClasse(captura.classe);
  if (severidade === "alta") {
    return "Prioridade alta";
  }
  if (severidade === "média") {
    return "Prioridade média";
  }
  return "Prioridade baixa";
}

function OneReport({ captura }: { captura: Captura }) {
  const status = capturaStatus(captura);
  return (
    <article className="card" style={{ marginBottom: 12 }}>
      <h3 className="section-title" style={{ marginBottom: 8 }}>
        Captura
      </h3>
      <div className="toolbar" style={{ marginBottom: 12, gap: 8 }}>
        <StatusPill value={status.value} label={status.label} />
      </div>
      <p style={{ fontSize: 13, fontWeight: 650, margin: "0 0 8px" }}>
        {priorityLabel(captura)}
      </p>
      {captura.inferenceError ? (
        <p className="muted" style={{ fontSize: 13, margin: 0 }}>
          Não foi possível classificar: {captura.inferenceError}
        </p>
      ) : null}
      <div className="toolbar" style={{ marginTop: 14 }}>
        <Link className="btn" href={`/capturas/${captura.id}`}>
          Abrir
        </Link>
      </div>
    </article>
  );
}

export function NovaCapturaResults({
  report,
  classifying,
}: {
  report: BatchReport;
  classifying: number;
}) {
  const { uploaded, failed, skipped } = report;
  const done = uploaded.filter((c) => !isClassificationPending(c)).length;
  const errors = uploaded.filter((c) => c.inferenceError).length;

  return (
    <section>
      <div className="page-head" style={{ marginBottom: 14 }}>
        <div>
          <h2 className="page-title" style={{ fontSize: 22 }}>
            Resultado
          </h2>
          <p className="page-subtitle">
            {uploaded.length} enviada{uploaded.length === 1 ? "" : "s"}
            {classifying > 0 ? ` · ${classifying} na fila` : ` · ${done} classificada${done === 1 ? "" : "s"}`}
            {errors > 0 ? ` · ${errors} falha${errors === 1 ? "" : "s"}` : ""}
            {failed.length > 0
              ? ` · ${failed.length} não enviada${failed.length === 1 ? "" : "s"}`
              : ""}
            {skipped > 0 ? ` · ${skipped} sem GPS` : ""}
          </p>
        </div>
      </div>

      {uploaded.length === 1 && uploaded[0] ? (
        <OneReport captura={uploaded[0]} />
      ) : null}

      {failed.map((item, index) => (
        <div className="alert" key={`${item.name}-${index}`} style={{ marginBottom: 12 }}>
          <span className="alert-dot" style={{ background: "var(--danger)" }} />
          <div className="alert-main">
            <div className="alert-title">{item.name}</div>
            <div className="alert-meta">{item.message}</div>
          </div>
        </div>
      ))}

      {uploaded.length > 0 ? (
        <div className="toolbar" style={{ marginTop: 8 }}>
          <Link className="btn btn-primary" href="/mapa">
            Ver no mapa
          </Link>
        </div>
      ) : null}
    </section>
  );
}
