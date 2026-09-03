"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  RodoviasCards,
  type RodoviaCard,
} from "@/components/rodovias-cards";
import { RodoviasToolbar } from "@/components/rodovias-toolbar";
import type { Captura, Severidade } from "@/lib/domain";
import { isExcelFilename } from "@/lib/excel/excel-filename";
import type { Rodovia } from "@/lib/rodovias";

function buildCards(
  capturas: Captura[],
  rodovias: Rodovia[],
  selected: string,
  search: string,
  priority: "todas" | Severidade,
): RodoviaCard[] {
  const filtered = capturas
    .filter((c) => selected === "todas" || c.rodoviaId === selected)
    .filter((c) => {
      if (priority !== "todas" && c.classe !== priority) {
        return false;
      }
      if (!search) {
        return true;
      }
      const roadCode =
        rodovias.find((r) => r.id === c.rodoviaId)?.codigo ?? c.rodoviaId;
      const hay = `${roadCode} ${c.km} ${c.classe} ${c.alturaCm}`.toLowerCase();
      return hay.includes(search.toLowerCase());
    })
    .sort((a, b) => {
      const rank = { alta: 0, média: 1, baixa: 2 } as const;
      const ra = a.classe ? rank[a.classe] : 99;
      const rb = b.classe ? rank[b.classe] : 99;
      if (ra !== rb) {
        return ra - rb;
      }
      return (
        (a.km ?? Number.POSITIVE_INFINITY) - (b.km ?? Number.POSITIVE_INFINITY)
      );
    });

  return filtered.map((c, index) => {
    const codigo = rodovias.find((r) => r.id === c.rodoviaId)?.codigo;
    const rodoviaLabel =
      !c.rodoviaId || c.rodoviaId === "todas"
        ? "—"
        : (codigo ?? c.rodoviaId);
    return {
      id: c.id,
      ordem: index + 1,
      rodovia: rodoviaLabel,
      km: c.km != null ? c.km.toFixed(1) : "—",
      altura: c.alturaCm != null ? `${c.alturaCm} cm` : "—",
      severidade: (c.classe ?? "baixa") as Severidade,
      confianca:
        c.confidence != null ? `${Math.round(c.confidence * 100)}%` : "—",
    };
  });
}

async function fetchCapturas(scope: string): Promise<Captura[]> {
  const url =
    scope === "todas"
      ? `/api/capturas?t=${Date.now()}`
      : `/api/capturas?rodoviaId=${encodeURIComponent(scope)}&t=${Date.now()}`;
  const response = await fetch(url, {
    cache: "no-store",
    headers: { "Cache-Control": "no-cache" },
  });
  if (!response.ok) {
    throw new Error("Não foi possível atualizar os cards.");
  }
  const data = (await response.json()) as { capturas?: Captura[] };
  return data.capturas ?? [];
}

function existingInScope(capturas: Captura[], selected: string): number {
  return selected === "todas"
    ? capturas.length
    : capturas.filter((c) => c.rodoviaId === selected).length;
}

