import { describe, expect, it } from "vitest";
import { computeAdherence, summarizeAdherence } from "./adherence";
import type { Block, LoggedSession } from "./types";

const block: Block = {
  schema_version: 1,
  block: { id: "b1", name: "Test", sequence: 1, weeks: 1, start_date: "2026-09-21", end_date: "2026-09-27" },
  constraints: { bjj_days: [], anchored_days: [], rules: [] },
  implements: [],
  weeks: [
    {
      week: 1,
      phase: "intro",
      week_of: "2026-09-21", // Monday
      days: [
        { dow: "MON", movable: true, sessions: [{ type: "lift", name: "A — Lower Strength", slot: "A", exercises: [] }] },
        { dow: "TUE", movable: false, sessions: [{ type: "run", subtype: "easy", distance_mi: 3, log: [] }] },
        { dow: "WED", movable: true, sessions: [{ type: "lift", name: "B — Upper Strength", slot: "B", exercises: [] }] },
      ],
    },
  ],
};

describe("computeAdherence", () => {
  it("marks a session done when a matching logged row exists", () => {
    const sessions: LoggedSession[] = [
      { session_id: "x", date: "2026-09-21", block_id: "b1", week: 1, dow: "MON", type: "lift", name: "A — Lower Strength", status: "done" },
    ];
    const rows = computeAdherence(block, sessions, "2026-09-27");
    const mon = rows.find((r) => r.dow === "MON")!;
    expect(mon.status).toBe("done");
  });

  it("treats a planned session with no logged row, in the past, as skipped", () => {
    const rows = computeAdherence(block, [], "2026-09-27");
    const tue = rows.find((r) => r.dow === "TUE")!;
    expect(tue.status).toBe("skipped");
  });

  it("marks a planned session in the future as future, not skipped", () => {
    const rows = computeAdherence(block, [], "2026-09-20");
    expect(rows.every((r) => r.status === "future")).toBe(true);
  });
});

describe("summarizeAdherence", () => {
  it("excludes future sessions from the skipped/done counts", () => {
    const rows = computeAdherence(block, [], "2026-09-21");
    const summary = summarizeAdherence(rows);
    // Only MON has passed (asOf = MON itself); TUE/WED are future.
    expect(summary.total).toBe(1);
  });
});
