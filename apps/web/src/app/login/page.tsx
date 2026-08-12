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
    <form className="card login-card" onSubmit={onSubmit}>
      <div className="eyebrow">ACESSO</div>
      <h1 className="page-title" style={{ fontSize: 28 }}>
        verdia
      </h1>
      <p className="page-subtitle" style={{ marginBottom: 18 }}>
        Entre com a senha compartilhada do demo.
      </p>
      <label
        className="muted"
        style={{ display: "grid", gap: 6, marginBottom: 12, fontSize: 12 }}
      >
        Senha
        <input
          className="input"
          type="password"
          name="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />
      </label>
      {error ? (
        <p role="alert" style={{ margin: "0 0 12px", color: "var(--danger)" }}>
          {error}
        </p>
      ) : null}
      <button className="btn btn-primary" type="submit" disabled={pending}>
        {pending ? "Entrando…" : "Entrar"}
      </button>
    </form>
  );
}
