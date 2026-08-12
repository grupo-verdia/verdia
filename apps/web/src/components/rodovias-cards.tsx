"use client";

import Link from "next/link";

import type { Severidade } from "@/lib/domain";

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

export type RodoviaCard = {
  id: string;
  ordem: number;
  rodovia: string;
  km: string;
  altura: string;
  severidade: Severidade;
  confianca: string;
};

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "grid", gap: 2 }}>
      <span
        style={{
          fontSize: "0.7rem",
          color: "#94a3b8",
          textTransform: "uppercase",
        }}
      >
        {label}
      </span>
      <span style={{ fontSize: "0.9rem", color: "#0f172a", fontWeight: 600 }}>
        {value}
      </span>
    </div>
  );
}

export function RodoviasCards({
  cards,
  emptyHint,
}: {
  cards: RodoviaCard[];
  emptyHint: string;
}) {
  if (cards.length === 0) {
    return <div className="empty">{emptyHint}</div>;
  }

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
        gap: "1rem",
      }}
    >
      {cards.map((card) => {
        const tone = PRIORITY_STYLE[card.severidade];
        return (
          <article
            key={card.id}
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
            <header
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 8,
                paddingBottom: "0.55rem",
                borderBottom: "1px solid #e2e8f0",
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: "0.7rem",
                    color: "#94a3b8",
                    textTransform: "uppercase",
                  }}
                >
                  Rodovia
                </div>
                <strong style={{ fontSize: "1rem", color: "#0f172a" }}>
                  {card.rodovia}
                </strong>
              </div>
              <span
                style={{
                  fontSize: "0.75rem",
                  fontWeight: 700,
                  padding: "0.2rem 0.55rem",
                  borderRadius: 999,
                  background: tone.bg,
                  color: tone.color,
                }}
              >
                {PRIORITY_LABEL[card.severidade]}
              </span>
            </header>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                gap: "0.65rem 0.75rem",
              }}
            >
              <Field label="Ordem" value={`#${card.ordem}`} />
              <Field label="KM" value={card.km} />
              <Field label="Altura" value={card.altura} />
              <Field label="Confiança" value={card.confianca} />
            </div>
            <div>
              <Link className="btn" href={`/capturas/${card.id}`}>
                Abrir
              </Link>
            </div>
          </article>
        );
      })}
    </div>
  );
}
