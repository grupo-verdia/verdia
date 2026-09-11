/** Authenticated photo URL for a persisted captura. */
export function capturaPhotoPath(id: string): string {
  return `/api/capturas/${encodeURIComponent(id)}/photo`;
}
