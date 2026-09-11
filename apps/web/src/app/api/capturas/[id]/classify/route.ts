import { NextResponse } from "next/server";

import { classifyPersistedCaptura } from "@/lib/ingest/classify-persisted";

/** Google VLM can exceed the default serverless budget. */
export const maxDuration = 60;

type RouteContext = {
  params: Promise<{ id: string }>;
};

/** Used by Nova captura after save, and by Continuar. */
export async function POST(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  try {
    const captura = await classifyPersistedCaptura(id);
    return NextResponse.json({ captura });
  } catch (error) {
    const message = error instanceof Error ? error.message : "classify failed";
    const status = message === "captura not found" ? 404 : 500;
    const errorText =
      message === "captura not found"
        ? "Captura não encontrada."
        : message === "missing photo bytes"
          ? "Foto não encontrada."
          : message;
    return NextResponse.json({ error: errorText }, { status });
  }
}
