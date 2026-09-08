import { describe, expect, it } from "vitest";
import { e1rmTrend, epley1RM, groupSetsByExerciseImplement } from "./e1rm";
import type { LoggedSet } from "./types";

describe("epley1RM", () => {
  it("matches the standard Epley formula", () => {
    expect(epley1RM(245, 5)).toBeCloseTo(245 * (1 + 5 / 30));
  });

  it("returns the weight itself for a single-rep set", () => {
    expect(epley1RM(315, 1)).toBe(315);
  });

  it("returns 0 for non-positive inputs", () => {
    expect(epley1RM(0, 5)).toBe(0);
    expect(epley1RM(245, 0)).toBe(0);
  });
});

const sets: LoggedSet[] = [
  { session_id: "s1", date: "2026-09-21", exercise: "Trap Bar Deadlift", implement: "tb", set_index: 1, weight_lb: 245, reps: 5, rpe: 7 },
  { session_id: "s1", date: "2026-09-21", exercise: "Trap Bar Deadlift", implement: "tb", set_index: 2, weight_lb: 245, reps: 5, rpe: 8 },
  // Same lift on the barbell (conventional deadlift sub) must never be pooled with the trap bar numbers.
  { session_id: "s1", date: "2026-09-21", exercise: "Trap Bar Deadlift", implement: "bb", set_index: 1, weight_lb: 225, reps: 5, rpe: 8 },
  { session_id: "s2", date: "2026-09-28", exercise: "Trap Bar Deadlift", implement: "tb", set_index: 1, weight_lb: 255, reps: 5, rpe: 7 },
];

describe("groupSetsByExerciseImplement", () => {
  it("keeps different implements of the same exercise in separate groups", () => {
    const groups = groupSetsByExerciseImplement(sets);
    expect(groups.get("Trap Bar Deadlift::tb")).toHaveLength(3);
    expect(groups.get("Trap Bar Deadlift::bb")).toHaveLength(1);
  });
});

describe("e1rmTrend", () => {
  it("takes one point per session off the top set, sorted chronologically, per implement", () => {
    const tbOnly = sets.filter((s) => s.implement === "tb");
    const trend = e1rmTrend(tbOnly);
    expect(trend).toHaveLength(2);
    expect(trend[0]).toMatchObject({ session_id: "s1", topSetWeightLb: 245, topSetReps: 5 });
    expect(trend[1]).toMatchObject({ session_id: "s2", topSetWeightLb: 255, topSetReps: 5 });
  });

  it("ignores sets with no weight or reps logged (e.g. a skipped set)", () => {
    const withSkip: LoggedSet[] = [
      ...sets.filter((s) => s.implement === "tb"),
      { session_id: "s3", date: "2026-10-05", exercise: "Trap Bar Deadlift", implement: "tb", set_index: 1, weight_lb: null, reps: null, rpe: null },
    ];
    const trend = e1rmTrend(withSkip);
    expect(trend.find((p) => p.session_id === "s3")).toBeUndefined();
  });
});
