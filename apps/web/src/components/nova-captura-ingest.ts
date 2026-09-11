import { isClassificationPending, type Captura } from "@/lib/domain";
import { readGeotagFromImage } from "@/lib/ingest/exif-gps";
import { resolveGeotag } from "@/lib/ingest/resolve-geotag";

export type IngestMeta = {
  rodoviaId: string;
  km: string;
  sentido: string;
  lat: string;
  lon: string;
};

export type FieldErrors = {
  km?: string;
  lat?: string;
  lon?: string;
};

type IngestResponse = {
  error?: string;
  captura?: Captura;
};

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== "string") {
        reject(new Error("Falha ao ler a imagem."));
        return;
      }
      const comma = result.indexOf(",");
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.onerror = () => reject(new Error("Falha ao ler a imagem."));
    reader.readAsDataURL(file);
  });
}

function parseFiniteNumber(raw: string): number | null {
  const n = Number(raw.trim().replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

export function kmFieldError(km: string): string | undefined {
  if (km.trim() === "") {
    return undefined;
  }
  return parseFiniteNumber(km) == null ? "KM inválido." : undefined;
}

export function manualGpsFieldErrors(lat: string, lon: string): FieldErrors {
  const probe = resolveGeotag(null, { lat, lon });
  if (probe.ok) {
    return {};
  }
  const latRaw = lat.trim();
  const lonRaw = lon.trim();
  const errors: FieldErrors = {};
  if (!latRaw) {
    errors.lat = "Informe a latitude.";
  }
  if (!lonRaw) {
    errors.lon = "Informe a longitude.";
  }
  if (errors.lat || errors.lon) {
    return errors;
  }
  const latN = parseFiniteNumber(lat);
  const lonN = parseFiniteNumber(lon);
  if (latN == null) {
    errors.lat = "Latitude inválida.";
  } else if (latN < -90 || latN > 90) {
    errors.lat = "Latitude fora do intervalo.";
  }
  if (lonN == null) {
    errors.lon = "Longitude inválida.";
  } else if (lonN < -180 || lonN > 180) {
    errors.lon = "Longitude fora do intervalo.";
  }
  return errors;
}

/** POST /api/capturas/ingest. Saves the photo; classification runs after. */
export async function persistOne(
  file: File,
  meta: IngestMeta,
): Promise<{ ok: true; captura: Captura } | { ok: false; message: string }> {
  const exif = await readGeotagFromImage(file);
  const geotag = resolveGeotag(exif, { lat: meta.lat, lon: meta.lon });
  if (!geotag.ok) {
    return { ok: false, message: geotag.error };
  }

  const imageBase64 = await fileToBase64(file);
  const body: Record<string, unknown> = {
    lat: geotag.value.lat,
    lon: geotag.value.lon,
    capturedAt: geotag.value.capturedAt,
    imageBase64,
    contentType: file.type || "image/jpeg",
  };
  if (meta.rodoviaId) {
    body.rodoviaId = meta.rodoviaId;
  }
  if (meta.km.trim() !== "") {
    const km = parseFiniteNumber(meta.km);
    if (km == null) {
      return { ok: false, message: "KM inválido." };
    }
    body.km = km;
  }
  if (meta.sentido.trim() !== "") {
    body.sentido = meta.sentido.trim();
  }

  const response = await fetch("/api/capturas/ingest", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await response.json()) as IngestResponse;
  if (!response.ok || !data.captura) {
    return { ok: false, message: data.error ?? "Falha ao registrar a captura." };
  }
  return { ok: true, captura: data.captura };
}

export async function classifyOne(id: string): Promise<Captura> {
  const response = await fetch(`/api/capturas/${id}/classify`, {
    method: "POST",
  });
  const data = (await response.json()) as { error?: string; captura?: Captura };
  if (!response.ok || !data.captura) {
    throw new Error(data.error ?? "Falha ao classificar.");
  }
  return data.captura;
}

export async function runPool<T>(
  items: T[],
  limit: number,
  worker: (item: T) => Promise<void>,
): Promise<void> {
  let next = 0;
  async function pump(): Promise<void> {
    while (next < items.length) {
      const index = next;
      next += 1;
      await worker(items[index]!);
    }
  }
  const n = Math.min(Math.max(1, limit), items.length);
  await Promise.all(Array.from({ length: n }, () => pump()));
}

export async function listCapturas(): Promise<Captura[]> {
  const response = await fetch(`/api/capturas?t=${Date.now()}`, {
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error("Falha ao listar capturas.");
  }
  const data = (await response.json()) as { capturas?: Captura[] };
  return data.capturas ?? [];
}

const POLL_MS = 4000;
const POLL_TRIES = 15;

/** Poll until ingest `after()` stamps classifiedAt. Do not POST classify. */
export async function watchClassify(
  ids: string[],
  alive: () => boolean,
  onUpdate: (capturas: Captura[]) => void,
): Promise<void> {
  if (ids.length === 0) {
    return;
  }
  const idSet = new Set(ids);
  for (let attempt = 0; attempt < POLL_TRIES; attempt += 1) {
    if (!alive()) {
      return;
    }
    try {
      const listed = await listCapturas();
      const batch = listed.filter((captura) => idSet.has(captura.id));
      if (batch.length > 0) {
        onUpdate(batch);
      }
      if (batch.length > 0 && batch.every((captura) => !isClassificationPending(captura))) {
        return;
      }
    } catch {
      // Keep the last report. Continuar remains if the server never finishes.
    }
    if (attempt < POLL_TRIES - 1) {
      await new Promise((resolve) => {
        window.setTimeout(resolve, POLL_MS);
      });
    }
  }
}
