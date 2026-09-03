"use client";

import { useRef, useState, type DragEvent } from "react";

import type { CapturaReport, FileOutcome } from "@/components/nova-captura-results";
import type { Captura } from "@/lib/domain";
import { readGeotagFromImage } from "@/lib/ingest/exif-gps";
import { resolveGeotag } from "@/lib/ingest/resolve-geotag";

const ACCEPT = "image/jpeg,image/png,image/webp";

export type QueueGps = "reading" | "ok" | "missing";

export type QueuedImage = {
  key: string;
  file: File;
  previewUrl: string;
  gps: QueueGps;
};

export function isAcceptedImage(file: File): boolean {
  if (
    file.type === "image/jpeg" ||
    file.type === "image/png" ||
    file.type === "image/webp"
  ) {
    return true;
  }
  return /\.(jpe?g|png|webp)$/i.test(file.name);
}

export function fileQueueKey(file: File): string {
  return `${file.name}-${file.size}-${file.lastModified}`;
}

export type IngestMeta = {
  rodoviaId: string;
  km: string;
  sentido: string;
  lat: string;
  lon: string;
};

export type FieldErrors = {
  km?: string;
  lat?: string;
  lon?: string;
};

type IngestResponse = {
  error?: string;
  captura?: Captura;
  classification?: {
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

function parseFiniteNumber(raw: string): number | null {
  const n = Number(raw.trim().replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

export function kmFieldError(km: string): string | undefined {
  if (km.trim() === "") {
    return undefined;
  }
  return parseFiniteNumber(km) == null ? "KM inválido." : undefined;
}

export function manualGpsFieldErrors(lat: string, lon: string): FieldErrors {
  const probe = resolveGeotag(null, { lat, lon });
  if (probe.ok) {
    return {};
  }
  const latRaw = lat.trim();
  const lonRaw = lon.trim();
  const errors: FieldErrors = {};
  if (!latRaw) {
    errors.lat = "Informe a latitude.";
  }
  if (!lonRaw) {
    errors.lon = "Informe a longitude.";
  }
  if (errors.lat || errors.lon) {
    return errors;
  }
  const latN = parseFiniteNumber(lat);
  const lonN = parseFiniteNumber(lon);
  if (latN == null) {
    errors.lat = "Latitude inválida.";
  } else if (latN < -90 || latN > 90) {
    errors.lat = "Latitude fora do intervalo.";
  }
  if (lonN == null) {
    errors.lon = "Longitude inválida.";
  } else if (lonN < -180 || lonN > 180) {
    errors.lon = "Longitude fora do intervalo.";
  }
  return errors;
}

function reportFromResponse(data: IngestResponse): CapturaReport {
  const c = data.classification;
  return {
    justificativa: c?.justificativa ?? null,
    inferenceError: c?.inferenceError ?? null,
  };
}

/** POST /api/capturas/ingest for one queued photo. */
export async function ingestOne(
  file: File,
  meta: IngestMeta,
  previewUrl: string,
): Promise<FileOutcome> {
  const key = fileQueueKey(file);
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
    const km = parseFiniteNumber(meta.km);
    if (km == null) {
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

function gpsLabel(gps: QueueGps): string {
  if (gps === "reading") {
    return "Lendo GPS…";
  }
  if (gps === "ok") {
    return "GPS no arquivo";
  }
  return "Sem GPS no arquivo";
}

type NovaCapturaQueueProps = {
  items: QueuedImage[];
  busy: boolean;
  onAdd: (files: File[]) => void;
  onRemove: (key: string) => void;
};

export function NovaCapturaQueue({
  items,
  busy,
  onAdd,
  onRemove,
}: NovaCapturaQueueProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);

  function takeFiles(list: FileList | File[] | null) {
    if (!list || busy) {
      return;
    }
    const files = Array.from(list);
    if (files.length) {
      onAdd(files);
    }
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  }

  function onDragOver(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    if (!busy) {
      setDrag(true);
    }
  }

  function onDragLeave(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setDrag(false);
  }

  function onDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setDrag(false);
    takeFiles(event.dataTransfer.files);
  }

  const dropClass = `dropzone${drag && !busy ? " dropzone-active" : ""}`;

  return (
    <div className="field" style={{ marginTop: 16 }}>
      <span className="field-label">Fotos</span>
      <label
        className={dropClass}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        aria-disabled={busy}
        style={busy ? { pointerEvents: "none", opacity: 0.55 } : undefined}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          multiple
          hidden
          disabled={busy}
          aria-label="Fotos"
          onChange={(event) => takeFiles(event.target.files)}
        />
        <span>JPEG, PNG ou WebP. Clique ou arraste.</span>
        <span className="btn">
          {items.length > 0 ? "Adicionar imagens" : "Selecionar imagens"}
        </span>
      </label>
      {items.length > 0 ? (
        <div className="file-queue">
          {items.map((item) => (
            <div className="file-queue-item" key={item.key}>
              {/* eslint-disable-next-line @next/next/no-img-element -- blob preview */}
              <img src={item.previewUrl} alt="" />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 650,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {item.file.name}
                </div>
                <div className="muted" style={{ fontSize: 12 }}>
                  {gpsLabel(item.gps)}
                </div>
              </div>
              <button
                type="button"
                className="btn"
                disabled={busy}
                onClick={() => onRemove(item.key)}
              >
                Remover
              </button>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
