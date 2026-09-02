"use client";

import { usePathname } from "next/navigation";

import { Sidebar } from "@/components/sidebar";

type AppShellProps = {
  children: React.ReactNode;
};

/** Operational shell; nav hidden on login. */
export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const hideNav = pathname === "/login";

  if (hideNav) {
    return <div className="login-shell">{children}</div>;
  }

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="content">{children}</div>
    </div>
  );
}
