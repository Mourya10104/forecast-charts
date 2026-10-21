import { afterEach, describe, expect, it, vi } from "vitest";
import { makeTimeFormatters, makeValueFormatter, normalizeData, toDate } from "./time";

const DAY = 24 * 60 * 60 * 1000;
const london = (spanMs = 0) => makeTimeFormatters({ locale: "en-GB", timeZone: "Europe/London", spanMs });
const at = (iso: string) => new Date(iso);

// Whole-string equality would be brittle: Node and Chromium ship different ICU
// versions. These tests check the parts that matter (clock time and zone name).

describe("toDate", () => {
  it("accepts ISO strings, epoch milliseconds and Dates", () => {
    const iso = "2025-01-25T12:00:00Z";
    const ms = Date.UTC(2025, 0, 25, 12);
    expect(toDate(iso)?.getTime()).toBe(ms);
    expect(toDate(ms)?.getTime()).toBe(ms);
    expect(toDate(new Date(ms))?.getTime()).toBe(ms);
  });

  it("returns a copy, never the Date that was passed in", () => {
    const original = new Date(0);
    const result = toDate(original);
    expect(result).not.toBe(original);
    result?.setFullYear(2000);
    expect(original.getTime()).toBe(0);
  });

  it("returns null for anything that is not a valid instant", () => {
    expect(toDate("not a date")).toBeNull();
    expect(toDate(Number.NaN)).toBeNull();
    expect(toDate(new Date("nope"))).toBeNull();
  });
});

describe("normalizeData", () => {
  it("drops points with invalid times", () => {
    const rows = normalizeData([
      { time: "2025-01-01T00:00:00Z", actual: 1, forecast: 1 },
      { time: "garbage", actual: 2, forecast: 2 },
    ]);
    expect(rows).toHaveLength(1);
  });

  it("turns NaN and Infinity into null, keeps real numbers including 0", () => {
    const [row] = normalizeData([{ time: 0, actual: Number.NaN, forecast: 0 }]);
    expect(row).toEqual({ t: 0, actual: null, forecast: 0 });
    const [inf] = normalizeData([{ time: 0, actual: Infinity, forecast: -Infinity }]);
    expect(inf).toEqual({ t: 0, actual: null, forecast: null });
  });

  it("sorts ascending by time and converts everything to epoch milliseconds", () => {
    const rows = normalizeData([
      { time: "2025-01-01T02:00:00Z", actual: 3, forecast: null },
      { time: Date.UTC(2025, 0, 1, 0), actual: 1, forecast: null },
      { time: new Date("2025-01-01T01:00:00Z"), actual: 2, forecast: null },
    ]);
    expect(rows.map((r) => r.actual)).toEqual([1, 2, 3]);
    expect(rows.every((r) => typeof r.t === "number")).toBe(true);
  });

  it("keeps duplicate timestamps instead of silently merging them", () => {
    const rows = normalizeData([
      { time: 5, actual: 1, forecast: null },
      { time: 5, actual: 2, forecast: null },
    ]);
    expect(rows).toHaveLength(2);
  });

  it("does not modify the input array", () => {
    const input = [
      { time: 2, actual: 1, forecast: null },
      { time: 1, actual: 2, forecast: null },
    ];
    normalizeData(input);
    expect(input.map((p) => p.time)).toEqual([2, 1]);
  });
});

describe("time zone: Europe/London clock changes", () => {
  const { summary } = london();

  it("spring forward (30 Mar 2025): 01:00 UTC is already 02:00 BST, local 01:xx never happens", () => {
    expect(summary(at("2025-03-30T00:59:59Z"))).toMatch(/00:59.*GMT/);
    expect(summary(at("2025-03-30T01:00:00Z"))).toMatch(/02:00.*BST/);
    expect(summary(at("2025-03-30T01:30:00Z"))).toMatch(/02:30.*BST/);
  });

  it("fall back (26 Oct 2025): 01:30 happens twice, the zone name tells the two apart", () => {
    expect(summary(at("2025-10-26T00:30:00Z"))).toMatch(/01:30.*BST/);
    expect(summary(at("2025-10-26T01:30:00Z"))).toMatch(/01:30.*GMT/);
  });

  it("is one hour ahead of UTC in summer and equal to UTC in winter", () => {
    expect(summary(at("2025-07-15T12:00:00Z"))).toMatch(/13:00.*BST/);
    expect(summary(at("2025-01-15T12:00:00Z"))).toMatch(/12:00.*GMT/);
  });

  it("applies the same zone to the tooltip and axis formats", () => {
    const f = london(0); // short span -> axis shows clock times
    expect(f.tooltip(at("2025-03-30T01:00:00Z"))).toMatch(/02:00/);
    expect(f.axis(at("2025-03-30T01:00:00Z"))).toMatch(/^02:00$/);
  });
});

describe("time zone: different zones give different wall-clock times", () => {
  it("UTC does not shift", () => {
    const f = makeTimeFormatters({ locale: "en-GB", timeZone: "UTC", spanMs: 0 });
    expect(f.tooltip(at("2025-07-15T12:00:00Z"))).toMatch(/12:00/);
  });

  it("between 9 and 30 March the US is on summer time but the UK is not", () => {
    const instant = at("2025-03-15T12:00:00Z");
    const ny = makeTimeFormatters({ locale: "en-GB", timeZone: "America/New_York", spanMs: 0 });
    const ldn = london();
    expect(ldn.tooltip(instant)).toMatch(/12:00/); // GMT, offset 0
    expect(ny.tooltip(instant)).toMatch(/08:00/); // EDT, offset -4
    // Three weeks earlier both were on winter time: the gap was five hours, not four.
    expect(ny.tooltip(at("2025-03-05T12:00:00Z"))).toMatch(/07:00/); // EST, offset -5
  });
});

describe("axis format", () => {
  const instant = at("2025-01-25T14:30:00Z");

  it("shows clock times for spans under two days", () => {
    expect(london(2 * DAY - 1).axis(instant)).toMatch(/^\d{2}:\d{2}$/);
  });

  it("shows dates from two days upwards", () => {
    expect(london(2 * DAY).axis(instant)).toMatch(/^25 Jan/);
  });
});

describe("fallbacks", () => {
  afterEach(() => vi.restoreAllMocks());

  it("an unknown time zone warns once and still formats", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const f = makeTimeFormatters({ locale: "en-GB", timeZone: "Not/AZone", spanMs: 0 });
    expect(f.tooltip(at("2025-07-15T12:00:00Z"))).toMatch(/\d{2}:\d{2}/);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(String(warn.mock.calls[0]?.[0])).toContain('Unknown timeZone "Not/AZone"');
  });

  it("an invalid locale does not throw", () => {
    const f = makeTimeFormatters({ locale: "not a locale!!", timeZone: "Europe/London", spanMs: 0 });
    expect(f.summary(at("2025-07-15T12:00:00Z"))).toMatch(/13:00/);
  });
});

describe("makeValueFormatter", () => {
  it("uses two decimals", () => {
    expect(makeValueFormatter("en-US")(1234.5)).toBe("1,234.50");
    expect(makeValueFormatter("en-US")(0)).toBe("0.00");
  });

  it("follows the locale", () => {
    expect(makeValueFormatter("de-DE")(1234.5)).toBe("1.234,50");
  });

  it("falls back on an invalid locale", () => {
    expect(makeValueFormatter("not a locale!!")(2)).toMatch(/2[.,]00/);
  });
});
