import { NextResponse } from "next/server";

import { getCapturaStore } from "@/lib/persistence";

export async function GET() {
  try {
    const rodovias = await getCapturaStore().listRodovias();
    return NextResponse.json({ rodovias });
  } catch (error) {
    const message = error instanceof Error ? error.message : "list failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
