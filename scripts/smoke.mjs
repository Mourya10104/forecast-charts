// Smoke test for the BUILT package: imports it the way a consumer would, through
// the package name and the "exports" map, once as ESM and once as CommonJS.
// Run after `npm run build`.
import { createRequire } from "node:module";
import { existsSync } from "node:fs";

const NAME = "@mourya10104/forecast-charts";
const EXPECTED = ["ForecastChart", "HorizonSlider"];
const require = createRequire(import.meta.url);

function check(kind, mod) {
  for (const name of EXPECTED) {
    if (typeof mod[name] !== "function") {
      throw new Error(`${kind}: expected export "${name}" to be a function, got ${typeof mod[name]}`);
    }
  }
  console.log(`ok  ${kind}: exports ${EXPECTED.join(", ")}`);
}

const esm = await import(NAME);
check("ESM", esm);

const cjs = require(NAME);
check("CJS", cjs);

const css = require.resolve(`${NAME}/styles.css`);
if (!existsSync(css)) throw new Error("styles.css is missing from dist");
console.log("ok  CSS: ./styles.css resolves");
