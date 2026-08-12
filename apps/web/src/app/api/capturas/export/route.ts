import { NextRequest, NextResponse } from "next/server";

import { buildCapturasWorkbook } from "@/lib/excel/capturas-xlsx";
import { getCapturaStore } from "@/lib/persistence";
import { getRodoviaById } from "@/lib/rodovias";

export async function GET(request: NextRequest) {
  const rodoviaId = request.nextUrl.searchParams.get("rodoviaId");
  if (!rodoviaId) {
    return NextResponse.json({ error: "rodoviaId is required" }, { status: 400 });
  }
  if (!getRodoviaById(rodoviaId)) {
    return NextResponse.json({ error: "rodoviaId not found" }, { status: 400 });
  }

  try {
    const store = getCapturaStore();
    const capturas = await store.listCapturas({ rodoviaId });
    const rodovias = await store.listRodovias();
    const rodoviaCodigoById: Record<string, string> = {};
    for (const rodovia of rodovias) {
      rodoviaCodigoById[rodovia.id] = rodovia.codigo;
    }

    const bytes = buildCapturasWorkbook(capturas, rodoviaCodigoById);
    const filename = `capturas-${rodoviaId}.xlsx`;
    return new NextResponse(Buffer.from(bytes), {
      status: 200,
      headers: {
        "content-type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "content-disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "export failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
