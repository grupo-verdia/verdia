"use client";

import { useState } from "react";

import {
  classifyOne,
  runPool,
} from "@/components/nova-captura-ingest";
import { useOperationalData } from "@/components/operational-live";
import { isClassificationPending, type Captura } from "@/lib/domain";
import type { Rodovia } from "@/lib/rodovias";

/** Photos already saved, classification not done. Continuar on Nova captura. */
export function NovaCapturaPending({
  initialCapturas,
  initialRodovias,
  hideIds = [],
}: {
  initialCapturas: Captura[];
  initialRodovias: Rodovia[];
  hideIds?: string[];
}) {
  const { capturas, refresh } = useOperationalData(
    initialCapturas,
    initialRodovias,
  );
  const hidden = new Set(hideIds);
  const pending = capturas.filter(
    (captura) => isClassificationPending(captura) && !hidden.has(captura.id),
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onContinue() {
    if (busy || pending.length === 0) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const failed: string[] = [];
      await runPool(pending, 2, async (captura) => {
        try {
          await classifyOne(captura.id);
        } catch (caught) {
          failed.push(
            caught instanceof Error ? caught.message : "Falha ao classificar.",
          );
        }
      });
      await refresh();
      window.dispatchEvent(new Event("verdia:data-refresh"));
      if (failed.length > 0) {
        setError(
          failed.length === pending.length
            ? (failed[0] ?? "Falha ao classificar.")
            : "Algumas fotos não classificaram. Tente de novo.",
        );
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Falha ao classificar.");
    } finally {
      setBusy(false);
    }
  }

  if (pending.length === 0) {
    return null;
  }

  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <div className="toolbar" style={{ justifyContent: "space-between" }}>
        <div>
          <div style={{ fontWeight: 650, fontSize: 14 }}>
            {pending.length} na fila
          </div>
          <p className="muted" style={{ fontSize: 12, margin: "4px 0 0" }}>
            Fotos já salvas. Classificação incompleta.
          </p>
        </div>
        <button
          type="button"
          className="btn btn-primary"
          disabled={busy}
          onClick={() => {
            void onContinue();
          }}
        >
          {busy ? "Classificando…" : "Continuar"}
        </button>
      </div>
      {error ? (
        <p className="field-error" style={{ margin: "10px 0 0" }}>
          {error}
        </p>
      ) : null}
    </div>
  );
}
