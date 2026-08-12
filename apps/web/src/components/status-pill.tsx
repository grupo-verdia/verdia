import type { Severidade } from "@/lib/domain";

export function StatusPill({ value }: { value: Severidade | null }) {
  const label = value
    ? `${value[0]!.toUpperCase()}${value.slice(1)}`
    : "Pendente";

  return (
    <span className={`status-pill ${value ?? "neutral"}`}>
      <i />
      {label}
    </span>
  );
}
