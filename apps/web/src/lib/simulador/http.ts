import { isClasse } from "@/lib/domain";
import type {
  InferClient,
  InferResult,
  PersistClient,
  PersistInput,
  PersistResult,
  SampleCaptura,
} from "@/lib/simulador";

type InferResponseBody = {
  classe?: unknown;
  confidence?: unknown;
  model_version?: unknown;
  overlay_png_base64?: unknown;
  detail?: unknown;
};

/** HTTP client for the Inference API `POST /infer` boundary. */
export function createHttpInferClient(baseUrl: string): InferClient {
  const root = baseUrl.replace(/\/$/, "");

  return {
    async infer(sample: SampleCaptura): Promise<InferResult> {
      const form = new FormData();
      form.append(
        "image",
        new Blob([Buffer.from(sample.imageBytes)], { type: sample.contentType }),
        `${sample.id}.bin`,
      );
      form.append("lat", String(sample.lat));
      form.append("lon", String(sample.lon));
      form.append("captured_at", sample.capturedAt);

      let response: Response;
      try {
        response = await fetch(`${root}/infer`, {
          method: "POST",
          body: form,
        });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "network error";
        return { ok: false, error: `Inference API unreachable: ${message}` };
      }

      let body: InferResponseBody = {};
      try {
        body = (await response.json()) as InferResponseBody;
      } catch {
        return {
          ok: false,
          error: `Inference API returned non-JSON (${response.status})`,
        };
      }

      if (!response.ok) {
        const detail =
          typeof body.detail === "string"
            ? body.detail
            : `HTTP ${response.status}`;
        return { ok: false, error: detail };
      }

      if (
        !isClasse(body.classe) ||
        typeof body.confidence !== "number" ||
        typeof body.model_version !== "string" ||
        typeof body.overlay_png_base64 !== "string" ||
        body.overlay_png_base64.length === 0
      ) {
        return { ok: false, error: "Inference API response missing fields" };
      }

      let overlayPngBytes: Uint8Array;
      try {
        overlayPngBytes = Uint8Array.from(
          Buffer.from(body.overlay_png_base64, "base64"),
        );
      } catch {
        return { ok: false, error: "Inference API overlay_png_base64 is invalid" };
      }
      if (overlayPngBytes.byteLength === 0) {
        return { ok: false, error: "Inference API overlay_png_base64 is empty" };
      }

      return {
        ok: true,
        classe: body.classe,
        confidence: body.confidence,
        modelVersion: body.model_version,
        overlayPngBytes,
      };
    },
  };
}

type CapturaResponseBody = {
  id?: unknown;
  error?: unknown;
};

/** HTTP client for the web BFF `POST /api/capturas` boundary. */
export function createHttpPersistClient(
  webBaseUrl: string,
  sessionCookie: string,
): PersistClient {
  const root = webBaseUrl.replace(/\/$/, "");

  return {
    async persist(input: PersistInput): Promise<PersistResult> {
      const imageBase64 = Buffer.from(input.sample.imageBytes).toString(
        "base64",
      );

      let response: Response;
      try {
        response = await fetch(`${root}/api/capturas`, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            cookie: sessionCookie,
          },
          body: JSON.stringify({
            lat: input.sample.lat,
            lon: input.sample.lon,
            capturedAt: input.sample.capturedAt,
            classe: input.classe,
            confidence: input.confidence,
            modelVersion: input.modelVersion,
            inferenceError: input.inferenceError,
            imageBase64,
            contentType: input.sample.contentType,
            overlayBase64: input.overlayPngBytes
              ? Buffer.from(input.overlayPngBytes).toString("base64")
              : null,
            overlayContentType: input.overlayPngBytes ? "image/png" : null,
          }),
        });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "network error";
        return { ok: false, error: `BFF unreachable: ${message}` };
      }

      let body: CapturaResponseBody = {};
      try {
        body = (await response.json()) as CapturaResponseBody;
      } catch {
        return {
          ok: false,
          error: `BFF returned non-JSON (${response.status})`,
        };
      }

      if (!response.ok || typeof body.id !== "string") {
        const message =
          typeof body.error === "string"
            ? body.error
            : `HTTP ${response.status}`;
        return { ok: false, error: message };
      }

      return { ok: true, capturaId: body.id };
    },
  };
}

/** Login to the web app and return a `cookie` header value for BFF calls. */
export async function loginSessionCookie(
  webBaseUrl: string,
  password: string,
): Promise<string> {
  const root = webBaseUrl.replace(/\/$/, "");
  const response = await fetch(`${root}/api/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ password }),
  });

  if (!response.ok) {
    throw new Error(`login failed (${response.status})`);
  }

  const setCookie = response.headers.getSetCookie?.() ?? [];
  const fromList = setCookie.find((value) =>
    value.startsWith("verdia_session="),
  );
  if (fromList) {
    return fromList.split(";", 1)[0] ?? fromList;
  }

  const header = response.headers.get("set-cookie");
  if (!header || !header.includes("verdia_session=")) {
    throw new Error("login response missing verdia_session cookie");
  }
  const match = header.match(/verdia_session=[^;]+/);
  if (!match) {
    throw new Error("login response missing verdia_session cookie");
  }
  return match[0];
}
