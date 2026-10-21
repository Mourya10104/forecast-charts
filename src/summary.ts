import type { Row, TimeFormatters } from "./time";

interface SeriesStats {
  count: number;
  min: number;
  max: number;
  mean: number;
}

function stats(values: number[]): SeriesStats | null {
  if (values.length === 0) return null;
  let min = values[0] as number;
  let max = min;
  let sum = 0;
  for (const v of values) {
    if (v < min) min = v;
    if (v > max) max = v;
    sum += v;
  }
  return { count: values.length, min, max, mean: sum / values.length };
}

export interface SummaryOptions {
  unit: string;
  formatValue: (value: number) => string;
  formatTime: TimeFormatters["summary"];
  actualLabel: string;
  forecastLabel: string;
}

/**
 * A short plain-language description of the chart, computed from the data so it
 * can never disagree with what is plotted. Read by screen readers via aria-describedby.
 */
export function buildSummary(rows: readonly Row[], options: SummaryOptions): string {
  const { unit, formatValue, formatTime, actualLabel, forecastLabel } = options;
  if (rows.length === 0) return "No data.";

  const withUnit = (v: number) => (unit ? `${formatValue(v)} ${unit}` : formatValue(v));
  const first = rows[0] as Row;
  const last = rows[rows.length - 1] as Row;

  const parts = [
    `${rows.length} data point${rows.length === 1 ? "" : "s"} from ${formatTime(new Date(first.t))} to ${formatTime(new Date(last.t))}.`,
  ];

  const describe = (label: string, s: SeriesStats | null) =>
    s
      ? `${label}: lowest ${withUnit(s.min)}, highest ${withUnit(s.max)}, average ${withUnit(s.mean)} over ${s.count} point${s.count === 1 ? "" : "s"}.`
      : `${label}: no values.`;

  parts.push(describe(actualLabel, stats(rows.flatMap((r) => (r.actual === null ? [] : [r.actual])))));
  parts.push(describe(forecastLabel, stats(rows.flatMap((r) => (r.forecast === null ? [] : [r.forecast])))));

  const errors = rows.flatMap((r) => (r.actual !== null && r.forecast !== null ? [r.forecast - r.actual] : []));
  const errorStats = stats(errors);
  if (errorStats) {
    const sign = errorStats.mean > 0 ? "+" : "";
    parts.push(
      `Average error (${forecastLabel.toLowerCase()} minus ${actualLabel.toLowerCase()}) over ${errorStats.count} point${errorStats.count === 1 ? "" : "s"} with both values: ${sign}${withUnit(errorStats.mean)}.`,
    );
  }

  return parts.join(" ");
}
