import { describe, expect, it } from "vitest";

import { capturaStatus } from "@/components/status-pill";
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

describe("capturaStatus", () => {
  it("labels waiting, failure, and no grass apart from classe", () => {
    expect(
      capturaStatus({
        classifiedAt: null,
        inferenceError: null,
        classe: null,
      }).label,
    ).toBe("Na fila");
    expect(
      capturaStatus({
        classifiedAt: "2026-09-10T12:00:00.000Z",
        inferenceError: "timeout",
        classe: null,
      }).label,
    ).toBe("Falha");
    expect(
      capturaStatus({
        classifiedAt: "2026-09-10T12:00:00.000Z",
        inferenceError: null,
        classe: null,
      }).label,
    ).toBe("Sem vegetação");
    expect(
      capturaStatus({
        classifiedAt: "2026-09-10T12:00:00.000Z",
        inferenceError: null,
        classe: "alta",
      }).label,
    ).toBe("Alta");
  });
});
