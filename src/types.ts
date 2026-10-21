import type { ReactNode } from "react";

/** One point of the series. `null` means "no data": the line breaks instead of drawing a zero. */
export interface ForecastPoint {
  /** ISO 8601 string, epoch milliseconds, or a Date. */
  time: string | number | Date;
  actual: number | null;
  forecast: number | null;
}

export interface ForecastChartProps {
  data: ForecastPoint[];
  /** Pixels (number) or any CSS length (string). Default 400. */
  height?: number | string;
  /** Legend and tooltip label for the actual series. Default "Actual". */
  actualLabel?: string;
  /** Legend and tooltip label for the forecast series. Default "Forecast". */
  forecastLabel?: string;
  /** Unit appended to values, e.g. "MW". Default "". */
  unit?: string;
  /** Line colours. Defaults come from the `--fc-actual` / `--fc-forecast` CSS variables. */
  colors?: { actual?: string; forecast?: string };
  /** Format for x-axis ticks. */
  formatTime?: (time: Date) => string;
  /** Format for the time shown in the tooltip. */
  formatTooltipTime?: (time: Date) => string;
  /** Format for numeric values. Default: two decimals. */
  formatValue?: (value: number) => string;
  /** Show the forecast minus actual row in the tooltip. Default true. */
  showDelta?: boolean;
  /** Draw a line across gaps where a value is null. Default false. */
  connectNulls?: boolean;
  /** Shown instead of the chart when `data` is empty. */
  emptyMessage?: ReactNode;
  /** Accessible name for the chart. Default "Actual versus forecast chart". */
  "aria-label"?: string;
  className?: string;
}

export interface HorizonSliderProps {
  /** Controlled value. */
  value: number;
  onChange: (hours: number) => void;
  /** Default 0. */
  min?: number;
  /** Default 48. */
  max?: number;
  /** Default 1. */
  step?: number;
  /** Visible label. Default "Forecast horizon". */
  label?: ReactNode;
  /** Accessible name; required when `label` is hidden or empty. */
  "aria-label"?: string;
  /** Text for the current value; also used as `aria-valuetext`. Default `${value} hours`. */
  formatValue?: (value: number) => string;
  /** Tick labels under the slider. Default: five evenly spaced values from min to max. */
  ticks?: number[];
  disabled?: boolean;
  id?: string;
  className?: string;
}
