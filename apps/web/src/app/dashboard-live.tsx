"use client";

import Link from "next/link";
import { useOperationalData } from "@/components/operational-live";
import { StatusPill } from "@/components/status-pill";
import { MapaOperacional } from "@/components/mapa-operacional";
import type { Captura, Rodovia } from "@/lib/verdia-domain";

export function DashboardLive({ initialCapturas, initialRodovias }: { initialCapturas: Captura[]; initialRodovias: Rodovia[] }) {
  const { capturas, rodovias } = useOperationalData(initialCapturas, initialRodovias);
  const altas = capturas.filter(c => c.classeFinal === "alta").length;
  const medias = capturas.filter(c => c.classeFinal === "média").length;
  const baixas = capturas.filter(c => c.classeFinal === "baixa").length;
  const conf = capturas.map(c => c.aiConfidence).filter((v): v is number => typeof v === "number");
  const avg = conf.length ? conf.reduce((a,b) => a+b, 0) / conf.length : null;
  const coverage = rodovias.length ? new Set(capturas.map(c => c.rodoviaId)).size / rodovias.length : 0;
  const recentes = capturas.slice(0, 8);
  return <>
    <div className="grid kpis">
      <Kpi label="Capturas processadas" value={capturas.length} note="imagens georreferenciadas"/>
      <Kpi label="Alta prioridade" value={altas} note="intervenção prioritária"/>
      <Kpi label="Média prioridade" value={medias} note="acompanhar manutenção"/>
      <Kpi label="Baixa prioridade" value={baixas} note="dentro do controle"/>
      <Kpi label="Confiança média" value={avg === null ? "—" : `${Math.round(avg*100)}%`} note={`${Math.round(coverage*100)}% das rodovias com dados`}/>
    </div>
    <div className="grid dashboard-grid">
      <section className="card map-card"><div className="map-card-head"><div><h2 className="section-title">Mapa operacional</h2><span className="muted" style={{fontSize:11}}>Cada ponto representa uma captura</span></div></div><div className="map-box"><MapaOperacional capturas={capturas} rodovias={rodovias}/></div></section>
      <section className="card"><h2 className="section-title">Últimas ocorrências</h2><div className="alert-list">{recentes.length ? recentes.map(c => { const r=rodovias.find(x=>x.id===c.rodoviaId); return <Link className="alert" href={`/capturas/${c.id}`} key={c.id}><span className="alert-dot"/><div className="alert-main"><div className="alert-title">{r?.codigo ?? c.rodoviaId} · KM {c.km?.toFixed(1) ?? "—"}</div><div className="alert-meta">{c.alturaCm ?? "—"} cm · {c.sentido ?? "sentido não informado"}</div></div><StatusPill value={c.classeFinal}/></Link>}) : <div className="empty">Nenhuma captura recebida ainda.</div>}</div></section>
    </div>
  </>;
}
function Kpi({label,value,note}:{label:string,value:string|number,note:string}){return <div className="card"><div className="kpi-label">{label}</div><div className="kpi-value">{value}</div><div className="kpi-note">{note}</div></div>}
