"use client";

import { usePathname } from "next/navigation";

import { BottomNav } from "@/components/bottom-nav";
import { PhoneTopbar } from "@/components/phone-topbar";
import { Sidebar } from "@/components/sidebar";
import { ThemeToggle } from "@/components/theme-toggle";

type AppShellProps = {
  children: React.ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const hideNav = pathname === "/login";

  if (hideNav) {
    return (
      <div className="login-shell">
        <div className="login-theme">
          <ThemeToggle />
        </div>
        {children}
      </div>
    );
  }

  return (
    <div className="app-shell">
      <PhoneTopbar />
      <Sidebar />
      <div className="content">{children}</div>
      <BottomNav />
    </div>
  );
}
