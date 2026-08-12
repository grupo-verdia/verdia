import { NextRequest, NextResponse } from "next/server";

import type { Captura } from "@/lib/domain";
import {
  isExcelBuffer,
  isExcelFilename,
  MAX_IMPORT_BYTES,
  parseCapturasWorkbook,
  type CapturaRowError,
} from "@/lib/excel/capturas-xlsx";
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
  if (rodoviaIdRaw !== "todas" && !getRodoviaById(rodoviaIdRaw)) {
    return NextResponse.json({ error: "rodoviaId not found" }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "file is required" }, { status: 400 });
  }

  if (!isExcelFilename(file.name)) {
    return NextResponse.json(
      { error: "only Excel files (.xlsx, .xls) are accepted" },
      { status: 400 },
    );
  }

  if (file.size > MAX_IMPORT_BYTES) {
    return NextResponse.json(
      {
        error: `file exceeds ${MAX_IMPORT_BYTES} bytes`,
      },
      { status: 400 },
    );
  }

  const buffer = await file.arrayBuffer();
  if (buffer.byteLength > MAX_IMPORT_BYTES) {
    return NextResponse.json(
      {
        error: `file exceeds ${MAX_IMPORT_BYTES} bytes`,
      },
      { status: 400 },
    );
  }

  const bytes = new Uint8Array(buffer);
  if (!isExcelBuffer(bytes)) {
    return NextResponse.json(
      { error: "file is not a valid Excel workbook" },
      { status: 400 },
    );
  }

  const parsed = parseCapturasWorkbook(buffer, rodoviaIdRaw);
  if (!parsed.ok) {
    return NextResponse.json(
      { imported: 0, received: 0, errors: parsed.errors },
      { status: 400 },
    );
  }

  const store = getCapturaStore();
  const errors: CapturaRowError[] = [...parsed.errors];
  const capturas: Captura[] = [];
  const received = parsed.drafts.length + parsed.errors.length;

  for (const draft of parsed.drafts) {
    try {
      capturas.push(await store.createCaptura(draft.input));
    } catch (error) {
      const message = error instanceof Error ? error.message : "create failed";
      errors.push({ row: draft.row, message });
    }
  }

  return NextResponse.json({
    imported: capturas.length,
    received,
    errors,
    capturas,
  });
}
