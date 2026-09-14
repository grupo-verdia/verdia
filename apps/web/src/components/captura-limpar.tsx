"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { ConfirmStrip } from "@/components/confirm-strip";

/** Confirm then delete one captura (photo, captura, trecho). Same as bulk Limpar. */
export function CapturaLimparButton({
  id,
  afterDeleteHref,
  onDeleted,
}: {
  id: string;
  afterDeleteHref?: string;
  onDeleted?: () => void;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirm() {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/capturas/${encodeURIComponent(id)}`, {
        method: "DELETE",
        cache: "no-store",
      });
      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
      };
      if (!response.ok) {
        throw new Error(data.error ?? "Falha ao limpar.");
      }
      window.dispatchEvent(new Event("verdia:data-refresh"));
      onDeleted?.();
      if (afterDeleteHref) {
        router.push(afterDeleteHref);
      } else {
        router.refresh();
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Falha ao limpar.");
    } finally {
      setBusy(false);
    }
  }

  if (pending) {
    return (
      <div className="captura-limpar">
        {error ? (
          <div className="notice notice-danger" style={{ marginBottom: 8 }}>
            {error === "captura not found" ? "Captura não encontrada." : error}
          </div>
        ) : null}
        <ConfirmStrip
          title="Limpar esta captura?"
          body="Remove a foto, a captura e o trecho. Isso não pode ser desfeito."
          confirmLabel="Limpar"
          cancelLabel="Cancelar"
          danger
          busy={busy}
          onConfirm={() => void confirm()}
          onCancel={() => {
            setPending(false);
            setError(null);
          }}
        />
      </div>
    );
  }

  return (
    <div className="captura-limpar">
      <button
        type="button"
        className="btn btn-danger"
        onClick={() => setPending(true)}
      >
        Limpar
      </button>
    </div>
  );
}
