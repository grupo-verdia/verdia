import { describe, expect, it } from "vitest";

import { colaboradores, initials } from "@/lib/equipe";

describe("equipe", () => {
  it("credits every group member with a LinkedIn profile", () => {
    expect(colaboradores).toHaveLength(5);
    for (const { linkedin } of colaboradores) {
      expect(linkedin).toMatch(/^https:\/\/www\.linkedin\.com\/in\/[^/]+\/$/);
    }
  });

  it("uses first and last name initials", () => {
    expect(initials("Bruno Otávio da Cruz Carvalho")).toBe("BC");
    expect(initials("Letícia Gabrielle Andrade Temóteo")).toBe("LT");
    expect(initials("Stefanny")).toBe("S");
  });
});
