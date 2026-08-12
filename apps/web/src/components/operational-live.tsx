"use client";

import { useCallback, useEffect, useState } from "react";

import type { Captura } from "@/lib/domain";
import type { Rodovia } from "@/lib/rodovias";

export function useOperationalData(
  initialCapturas: Captura[] = [],
  initialRodovias: Rodovia[] = [],
) {
  const [capturas, setCapturas] = useState<Captura[]>(initialCapturas);
  const [rodovias, setRodovias] = useState<Rodovia[]>(initialRodovias);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const stamp = Date.now();
      const [cRes, rRes] = await Promise.all([
        fetch(`/api/capturas?t=${stamp}`, {
          cache: "no-store",
          headers: { "Cache-Control": "no-cache" },
        }),
        fetch(`/api/rodovias?t=${stamp}`, {
          cache: "no-store",
          headers: { "Cache-Control": "no-cache" },
        }),
      ]);
      if (!cRes.ok || !rRes.ok) {
        throw new Error("Falha ao sincronizar dados operacionais.");
      }
      const [cData, rData] = await Promise.all([cRes.json(), rRes.json()]);
      setCapturas(cData.capturas ?? []);
      setRodovias(rData.rodovias ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const handler = () => {
      refresh().catch(() => undefined);
    };
    window.addEventListener("verdia:data-refresh", handler);
    return () => window.removeEventListener("verdia:data-refresh", handler);
  }, [refresh]);

  return { capturas, rodovias, loading, refresh };
}
