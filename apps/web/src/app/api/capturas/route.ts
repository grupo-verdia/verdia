import { NextRequest, NextResponse } from "next/server";

import { isClasse, type Classe } from "@/lib/domain";
import { getCapturaStore } from "@/lib/persistence";

type CreateBody = {
  lat?: unknown;
  lon?: unknown;
  capturedAt?: unknown;
  classe?: unknown;
  confidence?: unknown;
  modelVersion?: unknown;
  imageBase64?: unknown;
  contentType?: unknown;
  trechoId?: unknown;
};

function parseCreateBody(body: unknown):
  | { ok: true; value: CreateBody }
  | { ok: false; error: string } {
  if (typeof body !== "object" || body === null) {
    return { ok: false, error: "invalid body" };
  }
  return { ok: true, value: body as CreateBody };
}

export async function GET() {
  try {
    const capturas = await getCapturaStore().listCapturas();
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
  if (body.classe === null || body.classe === undefined) {
    classe = null;
  } else if (isClasse(body.classe)) {
    classe = body.classe;
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

  const trechoId =
    body.trechoId === undefined
      ? undefined
      : typeof body.trechoId === "string"
        ? body.trechoId
        : undefined;
  if (body.trechoId !== undefined && trechoId === undefined) {
    return NextResponse.json({ error: "trechoId must be a string" }, { status: 400 });
  }

  let imageBytes: Uint8Array;
  try {
    imageBytes = Uint8Array.from(Buffer.from(body.imageBase64, "base64"));
  } catch {
    return NextResponse.json({ error: "imageBase64 is invalid" }, { status: 400 });
  }

  try {
    const captura = await getCapturaStore().createCaptura({
      trechoId,
      lat: body.lat,
      lon: body.lon,
      capturedAt: body.capturedAt,
      classe,
      confidence,
      modelVersion,
      imageBytes,
      contentType: body.contentType,
    });
    return NextResponse.json(captura, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "create failed";
    if (message.startsWith("trecho not found")) {
      return NextResponse.json({ error: message }, { status: 404 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
