/**
 * Simulador de ingestão CLI — replay geotagged sample capturas:
 * Inference API → BFF persist → dashboard.
 *
 * Usage (from apps/web):
 *   npm run simulate-ingest
 *
 * Env:
 *   DEMO_PASSWORD (required) — shared password for BFF login
 *   INFERENCE_URL (default http://127.0.0.1:8000)
 *   WEB_URL (default http://127.0.0.1:3000)
 *   SAMPLE_MANIFEST (default fixtures/capturas/manifest.json)
 */
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  createHttpInferClient,
  createHttpPersistClient,
  loginSessionCookie,
} from "../src/lib/simulador/http";
import { runSimulador } from "../src/lib/simulador";
import { loadSamplesFromManifest } from "../src/lib/simulador/samples";

const here = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.resolve(here, "..");

async function main(): Promise<void> {
  const password = process.env.DEMO_PASSWORD;
  if (!password) {
    throw new Error("DEMO_PASSWORD is required (see .env.example)");
  }

  const inferenceUrl = process.env.INFERENCE_URL ?? "http://127.0.0.1:8000";
  const webUrl = process.env.WEB_URL ?? "http://127.0.0.1:3000";
  const manifestPath = path.resolve(
    webRoot,
    process.env.SAMPLE_MANIFEST ?? "fixtures/capturas/manifest.json",
  );

  const samples = await loadSamplesFromManifest(manifestPath);
  console.log(`Loaded ${samples.length} sample captura(s) from ${manifestPath}`);

  const cookie = await loginSessionCookie(webUrl, password);
  const report = await runSimulador(samples, {
    infer: createHttpInferClient(inferenceUrl),
    persist: createHttpPersistClient(webUrl, cookie),
  });

  let ok = 0;
  let failed = 0;
  for (const result of report.results) {
    if (result.status === "ok") {
      ok += 1;
      console.log(
        `✓ ${result.sampleId} → captura ${result.capturaId} (classe ${result.classe})`,
      );
      continue;
    }
    failed += 1;
    if (result.status === "inference_failed") {
      console.log(
        `✗ ${result.sampleId} inference failed: ${result.error}` +
          (result.capturaId ? ` (persisted as ${result.capturaId})` : ""),
      );
      continue;
    }
    console.log(`✗ ${result.sampleId} persist failed: ${result.error}`);
  }

  console.log(`Done: ${ok} ok, ${failed} failed. Refresh the dashboard at ${webUrl}/`);
  if (failed > 0) {
    process.exitCode = 1;
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exitCode = 1;
});
