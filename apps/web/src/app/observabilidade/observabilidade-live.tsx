"use client";
import { useOperationalData } from "@/components/operational-live";
import type { Captura, Rodovia } from "@/lib/verdia-domain";

export function ObservabilidadeLive({ initialCapturas, initialRodovias }: { initialCapturas: Captura[]; initialRodovias: Rodovia[] }) {
  const { capturas, rodovias } = useOperationalData(initialCapturas, initialRodovias);
  const altas = capturas.filter(c=>c.classeFinal==='alta').length;
  const medias = capturas.filter(c=>c.classeFinal==='média').length;
  const baixas = capturas.filter(c=>c.classeFinal==='baixa').length;
  const manual = capturas.filter(c=>c.decisaoOrigem==='manual').length;
  const errors = capturas.filter(c=>c.inferenceError).length;
  const confidences = capturas.map(c=>c.aiConfidence).filter((v): v is number=>typeof v==='number');
  const avg = confidences.length ? confidences.reduce((a,b)=>a+b,0)/confidences.length : null;
  const high = confidences.length ? confidences.filter(v=>v>=.8).length/confidences.length : 0;
  const coverage = rodovias.length ? new Set(capturas.map(c=>c.rodoviaId)).size/rodovias.length : 0;
  return <><div className="grid metric-grid"><Metric title="Capturas" value={capturas.length.toString()} sub="processadas"/><Metric title="Confiança média" value={avg!=null?`${Math.round(avg*100)}%`:"—"} sub="score da IA"/><Metric title="Correções humanas" value={manual.toString()} sub="overwrites registrados"/><Metric title="Falhas" value={errors.toString()} sub="inferência/ingestão"/></div><div className="grid dashboard-grid" style={{marginTop:16}}><section className="card"><h2 className="section-title">Distribuição das previsões</h2><Bar label="Alta" value={altas} total={capturas.length}/><Bar label="Média" value={medias} total={capturas.length}/><Bar label="Baixa" value={baixas} total={capturas.length}/></section><section className="card"><h2 className="section-title">Qualidade operacional</h2><Info label="Rodovias com dados" value={`${Math.round(coverage*100)}%`}/><Info label="Predições ≥ 80%" value={`${Math.round(high*100)}%`}/><Info label="Taxa de override" value={`${capturas.length?Math.round(manual/capturas.length*100):0}%`}/><Info label="Rodovias cadastradas" value={rodovias.length.toString()}/></section></div></>;
}
function Metric({title,value,sub}:{title:string,value:string,sub:string}){return <div className="card"><div className="kpi-label">{title}</div><div className="metric-big">{value}</div><div className="kpi-note">{sub}</div></div>}
function Bar({label,value,total}:{label:string,value:number,total:number}){const p=total?Math.round(value/total*100):0;return <div style={{marginBottom:16}}><div style={{display:'flex',justifyContent:'space-between',fontSize:12}}><span>{label}</span><span className="muted">{value} · {p}%</span></div><div className="bar"><span style={{width:`${p}%`}}/></div></div>}
function Info({label,value}:{label:string,value:string}){return <div style={{display:'flex',justifyContent:'space-between',borderBottom:'1px solid #173029',padding:'12px 0',fontSize:12}}><span className="muted">{label}</span><b>{value}</b></div>}
