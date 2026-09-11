import {
  isClassificationPending,
  type Captura,
  type Severidade,
} from "@/lib/domain";

export function capturaStatus(
  captura: Pick<Captura, "classifiedAt" | "inferenceError" | "classe">,
): { value: Severidade | null; label: string } {
  if (isClassificationPending(captura)) {
    return { value: null, label: "Na fila" };
  }
  if (captura.inferenceError) {
    return { value: null, label: "Falha" };
  }
  if (captura.classe == null) {
    return { value: null, label: "Sem vegetação" };
  }
  return {
    value: captura.classe,
    label: `${captura.classe[0]!.toUpperCase()}${captura.classe.slice(1)}`,
  };
}

export function StatusPill({
  value,
  label,
}: {
  value: Severidade | null;
  label?: string;
}) {
  const text =
    label ??
    (value ? `${value[0]!.toUpperCase()}${value.slice(1)}` : "Pendente");

  return (
    <span className={`status-pill ${value ?? "neutral"}`}>
      <i />
      {text}
    </span>
  );
}
