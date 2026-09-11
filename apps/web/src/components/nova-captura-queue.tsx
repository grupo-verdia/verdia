"use client";

import { useRef, useState, type DragEvent } from "react";

import { filesFromDrop, isAcceptedImage } from "@/lib/ingest/drop-files";
import { isWithinUploadLimit, MAX_UPLOAD_LABEL } from "@/lib/ingest/prepare-upload";

export type QueueGps = "reading" | "ok" | "missing";

export type QueuedImage = {
  key: string;
  file: File;
  previewUrl: string;
  gps: QueueGps;
};

export const QUEUE_PREVIEW_LIMIT = 8;

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
  onClear: () => void;
};

export function NovaCapturaQueue({
  items,
  busy,
  onAdd,
  onRemove,
  onClear,
}: NovaCapturaQueueProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  const [oversized, setOversized] = useState(0);

  function takeFiles(list: FileList | File[] | null) {
    if (!list || busy) {
      return;
    }
    const images = Array.from(list).filter(isAcceptedImage);
    const files = images.filter(isWithinUploadLimit);
    setOversized(images.length - files.length);
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

  async function onDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setDrag(false);
    if (busy) {
      return;
    }
    takeFiles(await filesFromDrop(event));
  }

  const ready = items.filter((item) => item.gps === "ok").length;
  const missing = items.filter((item) => item.gps === "missing").length;
  const reading = items.filter((item) => item.gps === "reading").length;
  const showRows = items.length > 0 && items.length <= QUEUE_PREVIEW_LIMIT;
  const dropClass = `dropzone${drag && !busy ? " dropzone-active" : ""}`;

  return (
    <div className="field" style={{ marginTop: 16 }}>
      <span className="field-label">Fotos</span>
      <label
        className={dropClass}
        onDragOver={onDragOver}
        onDragLeave={(event) => {
          event.preventDefault();
          setDrag(false);
        }}
        onDrop={(event) => {
          void onDrop(event);
        }}
        aria-disabled={busy}
        style={busy ? { pointerEvents: "none", opacity: 0.55 } : undefined}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          hidden
          disabled={busy}
          aria-label="Fotos"
          onChange={(event) => takeFiles(event.target.files)}
        />
        <span className="dropzone-desktop">
          JPEG, PNG ou WebP até {MAX_UPLOAD_LABEL}. Clique, arraste ou solte uma pasta.
        </span>
        <span className="dropzone-phone">
          JPEG, PNG ou WebP até {MAX_UPLOAD_LABEL}. Toque para escolher fotos.
        </span>
        <span className="btn">
          {items.length > 0 ? "Adicionar imagens" : "Selecionar imagens"}
        </span>
      </label>
      {items.length > 0 ? (
        <div className="queue-summary">
          <div>
            <strong>{items.length}</strong> foto{items.length === 1 ? "" : "s"}
            {reading > 0 ? ` · ${reading} lendo GPS` : ""}
            {ready > 0 ? ` · ${ready} com GPS` : ""}
            {missing > 0 ? ` · ${missing} sem GPS` : ""}
          </div>
          <button type="button" className="btn" disabled={busy} onClick={onClear}>
            Limpar
          </button>
        </div>
      ) : null}
      {oversized > 0 ? (
        <p className="muted" style={{ fontSize: 12, margin: "8px 0 0" }}>
          {oversized === 1
            ? `1 foto acima de ${MAX_UPLOAD_LABEL} ficou de fora.`
            : `${oversized} fotos acima de ${MAX_UPLOAD_LABEL} ficaram de fora.`}
        </p>
      ) : null}
      {missing > 0 ? (
        <p className="muted" style={{ fontSize: 12, margin: "8px 0 0" }}>
          Sem GPS: preencha latitude e longitude, ou essas fotos ficam de fora.
        </p>
      ) : null}
      {showRows ? (
        <div className="file-queue">
          {items.map((item) => (
            <div className="file-queue-item" key={item.key}>
              {item.previewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- blob preview
                <img src={item.previewUrl} alt="" />
              ) : (
                <span className="file-queue-ph" />
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="file-queue-name">{item.file.name}</div>
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
