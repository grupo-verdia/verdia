import type { ReactNode } from "react";
import { notFound } from "next/navigation";

import { BackLink } from "@/components/back-link";
import { OverrideForm } from "@/components/override-form";
import { StatusPill } from "@/components/status-pill";
import { loadCapturaDetail } from "@/lib/dashboard";
import { getRodoviaById } from "@/lib/rodovias";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
};

function Info({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <div className="kpi-label">{label}</div>
      <div style={{ marginTop: 5, fontWeight: 650, fontSize: 13 }}>{value}</div>
    </div>
  );
}

export default async function CapturaDetailPage({ params }: PageProps) {
  const { id } = await params;
  const detail = await loadCapturaDetail(id);
  if (!detail) {
    notFound();
  }

  const { captura, photoBytes } = detail;
  const rodovia = captura.rodoviaId
    ? getRodoviaById(captura.rodoviaId)
    : null;
  const b64 = Buffer.from(photoBytes).toString("base64");
  const src = `data:image/jpeg;base64,${b64}`;

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="page-title">
            {rodovia?.codigo ?? "Rodovia"} · KM {captura.km?.toFixed(1) ?? "—"}
          </h1>
          <p className="page-subtitle">
            {new Date(captura.capturedAt).toLocaleString("pt-BR")} ·{" "}
            {captura.lat.toFixed(6)}, {captura.lon.toFixed(6)}
          </p>
        </div>
        <BackLink />
      </div>

      <div className="grid detail-grid">
        <section className="card">
          {/* eslint-disable-next-line @next/next/no-img-element -- stored photo as data URL */}
          <img
            className="capture-image"
            src={src}
            alt="Captura da vegetação"
          />
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 12,
              marginTop: 16,
            }}
          >
            <Info
              label="Altura"
              value={
                captura.alturaCm != null
                  ? `${captura.alturaCm} cm`
                  : "Não informada"
              }
            />
            <Info
              label="Sentido"
              value={captura.sentido ?? "Não informado"}
            />
            <Info
              label="Classe"
              value={<StatusPill value={captura.classe} />}
            />
            <Info
              label="Confiança"
              value={
                captura.confidence != null
                  ? `${Math.round(captura.confidence * 100)}%`
                  : "—"
              }
            />
            {rodovia ? <Info label="Rodovia" value={rodovia.nome} /> : null}
          </div>
          {captura.modelVersion ? (
            <p className="muted" style={{ fontSize: 11, marginTop: 12 }}>
              {captura.modelVersion}
            </p>
          ) : null}
          {captura.inferenceError ? (
            <div className="notice notice-danger" style={{ marginTop: 14 }}>
              Não foi possível classificar: {captura.inferenceError}
            </div>
          ) : null}
          {captura.overrideMotivo ? (
            <div className="notice" style={{ marginTop: 14 }}>
              Correção: {captura.overrideMotivo}
              {captura.overrideAt
                ? ` · ${new Date(captura.overrideAt).toLocaleString("pt-BR")}`
                : ""}
            </div>
          ) : null}
        </section>

        <section className="card">
          <h2 className="section-title" style={{ marginBottom: 6 }}>
            Corrigir classe
          </h2>
          <p
            className="muted"
            style={{ fontSize: 12, lineHeight: 1.6, margin: "0 0 14px" }}
          >
            Quando a classe da foto estiver errada.
          </p>
          <OverrideForm id={captura.id} current={captura.classe} />
        </section>
      </div>
    </>
  );
}
