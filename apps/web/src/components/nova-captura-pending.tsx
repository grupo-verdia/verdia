"use client";

import { useState } from "react";

import {
  classifyOne,
  runPool,
} from "@/components/nova-captura-ingest";
import { useOperationalData } from "@/components/operational-live";
import { isClassificationPending, type Captura } from "@/lib/domain";
import type { Rodovia } from "@/lib/rodovias";

/** Resume AI work left pending after a closed tab. */
export function NovaCapturaPending({
  initialCapturas,
  initialRodovias,
}: {
  initialCapturas: Captura[];
  initialRodovias: Rodovia[];
}) {
  const { capturas, refresh } = useOperationalData(
    initialCapturas,
    initialRodovias,
  );
  const pending = capturas.filter(isClassificationPending);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onContinue() {
    if (busy || pending.length === 0) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await runPool(pending, 2, async (captura) => {
        await classifyOne(captura.id);
      });
      await refresh();
      window.dispatchEvent(new Event("verdia:data-refresh"));
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
            {pending.length} na fila da classificação
          </div>
          <p className="muted" style={{ fontSize: 12, margin: "4px 0 0" }}>
            Fotos já salvas. Pode continuar daqui.
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
