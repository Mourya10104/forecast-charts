import axe from "axe-core";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { page, userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";
import { ForecastChart } from "./ForecastChart";
import { HorizonSlider } from "./HorizonSlider";
import type { ForecastPoint } from "./types";

const HOUR = 3_600_000;
/** `count` hourly points starting at 00:00 UTC on 30 March 2025, the day UK clocks go forward at 01:00 UTC. */
const hourly = (count: number, start = Date.UTC(2025, 2, 30, 0, 0)): ForecastPoint[] =>
  Array.from({ length: count }, (_, i) => ({ time: start + i * HOUR, actual: 100 + i * 10, forecast: 95 + i * 10 }));

const figure = () => page.getByRole("figure");
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Wait until Recharts has drawn both lines. */
async function drawn(container: HTMLElement) {
  await expect.poll(() => container.querySelectorAll(".recharts-line-curve").length, { timeout: 5000 }).toBe(2);
}

const lines = (container: HTMLElement) => [...container.querySelectorAll(".recharts-line-curve")];
const xLabels = (container: HTMLElement) =>
  [...container.querySelectorAll(".recharts-xAxis-tick-labels .recharts-cartesian-axis-tick-value")].map((e) => e.textContent);
const yLabels = (container: HTMLElement) =>
  [...container.querySelectorAll(".recharts-yAxis-tick-labels .recharts-cartesian-axis-tick-value")].map((e) => e.textContent);

/** Move the real mouse over the plot area, `fraction` of the way from left to right. */
async function hoverPlot(container: HTMLElement, fraction = 0.5) {
  const svg = container.querySelector('svg[role="application"]') as SVGSVGElement;
  const box = svg.getBoundingClientRect();
  const plot = container.querySelector(".recharts-cartesian-grid")!.getBoundingClientRect();
  await userEvent.hover(page.elementLocator(svg), {
    position: { x: plot.x - box.x + plot.width * fraction, y: plot.y - box.y + plot.height / 2 },
  });
}
const tooltipText = () => document.querySelector(".fc-tooltip")?.textContent ?? "";

describe("ForecastChart: accessible name and description", () => {
  it("is a figure named 'Actual versus forecast chart' by default", async () => {
    await render(<ForecastChart data={hourly(6)} />);
    await expect.element(page.getByRole("figure", { name: "Actual versus forecast chart" })).toBeVisible();
  });

  it("uses a custom aria-label", async () => {
    await render(<ForecastChart data={hourly(6)} aria-label="Wind generation, 30 March" />);
    await expect.element(page.getByRole("figure", { name: "Wind generation, 30 March" })).toBeVisible();
  });

  it("links the hidden summary with aria-describedby, so it IS the accessible description", async () => {
    const { container } = await render(<ForecastChart data={hourly(6)} unit="MW" />);
    const describedBy = figure().element().getAttribute("aria-describedby");
    expect(describedBy).toBeTruthy();
    const summary = document.getElementById(describedBy as string);
    expect(summary).not.toBeNull();
    expect(container.contains(summary)).toBe(true);
    expect(summary?.textContent).toMatch(/6 data points/);
    // What the browser itself computes as the description, not just our markup:
    await expect.element(figure()).toHaveAccessibleDescription(/6 data points/);
  });

  it("summary describes the plotted data, in the requested unit", async () => {
    await render(<ForecastChart data={hourly(6)} unit="MW" />);
    await expect.element(figure()).toHaveAccessibleDescription(/Actual: lowest 100\.00 MW, highest 150\.00 MW, average 125\.00 MW over 6 points/);
    await expect.element(figure()).toHaveAccessibleDescription(/Average error \(forecast minus actual\) over 6 points with both values: -5\.00 MW/);
  });

  it("the summary follows the timeZone prop", async () => {
    // Browsers differ on the winter zone name ("GMT" vs "GMT+0"), so accept both.
    const screen = await render(<ForecastChart data={hourly(6)} timeZone="Europe/London" locale="en-GB" />);
    await expect.element(figure()).toHaveAccessibleDescription(/00:00 GMT(\+0)? to .*06:00 BST/);
    await screen.rerender(<ForecastChart data={hourly(6)} timeZone="UTC" locale="en-GB" />);
    await expect.element(figure()).toHaveAccessibleDescription(/00:00 UTC to .*05:00 UTC/);
  });

  it("summary={false} removes both the text and the aria-describedby link", async () => {
    const { container } = await render(<ForecastChart data={hourly(6)} summary={false} />);
    expect(figure().element().hasAttribute("aria-describedby")).toBe(false);
    expect(container.querySelector("p.fc-sr-only")).toBeNull();
  });

  it("keeps the summary visually hidden", async () => {
    const { container } = await render(<ForecastChart data={hourly(6)} />);
    const box = container.querySelector("p.fc-sr-only")!.getBoundingClientRect();
    expect(box.width).toBeLessThanOrEqual(1);
    expect(box.height).toBeLessThanOrEqual(1);
  });
});

describe("ForecastChart: optional data table", () => {
  it("is not rendered by default", async () => {
    const { container } = await render(<ForecastChart data={hourly(6)} />);
    expect(container.querySelector("table")).toBeNull();
  });

  it("is a named, visually hidden table with one row per valid point", async () => {
    const data: ForecastPoint[] = [
      ...hourly(3),
      { time: "not a date", actual: 1, forecast: 1 },
      { time: Date.UTC(2025, 2, 30, 3), actual: null, forecast: 130 },
    ];
    await render(<ForecastChart data={data} accessibleTable unit="MW" timeZone="UTC" locale="en-GB" />);
    const table = page.getByRole("table", { name: "Actual versus forecast chart: data" });
    await expect.element(table).toBeInTheDocument();

    const headers = page.getByRole("columnheader").elements().map((e) => e.textContent);
    expect(headers).toEqual(["Time", "Actual", "Forecast"]);
    expect(page.getByRole("row").elements()).toHaveLength(1 + 4); // header + 4 valid points, the invalid one is dropped
    expect(table.element().textContent).toContain("no data");
    expect(table.element().textContent).toContain("100.00 MW");

    // Hidden from view (the wrapper is 1px and clipped) but still in the accessibility tree, as found above.
    const box = (table.element().parentElement as HTMLElement).getBoundingClientRect();
    expect(box.width).toBeLessThanOrEqual(1);
    expect(box.height).toBeLessThanOrEqual(1);
  });

  it("does not stretch the page, even for a week of half-hourly data", async () => {
    const week: ForecastPoint[] = Array.from({ length: 336 }, (_, i) => ({
      time: Date.UTC(2025, 0, 1) + i * 1_800_000,
      actual: 100 + (i % 50),
      forecast: 95 + (i % 50),
    }));
    const screen = await render(<ForecastChart data={week} height={200} />);
    const before = document.documentElement.scrollHeight;
    await screen.rerender(<ForecastChart data={week} height={200} accessibleTable />);
    expect(page.getByRole("row").elements()).toHaveLength(337);
    expect(document.documentElement.scrollHeight).toBe(before);
  });
});

describe("ForecastChart: empty state", () => {
  it("shows a status message instead of a chart", async () => {
    const { container } = await render(<ForecastChart data={[]} />);
    await expect.element(page.getByRole("status")).toHaveTextContent("No data available.");
    expect(container.querySelector('[role="figure"]')).toBeNull();
  });

  it("treats data with only invalid dates as empty, and shows a custom message", async () => {
    await render(<ForecastChart data={[{ time: "garbage", actual: 1, forecast: 1 }]} emptyMessage="Nothing to show" />);
    await expect.element(page.getByRole("status")).toHaveTextContent("Nothing to show");
  });
});

describe("ForecastChart: what is actually drawn", () => {
  it("draws two lines; after the draw-in animation the forecast line is dashed and the actual one is solid", async () => {
    const { container } = await render(<ForecastChart data={hourly(6)} />);
    await drawn(container);
    await expect.poll(() => lines(container)[1]?.getAttribute("stroke-dasharray"), { timeout: 5000 }).toBe("8 5");
    expect(lines(container)[0]?.getAttribute("stroke-dasharray")).toBeNull();
  });

  it("labels the legend with actualLabel and forecastLabel", async () => {
    const { container } = await render(<ForecastChart data={hourly(6)} actualLabel="Outturn" forecastLabel="Prediction" />);
    await drawn(container);
    expect(container.querySelector(".recharts-legend-wrapper")?.textContent).toBe("OutturnPrediction");
  });

  it("breaks the line at a null value, unless connectNulls is set", async () => {
    const gap = hourly(5).map((p, i) => (i === 2 ? { ...p, actual: null } : p));
    const segments = (c: HTMLElement) => (lines(c)[0]?.getAttribute("d") ?? "").split("M").length - 1;

    const screen = await render(<ForecastChart data={gap} />);
    await drawn(screen.container);
    expect(segments(screen.container)).toBe(2);

    await screen.rerender(<ForecastChart data={gap} connectNulls />);
    await expect.poll(() => segments(screen.container), { timeout: 5000 }).toBe(1);
  });

  it("honours height as a number (px) or any CSS length", async () => {
    const screen = await render(<ForecastChart data={hourly(6)} height={300} />);
    expect(figure().element().getBoundingClientRect().height).toBe(300);
    await screen.rerender(<ForecastChart data={hourly(6)} height="20rem" />);
    const rem = parseFloat(getComputedStyle(document.documentElement).fontSize);
    expect(figure().element().getBoundingClientRect().height).toBe(20 * rem);
  });

  it("the colors prop sets the CSS variables, and the lines really use them", async () => {
    const { container } = await render(<ForecastChart data={hourly(6)} colors={{ actual: "rgb(255, 0, 0)", forecast: "rgb(0, 0, 255)" }} />);
    await drawn(container);
    expect(getComputedStyle(lines(container)[0] as Element).stroke).toBe("rgb(255, 0, 0)");
    expect(getComputedStyle(lines(container)[1] as Element).stroke).toBe("rgb(0, 0, 255)");
  });

  it("formats the x-axis in the requested time zone: London skips 01:00, which doesn't exist that day", async () => {
    const screen = await render(<ForecastChart data={hourly(6)} timeZone="Europe/London" locale="en-GB" />);
    await drawn(screen.container);
    await expect.poll(() => xLabels(screen.container).length).toBeGreaterThan(0);
    expect(xLabels(screen.container)).toContain("00:00");
    expect(xLabels(screen.container)).toContain("02:00");
    expect(xLabels(screen.container)).not.toContain("01:00");

    await screen.rerender(<ForecastChart data={hourly(6)} timeZone="UTC" locale="en-GB" />);
    await expect.poll(() => xLabels(screen.container)).toContain("01:00");
  });

  it("puts the unit on the y-axis", async () => {
    const { container } = await render(<ForecastChart data={hourly(6)} unit="MW" />);
    await drawn(container);
    await expect.poll(() => yLabels(container).length).toBeGreaterThan(0);
    expect(yLabels(container).every((l) => l?.endsWith(" MW"))).toBe(true);
  });
});

describe("ForecastChart: tooltip", () => {
  it("shows time (in the chosen zone), both values and the delta on hover, and hides on leave", async () => {
    const { container } = await render(<ForecastChart data={hourly(6)} unit="MW" timeZone="Europe/London" locale="en-GB" />);
    await drawn(container);
    await hoverPlot(container);
    await expect.poll(tooltipText).toContain("Delta");
    expect(tooltipText()).toMatch(/30 Mar, \d{2}:\d{2}/);
    expect(tooltipText()).toMatch(/Actual: \d+\.\d{2} MW/);
    expect(tooltipText()).toMatch(/Forecast: \d+\.\d{2} MW/);
    expect(tooltipText()).toContain("Delta (forecast − actual): -5.00 MW");

    await userEvent.unhover(page.elementLocator(container.querySelector('svg[role="application"]')!));
    await expect.poll(tooltipText).toBe("");
  });

  it("showDelta={false} leaves the delta row out", async () => {
    const { container } = await render(<ForecastChart data={hourly(6)} showDelta={false} />);
    await drawn(container);
    await hoverPlot(container);
    await expect.poll(tooltipText).toContain("Actual");
    expect(tooltipText()).not.toContain("Delta");
  });

  it("uses custom labels and formatValue", async () => {
    const { container } = await render(
      <ForecastChart data={hourly(6)} actualLabel="Outturn" forecastLabel="Prediction" formatValue={(v) => `${Math.round(v)}!`} />,
    );
    await drawn(container);
    await hoverPlot(container);
    await expect.poll(tooltipText).toContain("Outturn: ");
    expect(tooltipText()).toMatch(/Prediction: \d+!/);
  });

  it("can be reached from the keyboard: focus the chart and press an arrow key", async () => {
    const { container } = await render(<ForecastChart data={hourly(6)} unit="MW" />);
    await drawn(container);
    (container.querySelector('svg[role="application"]') as SVGSVGElement).focus();
    await userEvent.keyboard("{ArrowRight}");
    await expect.poll(tooltipText).toContain("Actual");
  });
});

describe("axe-core accessibility scan (WCAG 2.0/2.1 A and AA, best practices)", () => {
  // The library sets no page background; the dark theme assumes a dark surface, like the dashboard it came from.
  beforeEach(() => {
    document.body.style.background = "#0a0a0a";
  });
  afterEach(() => {
    document.body.style.background = "";
  });

  async function violations(container: HTMLElement) {
    const results = await axe.run(container, { runOnly: ["wcag2a", "wcag2aa", "wcag21aa", "best-practice"] });
    return results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(" ; ")}`);
  }

  it("ForecastChart with summary and data table", async () => {
    const { container } = await render(<ForecastChart data={hourly(6)} unit="MW" accessibleTable />);
    await drawn(container);
    await sleep(1800); // let the animation finish so the scan sees the final state
    expect(await violations(container)).toEqual([]);
  });

  it("the empty state", async () => {
    const { container } = await render(<ForecastChart data={[]} />);
    expect(await violations(container)).toEqual([]);
  });

  it("HorizonSlider", async () => {
    const { container } = await render(<HorizonSlider value={24} onChange={() => {}} />);
    expect(await violations(container)).toEqual([]);
  });
});