export function RodoviasClient({
  rodovias,
  capturas: initialCapturas,
}: {
  rodovias: Rodovia[];
  capturas: Captura[];
}) {
  const [selected, setSelected] = useState("todas");
  const [capturas, setCapturas] = useState(initialCapturas);
  const [search, setSearch] = useState("");
  const [priority, setPriority] = useState<"todas" | Severidade>("todas");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [messageOk, setMessageOk] = useState(false);
  const [pendingConfirm, setPendingConfirm] = useState<"import" | "clear" | null>(
    null,
  );
  const fileRef = useRef<HTMLInputElement>(null);
  const pendingFileRef = useRef<File | null>(null);

  const refresh = useCallback(async (scope: string) => {
    const next = await fetchCapturas(scope);
    if (scope === "todas") {
      setCapturas(next);
    } else {
      setCapturas((prev) => [
        ...prev.filter((c) => c.rodoviaId !== scope),
        ...next,
      ]);
    }
  }, []);

  const importArgs = {
    fileRef,
    setBusy,
    setMessage,
    setMessageOk,
    setCapturas,
    refresh: () => refresh("todas"),
  };

  useEffect(() => {
    const handler = () => {
      refresh(selected).catch(() => undefined);
    };
    window.addEventListener("verdia:data-refresh", handler);
    return () => window.removeEventListener("verdia:data-refresh", handler);
  }, [refresh, selected]);

  const road = rodovias.find((r) => r.id === selected);
  const cards = useMemo(
    () => buildCards(capturas, rodovias, selected, search, priority),
    [capturas, selected, search, priority, rodovias],
  );
  const existingCount = existingInScope(capturas, selected);

  function dismissPending() {
    pendingFileRef.current = null;
    setPendingConfirm(null);
    if (fileRef.current) {
      fileRef.current.value = "";
    }
  }

  function queueImport(file: File) {
    if (!isExcelFilename(file.name)) {
      setMessageOk(false);
      setMessage("Apenas arquivos Excel (.xlsx, .xls) são aceitos.");
      if (fileRef.current) {
        fileRef.current.value = "";
      }
      return;
    }
    if (existingInScope(capturas, selected) > 0) {
      pendingFileRef.current = file;
      setPendingConfirm("import");
      setMessage(null);
      return;
    }
    void runImport({ file, ...importArgs });
  }

  function confirmPending() {
    if (pendingConfirm === "import") {
      const file = pendingFileRef.current;
      dismissPending();
      if (file) {
        void runImport({ file, ...importArgs });
      }
      return;
    }
    if (pendingConfirm === "clear") {
      setPendingConfirm(null);
      void runClear({
        selected,
        setBusy,
        setMessage,
        setMessageOk,
        refresh: () => refresh(selected),
      });
    }
  }

  return (
    <>
      <RodoviasToolbar
        rodovias={rodovias}
        selected={selected}
        search={search}
        priority={priority}
        busy={busy}
        message={message}
        messageOk={messageOk}
        fileRef={fileRef}
        cardsEmpty={cards.length === 0}
        pendingConfirm={pendingConfirm}
        existingCount={existingCount}
        clearScope={selected === "todas" ? "todas" : (road?.codigo ?? selected)}
        onSelect={(id) => {
          dismissPending();
          setSelected(id);
          refresh(id).catch(() => {
            setMessageOk(false);
            setMessage("Não foi possível sincronizar os dados.");
          });
        }}
        onSearch={setSearch}
        onPriority={setPriority}
        onImport={queueImport}
        onClear={() => {
          dismissPending();
          setPendingConfirm("clear");
          setMessage(null);
        }}
        onConfirmPending={confirmPending}
        onCancelPending={dismissPending}
      />
      <ListHeading
        title={
          selected === "todas"
            ? "Todas as rodovias"
            : `${road?.codigo} · ${road?.nome}`
        }
        count={cards.length}
      />
      <RodoviasCards
        cards={cards}
        emptyHint={
          <>
            Nenhuma captura nesta vista. Use Importar ou{" "}
            <Link href="/nova-captura">Nova captura</Link>.
          </>
        }
      />
    </>
  );
}

function ListHeading({ title, count }: { title: string; count: number }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <h2 className="section-title">{title}</h2>
      <span className="muted" style={{ fontSize: 11 }}>
        {count} {count === 1 ? "captura" : "capturas"}
      </span>
    </div>
  );
}

function translateImportError(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes("rodoviaid") && lower.includes("not found")) {
    return "Rodovia não encontrada. Escolha uma da lista ou use Todas as rodovias.";
  }
  if (lower.includes("not a valid excel") || lower.includes("invalid workbook")) {
    return "Este arquivo não é um Excel válido.";
  }
  if (lower.includes("only excel")) {
    return "Apenas arquivos Excel (.xlsx, .xls) são aceitos.";
  }
  if (lower.includes("lat") && lower.includes("lon")) {
    return "Falta latitude e longitude nas linhas.";
  }
  return message;
}

