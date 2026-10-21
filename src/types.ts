import type { ReactNode } from "react";

/**
 * Note on `| undefined`: every optional prop explicitly allows `undefined`, so
 * `<ForecastChart unit={maybeUndefined} />` type-checks even in projects that
 * enable `exactOptionalPropertyTypes`.
 */

/** One point of the series. `null` means "no data": the line breaks instead of drawing a zero. */
export interface ForecastPoint {
  /** ISO 8601 string, epoch milliseconds, or a Date. Invalid values are skipped. */
  time: string | number | Date;
  actual: number | null;
  forecast: number | null;
}

export interface ForecastChartProps {
  data: ForecastPoint[];
  /** Pixels (number) or any CSS length (string). Default 400. */
  height?: number | string | undefined;
  /** Legend and tooltip label for the actual series. Default "Actual". */
  actualLabel?: string | undefined;
  /** Legend and tooltip label for the forecast series. Default "Forecast". */
  forecastLabel?: string | undefined;
  /** Unit appended to values, e.g. "MW". Default "". */
  unit?: string | undefined;
  /** Line colours. Defaults come from the `--fc-actual` / `--fc-forecast` CSS variables. */
  colors?: { actual?: string | undefined; forecast?: string | undefined } | undefined;
  /**
   * IANA time zone used by the default time formatters, e.g. "Europe/London".
   * Default: the browser's zone. An invalid name falls back to the default.
   * Ignored by a custom `formatTime` / `formatTooltipTime`.
   */
  timeZone?: string | undefined;
  /** BCP 47 locale for the default formatters, e.g. "en-GB". Default: the browser's locale. */
  locale?: string | undefined;
  /** Replaces the default x-axis tick format. */
  formatTime?: ((time: Date) => string) | undefined;
  /** Replaces the default tooltip time format. */
  formatTooltipTime?: ((time: Date) => string) | undefined;
  /** Format for numeric values. Default: two decimals. */
  formatValue?: ((value: number) => string) | undefined;
  /** Show the forecast minus actual row in the tooltip. Default true. */
  showDelta?: boolean | undefined;
  /** Draw a line across gaps where a value is null. Default false. */
  connectNulls?: boolean | undefined;
  /** Shown instead of the chart when there is no usable data. */
  emptyMessage?: ReactNode;
  /** Accessible name for the chart. Default "Actual versus forecast chart". */
  "aria-label"?: string | undefined;
  /**
   * Add a visually hidden text summary (range, min/max/average, mean error) that
   * screen readers read as the chart's description. Default true.
   */
  summary?: boolean | undefined;
  /**
   * Add a visually hidden data table for screen readers. Off by default because a
   * long series makes a lot of DOM.
   */
  accessibleTable?: boolean | undefined;
  className?: string | undefined;
}

export interface HorizonSliderProps {
  /** Controlled value. */
  value: number;
  onChange: (hours: number) => void;
  /** Default 0. */
  min?: number | undefined;
  /** Default 48. */
  max?: number | undefined;
  /** Default 1. */
  step?: number | undefined;
  /** Visible label. Default "Forecast horizon". */
  label?: ReactNode;
  /** Accessible name; required when `label` is hidden or empty. */
  "aria-label"?: string | undefined;
  /** Text for the current value; also used as `aria-valuetext`. Default `${value} hours`. */
  formatValue?: ((value: number) => string) | undefined;
  /**
   * Tick labels under the slider. Default: five evenly spaced values from min to max.
   * Labels use `formatValue` if you pass one, otherwise a compact "24h".
   */
  ticks?: number[] | undefined;
  disabled?: boolean | undefined;
  id?: string | undefined;
  className?: string | undefined;
}
