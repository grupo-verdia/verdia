import { loadDashboardCapturas } from "@/lib/dashboard";

export const dynamic = "force-dynamic";

export default async function Home() {
  const capturas = await loadDashboardCapturas();

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
      <h1 style={{ margin: "0 0 0.35rem", fontSize: "2rem" }}>verdia</h1>
      <p style={{ margin: "0 0 1.5rem", color: "#444" }}>
        Dashboard de capturas — classe ordinal por foto geotagueada.
      </p>

      {capturas.length === 0 ? (
        <p style={{ margin: 0, color: "#666" }}>
          Nenhuma captura persistida ainda. Use o BFF{" "}
          <code>/api/capturas</code> para gravar dados de seed.
        </p>
      ) : (
        <ul
          style={{
            listStyle: "none",
            margin: 0,
            padding: 0,
            display: "flex",
            flexDirection: "column",
            gap: "0.75rem",
          }}
        >
          {capturas.map((captura) => (
            <li
              key={captura.id}
              style={{
                borderTop: "1px solid #ddd",
                paddingTop: "0.75rem",
              }}
            >
              <div style={{ fontWeight: 600 }}>
                Classe: {captura.classe ?? "—"}
              </div>
              <div style={{ color: "#444", fontSize: "0.95rem" }}>
                GPS {captura.lat.toFixed(5)}, {captura.lon.toFixed(5)} ·{" "}
                {new Date(captura.capturedAt).toLocaleString("pt-BR")}
              </div>
              <div style={{ color: "#666", fontSize: "0.85rem" }}>
                trecho {captura.trechoId.slice(0, 8)}… · confiança{" "}
                {captura.confidence ?? "—"} · modelo{" "}
                {captura.modelVersion ?? "—"}
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
