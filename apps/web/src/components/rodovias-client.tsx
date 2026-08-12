"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import { StatusPill } from "@/components/status-pill";
import type { Captura } from "@/lib/domain";
import { formatAlturaCm, formatConfianca } from "@/lib/planejamento";
import type { Rodovia } from "@/lib/rodovias";

async function fetchCapturasForRodovia(rodoviaId: string): Promise<Captura[]> {
  const response = await fetch(
    `/api/capturas?rodoviaId=${encodeURIComponent(rodoviaId)}&t=${Date.now()}`,
    {
      cache: "no-store",
      headers: { "Cache-Control": "no-cache" },
    },
  );
  if (!response.ok) {
    throw new Error("Não foi possível atualizar a tabela.");
  }
  const data = (await response.json()) as { capturas?: Captura[] };
  return data.capturas ?? [];
}

function RodoviasToolbar({
  rodovias,
  selected,
  search,
  busy,
  message,
  fileRef,
  onSelect,
  onSearch,
  onImport,
}: {
  rodovias: Rodovia[];
  selected: string;
  search: string;
  busy: boolean;
  message: string | null;
  fileRef: React.RefObject<HTMLInputElement | null>;
  onSelect: (id: string) => void;
  onSearch: (value: string) => void;
  onImport: (file: File) => void;
}) {
  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <div className="toolbar">
        <select
          className="select"
          value={selected}
          onChange={(event) => onSelect(event.target.value)}
        >
          {rodovias.map((rodovia) => (
            <option key={rodovia.id} value={rodovia.id}>
              {rodovia.codigo} · {rodovia.nome}
            </option>
          ))}
        </select>
        <input
          className="input"
          placeholder="Buscar KM, sentido ou severidade"
          value={search}
          onChange={(event) => onSearch(event.target.value)}
        />
        <label className={`btn ${busy ? "disabled" : ""}`}>
          {busy ? "Importando…" : "Importar Excel"}
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls"
            hidden
            disabled={busy || !selected}
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) {
                onImport(file);
              }
            }}
          />
        </label>
        {selected ? (
          <a
            className="btn btn-primary"
            href={`/api/capturas/export?rodoviaId=${encodeURIComponent(selected)}`}
          >
            Exportar Excel
          </a>
        ) : null}
      </div>
      {message ? (
        <div className="muted" style={{ marginTop: 10 }}>
          {message}
        </div>
      ) : null}
    </div>
  );
}

function RodoviasTable({
  road,
  rows,
}: {
  road: Rodovia | undefined;
  rows: Captura[];
}) {
  return (
    <div className="card">
      <div className="page-head" style={{ marginBottom: 16 }}>
        <div>
          <h2 className="section-title">
            {road?.codigo} · {road?.nome}
          </h2>
          <span className="muted" style={{ fontSize: 11 }}>
            {rows.length} registros nesta rodovia · dados sincronizados com o
            backend
          </span>
        </div>
      </div>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Data/hora</th>
              <th>KM</th>
              <th>Sentido</th>
              <th>Altura</th>
              <th>Severidade</th>
              <th>Confiança</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map((captura) => (
              <tr key={captura.id}>
                <td>{new Date(captura.capturedAt).toLocaleString("pt-BR")}</td>
                <td>{captura.km?.toFixed(1) ?? "—"}</td>
                <td>{captura.sentido ?? "—"}</td>
                <td>{formatAlturaCm(captura.alturaCm)}</td>
                <td>
                  <StatusPill value={captura.classe} />
                </td>
                <td>{formatConfianca(captura.confidence)}</td>
                <td>
                  <Link className="btn" href={`/capturas/${captura.id}`}>
                    Abrir
                  </Link>
                </td>
              </tr>
            ))}
            {!rows.length ? (
              <tr>
                <td colSpan={7}>
                  <div className="empty">Nenhum registro para esta rodovia.</div>
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function RodoviasClient({
  rodovias,
  capturas: initialCapturas,
}: {
  rodovias: Rodovia[];
  capturas: Captura[];
}) {
  const [selected, setSelected] = useState(rodovias[0]?.id ?? "");
  const [capturas, setCapturas] = useState(initialCapturas);
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!selected) {
      return;
    }
    const handler = () => {
      fetchCapturasForRodovia(selected)
        .then((next) => {
          setCapturas((prev) => [
            ...prev.filter((c) => c.rodoviaId !== selected),
            ...next,
          ]);
        })
        .catch(() => undefined);
    };
    window.addEventListener("verdia:data-refresh", handler);
    return () => window.removeEventListener("verdia:data-refresh", handler);
  }, [selected]);

  const rows = useMemo(
    () =>
      capturas.filter(
        (c) =>
          c.rodoviaId === selected &&
          (!search ||
            `${c.km} ${c.sentido} ${c.classe}`
              .toLowerCase()
              .includes(search.toLowerCase())),
      ),
    [capturas, selected, search],
  );
  const road = rodovias.find((r) => r.id === selected);

  async function importExcel(file: File) {
    setBusy(true);
    setMessage(null);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("rodoviaId", selected);
      const response = await fetch("/api/capturas/import", {
        method: "POST",
        body: form,
        cache: "no-store",
      });
      const data = (await response.json()) as {
        imported?: number;
        errors?: unknown[];
        error?: string;
      };
      if (!response.ok) {
        throw new Error(data.error ?? "Falha ao importar.");
      }
      const next = await fetchCapturasForRodovia(selected);
      setCapturas((prev) => [
        ...prev.filter((c) => c.rodoviaId !== selected),
        ...next,
      ]);
      const failed = data.errors?.length ?? 0;
      setMessage(
        `${data.imported ?? 0} registros importados${
          failed ? ` · ${failed} linhas com erro` : ""
        }. A tabela foi atualizada.`,
      );
      if (fileRef.current) {
        fileRef.current.value = "";
      }
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Falha ao importar.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <RodoviasToolbar
        rodovias={rodovias}
        selected={selected}
        search={search}
        busy={busy}
        message={message}
        fileRef={fileRef}
        onSelect={setSelected}
        onSearch={setSearch}
        onImport={(file) => {
          void importExcel(file);
        }}
      />
      <RodoviasTable road={road} rows={rows} />
    </>
  );
}
