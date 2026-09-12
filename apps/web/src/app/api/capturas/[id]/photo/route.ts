import { NextRequest, NextResponse } from "next/server";

import { sniffImageContentType } from "@/lib/ingest/image-type";
import { getCapturaStore } from "@/lib/persistence";
import {
  isPlaceholderPhoto,
  NO_IMAGE_HREF,
} from "@/lib/photo/placeholder";

type RouteContext = {
  params: Promise<{ id: string }>;
};

/** Serves the roadside photo, or Sem imagem when Excel had none. */
export async function GET(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  try {
    const store = getCapturaStore();
    const captura = await store.getCaptura(id);
    if (!captura) {
      return NextResponse.json(
        { error: "Captura não encontrada." },
        { status: 404 },
      );
    }
    const bytes = await store.getStoredBytes(captura.storageKey);
    if (!bytes) {
      return NextResponse.json(
        { error: "Foto não encontrada." },
        { status: 404 },
      );
    }
    if (isPlaceholderPhoto(bytes)) {
      return NextResponse.redirect(new URL(NO_IMAGE_HREF, request.url));
    }
    return new NextResponse(Buffer.from(bytes), {
      headers: {
        "content-type": sniffImageContentType(bytes),
        "cache-control": "private, max-age=3600",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "photo failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
