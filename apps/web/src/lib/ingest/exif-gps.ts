import exifr from "exifr";

export type Geotag = {
  lat: number;
  lon: number;
  capturedAt: string;
};

function isFiniteCoord(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

/**
 * Read GPS + capture time from image EXIF.
 * Returns null when lat/lon are missing or invalid (not a captura).
 */
export async function readGeotagFromImage(
  source: Blob | ArrayBuffer | Uint8Array,
): Promise<Geotag | null> {
  let parsed: {
    latitude?: number;
    longitude?: number;
    DateTimeOriginal?: Date | string;
    CreateDate?: Date | string;
  } | null;
  try {
    parsed = await exifr.parse(source, { gps: true });
  } catch {
    return null;
  }

  if (!parsed) {
    return null;
  }

  const lat = parsed.latitude;
  const lon = parsed.longitude;
  if (!isFiniteCoord(lat) || !isFiniteCoord(lon)) {
    return null;
  }
  if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
    return null;
  }

  const rawDate = parsed.DateTimeOriginal ?? parsed.CreateDate;
  let capturedAt: string;
  if (rawDate instanceof Date && !Number.isNaN(rawDate.getTime())) {
    capturedAt = rawDate.toISOString();
  } else if (typeof rawDate === "string") {
    const ms = Date.parse(rawDate);
    capturedAt = Number.isNaN(ms) ? new Date().toISOString() : new Date(ms).toISOString();
  } else {
    capturedAt = new Date().toISOString();
  }

  return { lat, lon, capturedAt };
}
