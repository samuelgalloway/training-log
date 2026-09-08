import { describe, expect, it } from "vitest";
import { rollingBodyweightSeries } from "./body";
import type { BodyEntry } from "./types";

describe("rollingBodyweightSeries", () => {
  it("averages only entries within the trailing window, not all history", () => {
    const entries: BodyEntry[] = [
      { date: "2026-09-01", bodyweight_lb: 180 },
      { date: "2026-09-08", bodyweight_lb: 178 },
      { date: "2026-09-15", bodyweight_lb: 176 },
    ];
    const series = rollingBodyweightSeries(entries, 7);
    // Each entry is >7 days apart, so each window contains only itself.
    expect(series.map((p) => p.avg)).toEqual([180, 178, 176]);
  });

  it("averages multiple entries that fall within the same window", () => {
    const entries: BodyEntry[] = [
      { date: "2026-09-01", bodyweight_lb: 180 },
      { date: "2026-09-03", bodyweight_lb: 182 },
      { date: "2026-09-05", bodyweight_lb: 178 },
    ];
    const series = rollingBodyweightSeries(entries, 7);
    expect(series[2]!.avg).toBeCloseTo((180 + 182 + 178) / 3);
  });

  it("ignores entries with no bodyweight logged (measurements-only rows)", () => {
    const entries: BodyEntry[] = [
      { date: "2026-09-01", bodyweight_lb: 180 },
      { date: "2026-09-02", bodyweight_lb: null, waist_in: 34 },
    ];
    expect(rollingBodyweightSeries(entries)).toHaveLength(1);
  });
});
