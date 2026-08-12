"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/", label: "Visão Geral", match: (p: string) => p === "/" },
  {
    href: "/mapa",
    label: "Mapa",
    match: (p: string) => p.startsWith("/mapa"),
  },
  {
    href: "/rodovias",
    label: "Rodovias e planilhas",
    match: (p: string) => p.startsWith("/rodovias"),
  },
  {
    href: "/observabilidade",
    label: "Observabilidade",
    match: (p: string) => p.startsWith("/observabilidade"),
  },
] as const;

/** Protótipo local — indicação de item ativo na navegação. */
export function AppNav() {
  const pathname = usePathname();

  return (
    <aside
      aria-label="Navegação principal"
      style={{
        width: 220,
        flexShrink: 0,
        padding: "1.25rem 0.85rem",
        borderRight: "5px solid #7b16a3",
        background: "#ffffff",
        minHeight: "100vh",
        fontFamily: "var(--font-geist), sans-serif",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.65rem",
          margin: "0 0.5rem 1.35rem",
        }}
      >
        <div
          aria-hidden
          style={{
            width: 34,
            height: 34,
            borderRadius: 9,
            background: "#16a34a",
            color: "#ffffff",
            display: "grid",
            placeItems: "center",
            fontWeight: 700,
            fontSize: "1.05rem",
            letterSpacing: "-0.03em",
            flexShrink: 0,
          }}
        >
          V
        </div>
        <div style={{ minWidth: 0, lineHeight: 1.15 }}>
          <div
            style={{
              fontWeight: 700,
              fontSize: "1.05rem",
              color: "#16a34a",
              letterSpacing: "-0.02em",
            }}
          >
            Verdia
          </div>
          <div
            style={{
              fontSize: "0.78rem",
              color: "#7b16a3",
              marginTop: 2,
              fontWeight: 500,
            }}
          >
            Motiva
          </div>
        </div>
      </div>
      <nav style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
        {ITEMS.map((item) => {
          const active = item.match(pathname);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              style={{
                display: "block",
                padding: "0.6rem 0.75rem",
                borderRadius: 8,
                textDecoration: "none",
                fontWeight: active ? 600 : 400,
                color: active ? "#0f172a" : "#475569",
                background: active ? "#e2e8f0" : "transparent",
                borderLeft: active
                  ? "3px solid #7b16a3"
                  : "3px solid transparent",
              }}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
