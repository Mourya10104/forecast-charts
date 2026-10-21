// Smoke test for the BUILT package: imports it the way a consumer would, through
// the package name and the "exports" map, once as ESM and once as CommonJS, then
// renders both components to HTML on the server and checks the accessibility wiring.
// Run after `npm run build`.
import { createRequire } from "node:module";
import { existsSync } from "node:fs";
import { createElement } from "react";
import { renderToString } from "react-dom/server";

const NAME = "@mourya10104/forecast-charts";
const EXPECTED = ["ForecastChart", "HorizonSlider"];
const require = createRequire(import.meta.url);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function check(kind, mod) {
  for (const name of EXPECTED) {
    assert(typeof mod[name] === "function", `${kind}: expected export "${name}" to be a function, got ${typeof mod[name]}`);
  }
  console.log(`ok  ${kind}: exports ${EXPECTED.join(", ")}`);
}

const esm = await import(NAME);
check("ESM", esm);
check("CJS", require(NAME));

const css = require.resolve(`${NAME}/styles.css`);
assert(existsSync(css), "styles.css is missing from dist");
console.log("ok  CSS: ./styles.css resolves");

const { ForecastChart, HorizonSlider } = esm;
const noop = () => {};

// ---- HorizonSlider ----------------------------------------------------
{
  const html = renderToString(createElement(HorizonSlider, { value: 24, onChange: noop }));
  const labelFor = /<label[^>]*for="([^"]+)"/.exec(html)?.[1];
  assert(labelFor, "slider: label has no `for` attribute");
  assert(html.includes(`id="${labelFor}"`), "slider: label `for` does not match the input id");
  assert(html.includes('type="range"'), "slider: not a native range input");
  assert(html.includes('aria-valuetext="24 hours"'), "slider: missing aria-valuetext");
  assert(html.includes('min="0"') && html.includes('max="48"'), "slider: default min/max wrong");
  console.log("ok  HorizonSlider: label linked by htmlFor, aria-valuetext, native range");

  const custom = renderToString(
    createElement(HorizonSlider, { value: 6, onChange: noop, label: "", "aria-label": "Lead time", formatValue: (v) => `${v}h ahead` }),
  );
  assert(custom.includes('aria-label="Lead time"'), "slider: aria-label not applied when label is empty");
  assert(custom.includes('aria-valuetext="6h ahead"'), "slider: formatValue not used for aria-valuetext");
  assert(!custom.includes("<label"), "slider: rendered a label element for an empty label");
  console.log("ok  HorizonSlider: aria-label fallback and custom formatValue");
}

// ---- ForecastChart ----------------------------------------------------
{
  // 30 March 2025: UK clocks go forward at 01:00 UTC, so 01:30Z is 02:30 BST.
  const data = [
    { time: "2025-03-30T00:30:00Z", actual: 100, forecast: 90 },
    { time: "2025-03-30T01:30:00Z", actual: 120, forecast: null },
    { time: Date.UTC(2025, 2, 30, 2, 30), actual: null, forecast: 110 },
    { time: "not a date", actual: 1, forecast: 1 },
  ];
  const html = renderToString(
    createElement(ForecastChart, { data, unit: "MW", timeZone: "Europe/London", locale: "en-GB", accessibleTable: true }),
  );
  assert(html.includes('role="figure"'), "chart: missing role=figure");
  assert(html.includes('aria-label="Actual versus forecast chart"'), "chart: missing default aria-label");
  const describedBy = /aria-describedby="([^"]+)"/.exec(html)?.[1];
  assert(describedBy && html.includes(`id="${describedBy}"`), "chart: aria-describedby does not point at the summary");
  assert(html.includes("3 data points"), "chart: invalid point was not dropped, or summary missing");
  assert(html.includes("BST"), "chart: summary is not in the requested time zone (expected BST)");
  assert(html.includes("<table") && html.includes("no data"), "chart: accessible table missing or has no 'no data' cells");
  console.log("ok  ForecastChart: figure, label, summary, time zone (BST), table, invalid points dropped");

  const noSummary = renderToString(createElement(ForecastChart, { data, summary: false }));
  assert(!noSummary.includes("aria-describedby"), "chart: summary=false should remove aria-describedby");

  const empty = renderToString(createElement(ForecastChart, { data: [] }));
  assert(empty.includes('role="status"') && empty.includes("No data available."), "chart: empty state missing");
  console.log("ok  ForecastChart: summary can be turned off; empty state is a status message");

  // A bad time zone must not crash the render.
  const bad = renderToString(createElement(ForecastChart, { data, timeZone: "Not/AZone" }));
  assert(bad.includes('role="figure"'), "chart: invalid timeZone crashed rendering");
  console.log("ok  ForecastChart: invalid timeZone falls back instead of throwing");
}
