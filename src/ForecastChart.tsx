import { CSSProperties, useId, useMemo, useSyncExternalStore } from "react";
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ChartTooltip } from "./ChartTooltip";
import { DataTable } from "./DataTable";
import { buildSummary } from "./summary";
import { makeTimeFormatters, makeValueFormatter, normalizeData } from "./time";
import type { ForecastChartProps } from "./types";

/** True when the user asked the OS/browser for less motion. False on the server. */
function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const query = window.matchMedia("(prefers-reduced-motion: reduce)");
      query.addEventListener("change", onChange);
      return () => query.removeEventListener("change", onChange);
    },
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => false,
  );
}

export function ForecastChart(props: ForecastChartProps) {
  const {
    data,
    height = 400,
    actualLabel = "Actual",
    forecastLabel = "Forecast",
    unit = "",
    colors,
    timeZone,
    locale,
    formatTime,
    formatTooltipTime,
    formatValue,
    showDelta = true,
    connectNulls = false,
    emptyMessage = "No data available.",
    summary = true,
    accessibleTable = false,
    className,
  } = props;
  const ariaLabel = props["aria-label"] ?? "Actual versus forecast chart";

  // Normalise once: parse times, drop invalid points, sort.
  const rows = useMemo(() => normalizeData(data), [data]);
  const spanMs = rows.length > 1 ? (rows[rows.length - 1]?.t ?? 0) - (rows[0]?.t ?? 0) : 0;

  const formatters = useMemo(() => makeTimeFormatters({ locale, timeZone, spanMs }), [locale, timeZone, spanMs]);
  const defaultValueFormat = useMemo(() => makeValueFormatter(locale), [locale]);
  const valueFormat = formatValue ?? defaultValueFormat;
  const axisTime = (date: Date) => (formatTime ?? formatters.axis)(date);
  const tooltipTime = (date: Date) => (formatTooltipTime ?? formatters.tooltip)(date);

  const summaryText = useMemo(
    () =>
      summary
        ? buildSummary(rows, {
            unit,
            formatValue: valueFormat,
            formatTime: formatters.summary,
            actualLabel,
            forecastLabel,
          })
        : "",
    [summary, rows, unit, valueFormat, formatters, actualLabel, forecastLabel],
  );

  const summaryId = useId();
  const reducedMotion = usePrefersReducedMotion();

  const style = {
    height,
    ...(colors?.actual ? { "--fc-actual": colors.actual } : {}),
    ...(colors?.forecast ? { "--fc-forecast": colors.forecast } : {}),
  } as CSSProperties;
  const rootClass = className ? `fc-chart ${className}` : "fc-chart";

  if (rows.length === 0) {
    return (
      <div role="status" className={`${rootClass} fc-empty`} style={style}>
        {emptyMessage}
      </div>
    );
  }

  return (
    <div
      role="figure"
      aria-label={ariaLabel}
      aria-describedby={summary ? summaryId : undefined}
      className={rootClass}
      style={style}
    >
      {summary && (
        <p id={summaryId} className="fc-sr-only">
          {summaryText}
        </p>
      )}
      {accessibleTable && (
        <DataTable
          rows={rows}
          formatTime={tooltipTime}
          formatValue={valueFormat}
          unit={unit}
          actualLabel={actualLabel}
          forecastLabel={forecastLabel}
          caption={`${ariaLabel}: data`}
        />
      )}
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={rows} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--fc-grid)" vertical={false} />
          <XAxis
            dataKey="t"
            stroke="var(--fc-axis)"
            tickFormatter={(t: number) => axisTime(new Date(t))}
            tickMargin={10}
            minTickGap={24}
          />
          <YAxis
            width="auto"
            stroke="var(--fc-axis)"
            tickFormatter={(v: number) => (unit ? `${v} ${unit}` : String(v))}
            tickMargin={10}
          />
          <Tooltip
            content={
              <ChartTooltip
                formatTime={tooltipTime}
                formatValue={valueFormat}
                unit={unit}
                actualLabel={actualLabel}
                forecastLabel={forecastLabel}
                showDelta={showDelta}
              />
            }
          />
          <Legend wrapperStyle={{ paddingTop: "20px" }} />
          <Line
            type="monotone"
            name={actualLabel}
            dataKey="actual"
            stroke="var(--fc-actual)"
            strokeWidth={3}
            dot={false}
            activeDot={{ r: 6 }}
            connectNulls={connectNulls}
            isAnimationActive={!reducedMotion}
          />
          {/* Dashed, so the two series differ by more than colour alone (WCAG 1.4.1). */}
          <Line
            type="monotone"
            name={forecastLabel}
            dataKey="forecast"
            stroke="var(--fc-forecast)"
            strokeWidth={3}
            strokeDasharray="8 5"
            dot={false}
            activeDot={{ r: 6 }}
            connectNulls={connectNulls}
            isAnimationActive={!reducedMotion}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
