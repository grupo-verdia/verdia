"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * Reloads a Server Component page when classification finishes.
 * Use on screens that are not already client-live.
 */
export function RscAutoRefresh({ intervalMs = 5000 }: { intervalMs?: number }) {
  const router = useRouter();

  useEffect(() => {
    const refresh = () => {
      router.refresh();
    };
    const timer = window.setInterval(refresh, intervalMs);
    window.addEventListener("verdia:data-refresh", refresh);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("verdia:data-refresh", refresh);
    };
  }, [intervalMs, router]);

  return null;
}
