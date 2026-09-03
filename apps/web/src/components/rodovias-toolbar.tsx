"use client";

import { ConfirmStrip } from "@/components/confirm-strip";
import { Field } from "@/components/field";
import type { Severidade } from "@/lib/domain";
import type { Rodovia } from "@/lib/rodovias";

const PRIORITY_FILTERS = [
  ["todas", "Todas"],
  ["alta", "Alta"],
  ["média", "Média"],
  ["baixa", "Baixa"],
] as const;

export function RodoviasToolbar({
  rodovias,
  selected,
  search,
  priority,
  busy,
  message,
  messageOk,
  fileRef,
  cardsEmpty,
  pendingConfirm,
  existingCount,
  clearScope,
  onSelect,
  onSearch,
  onPriority,
  onImport,
  onClear,
  onConfirmPending,
  onCancelPending,
}: {
  rodovias: Rodovia[];
  selected: string;
  search: string;
  priority: "todas" | Severidade;
  busy: boolean;
  message: string | null;
  messageOk: boolean;
  fileRef: React.RefObject<HTMLInputElement | null>;
  cardsEmpty: boolean;
  pendingConfirm: "import" | "clear" | null;
  existingCount: number;
  clearScope: string;
  onSelect: (id: string) => void;
  onSearch: (value: string) => void;
  onPriority: (value: "todas" | Severidade) => void;
  onImport: (file: File) => void;
  onClear: () => void;
  onConfirmPending: () => void;
  onCancelPending: () => void;
}) {
  const exportHref = `/api/capturas/export?rodoviaId=${encodeURIComponent(selected)}`;

  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <div className="toolbar-stack">
        <BrowseCluster
          rodovias={rodovias}
          selected={selected}
          search={search}
          priority={priority}
          onSelect={onSelect}
          onSearch={onSearch}
          onPriority={onPriority}
        />
        <ExcelCluster
          exportHref={exportHref}
          busy={busy}
          cardsEmpty={cardsEmpty}
          fileRef={fileRef}
          onImport={onImport}
          onClear={onClear}
        />
      </div>
      <ToolbarFeedback
        pendingConfirm={pendingConfirm}
        existingCount={existingCount}
        clearScope={clearScope}
        busy={busy}
        message={message}
        messageOk={messageOk}
        onConfirmPending={onConfirmPending}
        onCancelPending={onCancelPending}
      />
    </div>
  );
}

function BrowseCluster({
  rodovias,
  selected,
  search,
  priority,
  onSelect,
  onSearch,
  onPriority,
}: {
  rodovias: Rodovia[];
  selected: string;
  search: string;
  priority: "todas" | Severidade;
  onSelect: (id: string) => void;
  onSearch: (value: string) => void;
  onPriority: (value: "todas" | Severidade) => void;
}) {
  return (
    <div className="toolbar-cluster">
      <div style={{ minWidth: 200, flex: "1 1 180px", maxWidth: 320 }}>
        <Field label="Rodovia">
          <select
            className="select"
            value={selected}
            onChange={(event) => onSelect(event.target.value)}
          >
            <option value="todas">Todas as rodovias</option>
            {rodovias.map((r) => (
              <option key={r.id} value={r.id}>
                {r.codigo} · {r.nome}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <div style={{ minWidth: 200, flex: "1 1 220px", maxWidth: 420 }}>
        <Field label="Buscar">
          <input
            className="input"
            placeholder="Rodovia, KM ou altura"
            value={search}
            onChange={(event) => onSearch(event.target.value)}
          />
        </Field>
      </div>
      <div className="toolbar-cluster" style={{ alignSelf: "flex-end" }}>
        {PRIORITY_FILTERS.map(([id, label]) => (
          <button
            key={id}
            type="button"
            className={priority === id ? "btn btn-primary" : "btn"}
            onClick={() => onPriority(id)}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}

function ExcelCluster({
  exportHref,
  busy,
  cardsEmpty,
  fileRef,
  onImport,
  onClear,
}: {
  exportHref: string;
  busy: boolean;
  cardsEmpty: boolean;
  fileRef: React.RefObject<HTMLInputElement | null>;
  onImport: (file: File) => void;
  onClear: () => void;
}) {
  return (
    <div className="toolbar-cluster">
      <button
        type="button"
        className="btn"
        onClick={() => {
          window.location.href = "/api/capturas/template";
        }}
      >
        Modelo Excel
      </button>
      <label className={`btn btn-primary ${busy ? "disabled" : ""}`}>
        {busy ? "Importando…" : "Importar"}
        <input
          ref={fileRef}
          type="file"
          accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
          hidden
          disabled={busy}
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) {
              onImport(file);
            }
          }}
        />
      </label>
      <a className="btn" href={exportHref}>
        Exportar
      </a>
      <a className="btn" href="/verdia-teste-rodovias.xlsx">
        Planilha de teste
      </a>
      <button
        type="button"
        className="btn btn-danger"
        style={{ marginLeft: "auto" }}
        disabled={busy || cardsEmpty}
        onClick={onClear}
      >
        Limpar
      </button>
    </div>
  );
}

function ToolbarFeedback({
  pendingConfirm,
  existingCount,
  clearScope,
  busy,
  message,
  messageOk,
  onConfirmPending,
  onCancelPending,
}: {
  pendingConfirm: "import" | "clear" | null;
  existingCount: number;
  clearScope: string;
  busy: boolean;
  message: string | null;
  messageOk: boolean;
  onConfirmPending: () => void;
  onCancelPending: () => void;
}) {
  const importBody =
    existingCount === 1
      ? "A captura que já está aqui permanece. A importação só acrescenta linhas."
      : `As ${existingCount} capturas que já estão aqui permanecem. A importação só acrescenta linhas.`;
  const clearBody =
    clearScope === "todas"
      ? "Remove as capturas de todas as rodovias. Isso não pode ser desfeito."
      : `Remove as capturas de ${clearScope}. Isso não pode ser desfeito.`;

  return (
    <>
      {pendingConfirm === "import" ? (
        <ConfirmStrip
          title="Somar a esta lista?"
          body={importBody}
          confirmLabel="Importar"
          cancelLabel="Cancelar"
          busy={busy}
          onConfirm={onConfirmPending}
          onCancel={onCancelPending}
        />
      ) : null}
      {pendingConfirm === "clear" ? (
        <ConfirmStrip
          title="Limpar estas capturas?"
          body={clearBody}
          confirmLabel="Limpar"
          cancelLabel="Cancelar"
          danger
          busy={busy}
          onConfirm={onConfirmPending}
          onCancel={onCancelPending}
        />
      ) : null}
      {message ? (
        <div
          className={messageOk ? "notice notice-ok" : "notice"}
          style={{ marginTop: 10 }}
        >
          {message}
        </div>
      ) : null}
    </>
  );
}
