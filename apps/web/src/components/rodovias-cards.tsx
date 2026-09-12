"use client";

import type { ReactNode } from "react";
import Link from "next/link";

import { CapturaThumb } from "@/components/captura-thumb";
import { StatusPill } from "@/components/status-pill";
import type { Severidade } from "@/lib/domain";

export type RodoviaCard = {
  id: string;
  ordem: number;
  /** Queue position label (e.g. "#3") for Planejamento. Omit on Rodovias. */
  ordemLabel?: string;
  rodovia: string;
  km: string;
  altura: string;
  /** Queue prazo until 30 cm. Omit on Rodovias. */
  prazo?: string;
  severidade: Severidade | null;
  pillLabel?: string;
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
          className={["record-card", card.severidade].filter(Boolean).join(" ")}
        >
          <CapturaThumb id={card.id} className="captura-thumb-wide" />
          <header>
            <div>
              {card.ordemLabel ? <b>{card.ordemLabel}</b> : null}
              <div className="record-kicker">Rodovia</div>
              <strong>{card.rodovia}</strong>
            </div>
            <StatusPill value={card.severidade} label={card.pillLabel} />
          </header>
          <div className="record-fields">
            <RecordField label="KM" value={card.km} />
            <RecordField label="Altura" value={card.altura} />
            {card.prazo ? <RecordField label="Prazo" value={card.prazo} /> : null}
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
