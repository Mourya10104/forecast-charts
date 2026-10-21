import { copyFile } from "node:fs/promises";
import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm", "cjs"],
  dts: true,
  sourcemap: true,
  clean: true,
  // Peer dependencies must never be bundled: the consumer's copy is the only copy.
  external: ["react", "react-dom", "react-is", "recharts"],
  // The chart uses hooks, so mark the bundle as a client component for Next.js App Router.
  banner: { js: '"use client";' },
  // tsup doesn't handle plain CSS files, so copy the stylesheet next to the JS.
  async onSuccess() {
    await copyFile("src/styles.css", "dist/styles.css");
  },
});
