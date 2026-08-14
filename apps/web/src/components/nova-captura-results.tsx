"use client";

import Link from "next/link";

import { StatusPill } from "@/components/status-pill";
import type { Captura, Classe } from "@/lib/domain";

export type FileOutcome =
  | {
      key: string;
      name: string;
      status: "ok";
      captura: Captura;
    }
  | {
      key: string;
      name: string;
      status: "rejected" | "error";
      message: string;
    };

export function NovaCapturaResults({ outcomes }: { outcomes: FileOutcome[] }) {
  const okCount = outcomes.filter((o) => o.status === "ok").length;
  const failCount = outcomes.length - okCount;

  return (
    <section className="card">
      <h2 className="section-title">Resultado do envio</h2>
      <p className="muted" style={{ fontSize: 12, marginTop: 0 }}>
        {okCount} registrada{okCount === 1 ? "" : "s"}
        {failCount > 0
          ? ` · ${failCount} falha${failCount === 1 ? "" : "s"}`
          : ""}
      </p>
      <div className="alert-list">
        {outcomes.map((o) =>
          o.status === "ok" ? (
            <Link className="alert" href={`/capturas/${o.captura.id}`} key={o.key}>
              <span className="alert-dot" style={{ background: "var(--ok)" }} />
              <div className="alert-main">
                <div className="alert-title">{o.name}</div>
                <div className="alert-meta">
                  {o.captura.alturaCm ?? "—"} cm · GPS{" "}
                  {o.captura.lat.toFixed(5)}, {o.captura.lon.toFixed(5)}
                </div>
              </div>
              <StatusPill value={o.captura.classe as Classe | null} />
            </Link>
          ) : (
            <div className="alert" key={o.key}>
              <span
                className="alert-dot"
                style={{ background: "var(--danger)" }}
              />
              <div className="alert-main">
                <div className="alert-title">{o.name}</div>
                <div className="alert-meta">{o.message}</div>
              </div>
            </div>
          ),
        )}
      </div>
      {okCount > 0 ? (
        <div className="toolbar" style={{ marginTop: 14 }}>
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
