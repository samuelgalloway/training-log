import { describe, expect, it } from "vitest";
import { generateBrief } from "./brief";
import type { Block, LoggedSession, LoggedSet } from "./types";

const block: Block = {
  schema_version: 1,
  block: { id: "b1", name: "Strength Base", sequence: 1, weeks: 1, start_date: "2026-09-21", end_date: "2026-09-27" },
  constraints: { bjj_days: [], anchored_days: [], rules: [] },
  implements: [],
  weeks: [
    {
      week: 1,
      phase: "intro",
      week_of: "2026-09-21",
      planned_mileage: 10,
      days: [
        {
          dow: "MON",
          movable: true,
          sessions: [
            {
              type: "lift",
              name: "A — Lower Strength",
              slot: "A",
              exercises: [
                {
                  name: "Trap Bar Deadlift",
                  implement: "tb",
                  sets: 3,
                  reps: 5,
                  target_rpe: 7,
                  progression: { mode: "load", increment_lb: 10 },
                },
              ],
            },
          ],
        },
        { dow: "TUE", movable: false, sessions: [{ type: "run", subtype: "easy", distance_mi: 3, log: [] }] },
      ],
    },
  ],
};

const sets: LoggedSet[] = [
  { session_id: "s1", date: "2026-09-21", exercise: "Trap Bar Deadlift", implement: "tb", set_index: 1, weight_lb: 245, reps: 5, rpe: 7 },
  { session_id: "s1", date: "2026-09-21", exercise: "Trap Bar Deadlift", implement: "tb", set_index: 2, weight_lb: 245, reps: 5, rpe: 8 },
];

const sessions: LoggedSession[] = [
  {
    session_id: "s1",
    date: "2026-09-21",
    block_id: "b1",
    week: 1,
    dow: "MON",
    type: "lift",
    name: "A — Lower Strength",
    status: "done",
    sleep: 4,
    soreness: 2,
    note: "Felt strong.",
  },
];

describe("generateBrief", () => {
  it("includes every required section and reflects the logged data", () => {
    const md = generateBrief(block, sets, sessions, [], "2026-09-27");

    for (const heading of [
      "## Adherence",
      "## e1RM trend",
      "## RPE drift flags",
      "## Rep-progression status",
      "## Weekly tonnage",
      "## Body",
      "## Run mileage",
      "## Subjective data",
      "## Session notes",
    ]) {
      expect(md).toContain(heading);
    }

    // Adherence: MON done, TUE (run) never logged and in the past -> skipped.
    expect(md).toMatch(/1 done, 0 partial, 1 skipped, out of 2 planned/);

    // e1RM trend shows the trap bar deadlift, not pooled with anything else.
    expect(md).toContain("Trap Bar Deadlift");

    // Tonnage: 245*5 + 245*5 = 2450 lb of hinge work in week 1.
    expect(md).toMatch(/Week 1:.*hinge 2,450 lb/);

    // The verbatim note comes through untouched.
    expect(md).toContain("Felt strong.");
  });

  it("degrades gracefully with no logged data at all", () => {
    const md = generateBrief(block, [], [], [], "2026-09-20");
    expect(md).toContain("No sets logged yet.");
    expect(md).toContain("No body entries logged yet.");
    expect(md).toContain("No notes logged yet.");
  });
});
