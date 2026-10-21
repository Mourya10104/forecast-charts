import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// `warnOnce` remembers what it has printed in a module-level Set, so every test
// loads a fresh copy of the module.
async function freshWarnOnce() {
  vi.resetModules();
  return (await import("./warn")).warnOnce;
}

describe("warnOnce", () => {
  let warn: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    warn = vi.spyOn(console, "warn").mockImplementation(() => {});
  });
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it("prints a message once, prefixed with the package name", async () => {
    const warnOnce = await freshWarnOnce();
    warnOnce("something is off");
    warnOnce("something is off");
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledWith("[@mourya10104/forecast-charts] something is off");
  });

  it("prints different messages separately", async () => {
    const warnOnce = await freshWarnOnce();
    warnOnce("first");
    warnOnce("second");
    expect(warn).toHaveBeenCalledTimes(2);
  });

  it("stays silent in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const warnOnce = await freshWarnOnce();
    warnOnce("not for production logs");
    expect(warn).not.toHaveBeenCalled();
  });
});
