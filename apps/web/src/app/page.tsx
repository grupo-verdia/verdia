export default function Home() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        fontFamily: "var(--font-geist-sans), sans-serif",
        padding: "1.5rem",
      }}
    >
      <div>
        <h1 style={{ margin: "0 0 0.5rem", fontSize: "2rem" }}>verdia</h1>
        <p style={{ margin: 0, color: "#444", maxWidth: "32rem" }}>
          Demo acadêmico: classifica vegetação à beira da rodovia e prioriza
          trechos para manutenção.
        </p>
      </div>
    </main>
  );
}
