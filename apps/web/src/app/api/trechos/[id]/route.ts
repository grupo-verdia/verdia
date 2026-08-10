import { NextRequest, NextResponse } from "next/server";

import { DEFAULT_TRECHO_LENGTH_METERS } from "@/lib/domain";
import { getCaptura, listCapturas } from "@/lib/verdia-store";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  try {
    const byId = await getCaptura(id);
    const captura =
      byId ??
      (await listCapturas()).find((item) => item.trechoId === id) ??
      null;
    if (!captura) {
      return NextResponse.json({ error: "trecho not found" }, { status: 404 });
    }
    return NextResponse.json({
      id: captura.trechoId ?? captura.id,
      severidade: captura.classeFinal ?? "baixa",
      lengthMeters: DEFAULT_TRECHO_LENGTH_METERS,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "load failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
