import { NextRequest, NextResponse } from "next/server";

import { classifyForIngest } from "@/lib/ingest/classify";
import { getCapturaStore } from "@/lib/persistence";
import { resolveRodoviaParam } from "@/lib/rodovias";

type IngestBody = {
  lat?: unknown;
  lon?: unknown;
  capturedAt?: unknown;
  imageBase64?: unknown;
  contentType?: unknown;
  filename?: unknown;
  rodoviaId?: unknown;
  km?: unknown;
  sentido?: unknown;
};

function parseOptionalNumber(
  value: unknown,
  field: string,
): { ok: true; value: number | null | undefined } | { ok: false; error: string } {
  if (value === undefined) {
    return { ok: true, value: undefined };
  }
  if (value === null || value === "") {
    return { ok: true, value: null };
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return { ok: true, value };
  }
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value);
    if (Number.isFinite(n)) {
      return { ok: true, value: n };
    }
  }
  return { ok: false, error: `${field} must be a number or null` };
}

/**
 * Nova captura ingest: geotagged photo → VLM classify → persist.
 * Feeds dashboard KPIs, ocorrências, mapa, e rodovias via the captura store.
 */
export async function POST(request: NextRequest) {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  if (typeof raw !== "object" || raw === null) {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }
  const body = raw as IngestBody;

  if (typeof body.lat !== "number" || typeof body.lon !== "number") {
    return NextResponse.json({ error: "lat and lon are required" }, { status: 400 });
  }
  if (body.lat < -90 || body.lat > 90 || body.lon < -180 || body.lon > 180) {
    return NextResponse.json({ error: "lat/lon out of range" }, { status: 400 });
  }
  if (typeof body.capturedAt !== "string" || Number.isNaN(Date.parse(body.capturedAt))) {
    return NextResponse.json(
      { error: "capturedAt must be an ISO timestamp" },
      { status: 400 },
    );
  }
  if (typeof body.imageBase64 !== "string" || body.imageBase64.length === 0) {
    return NextResponse.json({ error: "imageBase64 is required" }, { status: 400 });
  }
  if (typeof body.contentType !== "string" || body.contentType.length === 0) {
    return NextResponse.json({ error: "contentType is required" }, { status: 400 });
  }
  const filename =
    typeof body.filename === "string" && body.filename.length > 0
      ? body.filename
      : "upload.jpg";

  let rodoviaId: string | null | undefined;
  if (body.rodoviaId === undefined) {
    rodoviaId = undefined;
  } else if (body.rodoviaId === null || body.rodoviaId === "") {
    rodoviaId = null;
  } else if (typeof body.rodoviaId === "string") {
    const resolved = resolveRodoviaParam(body.rodoviaId);
    if (!resolved || resolved === "todas") {
      return NextResponse.json({ error: "rodoviaId not found" }, { status: 400 });
    }
    rodoviaId = resolved;
  } else {
    return NextResponse.json({ error: "rodoviaId must be a string or null" }, { status: 400 });
  }

  const kmParsed = parseOptionalNumber(body.km, "km");
  if (!kmParsed.ok) {
    return NextResponse.json({ error: kmParsed.error }, { status: 400 });
  }
  let sentido: string | null | undefined;
  if (body.sentido === undefined) {
    sentido = undefined;
  } else if (body.sentido === null || body.sentido === "") {
    sentido = null;
  } else if (typeof body.sentido === "string") {
    sentido = body.sentido;
  } else {
    return NextResponse.json({ error: "sentido must be a string or null" }, { status: 400 });
  }

  let imageBytes: Uint8Array;
  try {
    imageBytes = Uint8Array.from(Buffer.from(body.imageBase64, "base64"));
  } catch {
    return NextResponse.json({ error: "imageBase64 is invalid" }, { status: 400 });
  }

  const verdict = await classifyForIngest({
    filename,
    imageBytes,
    contentType: body.contentType,
  });

  try {
    const captura = await getCapturaStore().createCaptura({
      lat: body.lat,
      lon: body.lon,
      capturedAt: body.capturedAt,
      classe: verdict.classe,
      confidence: verdict.confidence,
      modelVersion: verdict.modelVersion,
      inferenceError: verdict.inferenceError,
      imageBytes,
      contentType: body.contentType,
      rodoviaId,
      km: kmParsed.value,
      sentido,
      alturaCm: verdict.alturaCm,
    });
    return NextResponse.json(
      {
        captura,
        classification: {
          fake: verdict.fake,
          modelVersion: verdict.modelVersion,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "ingest failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
