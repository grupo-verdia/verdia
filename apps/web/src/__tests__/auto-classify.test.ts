import { afterEach, describe, expect, it, vi } from "vitest";

import {
  drainPendingCapturas,
  enqueueClassify,
  resetAutoClassifyForTests,
} from "@/components/auto-classify";

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

function classifiedResponse(id: string): Response {
  return Response.json({
    captura: { id, classifiedAt: "2026-09-14T00:00:00.000Z" },
  });
}

describe("enqueueClassify", () => {
  afterEach(() => {
    resetAutoClassifyForTests();
    vi.unstubAllGlobals();
  });

  it("POSTs classify two at a time, then starts the next", async () => {
    const started: string[] = [];
    const blockers = new Map<string, ReturnType<typeof deferred<Response>>>();
    for (const id of ["a", "b", "c"]) {
      blockers.set(id, deferred<Response>());
    }
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        const id = url.match(/capturas\/([^/]+)\/classify/)?.[1];
        if (!id) {
          throw new Error(url);
        }
        started.push(id);
        return blockers.get(id)!.promise;
      }),
    );

    enqueueClassify(["a", "b", "c"]);
    await vi.waitFor(() => {
      expect(started).toEqual(["a", "b"]);
    });

    blockers.get("a")!.resolve(classifiedResponse("a"));
    await vi.waitFor(() => {
      expect(started).toEqual(["a", "b", "c"]);
    });

    blockers.get("b")!.resolve(classifiedResponse("b"));
    blockers.get("c")!.resolve(classifiedResponse("c"));
    await vi.waitFor(() => {
      expect(started).toHaveLength(3);
    });
  });

  it("does not POST the same id twice while in flight", async () => {
    const blocker = deferred<Response>();
    const fetchMock = vi.fn(async () => blocker.promise);
    vi.stubGlobal("fetch", fetchMock);

    enqueueClassify(["a"]);
    enqueueClassify(["a", "a"]);
    await vi.waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    blocker.resolve(classifiedResponse("a"));
    await vi.waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });
  });

  it("drains capturas that are still waiting", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/api/capturas?") && !url.includes("/classify")) {
        return Response.json({
          capturas: [
            { id: "waiting", classifiedAt: null },
            { id: "done", classifiedAt: "2026-09-14T00:00:00.000Z" },
          ],
        });
      }
      if (url.includes("/waiting/classify")) {
        return classifiedResponse("waiting");
      }
      throw new Error(url);
    });
    vi.stubGlobal("fetch", fetchMock);

    await drainPendingCapturas();
    await vi.waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/capturas/waiting/classify",
        expect.objectContaining({ method: "POST" }),
      );
    });
    expect(fetchMock.mock.calls.some(([url]) => String(url).includes("/done/classify"))).toBe(
      false,
    );
  });
});
