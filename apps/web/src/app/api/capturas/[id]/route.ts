import { NextRequest, NextResponse } from "next/server";

import { isClasse, type Classe } from "@/lib/domain";
import { getCapturaStore } from "@/lib/persistence";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  if (typeof body !== "object" || body === null) {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  const record = body as { classeFinal?: unknown; classe?: unknown; motivo?: unknown };
  const classeRaw = record.classeFinal ?? record.classe;
  if (!isClasse(classeRaw)) {
    return NextResponse.json(
      { error: "classeFinal e motivo são obrigatórios" },
      { status: 400 },
    );
  }
  if (typeof record.motivo !== "string" || record.motivo.trim().length < 5) {
    return NextResponse.json(
      { error: "classeFinal e motivo são obrigatórios" },
      { status: 400 },
    );
  }

  try {
    const captura = await getCapturaStore().overrideCaptura(id, {
      classe: classeRaw as Classe,
      motivo: record.motivo.trim(),
    });
    return NextResponse.json(captura);
  } catch (error) {
    const message = error instanceof Error ? error.message : "failed";
    const status = message === "captura not found" ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
