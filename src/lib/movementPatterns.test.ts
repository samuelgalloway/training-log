import { describe, expect, it } from "vitest";
import { classifyMovementPattern } from "./movementPatterns";

describe("classifyMovementPattern", () => {
  it.each([
    ["Trap Bar Deadlift", "hinge"],
    ["Back Squat", "squat"],
    ["Rear-Foot-Elevated Split Squat", "squat"],
    ["Barbell Bench Press", "push"],
    ["Barbell Pendlay Row", "pull"],
    ["Ring Chin-Up", "pull"],
    ["Ab Roller", "other"],
  ] as const)("%s -> %s", (name, expected) => {
    expect(classifyMovementPattern(name)).toBe(expected);
  });
});
