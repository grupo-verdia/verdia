"use client";

type ConfirmStripProps = {
  title: string;
  body?: string;
  confirmLabel: string;
  cancelLabel?: string;
  danger?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

/** In-page confirm. Replaces window.confirm on destructive or additive actions. */
export function ConfirmStrip({
  title,
  body,
  confirmLabel,
  cancelLabel = "Cancelar",
  danger,
  busy,
  onConfirm,
  onCancel,
}: ConfirmStripProps) {
  return (
    <div className="confirm-strip" role="alertdialog" aria-labelledby="confirm-title">
      <div>
        <p className="confirm-strip-title" id="confirm-title">
          {title}
        </p>
        {body ? <p className="confirm-strip-body">{body}</p> : null}
      </div>
      <div className="toolbar">
        <button type="button" className="btn" onClick={onCancel} disabled={busy}>
          {cancelLabel}
        </button>
        <button
          type="button"
          className={danger ? "btn btn-danger" : "btn btn-primary"}
          onClick={onConfirm}
          disabled={busy}
        >
          {confirmLabel}
        </button>
      </div>
    </div>
  );
}
