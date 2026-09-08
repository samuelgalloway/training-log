import { describe, expect, it } from "vitest";
import { validateSessionMove } from "./validator";
import type { Constraints, Week } from "./types";

const constraints: Constraints = {
  bjj_days: ["TUE", "THU"],
  anchored_days: ["TUE", "THU", "SUN"],
  rules: [
    { id: "no_heavy_legs_before_long_run", text: "No heavy lower-body session in the 24h before the long run." },
    { id: "no_adjacent_hard_days", text: "Two hard sessions should not sit back to back." },
    { id: "bjj_anchored", text: "BJJ days are fixed by the gym schedule and cannot be swapped." },
  ],
};

function makeWeek(): Week {
  return {
    week: 1,
    phase: "intro",
    week_of: "2026-09-21",
    days: [
      { dow: "MON", movable: true, sessions: [{ type: "lift", name: "A — Lower Strength", slot: "A", exercises: [] }] },
      {
        dow: "TUE",
        movable: false,
        sessions: [
          { type: "run", subtype: "easy", distance_mi: 3, log: [] },
          { type: "bjj", log: [] },
        ],
      },
      { dow: "WED", movable: true, sessions: [{ type: "lift", name: "B — Upper Strength", slot: "B", exercises: [] }] },
      { dow: "THU", movable: false, sessions: [{ type: "bjj", log: [] }] },
      { dow: "FRI", movable: true, sessions: [] },
      { dow: "SAT", movable: true, sessions: [{ type: "run", subtype: "long", distance_mi: 10, log: [] }] },
      { dow: "SUN", movable: false, sessions: [{ type: "run", subtype: "easy", distance_mi: 3, log: [] }] },
    ],
  };
}

describe("validateSessionMove", () => {
  it("blocks moving an anchored/non-movable day", () => {
    const week = makeWeek();
    const result = validateSessionMove(week, "TUE", "FRI", constraints);
    expect(result.blocked).toBe(true);
  });

  it("allows moving a movable, non-hard session with no conflicts", () => {
    const week = makeWeek();
    // FRI is empty (nothing hard to move), so moving it around triggers no rules.
    const result = validateSessionMove(week, "FRI", "MON", constraints);
    expect(result.blocked).toBe(false);
    expect(result.warnings).toHaveLength(0);
  });

  it("warns (without blocking) when a heavy-leg lift lands the day before a long run", () => {
    const week = makeWeek();
    // Moving Monday's lower-strength day to Friday puts it right before Saturday's long run.
    const result = validateSessionMove(week, "MON", "FRI", constraints);
    expect(result.blocked).toBe(false);
    expect(result.warnings.some((w) => w.ruleId === "no_heavy_legs_before_long_run")).toBe(true);
  });

  it("warns when two hard sessions would sit adjacent", () => {
    const week = makeWeek();
    // Wednesday's lift moved to Friday sits next to Thursday's BJJ.
    const result = validateSessionMove(week, "WED", "FRI", constraints);
    expect(result.warnings.some((w) => w.ruleId === "no_adjacent_hard_days")).toBe(true);
  });

  it("is a no-op moving a day to itself", () => {
    const week = makeWeek();
    const result = validateSessionMove(week, "MON", "MON", constraints);
    expect(result.blocked).toBe(false);
    expect(result.warnings).toHaveLength(0);
  });
});
