"use client";

import { useMemo, useRef, useState } from "react";

export type PlanRow = {
  id: string;
  ordem: number;
  rodovia: string;
  km: string;
  altura: string;
  severidade: "baixa" | "média" | "alta";
  confianca: string; // ex.: "0.87" ou "87%"
};

type PriorityFilter = "todas" | PlanRow["severidade"];

const PRIORITY_TABS: { id: PriorityFilter; label: string }[] = [
  { id: "todas", label: "Todas" },
  { id: "alta", label: "Alta" },
  { id: "média", label: "Média" },
  { id: "baixa", label: "Baixa" },
];

const PRIORITY_LABEL = {
  alta: "Alto",
  média: "Médio",
  baixa: "Baixo",
} as const;

const PRIORITY_STYLE = {
  alta: { bg: "#fef2f2", color: "#b42318", border: "#b42318" },
  média: { bg: "#fff7ed", color: "#c47a12", border: "#c47a12" },
  baixa: { bg: "#f0fdf4", color: "#2f6b3a", border: "#2f6b3a" },
} as const;

const HEADERS = ["Ordem", "Rodovia", "KM", "Altura", "Severidade", "Confiança"] as const;

function toCsv(rows: PlanRow[]): string {
  const lines = [
    HEADERS.join(";"),
    ...rows.map((r) =>
      [r.ordem, r.rodovia, r.km, r.altura, r.severidade, r.confianca]
        .map((cell) => `"${String(cell).replaceAll('"', '""')}"`)
        .join(";"),
    ),
  ];
  // BOM ajuda o Excel a abrir UTF-8 corretamente
  return `\uFEFF${lines.join("\n")}`;
}

function parseSeveridade(value: string): PlanRow["severidade"] {
  const v = value.trim().toLowerCase();
  if (v.startsWith("alt")) return "alta";
  if (v.startsWith("méd") || v.startsWith("med")) return "média";
  return "baixa";
}

function parseCsv(text: string): PlanRow[] {
  const raw = text.replace(/^\uFEFF/, "").trim();
  if (!raw) return [];

  const lines = raw.split(/\r?\n/);
  const start = lines[0]?.toLowerCase().includes("ordem") ? 1 : 0;
  const rows: PlanRow[] = [];

  for (let i = start; i < lines.length; i++) {
    const line = lines[i]?.trim();
    if (!line) continue;

    // aceita ; ou ,
    const sep = line.includes(";") ? ";" : ",";
    const cols = line
      .split(sep)
      .map((c) => c.trim().replace(/^"|"$/g, "").replaceAll('""', '"'));

    const [ordem, rodovia, km, altura, severidade, confianca] = cols;
    if (!rodovia && !km) continue;

    rows.push({
      id: `import-${i}-${rodovia ?? "trecho"}-${km ?? i}`,
      ordem: Number(ordem) || rows.length + 1,
      rodovia: rodovia || "—",
      km: km || "—",
      altura: altura || "—",
      severidade: parseSeveridade(severidade || "baixa"),
      confianca: confianca || "—",
    });
  }

  return rows;
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "grid", gap: 2 }}>
      <span style={{ fontSize: "0.7rem", color: "#94a3b8", textTransform: "uppercase" }}>
        {label}
      </span>
      <span style={{ fontSize: "0.9rem", color: "#0f172a", fontWeight: 600 }}>{value}</span>
    </div>
  );
}

