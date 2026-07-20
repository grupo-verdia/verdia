"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);

    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ password }),
    });

    setPending(false);

    if (!response.ok) {
      setError("Senha incorreta.");
      return;
    }

    router.replace("/");
    router.refresh();
  }

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
      <form
        onSubmit={onSubmit}
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "0.75rem",
          width: "min(100%, 20rem)",
        }}
      >
        <h1 style={{ margin: 0, fontSize: "1.5rem" }}>verdia</h1>
        <p style={{ margin: 0, color: "#444" }}>
          Entre com a senha compartilhada do demo.
        </p>
        <label style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
          Senha
          <input
            type="password"
            name="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </label>
        {error ? (
          <p role="alert" style={{ margin: 0, color: "#b00020" }}>
            {error}
          </p>
        ) : null}
        <button type="submit" disabled={pending}>
          {pending ? "Entrando…" : "Entrar"}
        </button>
      </form>
    </main>
  );
}
