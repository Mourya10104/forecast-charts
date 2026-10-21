import type { ForecastChartProps } from "./types";

/** Placeholder: the real chart is implemented in step 3. */
export function ForecastChart({ data, className }: ForecastChartProps) {
  return <div className={className}>ForecastChart ({data.length} points)</div>;
}
