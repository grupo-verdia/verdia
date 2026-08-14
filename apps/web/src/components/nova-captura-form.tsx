"use client";

import { useEffect, useRef, useState } from "react";

import {
  NovaCapturaResults,
  type CapturaReport,
  type FileOutcome,
} from "@/components/nova-captura-results";
import type { Captura } from "@/lib/domain";
import { readGeotagFromImage } from "@/lib/ingest/exif-gps";
import { resolveGeotag } from "@/lib/ingest/resolve-geotag";
import type { Rodovia } from "@/lib/rodovias";

type IngestMeta = {
  rodoviaId: string;
  km: string;
  sentido: string;
  lat: string;
  lon: string;
};

type IngestResponse = {
  error?: string;
  captura?: Captura;
  classification?: {
    fake?: boolean;
    modelVersion?: string;
    justificativa?: string | null;
    inferenceError?: string | null;
  };
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

function reportFromResponse(data: IngestResponse): CapturaReport {
  const c = data.classification;
  return {
    justificativa: c?.justificativa ?? null,
    fake: c?.fake === true,
    modelVersion: c?.modelVersion ?? "—",
    inferenceError: c?.inferenceError ?? null,
  };
}

async function ingestOne(
  file: File,
  meta: IngestMeta,
  previewUrl: string,
): Promise<FileOutcome> {
  const key = `${file.name}-${file.size}-${file.lastModified}`;
  const exif = await readGeotagFromImage(file);
  const geotag = resolveGeotag(exif, { lat: meta.lat, lon: meta.lon });
  if (!geotag.ok) {
    return {
      key,
      name: file.name,
      status: "rejected",
      message: geotag.error,
      previewUrl,
    };
  }

  const imageBase64 = await fileToBase64(file);
  const body: Record<string, unknown> = {
    lat: geotag.value.lat,
    lon: geotag.value.lon,
    capturedAt: geotag.value.capturedAt,
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
        previewUrl,
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
  const data = (await response.json()) as IngestResponse;
  if (!response.ok || !data.captura) {
    return {
      key,
      name: file.name,
      status: "error",
      message: data.error ?? "Falha ao registrar a captura.",
      previewUrl,
    };
  }
  return {
    key,
    name: file.name,
    status: "ok",
    captura: data.captura,
    previewUrl,
    report: reportFromResponse(data),
  };
}

export function NovaCapturaForm({ rodovias }: { rodovias: Rodovia[] }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const previewUrlsRef = useRef<string[]>([]);
  const [rodoviaId, setRodoviaId] = useState("");
  const [km, setKm] = useState("");
  const [sentido, setSentido] = useState("");
  const [lat, setLat] = useState("");
  const [lon, setLon] = useState("");
  const [busy, setBusy] = useState(false);
  const [outcomes, setOutcomes] = useState<FileOutcome[]>([]);

  useEffect(() => {
    return () => {
      for (const url of previewUrlsRef.current) {
        URL.revokeObjectURL(url);
      }
    };
  }, []);

  async function onSubmit(files: FileList | null) {
    if (!files?.length || busy) {
      return;
    }
    for (const url of previewUrlsRef.current) {
      URL.revokeObjectURL(url);
    }
    previewUrlsRef.current = [];

    setBusy(true);
    setOutcomes([]);
    const list = Array.from(files);
    const meta = { rodoviaId, km, sentido, lat, lon };
    const next: FileOutcome[] = [];
    for (const file of list) {
      const previewUrl = URL.createObjectURL(file);
      previewUrlsRef.current.push(previewUrl);
      try {
        next.push(await ingestOne(file, meta, previewUrl));
      } catch (error) {
        next.push({
          key: `${file.name}-${file.size}-${file.lastModified}`,
          name: file.name,
          status: "error",
          message:
            error instanceof Error ? error.message : "Erro inesperado.",
          previewUrl,
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

  return (
    <>
      <section className="card" style={{ marginBottom: 16 }}>
        <h2 className="section-title">Enviar fotos georreferenciadas</h2>
        <p className="muted" style={{ fontSize: 12, lineHeight: 1.6, marginTop: 0 }}>
          Selecione uma ou mais imagens. O GPS do EXIF é usado quando existir;
          se faltar, informe latitude e longitude abaixo. Após o envio, o
          relatório mostra a imagem, o que a IA disse e a prioridade.
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
          <input
            className="input"
            placeholder="Latitude (se sem GPS)"
            value={lat}
            onChange={(e) => setLat(e.target.value)}
            inputMode="decimal"
            aria-label="Latitude manual"
          />
          <input
            className="input"
            placeholder="Longitude (se sem GPS)"
            value={lon}
            onChange={(e) => setLon(e.target.value)}
            inputMode="decimal"
            aria-label="Longitude manual"
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
          EXIF tem prioridade. Manual só entra quando o metadado não traz GPS.
        </p>
      </section>
      {outcomes.length > 0 ? <NovaCapturaResults outcomes={outcomes} /> : null}
    </>
  );
}
