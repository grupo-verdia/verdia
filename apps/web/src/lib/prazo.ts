import {
  classeFromAlturaCm,
  MOTIVA_MEDIA_MAX_INCLUSIVE_CM,
  type Classe,
} from "@/lib/domain";

/** Roadside cut limit. Same as the top of Motiva's média band. */
export const CUT_LIMIT_CM = MOTIVA_MEDIA_MAX_INCLUSIVE_CM;

/** Oct–Mar (Brazilian growing season). */
export const GROWTH_OCT_MAR_CM_PER_DAY = 0.3;

/** Apr–Sep. */
export const GROWTH_APR_SEP_CM_PER_DAY = 0.1;

/** Assumed height when classe is média and the photo has no matching cm. */
export const ASSUMED_MEDIA_CM = 20;

/** Assumed height when classe is baixa and the photo has no matching cm. */
export const ASSUMED_BAIXA_CM = 5;

/** Visão geral lists trechos whose prazo is in this window (0-7 days). */
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

export type PrazoOrderKey = {
  prazoDias: number | null;
  rodoviaId: string | null;
  km: number | null;
  trechoId: string;
};

function growthRateCmPerDay(now: Date): number {
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

function compareNullsLast<T>(
  a: T | null,
  b: T | null,
  cmp: (left: T, right: T) => number,
): number {
  if (a === null && b === null) {
    return 0;
  }
  if (a === null) {
    return 1;
  }
  if (b === null) {
    return -1;
  }
  return cmp(a, b);
}

/**
 * Height used for the 30 cm projection.
 * Alta is already at the limit. Stored cm is used only when it still matches
 * classe. A field correction changes classe and leaves the old cm in place.
 */
function photoHeightCm(
  alturaCm: number | null,
  classe: Classe | null,
): number | null {
  if (classe === "alta") {
    return CUT_LIMIT_CM;
  }
  if (
    typeof alturaCm === "number" &&
    Number.isFinite(alturaCm) &&
    classeFromAlturaCm(alturaCm) === classe
  ) {
    return alturaCm;
  }
  if (classe === "média") {
    return ASSUMED_MEDIA_CM;
  }
  if (classe === "baixa") {
    return ASSUMED_BAIXA_CM;
  }
  return null;
}

function formatPrazoLabel(dias: number): string {
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
 * Null when classe is empty after classification.
 */
export function prazoUntilCut(input: PrazoInput, now: Date): Prazo | null {
  const photo = photoHeightCm(input.alturaCm, input.classe);
  if (photo === null) {
    return null;
  }

  const rate = growthRateCmPerDay(now);
  const heightToday = photo + calendarDaysSince(input.capturedAt, now) * rate;
  if (heightToday >= CUT_LIMIT_CM) {
    return { dias: 0, label: formatPrazoLabel(0) };
  }
  const dias = Math.ceil((CUT_LIMIT_CM - heightToday) / rate);
  return { dias, label: formatPrazoLabel(dias) };
}

/** Cortar agora (0) and Esta semana (1–7) on Visão geral. */
export function isPrazoThisWeek(dias: number): boolean {
  return dias >= 0 && dias <= THIS_WEEK_MAX_DIAS;
}

/** Prazo, then rodovia, then km, then trecho. Nulls last. */
export function comparePrazoOrder(a: PrazoOrderKey, b: PrazoOrderKey): number {
  const prazoA = a.prazoDias ?? Number.POSITIVE_INFINITY;
  const prazoB = b.prazoDias ?? Number.POSITIVE_INFINITY;
  if (prazoA !== prazoB) {
    return prazoA - prazoB;
  }
  const rodoviaDiff = compareNullsLast(a.rodoviaId, b.rodoviaId, (left, right) =>
    left.localeCompare(right),
  );
  if (rodoviaDiff !== 0) {
    return rodoviaDiff;
  }
  const kmDiff = compareNullsLast(a.km, b.km, (left, right) => left - right);
  if (kmDiff !== 0) {
    return kmDiff;
  }
  return a.trechoId.localeCompare(b.trechoId);
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
