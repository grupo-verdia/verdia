import type { Severidade } from "@/lib/verdia-domain";
export function StatusPill({ value }: { value: Severidade | null }) { return <span className={`status-pill ${value ?? "neutral"}`}><i/>{value ? value[0].toUpperCase()+value.slice(1) : "Pendente"}</span>; }
