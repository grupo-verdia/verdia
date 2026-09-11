"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";

import { CapturaMetaFields } from "@/components/nova-captura-fields";
import {
  kmFieldError,
  manualGpsFieldErrors,
  persistOne,
  runPool,
  watchClassify,
  type FieldErrors,
  type IngestMeta,
} from "@/components/nova-captura-ingest";
import { NovaCapturaPending } from "@/components/nova-captura-pending";
import {
  NovaCapturaQueue,
  QUEUE_PREVIEW_LIMIT,
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
      refs.queueRef.current.length + additions.length < QUEUE_PREVIEW_LIMIT;
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

function dropSucceeded(refs: QueueRefs, keys: Set<string>) {
  const next: QueuedImage[] = [];
  for (const item of refs.queueRef.current) {
    if (keys.has(item.key)) {
      if (item.previewUrl) {
        URL.revokeObjectURL(item.previewUrl);
      }
      continue;
    }
    next.push(item);
  }
  refs.previewUrlsRef.current = next
    .map((item) => item.previewUrl)
    .filter(Boolean);
  setQueueBoth(refs, next);
}

async function sendQueuedBatch(options: {
  items: QueuedImage[];
  meta: IngestMeta;
  includeMissing: boolean;
  refs: QueueRefs;
  setProgress: (value: string | null) => void;
  setReport: (report: BatchReport) => void;
  onPersisted: (ids: string[]) => void;
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
  const succeeded = new Set<string>();
  let current = 0;
  await runPool(toSend, 3, async (item) => {
    try {
      const result = await persistOne(item.file, options.meta);
      if (result.ok) {
        uploaded.push(result.captura);
        succeeded.add(item.key);
      } else {
        failed.push({ name: item.file.name, message: result.message });
      }
    } catch (error) {
      failed.push({
        name: item.file.name,
        message: error instanceof Error ? error.message : "Erro inesperado.",
      });
    }
    current += 1;
    options.setProgress(`${current} de ${toSend.length} enviadas`);
  });
  dropSucceeded(options.refs, succeeded);
  const ids = uploaded.map((captura) => captura.id);
  options.setReport({ uploaded: [...uploaded], failed, skipped });
  options.onPersisted(ids);
  if (ids.length === 0) {
    options.setProgress(null);
    return;
  }
  options.setProgress("Classificando…");
  window.dispatchEvent(new Event("verdia:data-refresh"));
  await watchClassify(ids, () => options.refs.aliveRef.current, (capturas) => {
    options.setReport({ uploaded: capturas, failed, skipped });
    const left = capturas.filter(isClassificationPending).length;
    options.setProgress(left > 0 ? `${left} na fila` : null);
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
  const [watchingIds, setWatchingIds] = useState<string[]>([]);
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
    const sentIds: string[] = [];
    try {
      await sendQueuedBatch({
        items,
        meta: { rodoviaId, km, sentido, lat, lon },
        includeMissing,
        refs,
        setProgress,
        setReport,
        onPersisted(ids) {
          sentIds.push(...ids);
          setBusy(false);
          if (ids.length) {
            setWatchingIds((prev) => [...prev, ...ids]);
          }
        },
      });
    } catch {
      setProgress(null);
    } finally {
      setBusy(false);
      if (sentIds.length) {
        setWatchingIds((prev) => prev.filter((id) => !sentIds.includes(id)));
      }
    }
  }

  const includeMissing = lat.trim() !== "" && lon.trim() !== "";
  const sendCount = queue.filter(
    (item) => item.gps === "ok" || (includeMissing && item.gps === "missing"),
  ).length;
  const sendDisabled =
    busy ||
    queue.length === 0 ||
    sendCount === 0 ||
    queue.some((item) => item.gps === "reading");
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
        hideIds={watchingIds}
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
