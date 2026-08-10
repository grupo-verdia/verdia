"use client";

import { usePathname } from "next/navigation";

import { Sidebar } from "@/components/sidebar";

type AppShellProps = {
  children: React.ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const hideNav = pathname === "/login";

  if (hideNav) {
    return <>{children}</>;
  }

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="content">{children}</div>
    </div>
  );
}
