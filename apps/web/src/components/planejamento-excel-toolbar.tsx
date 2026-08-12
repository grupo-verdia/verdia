"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { isExcelFilename } from "@/lib/excel/excel-filename";
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
    if (!isExcelFilename(file.name)) {
      setError("Apenas arquivos Excel (.xlsx, .xls) são aceitos.");
      setStatus(null);
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
    <section className="card" aria-labelledby="excel-toolbar-heading" style={{ marginBottom: 16 }}>
      <h2 id="excel-toolbar-heading" className="section-title">
        Excel
      </h2>
      <div className="toolbar">
        <label className="muted" style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span>Rodovia</span>
          <select
            className="select"
            value={rodoviaId}
            disabled={busy || rodovias.length === 0}
            onChange={(event) => setRodoviaId(event.target.value)}
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

        <a className="btn" href="/api/capturas/template">
          Baixar template
        </a>

        <label className={`btn ${busy || !rodoviaId ? "disabled" : ""}`}>
          Importar
          <input
            type="file"
            accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
            hidden
            disabled={busy || !rodoviaId}
            onChange={(event) => {
              void onImport(event.target.files);
              event.target.value = "";
            }}
          />
        </label>

        <button
          type="button"
          className="btn btn-primary"
          disabled={busy || !rodoviaId}
          onClick={onExport}
        >
          Exportar
        </button>
      </div>

      {status ? (
        <p className="muted" style={{ marginTop: 10 }}>
          {status}
        </p>
      ) : null}
      {error ? (
        <p style={{ marginTop: 10, color: "var(--danger)", fontSize: 12 }}>
          {error}
        </p>
      ) : null}
    </section>
  );
}