export function PlanejamentoBoard({ plan }: { plan: PlanRow[] }) {
  const [rows, setRows] = useState<PlanRow[]>(plan);
  const [priority, setPriority] = useState<PriorityFilter>("todas");
  const [rodovia, setRodovia] = useState("todas");
  const fileRef = useRef<HTMLInputElement>(null);

  const rodovias = useMemo(
    () => [...new Set(rows.map((r) => r.rodovia))].sort(),
    [rows],
  );

  const filtered = rows.filter((r) => {
    if (priority !== "todas" && r.severidade !== priority) return false;
    if (rodovia !== "todas" && r.rodovia !== rodovia) return false;
    return true;
  });

  function exportExcel() {
    const blob = new Blob([toCsv(rows)], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `planejamento-verdia-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function onImportFile(file: File | null) {
    if (!file) return;
    const text = await file.text();
    const imported = parseCsv(text);
    if (imported.length === 0) {
      alert("Não encontrei linhas válidas no arquivo.");
      return;
    }
    setRows(imported);
    setPriority("todas");
    setRodovia("todas");
  }

  return (
    <section>
      {/* Toolbar Excel + filtros */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "0.75rem 1rem",
          alignItems: "end",
          justifyContent: "space-between",
          marginBottom: "1.25rem",
          padding: "0.85rem 1rem",
          border: "1px solid #e2e8f0",
          borderRadius: 12,
          background: "#f8fafc",
        }}
      >
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem 1rem", alignItems: "end" }}>
          <label style={{ display: "grid", gap: 4, fontSize: "0.75rem", color: "#64748b" }}>
            RODOVIA
            <select
              value={rodovia}
              onChange={(e) => setRodovia(e.target.value)}
              style={{
                minWidth: 200,
                padding: "0.45rem 0.6rem",
                borderRadius: 8,
                border: "1px solid #cbd5e1",
                background: "#fff",
                fontFamily: "inherit",
              }}
            >
              <option value="todas">Todas as rodovias</option>
              {rodovias.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </label>

          <div style={{ display: "grid", gap: 4 }}>
            <span style={{ fontSize: "0.75rem", color: "#64748b" }}>PRIORIDADE</span>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {PRIORITY_TABS.map((tab) => {
                const active = priority === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setPriority(tab.id)}
                    style={{
                      padding: "0.4rem 0.75rem",
                      borderRadius: 999,
                      border: active ? "1px solid #16a34a" : "1px solid #cbd5e1",
                      background: active ? "#16a34a" : "#fff",
                      color: active ? "#fff" : "#334155",
                      fontWeight: active ? 600 : 500,
                      fontSize: "0.85rem",
                      cursor: "pointer",
                      fontFamily: "inherit",
                    }}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <button type="button" className="btn" onClick={exportExcel}>
            Exportar Excel
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => fileRef.current?.click()}
          >
            Importar Excel
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,text/csv,.xlsx"
            hidden
            onChange={(e) => {
              void onImportFile(e.target.files?.[0] ?? null);
              e.target.value = "";
            }}
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <p style={{ color: "#666" }}>Nenhum item com esses filtros.</p>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
            gap: "1rem",
          }}
        >
          {filtered.map((row) => {
            const tone = PRIORITY_STYLE[row.severidade];
            return (
              <article
                key={row.id}
                style={{
                  border: "1px solid #e2e8f0",
                  borderLeft: `4px solid ${tone.border}`,
                  borderRadius: 12,
                  background: "#fff",
                  padding: "0.9rem 1rem",
                  display: "grid",
                  gap: "0.75rem",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                  <strong style={{ fontSize: "1rem" }}>{row.rodovia}</strong>
                  <span
                    style={{
                      fontSize: "0.75rem",
                      fontWeight: 700,
                      padding: "0.2rem 0.55rem",
                      borderRadius: 999,
                      background: tone.bg,
                      color: tone.color,
                      height: "fit-content",
                    }}
                  >
                    {PRIORITY_LABEL[row.severidade]}
                  </span>
                </div>

                {/* Colunas pedidas */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                    gap: "0.65rem 0.75rem",
                  }}
                >
                  <Field label="Ordem" value={String(row.ordem)} />
                  <Field label="Rodovia" value={row.rodovia} />
                  <Field label="KM" value={row.km} />
                  <Field label="Altura" value={row.altura} />
                  <Field label="Severidade" value={row.severidade} />
                  <Field label="Confiança" value={row.confianca} />
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}