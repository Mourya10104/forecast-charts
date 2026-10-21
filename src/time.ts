import type { ForecastPoint } from "./types";
import { warnOnce } from "./warn";

/** A point after normalisation: time is epoch milliseconds, every value is a finite number or null. */
export interface Row {
  t: number;
  actual: number | null;
  forecast: number | null;
}

/** Convert the accepted time inputs to a Date, or null if it isn't a valid instant. */
export function toDate(time: string | number | Date): Date | null {
  const date = time instanceof Date ? new Date(time.getTime()) : new Date(time);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** NaN and Infinity are treated as "no data". */
function finiteOrNull(value: number | null | undefined): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

/**
 * Normalise the input once: parse every time to epoch milliseconds, drop points
 * whose time is invalid, clean the values and sort ascending by time.
 */
export function normalizeData(data: readonly ForecastPoint[]): Row[] {
  const rows: Row[] = [];
  for (const point of data) {
    const date = toDate(point.time);
    if (!date) continue;
    rows.push({ t: date.getTime(), actual: finiteOrNull(point.actual), forecast: finiteOrNull(point.forecast) });
  }
  return rows.sort((a, b) => a.t - b.t);
}

export interface TimeFormatters {
  /** Short text for x-axis ticks. */
  axis: (date: Date) => string;
  /** Full date and time for the tooltip. */
  tooltip: (date: Date) => string;
  /** Date, time and zone abbreviation, used in the text summary. */
  summary: (date: Date) => string;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Build an Intl.DateTimeFormat, tolerating a bad locale or time zone name:
 * Intl throws a RangeError for those, and a typo in a prop shouldn't crash the page.
 */
function createDateFormat(
  locale: string | undefined,
  timeZone: string | undefined,
  options: Intl.DateTimeFormatOptions,
): Intl.DateTimeFormat {
  const attempts: Array<[string | undefined, string | undefined]> = [
    [locale, timeZone],
    [locale, undefined],
    [undefined, timeZone],
    [undefined, undefined],
  ];
  for (const [loc, tz] of attempts) {
    try {
      return new Intl.DateTimeFormat(loc, tz ? { ...options, timeZone: tz } : options);
    } catch (error) {
      if (!(error instanceof RangeError)) throw error;
    }
  }
  return new Intl.DateTimeFormat(undefined, options);
}

export function makeTimeFormatters(opts: {
  locale?: string | undefined;
  timeZone?: string | undefined;
  /** Time covered by the data in ms; short ranges get clock times on the axis instead of dates. */
  spanMs: number;
}): TimeFormatters {
  const { locale, timeZone, spanMs } = opts;

  if (timeZone) {
    try {
      new Intl.DateTimeFormat(undefined, { timeZone });
    } catch {
      warnOnce(`Unknown timeZone "${timeZone}"; using the browser's time zone instead.`);
    }
  }

  const axisOptions: Intl.DateTimeFormatOptions =
    spanMs < 2 * DAY_MS
      ? { hour: "2-digit", minute: "2-digit", hourCycle: "h23" }
      : { day: "2-digit", month: "short" };

  const axis = createDateFormat(locale, timeZone, axisOptions);
  const tooltip = createDateFormat(locale, timeZone, {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  const summary = createDateFormat(locale, timeZone, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZoneName: "short",
  });

  return {
    axis: (date) => axis.format(date),
    tooltip: (date) => tooltip.format(date),
    summary: (date) => summary.format(date),
  };
}

/** Default number format: two decimals, in the given locale. */
export function makeValueFormatter(locale: string | undefined): (value: number) => string {
  const options = { minimumFractionDigits: 2, maximumFractionDigits: 2 };
  let format: Intl.NumberFormat;
  try {
    format = new Intl.NumberFormat(locale, options);
  } catch {
    format = new Intl.NumberFormat(undefined, options);
  }
  return (value) => format.format(value);
}
