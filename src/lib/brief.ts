// The coaching brief: a one-page markdown summary of the active block to
// date. Pure function over already-fetched data — never hands raw set rows
// to a model, only these pre-computed rollups.

import { summarizeAdherence, computeAdherence } from "./adherence";
import { rollingAverage } from "./dateUtils";
import { e1rmTrend, groupSetsByExerciseImplement } from "./e1rm";
import { classifyMovementPattern } from "./movementPatterns";
import { buildSessionSummariesFromSets, evaluateProgression } from "./progression";
import { findAllRpeDrift } from "./rpeDrift";
import type { Block, BodyEntry, Exercise, LoggedSession, LoggedSet } from "./types";

function fmt(n: number, digits = 1): string {
  return n.toFixed(digits).replace(/\.0+$/, "");
}

function collectExerciseCatalog(block: Block): Map<string, Exercise> {
  const catalog = new Map<string, Exercise>();
  for (const week of block.weeks) {
    for (const day of week.days) {
      for (const session of day.sessions) {
        if (session.type !== "lift") continue;
        for (const ex of session.exercises) {
          catalog.set(`${ex.name}::${ex.implement}`, ex);
        }
      }
    }
  }
  return catalog;
}

export function generateBrief(
  block: Block,
  sets: LoggedSet[],
  sessions: LoggedSession[],
  body: BodyEntry[],
  asOfDate: string
): string {
  const lines: string[] = [];
  lines.push(`# Coaching brief — ${block.block.name} (${block.block.id})`);
  lines.push("");
  lines.push(`As of ${asOfDate}. Block: ${block.block.start_date} → ${block.block.end_date}.`);
  lines.push("");

  // ---------------------------------------------------------- adherence
  const adherenceRows = computeAdherence(block, sessions, asOfDate);
  const adherenceSummary = summarizeAdherence(adherenceRows);
  lines.push("## Adherence");
  lines.push(
    `${adherenceSummary.done} done, ${adherenceSummary.partial} partial, ${adherenceSummary.skippedCount} skipped, out of ${adherenceSummary.total} planned sessions to date.`
  );
  if (adherenceSummary.skipped.length > 0) {
    lines.push("");
    lines.push("Skipped:");
    for (const s of adherenceSummary.skipped) {
      lines.push(`- ${s.date} (wk ${s.week} ${s.dow}) — ${s.name}`);
    }
  }
  lines.push("");

  // ---------------------------------------------------------- e1RM trends
  lines.push("## e1RM trend (Epley, top set)");
  const grouped = groupSetsByExerciseImplement(sets);
  if (grouped.size === 0) {
    lines.push("No sets logged yet.");
  }
  for (const [key, groupSets] of grouped) {
    const [exercise, implement] = key.split("::") as [string, string];
    const trend = e1rmTrend(groupSets);
    if (trend.length === 0) continue;
    const first = trend[0]!;
    const last = trend[trend.length - 1]!;
    const delta = last.e1rm - first.e1rm;
    lines.push(
      `- **${exercise}** (${implement}): ${fmt(first.e1rm)} → ${fmt(last.e1rm)} lb (${delta >= 0 ? "+" : ""}${fmt(delta)}) over ${trend.length} session(s)`
    );
  }
  lines.push("");

  // ---------------------------------------------------------- RPE drift
  lines.push("## RPE drift flags");
  const drift = findAllRpeDrift(sets);
  if (drift.length === 0) {
    lines.push("None — no exercise is trending up in RPE at a fixed load across 3+ sessions.");
  } else {
    for (const flag of drift) {
      lines.push(
        `- **${flag.exercise}** (${flag.implement}) @ ${flag.weightLb} lb: RPE ${flag.points.map((p) => fmt(p.avgRpe, 1)).join(" → ")} over ${flag.points.length} sessions — possible under-recovery.`
      );
    }
  }
  lines.push("");

  // ---------------------------------------------------------- rep-progression status (fixed-load exercises)
  lines.push("## Rep-progression status (fixed-load exercises)");
  const catalog = collectExerciseCatalog(block);
  let anyReps = false;
  for (const [key, exercise] of catalog) {
    if (exercise.progression?.mode !== "reps") continue;
    const [name, implement] = key.split("::") as [string, string];
    const summaries = buildSessionSummariesFromSets(sets, name, implement);
    if (summaries.length === 0) continue;
    anyReps = true;
    const result = evaluateProgression(summaries, exercise);
    if (!result || result.mode !== "reps") continue;
    const description =
      result.action === "advance_rung"
        ? `hit the rep cap — advance ${result.fromLoadLb} → ${result.nextLoadLb} lb`
        : result.action === "no_viable_rung"
          ? "hit the rep cap, but already at the top of its load ladder"
          : result.action === "add_set_or_progress"
            ? `hit the rep cap — ${result.note ?? "progress per exercise note"}`
            : result.reason;
    lines.push(`- **${name}** (${implement}): ${description}`);
  }
  if (!anyReps) lines.push("No fixed-load/reps-mode exercises logged yet.");
  lines.push("");

  // ---------------------------------------------------------- weekly tonnage by movement pattern
  lines.push("## Weekly tonnage by movement pattern");
  const tonnageByWeekPattern = new Map<string, number>();
  const dateToWeek = new Map<string, number>();
  for (const week of block.weeks) {
    for (const day of week.days) {
      // Any date within this week's Mon..Sun maps to this week number.
      dateToWeek.set(`${week.week_of}`, week.week);
    }
  }
  // Map every logged set's date to a block week via the sessions log (which already carries `week`).
  const sessionWeekByDate = new Map<string, number>();
  for (const s of sessions) sessionWeekByDate.set(`${s.date}::${s.type}`, s.week);
  for (const set of sets) {
    if (set.weight_lb == null || set.reps == null) continue;
    const week = sessionWeekByDate.get(`${set.date}::lift`) ?? sessions.find((s) => s.date === set.date)?.week;
    if (week == null) continue;
    const pattern = classifyMovementPattern(set.exercise);
    const key = `${week}::${pattern}`;
    tonnageByWeekPattern.set(key, (tonnageByWeekPattern.get(key) ?? 0) + set.weight_lb * set.reps);
  }
  if (tonnageByWeekPattern.size === 0) {
    lines.push("No logged sets with both weight and reps yet.");
  } else {
    const weeks = Array.from(new Set(Array.from(tonnageByWeekPattern.keys()).map((k) => Number(k.split("::")[0])))).sort(
      (a, b) => a - b
    );
    for (const week of weeks) {
      const patterns = ["squat", "hinge", "push", "pull", "carry", "other"] as const;
      const parts = patterns
        .map((p) => [p, tonnageByWeekPattern.get(`${week}::${p}`) ?? 0] as const)
        .filter(([, v]) => v > 0)
        .map(([p, v]) => `${p} ${Math.round(v).toLocaleString()}`);
      if (parts.length > 0) lines.push(`- Week ${week}: ${parts.join(", ")} lb`);
    }
  }
  lines.push("");

  // ---------------------------------------------------------- bodyweight / measurements
  lines.push("## Body");
  if (body.length === 0) {
    lines.push("No body entries logged yet.");
  } else {
    const sorted = [...body].sort((a, b) => a.date.localeCompare(b.date));
    const weights = sorted.map((b) => b.bodyweight_lb).filter((w): w is number => w != null);
    const avg7 = rollingAverage(weights, 7);
    const first = sorted[0]!;
    const last = sorted[sorted.length - 1]!;
    if (avg7 != null) lines.push(`7-day rolling average bodyweight: ${fmt(avg7)} lb`);
    const deltas: string[] = [];
    for (const [field, label] of [
      ["waist_in", "waist"],
      ["chest_in", "chest"],
      ["arm_in", "arm"],
      ["thigh_in", "thigh"],
    ] as const) {
      const a = first[field];
      const b = last[field];
      if (a != null && b != null) deltas.push(`${label} ${b - a >= 0 ? "+" : ""}${fmt(b - a)}in`);
    }
    if (deltas.length > 0) lines.push(`Measurement deltas since ${first.date}: ${deltas.join(", ")}`);
  }
  lines.push("");

  // ---------------------------------------------------------- run mileage
  lines.push("## Run mileage (planned vs. actual)");
  lines.push(
    "_Actual assumes a completed run was run as planned — this app doesn't capture GPS distance; the watch owns that._"
  );
  const mileageByWeek = new Map<number, { planned: number; actual: number }>();
  for (const week of block.weeks) {
    mileageByWeek.set(week.week, { planned: week.planned_mileage ?? 0, actual: 0 });
  }
  for (const s of sessions) {
    if (s.type !== "run") continue;
    const entry = mileageByWeek.get(s.week);
    if (!entry) continue;
    if (s.status === "done" && s.distance_mi != null) entry.actual += s.distance_mi;
  }
  for (const [week, { planned, actual }] of mileageByWeek) {
    if (planned === 0 && actual === 0) continue;
    lines.push(`- Week ${week}: planned ${fmt(planned)} mi, actual ${fmt(actual)} mi`);
  }
  lines.push("");

  // ---------------------------------------------------------- subjective data
  lines.push("## Subjective data");
  const sleeps = sessions.map((s) => s.sleep).filter((v): v is number => v != null);
  const soreness = sessions.map((s) => s.soreness).filter((v): v is number => v != null);
  if (sleeps.length > 0) lines.push(`Sleep (1–5) average: ${fmt(sleeps.reduce((a, b) => a + b, 0) / sleeps.length)}`);
  if (soreness.length > 0)
    lines.push(`Soreness (1–5) average: ${fmt(soreness.reduce((a, b) => a + b, 0) / soreness.length)}`);

  const liftSessions = sessions.filter((s) => s.type === "lift");
  const jointFlagCounts = new Map<string, number>();
  for (const s of liftSessions) {
    if (s.joint_flag) jointFlagCounts.set(s.joint_flag, (jointFlagCounts.get(s.joint_flag) ?? 0) + 1);
  }
  for (const [flag, count] of jointFlagCounts) {
    lines.push(`Joint flag "${flag}": ${count} of ${liftSessions.length} lift sessions.`);
  }
  lines.push("");

  // ---------------------------------------------------------- notes
  lines.push("## Session notes");
  const notedSessions = sessions.filter((s) => s.note && s.note.trim().length > 0);
  if (notedSessions.length === 0) {
    lines.push("No notes logged yet.");
  } else {
    for (const s of notedSessions) {
      lines.push(`- ${s.date} (${s.name}): ${s.note}`);
    }
  }

  return lines.join("\n");
}
