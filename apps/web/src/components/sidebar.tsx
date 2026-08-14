"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { Brand } from "@/components/brand";

const items = [
  { label: "Visão geral", href: "/", icon: "⌂" },
  { label: "Nova captura", href: "/nova-captura", icon: "+" },
  { label: "Mapa operacional", href: "/mapa", icon: "⌖" },
  { label: "Rodovias e planilhas", href: "/rodovias", icon: "▤" },
  { label: "Planejamento", href: "/planejamento", icon: "✓" },
  { label: "Observabilidade", href: "/observabilidade", icon: "◌" },
] as const;

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="sidebar">
      <div className="sidebar-top">
        <Brand />
        <div className="nav-caption">NAVEGAÇÃO</div>
        <nav aria-label="Navegação principal">
          {items.map(({ label, href, icon }) => {
            const active =
              href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`nav-link${active ? " active" : ""}`}
                aria-current={active ? "page" : undefined}
              >
                <span className="nav-icon" aria-hidden="true">
                  {icon}
                </span>
                <span className="nav-label">{label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="sidebar-footer">
        <span className="status-dot" />
        <span>Sistema operacional</span>
        <small>Monitoramento de vegetação</small>
      </div>
    </aside>
  );
}
