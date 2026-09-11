import { NextResponse } from "next/server";

import { sniffImageContentType } from "@/lib/ingest/image-type";
import { getCapturaStore } from "@/lib/persistence";

type RouteContext = {
  params: Promise<{ id: string }>;
};

/** Bytes of the roadside photo. Used by lists, map popup, and captura detail. */
export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const store = getCapturaStore();
  const captura = await store.getCaptura(id);
  if (!captura) {
    return NextResponse.json({ error: "Captura não encontrada." }, { status: 404 });
  }

  const bytes = await store.getStoredBytes(captura.storageKey);
  if (!bytes) {
    return NextResponse.json({ error: "Foto não encontrada." }, { status: 404 });
  }

  return new NextResponse(Buffer.from(bytes), {
    headers: {
      "Content-Type": sniffImageContentType(bytes),
      "Cache-Control": "private, max-age=3600",
    },
  });
}
