"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import type { Rodovia } from "@/lib/rodovias";

type PlanejamentoExcelToolbarProps = {
  rodovias: Rodovia[];
};

type ImportResult = {
  imported?: number;
  received?: number;
  errors?: Array<{ row: number; message: string }>;
  error?: string;
};

async function postImport(file: File, rodoviaId: string): Promise<ImportResult> {
  const form = new FormData();
  form.append("file", file);
  form.append("rodoviaId", rodoviaId);
  const response = await fetch("/api/capturas/import", {
    method: "POST",
    body: form,
  });
  const payload = (await response.json()) as ImportResult;
  if (!response.ok) {
    throw new Error(
      payload.error ??
        payload.errors?.[0]?.message ??
        `Importação falhou (${response.status})`,
    );
  }
  return payload;
}

function importStatusMessage(payload: ImportResult): string {
  const imported = payload.imported ?? 0;
  const errCount = payload.errors?.length ?? 0;
  if (errCount > 0) {
    return `Importadas ${imported}; ${errCount} linha(s) com erro.`;
  }
  return `Importadas ${imported} captura(s).`;
}

export function PlanejamentoExcelToolbar({
  rodovias,
}: PlanejamentoExcelToolbarProps) {
  const router = useRouter();
  const [rodoviaId, setRodoviaId] = useState(rodovias[0]?.id ?? "");
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onImport(fileList: FileList | null) {
    const file = fileList?.[0];
    if (!file) {
      return;
    }
    if (!rodoviaId) {
      setError("Selecione uma rodovia.");
      return;
    }

    setBusy(true);
    setError(null);
    setStatus("Importando…");

    try {
      const payload = await postImport(file, rodoviaId);
      setStatus(importStatusMessage(payload));
      router.refresh();
    } catch (err) {
      setStatus(null);
      setError(err instanceof Error ? err.message : "Falha na importação.");
    } finally {
      setBusy(false);
    }
  }

  function onExport() {
    if (!rodoviaId) {
      setError("Selecione uma rodovia.");
      return;
    }
    setError(null);
    setStatus(null);
    window.location.href = `/api/capturas/export?rodoviaId=${encodeURIComponent(rodoviaId)}`;
  }

  return (
    <section
      aria-labelledby="excel-toolbar-heading"
      style={{
        marginBottom: "1.5rem",
        padding: "0.85rem 0",
        borderTop: "1px solid #ddd",
        borderBottom: "1px solid #ddd",
      }}
    >
      <h2
        id="excel-toolbar-heading"
        style={{ margin: "0 0 0.65rem", fontSize: "1.15rem" }}
      >
        Excel
      </h2>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "0.65rem",
          alignItems: "center",
        }}
      >
        <label style={{ display: "flex", gap: "0.4rem", alignItems: "center" }}>
          <span style={{ color: "#444", fontSize: "0.95rem" }}>Rodovia</span>
          <select
            value={rodoviaId}
            disabled={busy || rodovias.length === 0}
            onChange={(event) => setRodoviaId(event.target.value)}
            style={{
              font: "inherit",
              padding: "0.25rem 0.4rem",
              border: "1px solid #ccc",
              borderRadius: "4px",
              minWidth: "12rem",
            }}
          >
            {rodovias.length === 0 ? (
              <option value="">Nenhuma rodovia</option>
            ) : (
              rodovias.map((rodovia) => (
                <option key={rodovia.id} value={rodovia.id}>
                  {rodovia.codigo} — {rodovia.nome}
                </option>
              ))
            )}
          </select>
        </label>

        <label style={{ display: "flex", gap: "0.4rem", alignItems: "center" }}>
          <span style={{ color: "#444", fontSize: "0.95rem" }}>Importar</span>
          <input
            type="file"
            accept=".xlsx,.xls"
            disabled={busy || !rodoviaId}
            onChange={(event) => {
              void onImport(event.target.files);
              event.target.value = "";
            }}
            style={{ font: "inherit", maxWidth: "16rem" }}
          />
        </label>

        <button
          type="button"
          disabled={busy || !rodoviaId}
          onClick={onExport}
          style={{
            font: "inherit",
            padding: "0.3rem 0.75rem",
            border: "1px solid #ccc",
            borderRadius: "4px",
            background: "#f5f5f5",
            cursor: busy || !rodoviaId ? "not-allowed" : "pointer",
          }}
        >
          Exportar
        </button>
      </div>

      {status ? (
        <p style={{ margin: "0.5rem 0 0", color: "#246", fontSize: "0.9rem" }}>
          {status}
        </p>
      ) : null}
      {error ? (
        <p style={{ margin: "0.5rem 0 0", color: "#b42318", fontSize: "0.9rem" }}>
          {error}
        </p>
      ) : null}
    </section>
  );
}
