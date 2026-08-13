import { NextRequest, NextResponse } from "next/server";

import { classeFromAlturaCm, isClasse, type Classe } from "@/lib/domain";
import { getCapturaStore } from "@/lib/persistence";
import { resolveRodoviaParam } from "@/lib/rodovias";

type CreateBody = {
  lat?: unknown;
  lon?: unknown;
  capturedAt?: unknown;
  classe?: unknown;
  confidence?: unknown;
  modelVersion?: unknown;
  inferenceError?: unknown;
  imageBase64?: unknown;
  contentType?: unknown;
  trechoId?: unknown;
  rodoviaId?: unknown;
  km?: unknown;
  sentido?: unknown;
  alturaCm?: unknown;
};

function parseCreateBody(body: unknown):
  | { ok: true; value: CreateBody }
  | { ok: false; error: string } {
  if (typeof body !== "object" || body === null) {
    return { ok: false, error: "invalid body" };
  }
  return { ok: true, value: body as CreateBody };
}

function parseOptionalNumber(
  value: unknown,
  field: string,
): { ok: true; value: number | null | undefined } | { ok: false; error: string } {
  if (value === undefined) {
    return { ok: true, value: undefined };
  }
  if (value === null) {
    return { ok: true, value: null };
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return { ok: true, value };
  }
  return { ok: false, error: `${field} must be a number or null` };
}

function parseOptionalString(
  value: unknown,
  field: string,
): { ok: true; value: string | null | undefined } | { ok: false; error: string } {
  if (value === undefined) {
    return { ok: true, value: undefined };
  }
  if (value === null) {
    return { ok: true, value: null };
  }
  if (typeof value === "string") {
    return { ok: true, value };
  }
  return { ok: false, error: `${field} must be a string or null` };
}

export async function GET(request?: NextRequest) {
  try {
    const raw = request?.nextUrl.searchParams.get("rodoviaId");
    const store = getCapturaStore();
    if (!raw || raw.toLowerCase() === "todas") {
      return NextResponse.json({ capturas: await store.listCapturas() });
    }
    const resolved = resolveRodoviaParam(raw);
    const capturas =
      resolved && resolved !== "todas"
        ? await store.listCapturas({ rodoviaId: resolved })
        : [];
    return NextResponse.json({ capturas });
  } catch (error) {
    const message = error instanceof Error ? error.message : "list failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  const parsed = parseCreateBody(raw);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }
  const body = parsed.value;

  if (typeof body.lat !== "number" || typeof body.lon !== "number") {
    return NextResponse.json({ error: "lat and lon are required" }, { status: 400 });
  }
  if (typeof body.capturedAt !== "string" || Number.isNaN(Date.parse(body.capturedAt))) {
    return NextResponse.json({ error: "capturedAt must be an ISO timestamp" }, { status: 400 });
  }
  if (typeof body.imageBase64 !== "string" || body.imageBase64.length === 0) {
    return NextResponse.json({ error: "imageBase64 is required" }, { status: 400 });
  }
  if (typeof body.contentType !== "string" || body.contentType.length === 0) {
    return NextResponse.json({ error: "contentType is required" }, { status: 400 });
  }

  let classe: Classe | null;
  let classeProvided = false;
  if (body.classe === null || body.classe === undefined) {
    classe = null;
  } else if (isClasse(body.classe)) {
    classe = body.classe;
    classeProvided = true;
  } else {
    return NextResponse.json(
      { error: "classe must be baixa, média, alta, or null" },
      { status: 400 },
    );
  }

  const confidence =
    body.confidence === null || body.confidence === undefined
      ? null
      : typeof body.confidence === "number"
        ? body.confidence
        : undefined;
  if (confidence === undefined) {
    return NextResponse.json({ error: "confidence must be a number or null" }, { status: 400 });
  }

  const modelVersion =
    body.modelVersion === null || body.modelVersion === undefined
      ? null
      : typeof body.modelVersion === "string"
        ? body.modelVersion
        : undefined;
  if (modelVersion === undefined) {
    return NextResponse.json(
      { error: "modelVersion must be a string or null" },
      { status: 400 },
    );
  }

  const inferenceError =
    body.inferenceError === null || body.inferenceError === undefined
      ? null
      : typeof body.inferenceError === "string"
        ? body.inferenceError
        : undefined;
  if (inferenceError === undefined) {
    return NextResponse.json(
      { error: "inferenceError must be a string or null" },
      { status: 400 },
    );
  }

  if (body.trechoId !== undefined) {
    return NextResponse.json(
      { error: "trechoId is not accepted; each captura creates its own trecho" },
      { status: 400 },
    );
  }

  const rodoviaIdParsed = parseOptionalString(body.rodoviaId, "rodoviaId");
  if (!rodoviaIdParsed.ok) {
    return NextResponse.json({ error: rodoviaIdParsed.error }, { status: 400 });
  }
  let rodoviaId = rodoviaIdParsed.value;
  if (typeof rodoviaId === "string" && rodoviaId.length > 0) {
    const resolved = resolveRodoviaParam(rodoviaId);
    if (!resolved || resolved === "todas") {
      return NextResponse.json({ error: "rodoviaId not found" }, { status: 400 });
    }
    rodoviaId = resolved;
  }
  const kmParsed = parseOptionalNumber(body.km, "km");
  if (!kmParsed.ok) {
    return NextResponse.json({ error: kmParsed.error }, { status: 400 });
  }
  const sentidoParsed = parseOptionalString(body.sentido, "sentido");
  if (!sentidoParsed.ok) {
    return NextResponse.json({ error: sentidoParsed.error }, { status: 400 });
  }
  const alturaCmParsed = parseOptionalNumber(body.alturaCm, "alturaCm");
  if (!alturaCmParsed.ok) {
    return NextResponse.json({ error: alturaCmParsed.error }, { status: 400 });
  }

  const alturaCm = alturaCmParsed.value;
  if (!classeProvided && typeof alturaCm === "number") {
    classe = classeFromAlturaCm(alturaCm);
  }

  let imageBytes: Uint8Array;
  try {
    imageBytes = Uint8Array.from(Buffer.from(body.imageBase64, "base64"));
  } catch {
    return NextResponse.json({ error: "imageBase64 is invalid" }, { status: 400 });
  }

  try {
    const captura = await getCapturaStore().createCaptura({
      lat: body.lat,
      lon: body.lon,
      capturedAt: body.capturedAt,
      classe,
      confidence,
      modelVersion,
      inferenceError,
      imageBytes,
      contentType: body.contentType,
      rodoviaId,
      km: kmParsed.value,
      sentido: sentidoParsed.value,
      alturaCm,
    });
    return NextResponse.json(captura, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "create failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const raw = request.nextUrl.searchParams.get("rodoviaId") ?? "todas";
    const rodoviaId = resolveRodoviaParam(raw);
    if (!rodoviaId) {
      return NextResponse.json({ error: "rodoviaId not found" }, { status: 400 });
    }
    const removed = await getCapturaStore().clearCapturas(rodoviaId);
    return NextResponse.json({
      ok: true,
      removed,
      message:
        rodoviaId === "todas"
          ? `${removed} registros removidos de todas as rodovias.`
          : `${removed} registros removidos da rodovia selecionada.`,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao limpar.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
