import { NextResponse } from "next/server";
import { listRodovias } from "@/lib/verdia-store";

export const dynamic = "force-dynamic";

export async function GET(){
  try {
    const rodovias = await listRodovias();
    return NextResponse.json({ rodovias }, { headers: { "Cache-Control": "no-store, no-cache, must-revalidate" } });
  } catch(e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "failed" }, { status:500 });
  }
}