function importResultMessage(data: {
  error?: string;
  imported?: number;
  errors?: Array<{ message?: string }>;
}): string {
  const imported = data.imported ?? 0;
  const failed = data.errors?.length ?? 0;
  const first = data.errors?.[0]?.message;
  if (imported === 0) {
    return first
      ? `Nenhuma linha importada. ${translateImportError(first)}`
      : translateImportError(data.error ?? "Nenhuma linha importada.");
  }
  return `${imported} capturas importadas${
    failed ? ` · ${failed} linhas com erro` : ""
  }.`;
}

async function runImport(args: {
  file: File;
  fileRef: React.RefObject<HTMLInputElement | null>;
  setBusy: (v: boolean) => void;
  setMessage: (v: string | null) => void;
  setMessageOk: (v: boolean) => void;
  setCapturas: React.Dispatch<React.SetStateAction<Captura[]>>;
  refresh: () => Promise<void>;
}) {
  const { file, fileRef, setBusy, setMessage, setMessageOk, setCapturas, refresh } =
    args;

  if (!isExcelFilename(file.name)) {
    setMessageOk(false);
    setMessage("Apenas arquivos Excel (.xlsx, .xls) são aceitos.");
    if (fileRef.current) {
      fileRef.current.value = "";
    }
    return;
  }

  setBusy(true);
  setMessage(null);
  try {
    const fd = new FormData();
    fd.append("file", file);
    // Spreadsheet Rodovia column assigns each row; do not send the view filter.
    fd.append("rodoviaId", "todas");
    const response = await fetch("/api/capturas/import", {
      method: "POST",
      body: fd,
      cache: "no-store",
    });
    const data = (await response.json()) as {
      error?: string;
      imported?: number;
      errors?: Array<{ message?: string }>;
      capturas?: Captura[];
    };
    if (!response.ok) {
      throw new Error(importResultMessage(data));
    }
    await refresh();
    const importedRows = data.capturas ?? [];
    if (importedRows.length > 0) {
      setCapturas((prev) => {
        const ids = new Set(prev.map((row) => row.id));
        const extra = importedRows.filter((row) => !ids.has(row.id));
        return extra.length > 0 ? [...prev, ...extra] : prev;
      });
    }
    const text = importResultMessage(data);
    setMessageOk((data.imported ?? 0) > 0);
    setMessage(text);
    if (fileRef.current) {
      fileRef.current.value = "";
    }
  } catch (error) {
    setMessageOk(false);
    setMessage(error instanceof Error ? error.message : "Falha ao importar.");
  } finally {
    setBusy(false);
  }
}

async function runClear(args: {
  selected: string;
  setBusy: (v: boolean) => void;
  setMessage: (v: string | null) => void;
  setMessageOk: (v: boolean) => void;
  refresh: () => Promise<void>;
}) {
  const { selected, setBusy, setMessage, setMessageOk, refresh } = args;
  setBusy(true);
  setMessage(null);
  try {
    const response = await fetch(
      `/api/capturas?rodoviaId=${encodeURIComponent(selected)}`,
      { method: "DELETE", cache: "no-store" },
    );
    const text = await response.text();
    let data: { error?: string; message?: string } = {};
    if (text) {
      try {
        data = JSON.parse(text) as { error?: string; message?: string };
      } catch {
        throw new Error(`Resposta inválida ao limpar (${response.status}).`);
      }
    }
    if (!response.ok) {
      throw new Error(data.error ?? `Falha ao limpar (${response.status}).`);
    }
    await refresh();
    setMessageOk(true);
    setMessage(data.message ?? "Dados limpos.");
  } catch (error) {
    setMessageOk(false);
    setMessage(error instanceof Error ? error.message : "Falha ao limpar.");
  } finally {
    setBusy(false);
  }
}
