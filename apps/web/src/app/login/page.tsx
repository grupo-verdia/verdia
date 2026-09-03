"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

import { Field } from "@/components/field";

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
    <form className="card login-card" method="post" onSubmit={onSubmit}>
      <h1 className="page-title" style={{ fontSize: 28 }}>
        verdia
      </h1>
      <p className="page-subtitle" style={{ marginBottom: 18 }}>
        Senha compartilhada da equipe.
      </p>
      <div style={{ marginBottom: 12 }}>
        <Field label="Senha" error={error ?? undefined}>
          <input
            className={`input${error ? " input-invalid" : ""}`}
            type="password"
            name="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </Field>
      </div>
      <button className="btn btn-primary" type="submit" disabled={pending}>
        {pending ? "Entrando…" : "Entrar"}
      </button>
    </form>
  );
}
