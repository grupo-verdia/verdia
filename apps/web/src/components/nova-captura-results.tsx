"use client";

import Link from "next/link";

import { StatusPill } from "@/components/status-pill";
import type { Captura, Classe, Severidade } from "@/lib/domain";
import { severidadeFromClasse } from "@/lib/domain";

export type CapturaReport = {
  justificativa: string | null;
  fake: boolean;
  modelVersion: string;
  inferenceError: string | null;
};

export type FileOutcome =
  | {
      key: string;
      name: string;
      status: "ok";
      captura: Captura;
      previewUrl: string;
      report: CapturaReport;
    }
  | {
      key: string;
      name: string;
      status: "rejected" | "error";
      message: string;
      previewUrl?: string;
    };

function priorityLabel(severidade: Severidade): string {
  switch (severidade) {
    case "alta":
      return "Prioridade alta — intervenção recomendada";
    case "média":
      return "Prioridade média — acompanhar manutenção";
    case "baixa":
      return "Prioridade baixa — dentro do controle";
    default: {
      const _exhaustive: never = severidade;
      return _exhaustive;
    }
  }
}

function OkReport({
  outcome,
}: {
  outcome: Extract<FileOutcome, { status: "ok" }>;
}) {
  const { captura, report } = outcome;
  const prioridade = severidadeFromClasse(captura.classe);
  const conf =
    captura.confidence != null
      ? `${Math.round(captura.confidence * 100)}%`
      : "—";

  return (
    <article className="card" style={{ marginBottom: 12 }}>
      <div className="grid detail-grid">
        <div>
          {/* eslint-disable-next-line @next/next/no-img-element -- blob/data preview */}
          <img
            className="capture-image"
            src={outcome.previewUrl}
            alt={`Prévia de ${outcome.name}`}
          />
        </div>
        <div>
          <div className="eyebrow">Relatório da captura</div>
          <h3 className="section-title" style={{ marginBottom: 8 }}>
            {outcome.name}
          </h3>
          <div className="toolbar" style={{ marginBottom: 12, gap: 8 }}>
            <StatusPill value={captura.classe as Classe | null} />
            <StatusPill value={prioridade} />
          </div>
          <p style={{ fontSize: 13, fontWeight: 650, margin: "0 0 8px" }}>
            {priorityLabel(prioridade)}
          </p>
          <p className="muted" style={{ fontSize: 13, lineHeight: 1.55, margin: 0 }}>
            {report.inferenceError
              ? `Falha de inferência: ${report.inferenceError}`
              : (report.justificativa ?? "Sem justificativa da IA.")}
          </p>
          <div className="alert-meta" style={{ marginTop: 12 }}>
            Altura {captura.alturaCm ?? "—"} cm · Confiança {conf} · GPS{" "}
            {captura.lat.toFixed(5)}, {captura.lon.toFixed(5)}
            {report.fake ? " · modo stub" : ""}
          </div>
          <div className="toolbar" style={{ marginTop: 14 }}>
            <Link className="btn" href={`/capturas/${captura.id}`}>
              Abrir detalhe
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}

export function NovaCapturaResults({ outcomes }: { outcomes: FileOutcome[] }) {
  const okCount = outcomes.filter((o) => o.status === "ok").length;
  const failCount = outcomes.length - okCount;

  return (
    <section>
      <div className="page-head" style={{ marginBottom: 14 }}>
        <div>
          <div className="eyebrow">APÓS O ENVIO</div>
          <h2 className="page-title" style={{ fontSize: 22 }}>
            Relatório das imagens
          </h2>
          <p className="page-subtitle">
            {okCount} registrada{okCount === 1 ? "" : "s"}
            {failCount > 0
              ? ` · ${failCount} falha${failCount === 1 ? "" : "s"}`
              : ""}
          </p>
        </div>
      </div>

      {outcomes.map((o) =>
        o.status === "ok" ? (
          <OkReport key={o.key} outcome={o} />
        ) : (
          <div className="alert" key={o.key} style={{ marginBottom: 12 }}>
            {o.previewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- blob preview
              <img
                src={o.previewUrl}
                alt=""
                style={{
                  width: 56,
                  height: 56,
                  objectFit: "cover",
                  borderRadius: 8,
                  border: "1px solid var(--line)",
                }}
              />
            ) : (
              <span
                className="alert-dot"
                style={{ background: "var(--danger)" }}
              />
            )}
            <div className="alert-main">
              <div className="alert-title">{o.name}</div>
              <div className="alert-meta">{o.message}</div>
            </div>
          </div>
        ),
      )}

      {okCount > 0 ? (
        <div className="toolbar" style={{ marginTop: 8 }}>
          <Link className="btn btn-primary" href="/">
            Ver no painel
          </Link>
          <Link className="btn" href="/rodovias">
            Ver em rodovias
          </Link>
          <Link className="btn" href="/mapa">
            Abrir mapa
          </Link>
        </div>
      ) : null}
    </section>
  );
}
