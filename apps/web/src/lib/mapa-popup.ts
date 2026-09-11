import { capturaStatus } from "@/components/status-pill";
import { capturaPhotoPath } from "@/lib/captura-photo";
import type { Captura } from "@/lib/domain";

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

/** Leaflet popup: photo plus the same stats the operator sees in the lists. */
export function capturaMapPopupHtml(
  captura: Captura,
  rodoviaCodigo: string | null,
  ordem: number | undefined,
): string {
  const status = capturaStatus(captura);
  const road = escapeHtml(rodoviaCodigo ?? "Rodovia");
  const km = captura.km != null ? captura.km.toFixed(1) : "—";
  const altura =
    captura.alturaCm != null ? `${captura.alturaCm} cm` : "—";
  const when = escapeHtml(
    new Date(captura.capturedAt).toLocaleString("pt-BR"),
  );
  const planLine =
    typeof ordem === "number"
      ? `<div>Plano: ordem <b>${ordem}</b></div>`
      : "";

  return (
    `<div class="map-popup">` +
    `<img class="map-popup-photo" src="${capturaPhotoPath(captura.id)}" alt="Captura da vegetação" />` +
    `<div class="map-popup-body">` +
    `<b>${road}</b>` +
    planLine +
    `<div>KM ${km}</div>` +
    `<div>Altura: ${escapeHtml(altura)}</div>` +
    `<div>Classe: ${escapeHtml(status.label)}</div>` +
    `<small>${when}</small>` +
    `</div>` +
    `<a class="map-popup-link" href="/capturas/${encodeURIComponent(captura.id)}">Abrir captura</a>` +
    `</div>`
  );
}
