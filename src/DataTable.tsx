import type { Row, TimeFormatters } from "./time";

interface DataTableProps {
  rows: readonly Row[];
  formatTime: TimeFormatters["tooltip"];
  formatValue: (value: number) => string;
  unit: string;
  actualLabel: string;
  forecastLabel: string;
  caption: string;
}

/** Visually hidden table with the plotted values, for screen reader users. */
export function DataTable({ rows, formatTime, formatValue, unit, actualLabel, forecastLabel, caption }: DataTableProps) {
  const cell = (value: number | null) => (value === null ? "no data" : unit ? `${formatValue(value)} ${unit}` : formatValue(value));

  return (
    <table className="fc-sr-only">
      <caption>{caption}</caption>
      <thead>
        <tr>
          <th scope="col">Time</th>
          <th scope="col">{actualLabel}</th>
          <th scope="col">{forecastLabel}</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row, index) => (
          <tr key={`${row.t}-${index}`}>
            <th scope="row">{formatTime(new Date(row.t))}</th>
            <td>{cell(row.actual)}</td>
            <td>{cell(row.forecast)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
