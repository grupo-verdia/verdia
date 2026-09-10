"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";

import { Field } from "@/components/field";
import {
  finishClassify,
  kmFieldError,
  manualGpsFieldErrors,
  persistOne,
  runPool,
  type FieldErrors,
  type IngestMeta,
} from "@/components/nova-captura-ingest";
import { NovaCapturaPending } from "@/components/nova-captura-pending";
import {
  NovaCapturaQueue,
  type QueuedImage,
} from "@/components/nova-captura-queue";
import {
  NovaCapturaResults,
  type BatchReport,
} from "@/components/nova-captura-results";
import { fileQueueKey } from "@/lib/ingest/drop-files";
import { readGeotagFromImage } from "@/lib/ingest/exif-gps";
import { isClassificationPending, type Captura } from "@/lib/domain";
import type { Rodovia } from "@/lib/rodovias";

const SENTIDOS = [
  "Norte",
  "Sul",
  "Leste",
  "Oeste",
  "Crescente",
  "Decrescente",
] as const;

const GPS_HINT = "Só nas fotos sem GPS.";
const PREVIEW_LIMIT = 8;

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
  const hasGps = items.some((item) => item.gps === "ok");
  const needsManual = items.some((item) => item.gps === "missing");
  if (needsManual && (!hasGps || lat.trim() !== "" || lon.trim() !== "")) {
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
    const key = fileQueueKey(file);
    if (keys.has(key)) {
      continue;
    }
    keys.add(key);
    const canPreview =
      refs.queueRef.current.length + additions.length < PREVIEW_LIMIT;
    const previewUrl = canPreview ? URL.createObjectURL(file) : "";
    if (previewUrl) {
      refs.previewUrlsRef.current.push(previewUrl);
    }
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
  if (item?.previewUrl) {
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

function clearQueue(refs: QueueRefs) {
  for (const url of refs.previewUrlsRef.current) {
    URL.revokeObjectURL(url);
  }
  refs.previewUrlsRef.current = [];
  setQueueBoth(refs, []);
}

async function sendQueuedBatch(options: {
  items: QueuedImage[];
  meta: IngestMeta;
  includeMissing: boolean;
  refs: QueueRefs;
  setProgress: (value: string | null) => void;
  setReport: (report: BatchReport) => void;
}): Promise<void> {
  const toSend = options.items.filter(
    (item) =>
      item.gps === "ok" || (options.includeMissing && item.gps === "missing"),
  );
  const skipped = options.items.length - toSend.length;
  if (toSend.length === 0) {
    return;
  }
  const uploaded: BatchReport["uploaded"] = [];
  const failed: BatchReport["failed"] = [];
  let current = 0;
  await runPool(toSend, 3, async (item) => {
    current += 1;
    options.setProgress(`${current} de ${toSend.length} enviadas`);
    try {
      const result = await persistOne(item.file, options.meta);
      if (result.ok) {
        uploaded.push(result.captura);
      } else {
        failed.push({ name: item.file.name, message: result.message });
      }
    } catch (error) {
      failed.push({
        name: item.file.name,
        message: error instanceof Error ? error.message : "Erro inesperado.",
      });
    }
  });
  clearQueue(options.refs);
  const ids = uploaded.map((captura) => captura.id);
  options.setReport({ uploaded: [...uploaded], failed, skipped });
  options.setProgress(
    uploaded.length ? "Classificando em segundo plano…" : null,
  );
  window.dispatchEvent(new Event("verdia:data-refresh"));
  await finishClassify(ids, () => options.refs.aliveRef.current, (capturas) => {
    options.setReport({ uploaded: capturas, failed, skipped });
    const left = capturas.filter(isClassificationPending).length;
    options.setProgress(left > 0 ? `${left} na fila da classificação` : null);
  });
  window.dispatchEvent(new Event("verdia:data-refresh"));
}

export function NovaCapturaForm({
  rodovias,
  initialCapturas,
}: {
  rodovias: Rodovia[];
  initialCapturas: Captura[];
}) {
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
  const [progress, setProgress] = useState<string | null>(null);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [report, setReport] = useState<BatchReport | null>(null);
  const refs: QueueRefs = { queueRef, previewUrlsRef, aliveRef, setQueue };

  useEffect(() => {
    aliveRef.current = true;
    const previews = previewUrlsRef;
    return () => {
      aliveRef.current = false;
      for (const url of previews.current) {
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
    const includeMissing = lat.trim() !== "" && lon.trim() !== "";
    setBusy(true);
    setReport(null);
    await sendQueuedBatch({
      items,
      meta: { rodoviaId, km, sentido, lat, lon },
      includeMissing,
      refs,
      setProgress,
      setReport,
    });
    setBusy(false);
  }

  const includeMissing = lat.trim() !== "" && lon.trim() !== "";
  const sendCount = queue.filter(
    (item) => item.gps === "ok" || (includeMissing && item.gps === "missing"),
  ).length;
  const sendDisabled =
    busy || queue.length === 0 || queue.some((item) => item.gps === "reading");
  const sendLabel = busy
    ? "Enviando…"
    : sendCount > 1
      ? `Enviar ${sendCount} fotos`
      : "Enviar";

  return (
    <>
      <NovaCapturaPending
        initialCapturas={initialCapturas}
        initialRodovias={rodovias}
      />
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
          onClear={() => clearQueue(refs)}
        />
        <div className="toolbar" style={{ marginTop: 16 }}>
          <button className="btn btn-primary" type="submit" disabled={sendDisabled}>
            {sendLabel}
          </button>
          {progress ? <span className="muted">{progress}</span> : null}
        </div>
      </form>
      {report ? (
        <NovaCapturaResults
          report={report}
          classifying={report.uploaded.filter(isClassificationPending).length}
        />
      ) : null}
    </>
  );
}
