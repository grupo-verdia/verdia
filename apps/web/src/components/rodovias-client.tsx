"use client";

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
  const fileRef = useRef<HTMLInputElement>(null);

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

  return (
    <>
      <RodoviasToolbar
        rodovias={rodovias}
        selected={selected}
        search={search}
        priority={priority}
        busy={busy}
        message={message}
        fileRef={fileRef}
        cardsEmpty={cards.length === 0}
        onSelect={(id) => {
          setSelected(id);
          refresh(id).catch(() =>
            setMessage("Não foi possível sincronizar os dados."),
          );
        }}
        onSearch={setSearch}
        onPriority={setPriority}
        onImport={(file) =>
          void runImport({
            file,
            selected,
            capturas,
            fileRef,
            setBusy,
            setMessage,
            setCapturas,
            refresh: async () => {
              await refresh("todas");
            },
          })
        }
        onClear={() =>
          void runClear({
            selected,
            roadCodigo: road?.codigo,
            setBusy,
            setMessage,
            refresh: () => refresh(selected),
          })
        }
      />
      <div style={{ marginBottom: 12 }}>
        <h2 className="section-title">
          {selected === "todas"
            ? "Todas as rodovias"
            : `${road?.codigo} · ${road?.nome}`}
        </h2>
        <span className="muted" style={{ fontSize: 11 }}>
          {cards.length} registros · Ordem, Rodovia, KM, Altura, Severidade,
          Confiança
        </span>
      </div>
      <RodoviasCards
        cards={cards}
        emptyHint={
          selected === "todas"
            ? "Nenhum registro. Clique em “Baixar planilha de teste” e depois em Importar Excel."
            : "Nenhum registro para esta rodovia. Importe a planilha nela ou volte para “Todas as rodovias”."
        }
      />
    </>
  );
}

function translateImportError(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes("rodoviaid") && lower.includes("not found")) {
    return "Rodovia não encontrada. Deixe “Todas as rodovias” ou escolha uma da lista.";
  }
  if (lower.includes("not a valid excel") || lower.includes("invalid workbook")) {
    return "Este arquivo não é um Excel válido. Baixe a planilha pelo botão nesta tela.";
  }
  if (lower.includes("only excel")) {
    return "Apenas arquivos Excel (.xlsx, .xls) são aceitos.";
  }
  if (lower.includes("lat") && lower.includes("lon")) {
    return "Falta Latitude e Longitude. Baixe a planilha de teste nesta tela e importe ela.";
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
  return `${imported} registros importados${
    failed ? ` · ${failed} linhas com erro` : ""
  }.`;
}

async function runImport(args: {
  file: File;
  selected: string;
  capturas: Captura[];
  fileRef: React.RefObject<HTMLInputElement | null>;
  setBusy: (v: boolean) => void;
  setMessage: (v: string | null) => void;
  setCapturas: React.Dispatch<React.SetStateAction<Captura[]>>;
  refresh: () => Promise<void>;
}) {
  const {
    file,
    selected,
    capturas,
    fileRef,
    setBusy,
    setMessage,
    setCapturas,
    refresh,
  } = args;

  if (!isExcelFilename(file.name)) {
    setMessage("Apenas arquivos Excel (.xlsx, .xls) são aceitos.");
    if (fileRef.current) {
      fileRef.current.value = "";
    }
    return;
  }

  const existentes =
    selected === "todas"
      ? capturas.length
      : capturas.filter((c) => c.rodoviaId === selected).length;
  if (existentes > 0) {
    const ok = window.confirm(
      `Já existem ${existentes} registro(s) na tela.\n\n` +
        `Importar agora soma essas linhas às que já estão aqui.\n\n` +
        `Quer continuar?\n` +
        `Para testar só esta planilha: Cancelar, clique em Limpar, depois importe de novo.`,
    );
    if (!ok) {
      setMessage(
        "Importação cancelada. Clique em Limpar e importe de novo para ver só esta planilha.",
      );
      if (fileRef.current) {
        fileRef.current.value = "";
      }
      return;
    }
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
    setMessage(importResultMessage(data));
    if (fileRef.current) {
      fileRef.current.value = "";
    }
  } catch (error) {
    setMessage(error instanceof Error ? error.message : "Falha ao importar.");
  } finally {
    setBusy(false);
  }
}

async function runClear(args: {
  selected: string;
  roadCodigo: string | undefined;
  setBusy: (v: boolean) => void;
  setMessage: (v: string | null) => void;
  refresh: () => Promise<void>;
}) {
  const { selected, roadCodigo, setBusy, setMessage, refresh } = args;
  const escopo =
    selected === "todas"
      ? "TODAS as rodovias"
      : `a rodovia ${roadCodigo ?? selected}`;
  const ok = window.confirm(
    `Limpar os dados de ${escopo}?\n\nIsso remove as capturas importadas e não pode ser desfeito.`,
  );
  if (!ok) {
    return;
  }
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
    setMessage(data.message ?? "Dados limpos.");
  } catch (error) {
    setMessage(error instanceof Error ? error.message : "Falha ao limpar.");
  } finally {
    setBusy(false);
  }
}
