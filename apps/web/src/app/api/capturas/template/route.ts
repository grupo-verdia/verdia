import { NextResponse } from "next/server";

import { buildCapturasTemplate } from "@/lib/excel/capturas-xlsx";

export async function GET() {
  try {
    const bytes = buildCapturasTemplate();
    return new NextResponse(Buffer.from(bytes), {
      status: 200,
      headers: {
        "content-type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "content-disposition":
          'attachment; filename="verdia-capturas-template.xlsx"',
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "template failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
