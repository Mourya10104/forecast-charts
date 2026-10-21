import { describe, expect, it } from "vitest";
import { buildSummary, type SummaryOptions } from "./summary";
import { makeTimeFormatters, type Row } from "./time";

const base: SummaryOptions = {
  unit: "MW",
  formatValue: (v) => v.toFixed(1),
  formatTime: (d) => d.toISOString(),
  actualLabel: "Actual",
  forecastLabel: "Forecast",
};
const row = (t: number, actual: number | null, forecast: number | null): Row => ({ t, actual, forecast });

describe("buildSummary", () => {
  it("says so when there is no data", () => {
    expect(buildSummary([], base)).toBe("No data.");
  });

  it("reports count, range, and min / max / average per series", () => {
    const text = buildSummary([row(0, 100, 90), row(1000, 120, 110), row(2000, 110, null)], base);
    expect(text).toContain("3 data points from 1970-01-01T00:00:00.000Z to 1970-01-01T00:00:02.000Z.");
    expect(text).toContain("Actual: lowest 100.0 MW, highest 120.0 MW, average 110.0 MW over 3 points.");
    expect(text).toContain("Forecast: lowest 90.0 MW, highest 110.0 MW, average 100.0 MW over 2 points.");
  });

  it("computes the mean error only over points that have both values", () => {
    // Pairs with both values: (100,90) -> -10 and (120,110) -> -10. The third point has no forecast.
    const text = buildSummary([row(0, 100, 90), row(1, 120, 110), row(2, 110, null), row(3, null, 500)], base);
    expect(text).toContain("Average error (forecast minus actual) over 2 points with both values: -10.0 MW.");
  });

  it("uses singular wording for a single point", () => {
    const text = buildSummary([row(0, 5, 7)], base);
    expect(text).toContain("1 data point from");
    expect(text).toContain("over 1 point.");
    expect(text).toContain("over 1 point with both values");
  });

  it("handles a series that has no values and omits the error sentence", () => {
    const text = buildSummary([row(0, null, 1), row(1, null, 2)], base);
    expect(text).toContain("Actual: no values.");
    expect(text).toContain("Forecast: lowest");
    expect(text).not.toContain("Average error");
  });

  it("puts a plus sign on a positive mean error but not on zero", () => {
    expect(buildSummary([row(0, 10, 15)], base)).toContain(": +5.0 MW.");
    expect(buildSummary([row(0, 10, 10)], base)).toContain(": 0.0 MW.");
  });

  it("leaves out the unit, without stray spaces, when there is none", () => {
    const text = buildSummary([row(0, 10, 12)], { ...base, unit: "" });
    expect(text).toContain("lowest 10.0, highest 10.0");
    expect(text).not.toContain(" MW");
    expect(text).not.toMatch(/ ,/);
  });

  it("uses custom labels, lower-cased inside the error sentence", () => {
    const text = buildSummary([row(0, 1, 2)], { ...base, actualLabel: "Outturn", forecastLabel: "Prediction" });
    expect(text).toContain("Outturn: lowest");
    expect(text).toContain("Prediction: lowest");
    expect(text).toContain("Average error (prediction minus outturn)");
  });

  it("shows both GMT and BST for a range that crosses the March clock change", () => {
    const { summary } = makeTimeFormatters({ locale: "en-GB", timeZone: "Europe/London", spanMs: 0 });
    const first = Date.UTC(2025, 2, 30, 0, 30); // 00:30 GMT
    const last = Date.UTC(2025, 2, 30, 1, 30); // 02:30 BST
    const text = buildSummary([row(first, 1, 1), row(last, 1, 1)], { ...base, formatTime: summary });
    expect(text).toMatch(/00:30.*GMT.* to .*02:30.*BST/);
  });
});
