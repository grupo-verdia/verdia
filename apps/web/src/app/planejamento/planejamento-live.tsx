"use client";
import Link from "next/link";
import { StatusPill } from "@/components/status-pill";
import { useOperationalData } from "@/components/operational-live";
import type { Captura, Rodovia } from "@/lib/verdia-domain";

export function PlanejamentoLive({ initialCapturas, initialRodovias }: { initialCapturas: Captura[]; initialRodovias: Rodovia[] }) {
  const { capturas, rodovias } = useOperationalData(initialCapturas, initialRodovias);
  const rank = { alta: 0, "média": 1, baixa: 2 } as const;
  const queue = [...capturas].filter(x => x.classeFinal).sort((a,b) => rank[a.classeFinal!] - rank[b.classeFinal!]);
  return <div className="card"><div className="table-wrap"><table className="data-table"><thead><tr><th>Ordem</th><th>Rodovia</th><th>KM</th><th>Altura</th><th>Severidade</th><th>Confiança</th><th></th></tr></thead><tbody>{queue.map((x,i)=>{const road=rodovias.find(r=>r.id===x.rodoviaId);return <tr key={x.id}><td><b>#{i+1}</b></td><td>{road?.codigo??x.rodoviaId}</td><td>{x.km?.toFixed(1)??"—"}</td><td>{x.alturaCm??"—"} cm</td><td><StatusPill value={x.classeFinal}/></td><td>{x.aiConfidence!=null?`${Math.round(x.aiConfidence*100)}%`:"—"}</td><td><Link className="btn" href={`/capturas/${x.id}`}>Abrir</Link></td></tr>})}{!queue.length && <tr><td colSpan={7}><div className="empty">Nenhuma ocorrência para planejar.</div></td></tr>}</tbody></table></div></div>;
}
