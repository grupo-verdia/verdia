import { NextRequest, NextResponse } from "next/server";

import { getCapturaStore } from "@/lib/persistence";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  try {
    const trecho = await getCapturaStore().getTrecho(id);
    if (!trecho) {
      return NextResponse.json({ error: "trecho not found" }, { status: 404 });
    }
    return NextResponse.json(trecho);
  } catch (error) {
    const message = error instanceof Error ? error.message : "load failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
