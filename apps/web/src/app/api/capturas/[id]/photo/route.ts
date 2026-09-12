import { NextResponse } from "next/server";

import { sniffImageContentType } from "@/lib/ingest/image-type";
import { getCapturaStore } from "@/lib/persistence";
import {
  isPlaceholderPhoto,
  NO_IMAGE_HREF,
} from "@/lib/photo/placeholder";

type RouteContext = {
  params: Promise<{ id: string }>;
};

/** Roadside photo bytes. Excel stand-ins redirect to Sem imagem. */
export async function GET(request: Request, context: RouteContext) {
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

  if (isPlaceholderPhoto(bytes)) {
    return NextResponse.redirect(new URL(NO_IMAGE_HREF, request.url));
  }

  return new NextResponse(Buffer.from(bytes), {
    headers: {
      "Content-Type": sniffImageContentType(bytes),
      "Cache-Control": "private, max-age=3600",
    },
  });
}
