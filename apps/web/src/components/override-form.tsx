"use client";

import { useState } from "react";

import type { Classe } from "@/lib/domain";

export function OverrideForm({
  id,
  current,
}: {
  id: string;
  current: Classe | null;
}) {
  const [classe, setClasse] = useState<Classe>(current ?? "baixa");
  const [motivo, setMotivo] = useState("");
  const [loading, setLoading] = useState(false);

  async function save() {
    if (motivo.trim().length < 5) {
      alert("Informe o motivo da correção.");
      return;
    }
    setLoading(true);
    const response = await fetch(`/api/capturas/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ classeFinal: classe, motivo }),
    });
    setLoading(false);
    if (!response.ok) {
      const data = (await response.json()) as { error?: string };
      alert(data.error ?? "Falha");
      return;
    }
    location.reload();
  }

  return (
    <div className="override">
      <select
        className="select"
        value={classe}
        onChange={(event) => setClasse(event.target.value as Classe)}
      >
        <option value="baixa">Baixa</option>
        <option value="média">Média</option>
        <option value="alta">Alta</option>
      </select>
      <textarea
        className="input"
        rows={4}
        placeholder="Motivo da correção manual..."
        value={motivo}
        onChange={(event) => setMotivo(event.target.value)}
      />
      <button
        className="btn btn-primary"
        type="button"
        onClick={() => void save()}
        disabled={loading}
      >
        {loading ? "Salvando…" : "Aplicar correção"}
      </button>
    </div>
  );
}
