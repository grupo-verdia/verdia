"use client";

import { useState } from "react";

import { capturaPhotoPath } from "@/lib/captura-photo";

/** Small roadside photo. Empty box if the file is missing. */
export function CapturaThumb({
  id,
  className,
}: {
  id: string;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const classes = ["captura-thumb", className].filter(Boolean).join(" ");

  if (failed) {
    return <span className={`${classes} captura-thumb-empty`} aria-hidden="true" />;
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- authenticated photo API
    <img
      className={classes}
      src={capturaPhotoPath(id)}
      alt=""
      onError={() => setFailed(true)}
    />
  );
}
