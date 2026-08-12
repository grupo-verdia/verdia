import { describe, expect, it } from "vitest";

import { classeFromAlturaCm } from "@/lib/domain";

describe("classeFromAlturaCm Motiva bands", () => {
  it("maps Motiva height bands to classe", () => {
    expect(classeFromAlturaCm(9.9)).toBe("baixa");
    expect(classeFromAlturaCm(10)).toBe("média");
    expect(classeFromAlturaCm(30)).toBe("média");
    expect(classeFromAlturaCm(30.1)).toBe("alta");
    expect(classeFromAlturaCm(null)).toBeNull();
  });
});
