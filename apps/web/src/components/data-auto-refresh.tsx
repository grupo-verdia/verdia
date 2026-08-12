"use client";

import { useEffect } from "react";

/**
 * Nudges operational client views to re-fetch from the same APIs.
 * Avoids router.refresh(), which can overwrite fresher client state
 * with a stale Server Component snapshot.
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
