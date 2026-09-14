import {
  classeFromAlturaCm,
  MOTIVA_MEDIA_MAX_INCLUSIVE_CM,
  type Classe,
} from "@/lib/domain";

/** Roadside cut limit. Same as the top of Motiva's média band. */
export const CUT_LIMIT_CM = MOTIVA_MEDIA_MAX_INCLUSIVE_CM;

/** Oct–Mar wet/growing season. Operational estimate until Motiva confirms. */
export const GROWTH_OCT_MAR_CM_PER_DAY = 0.4;

/** Apr–Sep. Operational estimate until Motiva confirms. */
export const GROWTH_APR_SEP_CM_PER_DAY = 0.2;

/** Assumed height when classe is média and the photo has no matching cm. */
export const ASSUMED_MEDIA_CM = 20;

/** Assumed height when classe is baixa and the photo has no matching cm. */
export const ASSUMED_BAIXA_CM = 5;

/** Visão geral lists trechos whose prazo is in this window (0-7 days). */
export const THIS_WEEK_MAX_DIAS = 7;

/** Label cap only. Sort still uses the real day count. */
export const FAR_PRAZO_DIAS = 90;

/** Stop a runaway walk instead of hanging tests. */
const MAX_WALK_DAYS = 365 * 3;

const MS_PER_DAY = 86_400_000;

/** Integer 0.01 cm units so ceil(remaining / rate) is not off by a float leftover. */
const CUT_LIMIT_HUNDREDTHS = Math.round(CUT_LIMIT_CM * 100);
const GROWTH_OCT_MAR_HUNDREDTHS = Math.round(GROWTH_OCT_MAR_CM_PER_DAY * 100);
const GROWTH_APR_SEP_HUNDREDTHS = Math.round(GROWTH_APR_SEP_CM_PER_DAY * 100);

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

function growthHundredthsPerDay(date: Date): number {
  const month = date.getUTCMonth() + 1;
  if (month >= 10 || month <= 3) {
    return GROWTH_OCT_MAR_HUNDREDTHS;
  }
  return GROWTH_APR_SEP_HUNDREDTHS;
}

function utcMidnightMs(date: Date): number {
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

/** Next 1 Oct or 1 Apr after this UTC calendar day. */
function nextSeasonStartMs(date: Date): number {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + 1;
  if (month >= 4 && month <= 9) {
    return Date.UTC(year, 9, 1);
  }
  if (month >= 10) {
    return Date.UTC(year + 1, 3, 1);
  }
  return Date.UTC(year, 3, 1);
}

function daysBetweenUtcMidnight(fromMs: number, toMs: number): number {
  return Math.round((toMs - fromMs) / MS_PER_DAY);
}

/**
 * Growth from capture midnight up to, but not including, now midnight.
 * Same-day capture adds nothing. Returns hundredths of a cm.
 */
function growthFromCaptureToNow(capturedAt: string, now: Date): number {
  const captured = new Date(capturedAt);
  if (Number.isNaN(captured.getTime())) {
    return 0;
  }
  const startMs = utcMidnightMs(captured);
  const endMs = utcMidnightMs(now);
  if (endMs <= startMs) {
    return 0;
  }
  let grown = 0;
  let cursor = startMs;
  let walked = 0;
  while (cursor < endMs && walked < MAX_WALK_DAYS) {
    const date = new Date(cursor);
    const rate = growthHundredthsPerDay(date);
    const segmentEnd = Math.min(endMs, nextSeasonStartMs(date));
    const days = daysBetweenUtcMidnight(cursor, segmentEnd);
    grown += days * rate;
    cursor = segmentEnd;
    walked += days;
  }
  return grown;
}

/**
 * Whole UTC days from `fromMs` until height reaches the cut limit.
 * First increment uses today's seasonal rate (Math.ceil via season chunks).
 * `heightHundredths` is integer 0.01 cm.
 */
function daysUntilLimit(heightHundredths: number, fromMs: number): number {
  let remaining = CUT_LIMIT_HUNDREDTHS - heightHundredths;
  let dias = 0;
  let cursor = fromMs;
  while (remaining > 0 && dias < MAX_WALK_DAYS) {
    const date = new Date(cursor);
    const rate = growthHundredthsPerDay(date);
    const daysInSeason = daysBetweenUtcMidnight(cursor, nextSeasonStartMs(date));
    const daysNeeded = Math.ceil(remaining / rate);
    if (daysNeeded <= daysInSeason) {
      return dias + daysNeeded;
    }
    remaining -= daysInSeason * rate;
    dias += daysInSeason;
    cursor = nextSeasonStartMs(date);
  }
  return dias;
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
  if (dias > FAR_PRAZO_DIAS) {
    return "Mais de 90 dias";
  }
  return `Em ${dias} dias`;
}

/**
 * Days until projected height hits 30 cm, walking each UTC day's seasonal
 * rate. Null when classe is empty after classification.
 */
export function prazoUntilCut(input: PrazoInput, now: Date): Prazo | null {
  const photo = photoHeightCm(input.alturaCm, input.classe);
  if (photo === null) {
    return null;
  }

  const heightNow =
    Math.round(photo * 100) + growthFromCaptureToNow(input.capturedAt, now);
  if (heightNow >= CUT_LIMIT_HUNDREDTHS) {
    return { dias: 0, label: formatPrazoLabel(0) };
  }
  const dias = daysUntilLimit(heightNow, utcMidnightMs(now));
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
