import { NextRequest, NextResponse } from "next/server";
import {
  createCaptura,
  listCapturas,
  localPersistenceInfo,
} from "@/lib/verdia-store";
import type { Captura } from "@/lib/verdia-domain";

/** Keep spreadsheet + legacy clients aligned (classe/confidence aliases). */
function withLegacyAliases(captura: Captura) {
  return {
    ...captura,
    classe: captura.classeFinal ?? captura.aiClasse,
    confidence: captura.aiConfidence,
  };
}

export async function GET(req?: NextRequest) {
  try {
    const rodoviaId = req?.nextUrl.searchParams.get("rodoviaId") ?? null;
    const capturas = (await listCapturas(rodoviaId ?? undefined)).map(
      withLegacyAliases,
    );
    const persistence = await localPersistenceInfo();
    return NextResponse.json(
      {
        capturas,
        source: persistence.source,
        persistedCount: persistence.count,
        storagePath: persistence.path,
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      },
    );
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "failed" },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    // Backward-compatible contract for the original simulator/tests.
    if (!body.rodoviaId && body.classe !== undefined) {
      const classe = body.classe === null ? null : body.classe;
      const rodovias = await import("@/lib/verdia-store").then(m => m.listRodovias());
      const rodoviaId = rodovias[0]?.id;
      if (!rodoviaId) return NextResponse.json({ error: "Nenhuma rodovia cadastrada." }, { status: 500 });
      const captura = await createCaptura({
        rodoviaId,
        trechoId: typeof body.trechoId === "string" ? body.trechoId : null,
        lat: body.lat,
        lon: body.lon,
        capturedAt: body.capturedAt,
        km: null,
        sentido: null,
        alturaCm: null,
        aiClasse: classe,
        aiConfidence: body.confidence ?? null,
        modelVersion: body.modelVersion ?? null,
        inferenceError: body.inferenceError ?? null,
        imageBytes: body.imageBase64
          ? Uint8Array.from(Buffer.from(body.imageBase64, "base64"))
          : undefined,
        contentType: body.contentType ?? "image/jpeg",
      });
      return NextResponse.json(withLegacyAliases(captura), { status: 201 });
    }
    if (
      typeof body.rodoviaId !== "string" ||
      typeof body.lat !== "number" ||
      typeof body.lon !== "number" ||
      typeof body.capturedAt !== "string"
    ) {
      return NextResponse.json(
        { error: "rodoviaId, lat, lon e capturedAt são obrigatórios" },
        { status: 400 },
      );
    }
    const captura = await createCaptura({
      rodoviaId: body.rodoviaId,
      trechoId: typeof body.trechoId === "string" ? body.trechoId : null,
      lat: body.lat,
      lon: body.lon,
      capturedAt: body.capturedAt,
      km: typeof body.km === "number" ? body.km : null,
      sentido: typeof body.sentido === "string" ? body.sentido : null,
      alturaCm: typeof body.alturaCm === "number" ? body.alturaCm : null,
      aiClasse: body.aiClasse ?? null,
      aiConfidence:
        typeof body.aiConfidence === "number" ? body.aiConfidence : null,
      modelVersion:
        typeof body.modelVersion === "string" ? body.modelVersion : null,
      inferenceError:
        typeof body.inferenceError === "string" ? body.inferenceError : null,
      imageBytes: body.imageBase64
        ? Uint8Array.from(Buffer.from(body.imageBase64, "base64"))
        : undefined,
      contentType:
        typeof body.contentType === "string" ? body.contentType : undefined,
    });
    return NextResponse.json(withLegacyAliases(captura), { status: 201 });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "failed" },
      { status: 500 },
    );
  }
}
