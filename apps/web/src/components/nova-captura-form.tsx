"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";

import { Field } from "@/components/field";
import {
  fileQueueKey,
  ingestOne,
  isAcceptedImage,
  kmFieldError,
  manualGpsFieldErrors,
  NovaCapturaQueue,
  type FieldErrors,
  type QueuedImage,
} from "@/components/nova-captura-queue";
import {
  NovaCapturaResults,
  type FileOutcome,
} from "@/components/nova-captura-results";
import { readGeotagFromImage } from "@/lib/ingest/exif-gps";
import type { Rodovia } from "@/lib/rodovias";

const SENTIDOS = [
  "Norte",
  "Sul",
  "Leste",
  "Oeste",
  "Crescente",
  "Decrescente",
] as const;

const GPS_HINT = "Só usada se a foto não tiver GPS.";

type MetaFieldsProps = {
  rodovias: Rodovia[];
  rodoviaId: string;
  km: string;
  sentido: string;
  lat: string;
  lon: string;
  errors: FieldErrors;
  onRodovia: (value: string) => void;
  onKm: (value: string) => void;
  onSentido: (value: string) => void;
  onLat: (value: string) => void;
  onLon: (value: string) => void;
};

function CapturaMetaFields({
  rodovias,
  rodoviaId,
  km,
  sentido,
  lat,
  lon,
  errors,
  onRodovia,
  onKm,
  onSentido,
  onLat,
  onLon,
}: MetaFieldsProps) {
  return (
    <div className="form-grid">
      <Field label="Rodovia">
        <select
          className="select"
          value={rodoviaId}
          onChange={(event) => onRodovia(event.target.value)}
        >
          <option value="">Não informar</option>
          {rodovias.map((rodovia) => (
            <option key={rodovia.id} value={rodovia.id}>
              {rodovia.codigo} · {rodovia.nome}
            </option>
          ))}
        </select>
      </Field>
      <Field label="KM" error={errors.km}>
        <input
          className={`input${errors.km ? " input-invalid" : ""}`}
          value={km}
          onChange={(event) => onKm(event.target.value)}
          inputMode="decimal"
        />
      </Field>
      <Field label="Sentido">
        <select
          className="select"
          value={sentido}
          onChange={(event) => onSentido(event.target.value)}
        >
          <option value="">Não informar</option>
          {SENTIDOS.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Latitude" hint={GPS_HINT} error={errors.lat}>
        <input
          className={`input${errors.lat ? " input-invalid" : ""}`}
          value={lat}
          onChange={(event) => onLat(event.target.value)}
          inputMode="decimal"
        />
      </Field>
      <Field label="Longitude" error={errors.lon}>
        <input
          className={`input${errors.lon ? " input-invalid" : ""}`}
          value={lon}
          onChange={(event) => onLon(event.target.value)}
          inputMode="decimal"
        />
      </Field>
    </div>
  );
}

function validateQueue(items: QueuedImage[], km: string, lat: string, lon: string) {
  const next: FieldErrors = {};
  const kmError = kmFieldError(km);
  if (kmError) {
    next.km = kmError;
  }
  if (items.some((item) => item.gps === "missing")) {
    Object.assign(next, manualGpsFieldErrors(lat, lon));
  }
  return next;
}

type QueueRefs = {
  queueRef: { current: QueuedImage[] };
  previewUrlsRef: { current: string[] };
  aliveRef: { current: boolean };
  setQueue: (next: QueuedImage[]) => void;
};

function setQueueBoth(refs: QueueRefs, next: QueuedImage[]) {
  refs.queueRef.current = next;
  refs.setQueue(next);
}

async function readQueueGps(refs: QueueRefs, key: string, file: File) {
  const geotag = await readGeotagFromImage(file);
  if (!refs.aliveRef.current) {
    return;
  }
  setQueueBoth(
    refs,
    refs.queueRef.current.map((item) =>
      item.key === key ? { ...item, gps: geotag ? "ok" : "missing" } : item,
    ),
  );
}

function addFiles(refs: QueueRefs, files: File[]) {
  const keys = new Set(refs.queueRef.current.map((item) => item.key));
  const additions: QueuedImage[] = [];
  for (const file of files) {
    if (!isAcceptedImage(file)) {
      continue;
    }
    const key = fileQueueKey(file);
    if (keys.has(key)) {
      continue;
    }
    keys.add(key);
    const previewUrl = URL.createObjectURL(file);
    refs.previewUrlsRef.current.push(previewUrl);
    additions.push({ key, file, previewUrl, gps: "reading" });
  }
  if (additions.length === 0) {
    return;
  }
  setQueueBoth(refs, [...refs.queueRef.current, ...additions]);
  for (const item of additions) {
    void readQueueGps(refs, item.key, item.file);
  }
}

function removeFile(refs: QueueRefs, key: string) {
  const item = refs.queueRef.current.find((entry) => entry.key === key);
  if (item) {
    URL.revokeObjectURL(item.previewUrl);
    refs.previewUrlsRef.current = refs.previewUrlsRef.current.filter(
      (url) => url !== item.previewUrl,
    );
  }
  setQueueBoth(
    refs,
    refs.queueRef.current.filter((entry) => entry.key !== key),
  );
}

export function NovaCapturaForm({ rodovias }: { rodovias: Rodovia[] }) {
  const previewUrlsRef = useRef<string[]>([]);
  const queueRef = useRef<QueuedImage[]>([]);
  const aliveRef = useRef(true);
  const [rodoviaId, setRodoviaId] = useState("");
  const [km, setKm] = useState("");
  const [sentido, setSentido] = useState("");
  const [lat, setLat] = useState("");
  const [lon, setLon] = useState("");
  const [queue, setQueue] = useState<QueuedImage[]>([]);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(
    null,
  );
  const [errors, setErrors] = useState<FieldErrors>({});
  const [outcomes, setOutcomes] = useState<FileOutcome[]>([]);
  const refs: QueueRefs = { queueRef, previewUrlsRef, aliveRef, setQueue };

  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
      for (const url of previewUrlsRef.current) {
        URL.revokeObjectURL(url);
      }
    };
  }, []);

  function clearError(key: keyof FieldErrors) {
    setErrors((prev) => (prev[key] ? { ...prev, [key]: undefined } : prev));
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const items = queueRef.current;
    if (!items.length || busy || items.some((item) => item.gps === "reading")) {
      return;
    }
    const nextErrors = validateQueue(items, km, lat, lon);
    if (nextErrors.km || nextErrors.lat || nextErrors.lon) {
      setErrors(nextErrors);
      return;
    }
    setErrors({});
    const keep = new Set(items.map((item) => item.previewUrl));
    previewUrlsRef.current = previewUrlsRef.current.filter((url) => {
      if (keep.has(url)) {
        return true;
      }
      URL.revokeObjectURL(url);
      return false;
    });
    setBusy(true);
    setOutcomes([]);
    const meta = { rodoviaId, km, sentido, lat, lon };
    const next: FileOutcome[] = [];
    for (let i = 0; i < items.length; i++) {
      const item = items[i]!;
      setProgress({ current: i + 1, total: items.length });
      try {
        next.push(await ingestOne(item.file, meta, item.previewUrl));
      } catch (error) {
        next.push({
          key: item.key,
          name: item.file.name,
          status: "error",
          message: error instanceof Error ? error.message : "Erro inesperado.",
          previewUrl: item.previewUrl,
        });
      }
      setOutcomes([...next]);
    }
    setQueueBoth(refs, []);
    setBusy(false);
    setProgress(null);
    if (next.some((outcome) => outcome.status === "ok")) {
      window.dispatchEvent(new Event("verdia:data-refresh"));
    }
  }

  const sendDisabled =
    busy || queue.length === 0 || queue.some((item) => item.gps === "reading");
  const sendLabel = busy
    ? "Enviando…"
    : queue.length > 1
      ? `Enviar ${queue.length} fotos`
      : "Enviar";

  return (
    <>
      <form className="card" style={{ marginBottom: 16 }} onSubmit={onSubmit}>
        <CapturaMetaFields
          rodovias={rodovias}
          rodoviaId={rodoviaId}
          km={km}
          sentido={sentido}
          lat={lat}
          lon={lon}
          errors={errors}
          onRodovia={setRodoviaId}
          onKm={(value) => {
            setKm(value);
            clearError("km");
          }}
          onSentido={setSentido}
          onLat={(value) => {
            setLat(value);
            clearError("lat");
          }}
          onLon={(value) => {
            setLon(value);
            clearError("lon");
          }}
        />
        <NovaCapturaQueue
          items={queue}
          busy={busy}
          onAdd={(files) => addFiles(refs, files)}
          onRemove={(key) => removeFile(refs, key)}
        />
        <div className="toolbar" style={{ marginTop: 16 }}>
          <button className="btn btn-primary" type="submit" disabled={sendDisabled}>
            {sendLabel}
          </button>
          {busy && progress ? (
            <span className="muted">
              {progress.current} de {progress.total}
            </span>
          ) : null}
        </div>
      </form>
      {outcomes.length > 0 ? <NovaCapturaResults outcomes={outcomes} /> : null}
    </>
  );
}
