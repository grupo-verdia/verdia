/**
 * Simulador de ingestão CLI — replay geotagged sample capturas:
 * Inference API → BFF persist → dashboard.
 *
 * DEFERRED: AI HTTP `/infer` was removed with the hand-CV path. This CLI exits
 * until a new Inference API shape lands. Unit tests still exercise the
 * simulador with mocked InferClient (`src/__tests__/simulador.test.ts`).
 *
 * When the API returns, restore the previous login → createHttpInferClient →
 * runSimulador → createHttpPersistClient flow (see git history).
 *
 * Env (historical): DEMO_PASSWORD, INFERENCE_URL, INFERENCE_API_KEY, WEB_URL,
 * SAMPLE_MANIFEST.
 */
async function main(): Promise<void> {
  console.error(
    "simulate-ingest is deferred: AI HTTP Inference API (/infer) is not shipped.\n" +
      "Use services/ai VLM CLI/notebook for classification this week.\n" +
      "See services/ai/README.md and docs/plans/2026-08-05-vlm-prototype.md.",
  );
  process.exitCode = 1;
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exitCode = 1;
});
