import Link from "next/link";
import { notFound } from "next/navigation";

import { OverrideForm } from "@/components/override-form";
import { StatusPill } from "@/components/status-pill";
import { loadCapturaDetail } from "@/lib/dashboard";
import { getRodoviaById } from "@/lib/rodovias";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
};

function Info({ label, value }: { label: string; value: string }) {
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

  const { captura } = detail;
  const rodovia = captura.rodoviaId
    ? getRodoviaById(captura.rodoviaId)
    : null;

  return (
    <>
      <div className="page-head">
        <div>
          <div className="eyebrow">DETALHE DA CAPTURA</div>
          <h1 className="page-title">
            {rodovia?.codigo ?? "Rodovia"} · KM {captura.km?.toFixed(1) ?? "—"}
          </h1>
          <p className="page-subtitle">
            {new Date(captura.capturedAt).toLocaleString("pt-BR")} ·{" "}
            {captura.lat.toFixed(6)}, {captura.lon.toFixed(6)}
          </p>
        </div>
        <Link className="btn" href="/rodovias">
          ← Voltar aos dados
        </Link>
      </div>

      <div className="grid detail-grid">
        <section className="card">
          <h2 className="section-title">Captura</h2>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 12,
              marginBottom: 16,
            }}
          >
            <Info
              label="Altura detectada"
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
            <Info label="IA" value={captura.classe ?? "Sem classificação"} />
            <Info
              label="Confiança"
              value={
                captura.confidence != null
                  ? `${Math.round(captura.confidence * 100)}%`
                  : "—"
              }
            />
            <Info label="Modelo" value={captura.modelVersion ?? "—"} />
            <Info
              label="Decisão final"
              value={captura.classe ?? "Pendente"}
            />
          </div>
          <StatusPill value={captura.classe} />
          {captura.inferenceError ? (
            <div className="notice" style={{ marginTop: 14 }}>
              Falha de inferência: {captura.inferenceError}
            </div>
          ) : null}
          {captura.overrideMotivo ? (
            <div className="notice" style={{ marginTop: 14 }}>
              Override: {captura.overrideMotivo}
              {captura.overrideAt
                ? ` · ${new Date(captura.overrideAt).toLocaleString("pt-BR")}`
                : ""}
            </div>
          ) : null}
        </section>

        <section className="card">
          <h2 className="section-title">Overwrite da IA</h2>
          <p className="muted" style={{ fontSize: 12, lineHeight: 1.6 }}>
            Use somente quando a análise humana identificar divergência. A
            alteração fica registrada em auditoria.
          </p>
          <OverrideForm id={captura.id} current={captura.classe} />
        </section>
      </div>

      <p className="footer-note">
        ID da captura:{" "}
        <span style={{ fontFamily: "var(--font-mono)" }}>{captura.id}</span>
      </p>
    </>
  );
}
