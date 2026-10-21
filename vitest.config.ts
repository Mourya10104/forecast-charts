import { playwright } from "@vitest/browser-playwright";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    projects: [
      {
        // Pure functions: fast, no DOM.
        test: {
          name: "unit",
          environment: "node",
          include: ["src/**/*.test.ts"],
        },
      },
      {
        // Components run in real Chromium, so layout, focus, the accessibility tree
        // and native keyboard behaviour (e.g. <input type="range">) are the real thing.
        test: {
          name: "browser",
          include: ["src/**/*.browser.test.tsx"],
          setupFiles: ["./src/test/setup.browser.ts"],
          // Pre-bundle these up front. Otherwise Vite discovers them mid-run on a cold cache
          // (e.g. in CI), re-optimises, and the first run can fail with a duplicate-React error.
          optimizeDeps: {
            include: ["react", "react-dom", "react-dom/client", "react/jsx-dev-runtime", "recharts", "axe-core"],
          },
          browser: {
            enabled: true,
            headless: true,
            provider: playwright(),
            viewport: { width: 1000, height: 800 },
            instances: [{ browser: "chromium" }],
          },
        },
      },
    ],
  },
});
