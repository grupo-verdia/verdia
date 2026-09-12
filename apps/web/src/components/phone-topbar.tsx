import { Brand } from "@/components/brand";
import { ThemeToggle } from "@/components/theme-toggle";

export function PhoneTopbar() {
  return (
    <header className="phone-topbar">
      <Brand />
      <ThemeToggle />
    </header>
  );
}
