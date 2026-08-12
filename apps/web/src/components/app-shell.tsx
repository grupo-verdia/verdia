"use client";

import { usePathname } from "next/navigation";

import { AppNav } from "@/components/app-nav";

type AppShellProps = {
  children: React.ReactNode;
};

/** Shell com AppNav do zip; oculto no login. */
export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const hideNav = pathname === "/login";

  if (hideNav) {
    return <div className="login-shell">{children}</div>;
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh", alignItems: "stretch" }}>
      <AppNav />
      <div style={{ flex: 1, minWidth: 0, padding: "1.5rem 2rem" }}>
        {children}
      </div>
    </div>
  );
}
