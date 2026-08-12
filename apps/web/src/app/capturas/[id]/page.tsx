import { notFound } from "next/navigation";

import { StatusPill } from "@/components/status-pill";
import { loadCapturaDetail } from "@/lib/dashboard";
import { formatAlturaCm, formatConfianca } from "@/lib/planejamento";
import { getRodoviaById } from "@/lib/rodovias";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
};

function toDataUrl(bytes: Uint8Array, fallbackContentType: string): string {
  const contentType = sniffImageContentType(bytes) ?? fallbackContentType;
  return `data:${contentType};base64,${Buffer.from(bytes).toString("base64")}`;
}

function sniffImageContentType(bytes: Uint8Array): string | null {
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  ) {
    return "image/png";
  }
  if (bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xd8) {
    return "image/jpeg";
  }
  return null;
}

export default async function CapturaDetailPage({ params }: PageProps) {
  const { id } = await params;
  const detail = await loadCapturaDetail(id);
  if (!detail) {
    notFound();
  }

  const { captura, photoBytes } = detail;
  const photoUrl = toDataUrl(photoBytes, "application/octet-stream");
  const rodovia = captura.rodoviaId
    ? getRodoviaById(captura.rodoviaId)
    : null;

  return (
    <>
      <div className="page-head">
        <div>
          <div className="eyebrow">CAPTURA</div>
          <h1 className="page-title">
            {rodovia?.codigo ?? "Captura"} · KM{" "}
            {captura.km?.toFixed(1) ?? "—"}
          </h1>
          <p className="page-subtitle">
            GPS {captura.lat.toFixed(5)}, {captura.lon.toFixed(5)} ·{" "}
            {new Date(captura.capturedAt).toLocaleString("pt-BR")}
          </p>
        </div>
        <StatusPill value={captura.classe} />
      </div>

      <div className="grid detail-grid">
        <section className="card">
          <h2 className="section-title">Foto</h2>
          {/* eslint-disable-next-line @next/next/no-img-element -- data URL from stored bytes */}
          <img
            src={photoUrl}
            alt="Foto da captura"
            className="capture-image"
          />
        </section>

        <section className="card">
          <h2 className="section-title">Detalhes</h2>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              borderBottom: "1px solid #173029",
              padding: "12px 0",
              fontSize: 12,
            }}
          >
            <span className="muted">Severidade</span>
            <StatusPill value={captura.classe} />
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              borderBottom: "1px solid #173029",
              padding: "12px 0",
              fontSize: 12,
            }}
          >
            <span className="muted">Altura</span>
            <b>{formatAlturaCm(captura.alturaCm)}</b>
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              borderBottom: "1px solid #173029",
              padding: "12px 0",
              fontSize: 12,
            }}
          >
            <span className="muted">Confiança</span>
            <b>{formatConfianca(captura.confidence)}</b>
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              borderBottom: "1px solid #173029",
              padding: "12px 0",
              fontSize: 12,
            }}
          >
            <span className="muted">Modelo</span>
            <b>{captura.modelVersion ?? "—"}</b>
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              borderBottom: "1px solid #173029",
              padding: "12px 0",
              fontSize: 12,
            }}
          >
            <span className="muted">Sentido</span>
            <b>{captura.sentido ?? "—"}</b>
          </div>
          {captura.inferenceError ? (
            <div className="notice" style={{ marginTop: 14 }}>
              Erro de inferência: {captura.inferenceError}
            </div>
          ) : null}
        </section>
      </div>
    </>
  );
}
