"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

import { Field } from "@/components/field";

export default function LoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
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
          <div className="password-field">
            <input
              className={`input${error ? " input-invalid" : ""}`}
              type={showPassword ? "text" : "password"}
              name="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
            <button
              className="password-toggle"
              type="button"
              aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
              aria-pressed={showPassword}
              title={showPassword ? "Ocultar senha" : "Mostrar senha"}
              onClick={(event) => {
                event.preventDefault();
                setShowPassword((visible) => !visible);
              }}
            >
              {showPassword ? <EyeOffIcon /> : <EyeIcon />}
            </button>
          </div>
        </Field>
      </div>
      <button className="btn btn-primary" type="submit" disabled={pending}>
        {pending ? "Entrando…" : "Entrar"}
      </button>
    </form>
  );
}

function EyeIcon() {
  return (
    <svg viewBox="0 0 16 16" width="16" height="16" fill="none" aria-hidden="true">
      <path
        d="M1.5 8s2.4-4.5 6.5-4.5S14.5 8 14.5 8s-2.4 4.5-6.5 4.5S1.5 8 1.5 8Z"
        stroke="currentColor"
        strokeWidth="1.4"
      />
      <circle cx="8" cy="8" r="2.1" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg viewBox="0 0 16 16" width="16" height="16" fill="none" aria-hidden="true">
      <path
        d="M3.2 3.2 12.8 12.8M6.4 6.5A2.1 2.1 0 0 0 9.5 9.6"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      <path
        d="M4.2 4.7C2.5 5.8 1.5 8 1.5 8s2.4 4.5 6.5 4.5c1.2 0 2.3-.4 3.2-1M7.1 3.6c.3 0 .6-.1.9-.1 4.1 0 6.5 4.5 6.5 4.5s-.5 1-1.4 2"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}
