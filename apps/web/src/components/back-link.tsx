"use client";

import { useRouter } from "next/navigation";

const FALLBACK = "/rodovias";

/** Browser back for captura detail; Rodovias when there is no history. */
export function BackLink() {
  const router = useRouter();

  return (
    <button
      type="button"
      className="btn"
      onClick={() => {
        if (window.history.length > 1) {
          router.back();
          return;
        }
        router.push(FALLBACK);
      }}
    >
      Voltar
    </button>
  );
}
