import { NextRequest, NextResponse } from "next/server";

import { parseCapturasWorkbook, type CapturaRowError } from "@/lib/excel/capturas-xlsx";
import { getCapturaStore } from "@/lib/persistence";
import { getRodoviaById } from "@/lib/rodovias";

export async function POST(request: NextRequest) {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "invalid multipart body" }, { status: 400 });
  }

  const rodoviaIdRaw = form.get("rodoviaId");
  if (typeof rodoviaIdRaw !== "string" || rodoviaIdRaw.length === 0) {
    return NextResponse.json({ error: "rodoviaId is required" }, { status: 400 });
  }
  if (!getRodoviaById(rodoviaIdRaw)) {
    return NextResponse.json({ error: "rodoviaId not found" }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "file is required" }, { status: 400 });
  }

  const buffer = await file.arrayBuffer();
  const parsed = parseCapturasWorkbook(buffer, rodoviaIdRaw);
  if (!parsed.ok) {
    return NextResponse.json(
      { imported: 0, received: 0, errors: parsed.errors },
      { status: 400 },
    );
  }

  const store = getCapturaStore();
  const errors: CapturaRowError[] = [...parsed.errors];
  let imported = 0;
  const received = parsed.drafts.length + parsed.errors.length;

  for (const draft of parsed.drafts) {
    try {
      await store.createCaptura(draft.input);
      imported += 1;
    } catch (error) {
      const message = error instanceof Error ? error.message : "create failed";
      errors.push({ row: draft.row, message });
    }
  }

  return NextResponse.json({ imported, received, errors });
}
