"use client";

import { useEffect } from "react";

import { drainPendingCapturas } from "@/components/auto-classify";

const DRAIN_MS = 8000;

/** Classifies leftover photos on any signed-in page. No extra click. */
export function AutoClassifyLive() {
  useEffect(() => {
    void drainPendingCapturas();
    const timer = window.setInterval(() => {
      void drainPendingCapturas();
    }, DRAIN_MS);
    return () => window.clearInterval(timer);
  }, []);

  return null;
}
