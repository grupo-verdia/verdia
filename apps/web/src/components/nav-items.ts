import type { ComponentType } from "react";

import {
  IconHome,
  IconList,
  IconMap,
  IconPlus,
  IconPulse,
  IconRoad,
} from "@/components/nav-icons";

export type NavItem = {
  href: string;
  label: string;
  shortLabel: string;
  icon: ComponentType;
};

/** Sidebar order. Bottom bar reorders these same entries. */
export const sidebarNavItems: readonly NavItem[] = [
  { href: "/", label: "Visão geral", shortLabel: "Início", icon: IconHome },
  { href: "/nova-captura", label: "Nova captura", shortLabel: "Captura", icon: IconPlus },
  { href: "/mapa", label: "Mapa", shortLabel: "Mapa", icon: IconMap },
  { href: "/rodovias", label: "Rodovias", shortLabel: "Rodovias", icon: IconRoad },
  { href: "/planejamento", label: "Planejamento", shortLabel: "Plano", icon: IconList },
  { href: "/observabilidade", label: "Observabilidade", shortLabel: "Stats", icon: IconPulse },
];

const BOTTOM_NAV_HREFS = [
  "/",
  "/mapa",
  "/nova-captura",
  "/rodovias",
  "/planejamento",
  "/observabilidade",
] as const;

const itemsByHref = new Map(sidebarNavItems.map((item) => [item.href, item]));

export const bottomNavItems: readonly NavItem[] = BOTTOM_NAV_HREFS.map((href) => {
  const item = itemsByHref.get(href);
  if (!item) {
    throw new Error(`Unknown nav href: ${href}`);
  }
  return item;
});

export function isNavActive(href: string, pathname: string): boolean {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}
