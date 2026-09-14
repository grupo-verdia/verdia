import { describe, expect, it } from "vitest";

import {
  comparePrazoOrder,
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
    expect(media).toEqual({ dias: 3, label: "Esta semana" });
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
    expect(summer).toEqual({ dias: 25, label: "Em 25 dias" });
    expect(winter).toEqual({ dias: 50, label: "Em 50 dias" });
  });

  it("walks past days at each day's rate, not today's rate for the whole span", () => {
    const prazo = prazoUntilCut(
      {
        alturaCm: 20,
        classe: "média",
        capturedAt: "2026-06-25T10:00:00.000Z",
      },
      WINTER,
    );
    expect(prazo).toEqual({ dias: 30, label: "Em 30 dias" });
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
    expect(
      prazoUntilCut(
        {
          alturaCm: 22,
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
    expect(media).toEqual({ dias: 50, label: "Em 50 dias" });
    expect(baixa).toEqual({ dias: 102, label: "Mais de 90 dias" });
  });

  it("treats a classe correction to alta as cortar agora even if cm is still média", () => {
    expect(
      prazoUntilCut(
        {
          alturaCm: 12,
          classe: "alta",
          capturedAt: "2026-01-15T10:00:00.000Z",
        },
        SUMMER,
      ),
    ).toEqual({ dias: 0, label: "Cortar agora" });
  });

  it("ignores leftover alta cm after a correction to média", () => {
    expect(
      prazoUntilCut(
        {
          alturaCm: 40,
          classe: "média",
          capturedAt: "2026-07-15T10:00:00.000Z",
        },
        WINTER,
      ),
    ).toEqual({ dias: 50, label: "Em 50 dias" });
  });

  it("uses 0.2 through September then 0.4 from October, not a frozen dry-season rate", () => {
    const now = new Date("2026-09-14T12:00:00.000Z");
    const prazo = prazoUntilCut(
      {
        alturaCm: 4,
        classe: "baixa",
        capturedAt: "2026-09-14T10:00:00.000Z",
      },
      now,
    );
    expect(prazo).toEqual({ dias: 74, label: "Em 74 dias" });
    expect(prazo!.dias).toBeLessThan(200);
  });

  it("grows March at 0.4 then April onward at 0.2", () => {
    const prazo = prazoUntilCut(
      {
        alturaCm: 5,
        classe: "baixa",
        capturedAt: "2026-03-01T10:00:00.000Z",
      },
      new Date("2026-04-01T12:00:00.000Z"),
    );
    expect(prazo).toEqual({ dias: 63, label: "Em 63 dias" });
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

describe("comparePrazoOrder", () => {
  it("ties on trechoId so Visão geral matches Planejamento", () => {
    const later = {
      trechoId: "t-b",
      rodoviaId: null,
      km: null,
      prazoDias: 3,
    };
    const earlier = {
      trechoId: "t-a",
      rodoviaId: null,
      km: null,
      prazoDias: 3,
    };
    expect(comparePrazoOrder(later, earlier)).toBeGreaterThan(0);
  });
});
