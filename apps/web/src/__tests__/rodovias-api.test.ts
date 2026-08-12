import { beforeEach, describe, expect, it } from "vitest";

import { GET as listRodovias } from "@/app/api/rodovias/route";
import { createMemoryStore, setCapturaStore } from "@/lib/persistence";
import { resolveRodoviaParam } from "@/lib/rodovias";

describe("rodovias API", () => {
  beforeEach(() => {
    setCapturaStore(createMemoryStore());
  });

  it("returns Motiva catalog including sp-330", async () => {
    const response = await listRodovias();
    expect(response.status).toBe(200);

    const body = (await response.json()) as {
      rodovias: Array<{ id: string; codigo: string }>;
    };
    expect(body.rodovias.length).toBeGreaterThan(0);
    expect(body.rodovias.some((rodovia) => rodovia.id === "sp-330")).toBe(true);
    expect(body.rodovias.find((rodovia) => rodovia.id === "sp-330")?.codigo).toBe(
      "SP-330",
    );
  });

  it("resolves codigo, id, and todas to catalog ids", () => {
    expect(resolveRodoviaParam("SP-330")).toBe("sp-330");
    expect(resolveRodoviaParam("sp-330")).toBe("sp-330");
    expect(resolveRodoviaParam("SPI-102/330")).toBe("spi-102-330");
    expect(resolveRodoviaParam("todas")).toBe("todas");
    expect(resolveRodoviaParam("not-a-road")).toBeNull();
  });
});
