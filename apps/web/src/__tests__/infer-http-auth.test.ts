import { afterEach, describe, expect, it, vi } from "vitest";

import { createHttpInferClient } from "@/lib/simulador/http";

const sample = {
  id: "sample-1",
  imageBytes: new Uint8Array([1, 2, 3]),
  contentType: "image/jpeg",
  lat: -23.55,
  lon: -46.63,
  capturedAt: "2026-07-20T12:00:00.000Z",
};

const okInferBody = {
  classe: "média",
  confidence: 0.5,
  model_version: "stub-0.1",
  overlay_png_base64:
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
};

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function authorizationFromFetchCall(
  fetchMock: ReturnType<typeof vi.fn>,
): string | null {
  expect(fetchMock).toHaveBeenCalled();
  const call = fetchMock.mock.calls.at(0);
  expect(call).toBeDefined();
  const init = (call?.[1] ?? {}) as RequestInit;
  return new Headers(init.headers).get("Authorization");
}

describe("createHttpInferClient auth", () => {
  it("sends Authorization Bearer when apiKey is provided", async () => {
    const fetchMock = vi.fn(async () => Response.json(okInferBody));
    vi.stubGlobal("fetch", fetchMock);

    const client = createHttpInferClient("http://ml.example", "test-secret");
    const result = await client.infer(sample);

    expect(result.ok).toBe(true);
    expect(authorizationFromFetchCall(fetchMock)).toBe("Bearer test-secret");
  });

  it("omits Authorization when apiKey is not provided", async () => {
    const fetchMock = vi.fn(async () => Response.json(okInferBody));
    vi.stubGlobal("fetch", fetchMock);

    const client = createHttpInferClient("http://ml.example");
    await client.infer(sample);

    expect(authorizationFromFetchCall(fetchMock)).toBeNull();
  });
});
