import { describe, expect, it } from "vitest";
import { findRpeDrift } from "./rpeDrift";
import type { LoggedSet } from "./types";

function setAt(session_id: string, date: string, weight: number, rpe: number): LoggedSet {
  return { session_id, date, exercise: "Barbell Bench Press", implement: "bb", set_index: 1, weight_lb: weight, reps: 5, rpe };
}

describe("findRpeDrift", () => {
  it("flags 3+ consecutive sessions at the same weight with strictly rising RPE", () => {
    const sets = [
      setAt("s1", "2026-09-21", 185, 6),
      setAt("s2", "2026-09-28", 185, 7),
      setAt("s3", "2026-10-05", 185, 8),
      setAt("s4", "2026-10-12", 185, 9),
    ];
    const flags = findRpeDrift(sets, "Barbell Bench Press", "bb");
    expect(flags).toHaveLength(1);
    expect(flags[0]!.points).toHaveLength(4);
  });

  it("does not flag a run of only 2 rising sessions", () => {
    const sets = [setAt("s1", "2026-09-21", 185, 6), setAt("s2", "2026-09-28", 185, 7)];
    expect(findRpeDrift(sets, "Barbell Bench Press", "bb")).toHaveLength(0);
  });

  it("resets the run when RPE drops or repeats", () => {
    const sets = [
      setAt("s1", "2026-09-21", 185, 8),
      setAt("s2", "2026-09-28", 185, 6),
      setAt("s3", "2026-10-05", 185, 7),
      setAt("s4", "2026-10-12", 185, 8),
    ];
    const flags = findRpeDrift(sets, "Barbell Bench Press", "bb");
    expect(flags).toHaveLength(1);
    // Only the trailing 3-session rise (6 -> 7 -> 8) should be in the flagged run.
    expect(flags[0]!.points.map((p) => p.session_id)).toEqual(["s2", "s3", "s4"]);
  });

  it("tracks weights independently — a drift at 185 doesn't get diluted by 135 sets", () => {
    const sets = [
      setAt("s1", "2026-09-21", 185, 7),
      setAt("s2", "2026-09-28", 185, 8),
      setAt("s3", "2026-10-05", 185, 9),
      setAt("s1", "2026-09-21", 135, 5),
      setAt("s2", "2026-09-28", 135, 5),
    ];
    const flags = findRpeDrift(sets, "Barbell Bench Press", "bb");
    expect(flags).toHaveLength(1);
    expect(flags[0]!.weightLb).toBe(185);
  });
});
