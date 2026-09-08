import { describe, expect, it } from "vitest";
import { evaluateLoadProgression, evaluateRepsProgression } from "./progression";
import type { Exercise, LoadProgression, RepsProgression } from "./types";

const deadlift: Exercise & { progression: LoadProgression } = {
  name: "Trap Bar Deadlift",
  implement: "tb",
  sets: 3,
  reps: 5,
  target_rpe: 7,
  progression: { mode: "load", increment_lb: 10, rule: "all_sets_at_reps_and_rpe<=8" },
};

describe("evaluateLoadProgression", () => {
  it("advances when the last session hit target reps at RPE<=8", () => {
    const result = evaluateLoadProgression(
      [
        {
          session_id: "s1",
          date: "2026-09-21",
          sets: [
            { weight_lb: 245, reps: 5, rpe: 7 },
            { weight_lb: 245, reps: 5, rpe: 7 },
            { weight_lb: 245, reps: 5, rpe: 8 },
          ],
        },
      ],
      deadlift
    );
    expect(result).toEqual({ mode: "load", action: "advance", currentLoadLb: 245, nextLoadLb: 255 });
  });

  it("holds when a set missed reps, even at low RPE", () => {
    const result = evaluateLoadProgression(
      [
        {
          session_id: "s1",
          date: "2026-09-21",
          sets: [
            { weight_lb: 245, reps: 5, rpe: 7 },
            { weight_lb: 245, reps: 3, rpe: 9 },
            { weight_lb: 245, reps: 5, rpe: 7 },
          ],
        },
      ],
      deadlift
    );
    expect(result.action).toBe("hold");
  });

  it("deloads 10% after two consecutive failures at the same weight", () => {
    const failedSession = {
      sets: [
        { weight_lb: 245, reps: 3, rpe: 9 },
        { weight_lb: 245, reps: 3, rpe: 9 },
        { weight_lb: 245, reps: 3, rpe: 9 },
      ],
    };
    const result = evaluateLoadProgression(
      [
        { session_id: "s1", date: "2026-09-21", ...failedSession },
        { session_id: "s2", date: "2026-09-28", ...failedSession },
      ],
      deadlift
    );
    expect(result.action).toBe("deload");
    if (result.action === "deload") {
      expect(result.nextLoadLb).toBe(220.5); // 245 * 0.9 = 220.5
    }
  });

  it("never suggests progress with no logged history", () => {
    const result = evaluateLoadProgression([], deadlift);
    expect(result.action).toBe("hold");
    expect(result.currentLoadLb).toBeNull();
  });
});

const rfess: Exercise & { progression: RepsProgression } = {
  name: "Rear-Foot-Elevated Split Squat",
  implement: "kb",
  sets: 3,
  reps: "10/side",
  target_rpe: 7,
  progression: { mode: "reps", cap: 15, load_ladder_lb: [18, 36, 40, 54], then: "Advance one rung, reset to 10 reps." },
};

describe("evaluateRepsProgression", () => {
  it("holds below the rep cap", () => {
    const result = evaluateRepsProgression(
      [{ session_id: "s1", date: "2026-09-21", sets: [{ weight_lb: 18, reps: 12, rpe: 7 }] }],
      rfess
    );
    expect(result.action).toBe("hold");
  });

  it("advances to the next ladder rung once the cap is hit", () => {
    const result = evaluateRepsProgression(
      [{ session_id: "s1", date: "2026-09-21", sets: [{ weight_lb: 18, reps: 15, rpe: 8 }] }],
      { ...rfess, load_lb: 18 }
    );
    expect(result).toEqual({ mode: "reps", action: "advance_rung", fromLoadLb: 18, nextLoadLb: 36 });
  });

  it("reports no viable rung at the top of the ladder — never invents a next size", () => {
    const result = evaluateRepsProgression(
      [{ session_id: "s1", date: "2026-09-21", sets: [{ weight_lb: 54, reps: 15, rpe: 8 }] }],
      { ...rfess, load_lb: 54 }
    );
    expect(result.action).toBe("no_viable_rung");
  });

  it("falls back to the exercise's own note when there's no ladder", () => {
    const chinup: Exercise & { progression: RepsProgression } = {
      name: "Ring Chin-Up",
      implement: "rings",
      sets: 3,
      reps: "AMRAP-1",
      progression: { mode: "reps", note: "Leave one rep in the tank. Add reps before adding load." },
    };
    const result = evaluateRepsProgression(
      [{ session_id: "s1", date: "2026-09-21", sets: [{ weight_lb: null, reps: 8, rpe: null }] }],
      chinup
    );
    // No cap at all → always "hold" (keep building reps), never a phantom load suggestion.
    expect(result.action).toBe("hold");
  });
});
