/** Minimal shape of what Recharts passes to tooltip content; values arrive as `unknown`. */
interface TooltipEntry {
  dataKey?: unknown;
  value?: unknown;
}

export interface ChartTooltipProps {
  // Injected by Recharts when it renders the tooltip:
  active?: boolean | undefined;
  payload?: readonly TooltipEntry[] | undefined;
  label?: string | number | undefined;
  // Passed in by ForecastChart:
  formatTime: (date: Date) => string;
  formatValue: (value: number) => string;
  unit: string;
  actualLabel: string;
  forecastLabel: string;
  showDelta: boolean;
}

function numberFor(payload: readonly TooltipEntry[], key: string): number | undefined {
  const value = payload.find((entry) => entry.dataKey === key)?.value;
  return typeof value === "number" ? value : undefined;
}

/**
 * Defined at module level (not inside the chart component) so React keeps its
 * identity between renders instead of re-creating it each time.
 */
export function ChartTooltip(props: ChartTooltipProps) {
  const { active, payload, label, formatTime, formatValue, unit, actualLabel, forecastLabel, showDelta } = props;
  if (!active || !payload || payload.length === 0) return null;

  const actual = numberFor(payload, "actual");
  const forecast = numberFor(payload, "forecast");
  const delta = actual !== undefined && forecast !== undefined ? forecast - actual : undefined;
  const withUnit = (v: number) => (unit ? `${formatValue(v)} ${unit}` : formatValue(v));

  return (
    <div className="fc-tooltip">
      <p className="fc-tooltip__time">{formatTime(new Date(Number(label)))}</p>
      {actual !== undefined && (
        <p className="fc-tooltip__row" style={{ color: "var(--fc-actual)" }}>
          {actualLabel}: {withUnit(actual)}
        </p>
      )}
      {forecast !== undefined && (
        <p className="fc-tooltip__row" style={{ color: "var(--fc-forecast)" }}>
          {forecastLabel}: {withUnit(forecast)}
        </p>
      )}
      {showDelta && delta !== undefined && (
        <p className="fc-tooltip__delta">
          <span className="fc-tooltip__delta-label">Delta ({forecastLabel.toLowerCase()} − {actualLabel.toLowerCase()}): </span>
          <span className={delta > 0 ? "fc-tooltip__delta-up" : "fc-tooltip__delta-down"}>
            {delta > 0 ? "+" : ""}
            {withUnit(delta)}
          </span>
        </p>
      )}
    </div>
  );
}
