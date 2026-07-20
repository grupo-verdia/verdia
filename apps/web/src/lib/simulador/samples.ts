import { readFile } from "node:fs/promises";
import path from "node:path";

import type { SampleCaptura } from "@/lib/simulador";

type ManifestCaptura = {
  id: string;
  image: string;
  lat: number;
  lon: number;
  capturedAt: string;
  contentType?: string;
};

type Manifest = {
  capturas: ManifestCaptura[];
};

export async function loadSamplesFromManifest(
  manifestPath: string,
): Promise<SampleCaptura[]> {
  const raw = await readFile(manifestPath, "utf8");
  const manifest = JSON.parse(raw) as Manifest;
  if (!Array.isArray(manifest.capturas)) {
    throw new Error("manifest must contain a capturas array");
  }

  const baseDir = path.dirname(manifestPath);
  const samples: SampleCaptura[] = [];

  for (const entry of manifest.capturas) {
    if (
      typeof entry.id !== "string" ||
      typeof entry.image !== "string" ||
      typeof entry.lat !== "number" ||
      typeof entry.lon !== "number" ||
      typeof entry.capturedAt !== "string"
    ) {
      throw new Error(`invalid manifest entry: ${JSON.stringify(entry)}`);
    }
    const imagePath = path.resolve(baseDir, entry.image);
    const imageBytes = new Uint8Array(await readFile(imagePath));
    samples.push({
      id: entry.id,
      imageBytes,
      contentType: entry.contentType ?? "image/png",
      lat: entry.lat,
      lon: entry.lon,
      capturedAt: entry.capturedAt,
    });
  }

  return samples;
}
