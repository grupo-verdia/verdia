"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

import { Field } from "@/components/field";
import type { Classe } from "@/lib/domain";

function apiErrorMessage(error?: string): string {
  if (error === "captura not found") {
    return "Captura não encontrada.";
  }
  return "Não foi possível salvar.";
}

/** Manual classe correction on captura detail. PATCH /api/capturas/:id. */
export function OverrideForm({
  id,
  current,
}: {
  id: string;
  current: Classe | null;
}) {
  const router = useRouter();
  const [classe, setClasse] = useState<Classe>(current ?? "baixa");
  const [motivo, setMotivo] = useState("");
  const [motivoError, setMotivoError] = useState<string | undefined>();
  const [apiError, setApiError] = useState<string | undefined>();
  const [ok, setOk] = useState(false);
  const [loading, setLoading] = useState(false);

  function onMotivoChange(value: string) {
    setMotivo(value);
    setOk(false);
    if (motivoError && value.trim().length >= 5) {
      setMotivoError(undefined);
    }
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = motivo.trim();
    if (trimmed.length < 5) {
      setMotivoError("O motivo precisa ter pelo menos 5 caracteres.");
      setOk(false);
      setApiError(undefined);
      return;
    }

    setMotivoError(undefined);
    setApiError(undefined);
    setOk(false);
    setLoading(true);
    try {
      const response = await fetch(`/api/capturas/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ classeFinal: classe, motivo: trimmed }),
      });
      if (!response.ok) {
        let error: string | undefined;
        try {
          const data = (await response.json()) as { error?: string };
          error = data.error;
        } catch {
          error = undefined;
        }
        setApiError(apiErrorMessage(error));
        return;
      }
      setMotivo("");
      setOk(true);
      router.refresh();
    } catch {
      setApiError("Não foi possível salvar.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="override" onSubmit={(event) => void save(event)}>
      {ok ? <div className="notice notice-ok">Classe corrigida.</div> : null}
      {apiError ? <div className="notice notice-danger">{apiError}</div> : null}
      <Field label="Classe">
        <select
          className="select"
          value={classe}
          onChange={(event) => {
            setClasse(event.target.value as Classe);
            setOk(false);
          }}
        >
          <option value="baixa">Baixa</option>
          <option value="média">Média</option>
          <option value="alta">Alta</option>
        </select>
      </Field>
      <Field label="Motivo" error={motivoError}>
        <textarea
          className={`input${motivoError ? " input-invalid" : ""}`}
          rows={4}
          placeholder="Por que a classe da foto está errada?"
          value={motivo}
          onChange={(event) => onMotivoChange(event.target.value)}
        />
      </Field>
      <button className="btn btn-primary" type="submit" disabled={loading}>
        {loading ? "Salvando…" : "Salvar correção"}
      </button>
    </form>
  );
}
