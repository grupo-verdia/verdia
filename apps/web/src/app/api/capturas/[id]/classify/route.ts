import { NextResponse } from "next/server";

import { classifyPersistedCaptura } from "@/lib/ingest/classify-persisted";

/** Google VLM can exceed the default serverless budget. */
export const maxDuration = 60;

type RouteContext = {
  params: Promise<{ id: string }>;
};

/** Classify a captura that was saved first (Nova captura queue / resume). */
export async function POST(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  try {
    const captura = await classifyPersistedCaptura(id);
    return NextResponse.json({
      captura,
      classification: {
        classe: captura.classe,
        alturaCm: captura.alturaCm,
        confidence: captura.confidence,
        inferenceError: captura.inferenceError,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "classify failed";
    const status = message === "captura not found" ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
