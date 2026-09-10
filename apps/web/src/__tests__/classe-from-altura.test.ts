import { describe, expect, it } from "vitest";

import { classeFromAlturaCm, isClassificationPending } from "@/lib/domain";

describe("classeFromAlturaCm Motiva bands", () => {
  it("maps Motiva height bands to classe", () => {
    expect(classeFromAlturaCm(9.9)).toBe("baixa");
    expect(classeFromAlturaCm(10)).toBe("média");
    expect(classeFromAlturaCm(30)).toBe("média");
    expect(classeFromAlturaCm(30.1)).toBe("alta");
    expect(classeFromAlturaCm(null)).toBeNull();
  });
});

describe("isClassificationPending", () => {
  it("is pending until classifiedAt is set", () => {
    expect(isClassificationPending({ classifiedAt: null })).toBe(true);
    expect(isClassificationPending({ classifiedAt: "2026-09-10T12:00:00.000Z" })).toBe(
      false,
    );
  });
});
