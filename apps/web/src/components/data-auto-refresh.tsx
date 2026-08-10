"use client";

import { useEffect } from "react";

/**
 * Notifica as telas operacionais para que busquem novamente a mesma fonte de dados.
 * Não usa router.refresh(): isso poderia re-renderizar Server Components com um snapshot
 * anterior e sobrescrever o estado já atualizado no cliente.
 */
export function DataAutoRefresh({ intervalMs = 5000 }: { intervalMs?: number }) {
  useEffect(() => {
    const timer = window.setInterval(() => {
      window.dispatchEvent(new Event("verdia:data-refresh"));
    }, intervalMs);
    return () => window.clearInterval(timer);
  }, [intervalMs]);
  return null;
}
