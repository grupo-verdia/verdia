import type { Geotag } from "@/lib/ingest/exif-gps";

export type ManualGeotagInput = {
  lat: string;
  lon: string;
};

/**
 * Prefer EXIF geotag; if missing, use manual lat/lon (same capture time = now).
 * Returns an error message when neither source yields valid coordinates.
 */
export function resolveGeotag(
  exif: Geotag | null,
  manual: ManualGeotagInput,
): { ok: true; value: Geotag } | { ok: false; error: string } {
  if (exif) {
    return { ok: true, value: exif };
  }

  const latRaw = manual.lat.trim();
  const lonRaw = manual.lon.trim();
  if (!latRaw || !lonRaw) {
    return {
      ok: false,
      error:
        "Sem GPS no EXIF — informe latitude e longitude manuais para este envio.",
    };
  }

  const lat = Number(latRaw.replace(",", "."));
  const lon = Number(lonRaw.replace(",", "."));
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return { ok: false, error: "Latitude ou longitude inválida." };
  }
  if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
    return { ok: false, error: "Latitude ou longitude fora do intervalo." };
  }

  return {
    ok: true,
    value: {
      lat,
      lon,
      capturedAt: new Date().toISOString(),
    },
  };
}
