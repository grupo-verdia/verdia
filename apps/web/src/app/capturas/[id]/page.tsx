import Link from "next/link";
import { notFound } from "next/navigation";

import { loadCapturaDetail } from "@/lib/dashboard";

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

  const { captura, photoBytes, overlayBytes } = detail;
  const photoUrl = toDataUrl(photoBytes, "application/octet-stream");
  const overlayUrl = overlayBytes
    ? toDataUrl(overlayBytes, "image/png")
    : null;

  return (
    <main
      style={{
        minHeight: "100vh",
        fontFamily: "var(--font-geist-sans), sans-serif",
        padding: "1.5rem",
        maxWidth: "48rem",
        margin: "0 auto",
      }}
    >
      <p style={{ margin: "0 0 1rem" }}>
        <Link href="/" style={{ color: "#246", textDecoration: "underline" }}>
          ← Dashboard
        </Link>
      </p>

      <h1 style={{ margin: "0 0 0.35rem", fontSize: "1.75rem" }}>
        Captura — classe {captura.classe ?? "—"}
      </h1>
      <p style={{ margin: "0 0 1.25rem", color: "#444" }}>
        GPS {captura.lat.toFixed(5)}, {captura.lon.toFixed(5)} ·{" "}
        {new Date(captura.capturedAt).toLocaleString("pt-BR")}
      </p>

      {captura.inferenceError ? (
        <p style={{ color: "#a33", marginBottom: "1.25rem" }}>
          Erro de inferência: {captura.inferenceError}
        </p>
      ) : (
        <p style={{ color: "#666", marginBottom: "1.25rem", fontSize: "0.95rem" }}>
          confiança {captura.confidence ?? "—"} · modelo{" "}
          {captura.modelVersion ?? "—"} · classe vem do classificador ordinal
        </p>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "1rem",
        }}
      >
        <figure style={{ margin: 0 }}>
          <figcaption style={{ marginBottom: "0.5rem", fontWeight: 600 }}>
            Foto
          </figcaption>
          {/* eslint-disable-next-line @next/next/no-img-element -- Supabase signed URL; next/image needs remotePatterns per bucket */}
          <img
            src={photoUrl}
            alt="Foto da captura"
            style={{
              width: "100%",
              height: "auto",
              display: "block",
              background: "#eee",
            }}
          />
        </figure>

        <figure style={{ margin: 0 }}>
          <figcaption style={{ marginBottom: "0.5rem", fontWeight: 600 }}>
            Segmentação (overlay)
          </figcaption>
          {overlayUrl ? (
            /* eslint-disable-next-line @next/next/no-img-element -- Supabase signed URL; next/image needs remotePatterns per bucket */
            <img
              src={overlayUrl}
              alt="Overlay de segmentação da vegetação"
              style={{
                width: "100%",
                height: "auto",
                display: "block",
                background: "#eee",
              }}
            />
          ) : (
            <p style={{ margin: 0, color: "#666" }}>
              Sem overlay persistido para esta captura.
            </p>
          )}
        </figure>
      </div>
    </main>
  );
}
