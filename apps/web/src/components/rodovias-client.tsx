"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Captura, Rodovia } from "@/lib/verdia-domain";
import { StatusPill } from "@/components/status-pill";
import Link from "next/link";

export function RodoviasClient({ rodovias, capturas: initialCapturas }: { rodovias: Rodovia[]; capturas: Captura[] }) {
  const [selected, setSelected] = useState(rodovias[0]?.id ?? "");
  const [capturas, setCapturas] = useState(initialCapturas);
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!selected) return;
    refresh().catch(() => setMessage("Não foi possível sincronizar os dados."));
  }, [selected]);

  const rows = useMemo(
    () => capturas.filter(c => c.rodoviaId === selected && (!search || `${c.km} ${c.sentido} ${c.classeFinal}`.toLowerCase().includes(search.toLowerCase()))),
    [capturas, selected, search],
  );
  const road = rodovias.find(r => r.id === selected);

  async function refresh() {
    const r = await fetch(`/api/capturas?rodoviaId=${encodeURIComponent(selected)}&t=${Date.now()}`, { cache: "no-store", headers: { "Cache-Control": "no-cache" } });
    if (!r.ok) throw new Error("Não foi possível atualizar a tabela.");
    const data = await r.json();
    setCapturas(prev => [...prev.filter(c => c.rodoviaId !== selected), ...(data.capturas ?? [])]);
  }

  useEffect(() => {
    const handler = () => { refresh().catch(() => undefined); };
    window.addEventListener("verdia:data-refresh", handler);
    return () => window.removeEventListener("verdia:data-refresh", handler);
  }, [selected]);

  async function importExcel(file: File) {
    setBusy(true); setMessage(null);
    try {
      const fd = new FormData(); fd.append("file", file); fd.append("rodoviaId", selected);
      const r = await fetch("/api/capturas/import", { method: "POST", body: fd, cache: "no-store" });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error ?? "Falha ao importar.");
      await refresh();
      const failed = data.errors?.length ?? 0;
      setMessage(`${data.imported} registros importados${failed ? ` · ${failed} linhas com erro` : ""}. A tabela foi atualizada.`);
      if (fileRef.current) fileRef.current.value = "";
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Falha ao importar.");
    } finally { setBusy(false); }
  }

  return <>
    <div className="card" style={{ marginBottom: 16 }}>
      <div className="toolbar">
        <select className="select" value={selected} onChange={e => setSelected(e.target.value)}>
          {rodovias.map(r => <option key={r.id} value={r.id}>{r.codigo} · {r.nome}</option>)}
        </select>
        <input className="input" placeholder="Buscar KM, sentido ou severidade" value={search} onChange={e => setSearch(e.target.value)} />
        <label className={`btn ${busy ? "disabled" : ""}`}>
          {busy ? "Importando…" : "Importar Excel"}
          <input ref={fileRef} type="file" accept=".xlsx,.xls" hidden disabled={busy} onChange={e => { const f = e.target.files?.[0]; if (f) importExcel(f); }} />
        </label>
        {selected && <a className="btn btn-primary" href={`/api/capturas/export?rodoviaId=${encodeURIComponent(selected)}`}>Exportar Excel</a>}
      </div>
      {message && <div className="muted" style={{ marginTop: 10 }}>{message}</div>}
    </div>

    <div className="card">
      <div className="page-head" style={{ marginBottom: 16 }}>
        <div>
          <h2 className="section-title">{road?.codigo} · {road?.nome}</h2>
          <span className="muted" style={{ fontSize: 11 }}>{rows.length} registros nesta rodovia · dados sincronizados com o backend</span>
        </div>
      </div>
      <div className="table-wrap"><table className="data-table"><thead><tr><th>Data/hora</th><th>KM</th><th>Sentido</th><th>Altura</th><th>IA</th><th>Final</th><th>Confiança</th><th></th></tr></thead>
        <tbody>{rows.map(c => <tr key={c.id}><td>{new Date(c.capturedAt).toLocaleString("pt-BR")}</td><td>{c.km?.toFixed(1) ?? "—"}</td><td>{c.sentido ?? "—"}</td><td>{c.alturaCm != null ? `${c.alturaCm} cm` : "—"}</td><td>{c.aiClasse ?? "—"}</td><td><StatusPill value={c.classeFinal} /></td><td>{c.aiConfidence != null ? `${Math.round(c.aiConfidence * 100)}%` : "—"}</td><td><Link className="btn" href={`/capturas/${c.id}`}>Abrir</Link></td></tr>)}
        {!rows.length && <tr><td colSpan={8}><div className="empty">Nenhum registro para esta rodovia.</div></td></tr>}</tbody>
      </table></div>
    </div>
  </>;
}
