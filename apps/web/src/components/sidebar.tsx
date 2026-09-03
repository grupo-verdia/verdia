"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { Brand } from "@/components/brand";

const items = [
  { label: "Visão geral", href: "/", icon: IconHome },
  { label: "Nova captura", href: "/nova-captura", icon: IconPlus },
  { label: "Mapa", href: "/mapa", icon: IconMap },
  { label: "Rodovias", href: "/rodovias", icon: IconRoad },
  { label: "Planejamento", href: "/planejamento", icon: IconList },
  { label: "Observabilidade", href: "/observabilidade", icon: IconPulse },
] as const;

function IconHome() {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M2.5 7.2 8 2.8l5.5 4.4V13a1 1 0 0 1-1 1H3.5a1 1 0 0 1-1-1V7.2Z"
        stroke="currentColor"
        strokeWidth="1.4"
      />
    </svg>
  );
}

function IconPlus() {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}

function IconMap() {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M8 8.8a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z"
        stroke="currentColor"
        strokeWidth="1.4"
      />
      <path
        d="M8 14s4.5-4.1 4.5-7.2A4.5 4.5 0 0 0 3.5 6.8C3.5 9.9 8 14 8 14Z"
        stroke="currentColor"
        strokeWidth="1.4"
      />
    </svg>
  );
}

function IconRoad() {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M5 2 3 14M11 2l2 12M8 3v2.2M8 7.4v2.2M8 11.6V14" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}

function IconList() {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M4 4h9M4 8h9M4 12h9M2.5 4h.01M2.5 8h.01M2.5 12h.01"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconPulse() {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M1.5 8h3l1.5-4 2.5 8 1.5-4h4.5"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="sidebar">
      <div className="sidebar-top">
        <Brand />
        <nav aria-label="Navegação principal">
          {items.map(({ label, href, icon: Icon }) => {
            const active =
              href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`nav-link${active ? " active" : ""}`}
                aria-current={active ? "page" : undefined}
              >
                <span className="nav-icon">
                  <Icon />
                </span>
                <span className="nav-label">{label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
