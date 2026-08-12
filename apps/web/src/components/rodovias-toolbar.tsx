"use client";

import type { Severidade } from "@/lib/domain";
import type { Rodovia } from "@/lib/rodovias";

export function RodoviasToolbar({
  rodovias,
  selected,
  search,
  priority,
  busy,
  message,
  fileRef,
  cardsEmpty,
  onSelect,
  onSearch,
  onPriority,
  onImport,
  onClear,
}: {
  rodovias: Rodovia[];
  selected: string;
  search: string;
  priority: "todas" | Severidade;
  busy: boolean;
  message: string | null;
  fileRef: React.RefObject<HTMLInputElement | null>;
  cardsEmpty: boolean;
  onSelect: (id: string) => void;
  onSearch: (value: string) => void;
  onPriority: (value: "todas" | Severidade) => void;
  onImport: (file: File) => void;
  onClear: () => void;
}) {
  const exportHref = `/api/capturas/export?rodoviaId=${encodeURIComponent(selected)}`;

  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <div className="toolbar" style={{ flexWrap: "wrap", gap: 10 }}>
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
        <input
          className="input"
          placeholder="Buscar rodovia, KM, severidade ou altura"
          value={search}
          onChange={(event) => onSearch(event.target.value)}
        />
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {(
            [
              ["todas", "Todas"],
              ["alta", "Alta"],
              ["média", "Média"],
              ["baixa", "Baixa"],
            ] as const
          ).map(([id, label]) => (
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
        <a className="btn" href="/api/capturas/template">
          Baixar template
        </a>
        <label className={`btn ${busy ? "disabled" : ""}`}>
          {busy ? "Importando…" : "Importar Excel"}
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
        <a className="btn btn-primary" href={exportHref}>
          Exportar Excel
        </a>
        <button
          type="button"
          className="btn"
          disabled={busy || cardsEmpty}
          onClick={onClear}
        >
          Limpar
        </button>
      </div>
      {message ? (
        <div className="muted" style={{ marginTop: 10 }}>
          {message}
        </div>
      ) : null}
    </div>
  );
}
