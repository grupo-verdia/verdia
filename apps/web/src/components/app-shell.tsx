"use client";

import { usePathname } from "next/navigation";

import { AppNav } from "@/components/app-nav";

type AppShellProps = {
  children: React.ReactNode;
};

/** Protótipo local — shell com sidebar; oculto no login. */
export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const hideNav = pathname === "/login";

  if (hideNav) {
    return <>{children}</>;
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh", alignItems: "stretch" }}>
      <AppNav />
      <div style={{ flex: 1, minWidth: 0, padding: "1.5rem 2rem", }}>{children}</div>
    </div>
  );
}