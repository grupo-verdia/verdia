"use client";

import Link from "next/link";

import { StatusPill } from "@/components/status-pill";
import { useOperationalData } from "@/components/operational-live";
import type { Captura, Rodovia } from "@/lib/verdia-domain";

const RANK = { alta: 0, média: 1, baixa: 2 } as const;

function formatKm(km: number | null | undefined): string {
  return typeof km === "number" && Number.isFinite(km) ? km.toFixed(1) : "—";
}

function formatAltura(alturaCm: number | null | undefined): string {
  return typeof alturaCm === "number" && Number.isFinite(alturaCm)
    ? `${alturaCm} cm`
    : "—";
}

function formatConfianca(value: number | null | undefined): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return "—";
  const pct = value > 1 ? value : value * 100;
  return `${Math.round(pct)}%`;
}

function rodoviaLabel(captura: Captura, rodovias: Rodovia[]): string {
  const road = rodovias.find((r) => r.id === captura.rodoviaId);
  return road?.codigo ?? captura.rodoviaId ?? "—";
}

export function PlanejamentoLive({
  initialCapturas,
  initialRodovias,
}: {
  initialCapturas: Captura[];
  initialRodovias: Rodovia[];
}) {
  const { capturas, rodovias } = useOperationalData(
    initialCapturas,
    initialRodovias,
  );

  const queue = [...capturas]
    .filter((item) => item.classeFinal)
    .sort((a, b) => {
      const rankDiff = RANK[a.classeFinal!] - RANK[b.classeFinal!];
      if (rankDiff !== 0) return rankDiff;
      const kmA = a.km ?? Number.POSITIVE_INFINITY;
      const kmB = b.km ?? Number.POSITIVE_INFINITY;
      return kmA - kmB;
    });

  return (
    <div className="card">
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Ordem</th>
              <th>Rodovia</th>
              <th>KM</th>
              <th>Altura</th>
              <th>Severidade</th>
              <th>Confiança</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {queue.map((captura, index) => (
              <tr key={captura.id}>
                <td>
                  <b>#{index + 1}</b>
                </td>
                <td>{rodoviaLabel(captura, rodovias)}</td>
                <td>{formatKm(captura.km)}</td>
                <td>{formatAltura(captura.alturaCm)}</td>
                <td>
                  <StatusPill value={captura.classeFinal} />
                </td>
                <td>{formatConfianca(captura.aiConfidence)}</td>
                <td>
                  <Link className="btn" href={`/capturas/${captura.id}`}>
                    Abrir
                  </Link>
                </td>
              </tr>
            ))}
            {!queue.length && (
              <tr>
                <td colSpan={7}>
                  <div className="empty">
                    Nenhuma ocorrência para planejar. Importe a planilha em{" "}
                    <Link href="/rodovias">Rodovias e planilhas</Link>.
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
