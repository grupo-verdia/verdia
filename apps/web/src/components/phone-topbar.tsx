import { Brand } from "@/components/brand";
import { CreditsLink } from "@/components/credits-link";
import { ThemeToggle } from "@/components/theme-toggle";

export function PhoneTopbar() {
  return (
    <header className="phone-topbar">
      <Brand />
      <CreditsLink />
      <ThemeToggle />
    </header>
  );
}
