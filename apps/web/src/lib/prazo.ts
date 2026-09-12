import type { Classe } from "@/lib/domain";

/** ARTESP / PER roadside cut limit used for the maintenance queue. */
export const CUT_LIMIT_CM = 30;

/** Oct–Mar (Brazilian growing season). */
export const GROWTH_OCT_MAR_CM_PER_DAY = 0.3;

/** Apr–Sep. */
export const GROWTH_APR_SEP_CM_PER_DAY = 0.1;

/** Stand-in when classe is média and the photo has no cm. */
export const ASSUMED_MEDIA_CM = 20;

/** Stand-in when classe is baixa and the photo has no cm. */
export const ASSUMED_BAIXA_CM = 5;

/** Visão geral lists trechos whose prazo is in this window. */
export const THIS_WEEK_MAX_DIAS = 7;

export type PrazoInput = {
  alturaCm: number | null;
  classe: Classe | null;
  capturedAt: string;
};

export type Prazo = {
  dias: number;
  label: string;
};

export function growthRateCmPerDay(now: Date): number {
  const month = now.getUTCMonth() + 1;
  if (month >= 10 || month <= 3) {
    return GROWTH_OCT_MAR_CM_PER_DAY;
  }
  return GROWTH_APR_SEP_CM_PER_DAY;
}

function utcMidnightMs(date: Date): number {
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

function calendarDaysSince(capturedAt: string, now: Date): number {
  const captured = new Date(capturedAt);
  if (Number.isNaN(captured.getTime())) {
    return 0;
  }
  const days = Math.round(
    (utcMidnightMs(now) - utcMidnightMs(captured)) / 86_400_000,
  );
  return Math.max(0, days);
}

function photoHeightCm(
  alturaCm: number | null,
  classe: Classe | null,
): number | "over" | null {
  if (typeof alturaCm === "number" && Number.isFinite(alturaCm)) {
    return alturaCm;
  }
  if (classe === "alta") {
    return "over";
  }
  if (classe === "média") {
    return ASSUMED_MEDIA_CM;
  }
  if (classe === "baixa") {
    return ASSUMED_BAIXA_CM;
  }
  return null;
}

export function formatPrazoLabel(dias: number): string {
  if (dias <= 0) {
    return "Cortar agora";
  }
  if (dias <= THIS_WEEK_MAX_DIAS) {
    return "Esta semana";
  }
  return `Em ${dias} dias`;
}

/**
 * Days until projected height hits 30 cm, at today's seasonal rate.
 * Null when there is no visible grass (no height and no classe).
 */
export function prazoUntilCut(input: PrazoInput, now: Date): Prazo | null {
  const photo = photoHeightCm(input.alturaCm, input.classe);
  if (photo === null) {
    return null;
  }
  if (photo === "over") {
    return { dias: 0, label: formatPrazoLabel(0) };
  }

  const rate = growthRateCmPerDay(now);
  const heightToday = photo + calendarDaysSince(input.capturedAt, now) * rate;
  if (heightToday >= CUT_LIMIT_CM) {
    return { dias: 0, label: formatPrazoLabel(0) };
  }
  const dias = Math.ceil((CUT_LIMIT_CM - heightToday) / rate);
  return { dias, label: formatPrazoLabel(dias) };
}

export function isPrazoThisWeek(dias: number): boolean {
  return dias >= 0 && dias <= THIS_WEEK_MAX_DIAS;
}

export function countPrazoBuckets(diasList: Array<number | null>): {
  cortarAgora: number;
  estaSemana: number;
} {
  let cortarAgora = 0;
  let estaSemana = 0;
  for (const dias of diasList) {
    if (dias == null) {
      continue;
    }
    if (dias === 0) {
      cortarAgora += 1;
    } else if (dias <= THIS_WEEK_MAX_DIAS) {
      estaSemana += 1;
    }
  }
  return { cortarAgora, estaSemana };
}
