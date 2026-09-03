"use client";

import type { ReactNode } from "react";
import Link from "next/link";

import { StatusPill } from "@/components/status-pill";
import type { Severidade } from "@/lib/domain";

export type RodoviaCard = {
  id: string;
  ordem: number;
  rodovia: string;
  km: string;
  altura: string;
  severidade: Severidade;
  confianca: string;
};

function RecordField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="record-kicker">{label}</div>
      <div>{value}</div>
    </div>
  );
}

export function RodoviasCards({
  cards,
  emptyHint,
}: {
  cards: RodoviaCard[];
  emptyHint: ReactNode;
}) {
  if (cards.length === 0) {
    return <div className="empty">{emptyHint}</div>;
  }

  return (
    <div className="cards-grid">
      {cards.map((card) => (
        <article
          key={card.id}
          className={`record-card ${card.severidade}`}
        >
          <header>
            <div>
              <div className="record-kicker">Rodovia</div>
              <strong>{card.rodovia}</strong>
            </div>
            <StatusPill value={card.severidade} />
          </header>
          <div className="record-fields">
            <RecordField label="KM" value={card.km} />
            <RecordField label="Altura" value={card.altura} />
            <RecordField label="Confiança" value={card.confianca} />
          </div>
          <div>
            <Link className="btn" href={`/capturas/${card.id}`}>
              Abrir
            </Link>
          </div>
        </article>
      ))}
    </div>
  );
}
