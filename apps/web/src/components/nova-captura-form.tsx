"use client";

import Link from "next/link";
import { useRef, useState } from "react";

import { StatusPill } from "@/components/status-pill";
import type { Captura, Classe } from "@/lib/domain";
import { readGeotagFromImage } from "@/lib/ingest/exif-gps";
import type { Rodovia } from "@/lib/rodovias";

type FileOutcome =
  | {
      key: string;
      name: string;
      status: "ok";
      captura: Captura;
    }
  | {
      key: string;
      name: string;
      status: "rejected" | "error";
      message: string;
    };

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== "string") {
        reject(new Error("Falha ao ler a imagem."));
        return;
      }
      const comma = result.indexOf(",");
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.onerror = () => reject(new Error("Falha ao ler a imagem."));
    reader.readAsDataURL(file);
  });
}

async function ingestOne(
  file: File,
  meta: { rodoviaId: string; km: string; sentido: string },
): Promise<FileOutcome> {
  const key = `${file.name}-${file.size}-${file.lastModified}`;
  const geotag = await readGeotagFromImage(file);
  if (!geotag) {
    return {
      key,
      name: file.name,
      status: "rejected",
      message: "Sem GPS válido no EXIF — arquivo ignorado.",
    };
  }

  const imageBase64 = await fileToBase64(file);
  const body: Record<string, unknown> = {
    lat: geotag.lat,
    lon: geotag.lon,
    capturedAt: geotag.capturedAt,
    imageBase64,
    contentType: file.type || "image/jpeg",
    filename: file.name,
  };
  if (meta.rodoviaId) {
    body.rodoviaId = meta.rodoviaId;
  }
  if (meta.km.trim() !== "") {
    const km = Number(meta.km);
    if (!Number.isFinite(km)) {
      return {
        key,
        name: file.name,
        status: "error",
        message: "KM inválido.",
      };
    }
    body.km = km;
  }
  if (meta.sentido.trim() !== "") {
    body.sentido = meta.sentido.trim();
  }

  const response = await fetch("/api/capturas/ingest", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await response.json()) as {
    error?: string;
    captura?: Captura;
  };
  if (!response.ok || !data.captura) {
    return {
      key,
      name: file.name,
      status: "error",
      message: data.error ?? "Falha ao registrar a captura.",
    };
  }
  return { key, name: file.name, status: "ok", captura: data.captura };
}

export function NovaCapturaForm({ rodovias }: { rodovias: Rodovia[] }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [rodoviaId, setRodoviaId] = useState("");
  const [km, setKm] = useState("");
  const [sentido, setSentido] = useState("");
  const [busy, setBusy] = useState(false);
  const [outcomes, setOutcomes] = useState<FileOutcome[]>([]);

  async function onSubmit(files: FileList | null) {
    if (!files?.length || busy) {
      return;
    }
    setBusy(true);
    setOutcomes([]);
    const list = Array.from(files);
    const next: FileOutcome[] = [];
    for (const file of list) {
      try {
        next.push(await ingestOne(file, { rodoviaId, km, sentido }));
      } catch (error) {
        next.push({
          key: `${file.name}-${file.size}-${file.lastModified}`,
          name: file.name,
          status: "error",
          message:
            error instanceof Error ? error.message : "Erro inesperado.",
        });
      }
      setOutcomes([...next]);
    }
    setBusy(false);
    if (fileRef.current) {
      fileRef.current.value = "";
    }
    if (next.some((o) => o.status === "ok")) {
      window.dispatchEvent(new Event("verdia:data-refresh"));
    }
  }

  const okCount = outcomes.filter((o) => o.status === "ok").length;
  const failCount = outcomes.length - okCount;

  return (
    <>
      <section className="card" style={{ marginBottom: 16 }}>
        <h2 className="section-title">Enviar fotos georreferenciadas</h2>
        <p className="muted" style={{ fontSize: 12, lineHeight: 1.6, marginTop: 0 }}>
          Selecione uma ou mais imagens com GPS no EXIF. A IA classifica a altura
          da grama (baixa / média / alta); cada arquivo válido vira uma captura e
          atualiza os índices do painel.
        </p>
        <div className="toolbar" style={{ marginTop: 14, flexWrap: "wrap", gap: 10 }}>
          <select
            className="select"
            value={rodoviaId}
            onChange={(e) => setRodoviaId(e.target.value)}
            aria-label="Rodovia"
          >
            <option value="">Rodovia (opcional)</option>
            {rodovias.map((r) => (
              <option key={r.id} value={r.id}>
                {r.codigo} · {r.nome}
              </option>
            ))}
          </select>
          <input
            className="input"
            placeholder="KM (opcional)"
            value={km}
            onChange={(e) => setKm(e.target.value)}
            inputMode="decimal"
            aria-label="Quilômetro"
          />
          <input
            className="input"
            placeholder="Sentido (opcional)"
            value={sentido}
            onChange={(e) => setSentido(e.target.value)}
            aria-label="Sentido"
          />
          <label className={`btn btn-primary ${busy ? "disabled" : ""}`}>
            {busy ? "Processando…" : "Selecionar imagens"}
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/*"
              multiple
              hidden
              disabled={busy}
              onChange={(e) => void onSubmit(e.target.files)}
            />
          </label>
        </div>
        <p className="footer-note" style={{ marginTop: 12, marginBottom: 0 }}>
          Sem GPS válido o arquivo é rejeitado. Classificação usa stub local até
          a Inference API conectar.
        </p>
      </section>

      {outcomes.length > 0 ? (
        <section className="card">
          <h2 className="section-title">Resultado do envio</h2>
          <p className="muted" style={{ fontSize: 12, marginTop: 0 }}>
            {okCount} registrada{okCount === 1 ? "" : "s"}
            {failCount > 0 ? ` · ${failCount} falha${failCount === 1 ? "" : "s"}` : ""}
          </p>
          <div className="alert-list">
            {outcomes.map((o) =>
              o.status === "ok" ? (
                <Link className="alert" href={`/capturas/${o.captura.id}`} key={o.key}>
                  <span className="alert-dot" style={{ background: "var(--ok)" }} />
                  <div className="alert-main">
                    <div className="alert-title">{o.name}</div>
                    <div className="alert-meta">
                      {o.captura.alturaCm ?? "—"} cm · GPS{" "}
                      {o.captura.lat.toFixed(5)}, {o.captura.lon.toFixed(5)}
                    </div>
                  </div>
                  <StatusPill value={o.captura.classe as Classe | null} />
                </Link>
              ) : (
                <div className="alert" key={o.key}>
                  <span
                    className="alert-dot"
                    style={{ background: "var(--danger)" }}
                  />
                  <div className="alert-main">
                    <div className="alert-title">{o.name}</div>
                    <div className="alert-meta">{o.message}</div>
                  </div>
                </div>
              ),
            )}
          </div>
          {okCount > 0 ? (
            <div className="toolbar" style={{ marginTop: 14 }}>
              <Link className="btn btn-primary" href="/">
                Ver no painel
              </Link>
              <Link className="btn" href="/rodovias">
                Ver em rodovias
              </Link>
              <Link className="btn" href="/mapa">
                Abrir mapa
              </Link>
            </div>
          ) : null}
        </section>
      ) : null}
    </>
  );
}
