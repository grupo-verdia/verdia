"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { bottomNavItems, isNavActive } from "@/components/nav-items";

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="bottom-nav" aria-label="Navegação principal">
      {bottomNavItems.map(({ href, shortLabel, icon: Icon }) => {
        const active = isNavActive(href, pathname);
        return (
          <Link
            key={href}
            href={href}
            className={`bottom-nav-link${active ? " active" : ""}`}
            aria-current={active ? "page" : undefined}
          >
            <span className="bottom-nav-icon">
              <Icon />
            </span>
            <span className="bottom-nav-label">{shortLabel}</span>
          </Link>
        );
      })}
    </nav>
  );
}
