// Heuristic movement-pattern classification for weekly tonnage rollups.
// The plan format doesn't tag exercises with a pattern, so this infers one
// from the exercise name. Good enough for a coaching brief; not meant to be
// exhaustive taxonomy.

export type MovementPattern = "squat" | "hinge" | "push" | "pull" | "carry" | "other";

const PATTERNS: [MovementPattern, RegExp][] = [
  ["hinge", /deadlift|hinge|good.?morning|rdl|hip.?thrust/i],
  ["squat", /squat|lunge|split squat|step.?up/i],
  ["push", /press|push.?up|dip\b/i],
  ["pull", /row|pull.?up|pulldown|chin.?up/i],
  ["carry", /carry|farmer|suitcase/i],
];

export function classifyMovementPattern(exerciseName: string): MovementPattern {
  for (const [pattern, re] of PATTERNS) {
    if (re.test(exerciseName)) return pattern;
  }
  return "other";
}
