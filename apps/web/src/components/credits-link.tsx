"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function CreditsLink() {
  const active = usePathname() === "/equipe";

  return (
    <Link
      href="/equipe"
      className={`credits-link${active ? " active" : ""}`}
      aria-current={active ? "page" : undefined}
      aria-label="Feito com amor por: equipe"
      title="Equipe"
    >
      <span className="credits-label">Feito com </span>
      <span className="heart" aria-hidden="true">
        ♥
      </span>
      <span className="credits-label"> por: equipe</span>
    </Link>
  );
}
