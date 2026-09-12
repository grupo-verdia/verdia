import { describe, expect, it } from "vitest";

import {
  countPrazoBuckets,
  prazoUntilCut,
} from "@/lib/prazo";

const SUMMER = new Date("2026-01-15T12:00:00.000Z");
const WINTER = new Date("2026-07-15T12:00:00.000Z");

describe("prazoUntilCut", () => {
  it("marks height at or over 30 cm as cortar agora", () => {
    expect(
      prazoUntilCut(
        {
          alturaCm: 32,
          classe: "alta",
          capturedAt: "2026-01-15T10:00:00.000Z",
        },
        SUMMER,
      ),
    ).toEqual({ dias: 0, label: "Cortar agora" });
    expect(
      prazoUntilCut(
        {
          alturaCm: 30,
          classe: "média",
          capturedAt: "2026-01-15T10:00:00.000Z",
        },
        SUMMER,
      ),
    ).toEqual({ dias: 0, label: "Cortar agora" });
    expect(
      prazoUntilCut(
        { alturaCm: null, classe: "alta", capturedAt: "2026-01-15T10:00:00.000Z" },
        SUMMER,
      ),
    ).toEqual({ dias: 0, label: "Cortar agora" });
  });

  it("puts média near 30 cm ahead of baixa", () => {
    const media = prazoUntilCut(
      {
        alturaCm: 29,
        classe: "média",
        capturedAt: "2026-01-15T10:00:00.000Z",
      },
      SUMMER,
    );
    const baixa = prazoUntilCut(
      {
        alturaCm: 5,
        classe: "baixa",
        capturedAt: "2026-01-15T10:00:00.000Z",
      },
      SUMMER,
    );
    expect(media?.dias).toBe(4);
    expect(media?.label).toBe("Esta semana");
    expect(baixa?.dias).toBeGreaterThan(media!.dias);
  });

  it("grows faster in Oct–Mar than in Apr–Sep", () => {
    const input = {
      alturaCm: 20,
      classe: "média" as const,
      capturedAt: "2026-01-15T10:00:00.000Z",
    };
    const summer = prazoUntilCut(input, SUMMER);
    const winter = prazoUntilCut(
      { ...input, capturedAt: "2026-07-15T10:00:00.000Z" },
      WINTER,
    );
    expect(summer?.dias).toBe(34);
    expect(winter?.dias).toBe(100);
    expect(summer!.dias).toBeLessThan(winter!.dias);
  });

  it("projects height from days since the photo at today's rate", () => {
    const prazo = prazoUntilCut(
      {
        alturaCm: 20,
        classe: "média",
        capturedAt: "2026-06-25T10:00:00.000Z",
      },
      WINTER,
    );
    expect(prazo).toEqual({ dias: 80, label: "Em 80 dias" });
  });

  it("returns no prazo when the strip has no visible grass", () => {
    expect(
      prazoUntilCut(
        {
          alturaCm: null,
          classe: null,
          capturedAt: "2026-01-15T10:00:00.000Z",
        },
        SUMMER,
      ),
    ).toBeNull();
  });

  it("uses 20 cm for média and 5 cm for baixa when cm is missing", () => {
    const media = prazoUntilCut(
      { alturaCm: null, classe: "média", capturedAt: "2026-07-15T10:00:00.000Z" },
      WINTER,
    );
    const baixa = prazoUntilCut(
      { alturaCm: null, classe: "baixa", capturedAt: "2026-07-15T10:00:00.000Z" },
      WINTER,
    );
    expect(media).toEqual({ dias: 100, label: "Em 100 dias" });
    expect(baixa).toEqual({ dias: 250, label: "Em 250 dias" });
  });
});

describe("countPrazoBuckets", () => {
  it("counts cortar agora and esta semana, ignoring later and empty prazo", () => {
    expect(countPrazoBuckets([0, 0, 3, 7, 8, null])).toEqual({
      cortarAgora: 2,
      estaSemana: 2,
    });
  });
});
