// Week-to-week progression evaluation. Pure — takes an exercise's plan
// definition plus its logged history and says what to do next time.
//
// Never suggest a weight increase on a reps-mode exercise, and never treat a
// fixed-load implement's rungs as continuous ("next size up" doesn't exist
// for kettlebells — only the ladder the exercise defines).

import type { Exercise, LoadProgression, LoggedSet, RepsProgression } from "./types";

export interface SessionSetSummary {
  session_id: string;
  date: string;
  sets: { weight_lb: number | null; reps: number | null; rpe: number | null; brutal?: boolean }[];
}

export type LoadProgressionResult =
  | { mode: "load"; action: "advance"; currentLoadLb: number; nextLoadLb: number }
  | { mode: "load"; action: "hold"; currentLoadLb: number | null; reason: string }
  | { mode: "load"; action: "deload"; currentLoadLb: number; nextLoadLb: number; reason: string };

export type RepsProgressionResult =
  | { mode: "reps"; action: "advance_rung"; fromLoadLb: number; nextLoadLb: number }
  | { mode: "reps"; action: "no_viable_rung" }
  | { mode: "reps"; action: "add_set_or_progress"; note?: string }
  | { mode: "reps"; action: "hold"; reason: string };

export type DistanceProgressionResult = { mode: "distance"; action: "hold" };

export type ProgressionResult = LoadProgressionResult | RepsProgressionResult | DistanceProgressionResult;

/** Groups an exercise+implement's logged sets into one chronological summary per session — the shape every progression evaluator consumes. */
export function buildSessionSummariesFromSets(sets: LoggedSet[], exercise: string, implement: string): SessionSetSummary[] {
  const relevant = sets.filter((s) => s.exercise === exercise && s.implement === implement);
  const bySession = new Map<string, SessionSetSummary>();
  for (const s of relevant) {
    const entry = bySession.get(s.session_id) ?? { session_id: s.session_id, date: s.date, sets: [] };
    entry.sets.push({ weight_lb: s.weight_lb, reps: s.reps, rpe: s.rpe, brutal: s.brutal });
    bySession.set(s.session_id, entry);
  }
  return Array.from(bySession.values()).sort((a, b) => a.date.localeCompare(b.date));
}

function mostCommonWeight(sets: SessionSetSummary["sets"]): number | null {
  const counts = new Map<number, number>();
  for (const s of sets) {
    if (s.weight_lb == null) continue;
    counts.set(s.weight_lb, (counts.get(s.weight_lb) ?? 0) + 1);
  }
  let best: number | null = null;
  let bestCount = 0;
  for (const [w, c] of counts) {
    if (c > bestCount) {
      best = w;
      bestCount = c;
    }
  }
  return best;
}

// Reps hit is the whole rule by default — never gated on RPE. RPE stays a
// logged, useful number (History's drift detector watches it), but it's not
// what decides "advance or not": Sam found that grading his own RPE mid-set
// isn't something he wants to think about, and grindy-but-successful sets
// are still successful. "brutal" is the one explicit override for "technically
// hit the reps, but that shouldn't count" — a single end-of-exercise tap
// instead of a number to get right in the moment.
function hitRule(session: SessionSetSummary, weight: number, targetReps: number | null): boolean {
  if (session.sets.length === 0) return false;
  return session.sets.every((s) => s.weight_lb === weight && (targetReps == null || (s.reps ?? -Infinity) >= targetReps));
}

function sessionSucceeded(session: SessionSetSummary, weight: number, targetReps: number | null): boolean {
  return hitRule(session, weight, targetReps) && !session.sets.some((s) => s.brutal);
}

export function evaluateLoadProgression(
  sessions: SessionSetSummary[], // chronological, oldest first
  exercise: Exercise & { progression: LoadProgression }
): LoadProgressionResult {
  if (sessions.length === 0) {
    return { mode: "load", action: "hold", currentLoadLb: null, reason: "No logged sessions yet." };
  }

  const targetReps = typeof exercise.reps === "number" ? exercise.reps : null;
  const last = sessions[sessions.length - 1]!;
  const lastWeight = mostCommonWeight(last.sets);

  if (lastWeight == null) {
    return { mode: "load", action: "hold", currentLoadLb: null, reason: "No weight logged last session." };
  }

  if (sessionSucceeded(last, lastWeight, targetReps)) {
    return {
      mode: "load",
      action: "advance",
      currentLoadLb: lastWeight,
      nextLoadLb: lastWeight + exercise.progression.increment_lb,
    };
  }

  if (sessions.length >= 2) {
    const prev = sessions[sessions.length - 2]!;
    const prevWeight = mostCommonWeight(prev.sets);
    if (prevWeight === lastWeight && !sessionSucceeded(prev, prevWeight, targetReps)) {
      // Two consecutive sessions failing at the same load: drop 10%, build back.
      const nextLoadLb = Math.round(lastWeight * 0.9 * 2) / 2;
      return {
        mode: "load",
        action: "deload",
        currentLoadLb: lastWeight,
        nextLoadLb,
        reason: "Two consecutive sessions at this weight didn't succeed.",
      };
    }
  }

  const missedReps = !hitRule(last, lastWeight, targetReps);
  let reason = "Marked brutal last time — repeat the weight.";
  if (missedReps) {
    // hitRule requires every set at lastWeight AND at/above targetReps — say
    // how many actually qualified, since "didn't hit target reps" alone
    // reads the same whether one set came up a rep short or the session was
    // a ramp where only the top set was even at this weight.
    const qualifying = last.sets.filter(
      (s) => s.weight_lb === lastWeight && (targetReps == null || (s.reps ?? -Infinity) >= targetReps)
    ).length;
    const repsPart = targetReps != null ? `${targetReps} reps` : "the target";
    reason = `Only ${qualifying} of ${last.sets.length} sets hit ${repsPart} at ${lastWeight} lb last time — repeat the weight.`;
  }
  return {
    mode: "load",
    action: "hold",
    currentLoadLb: lastWeight,
    reason,
  };
}

export function evaluateRepsProgression(
  sessions: SessionSetSummary[],
  exercise: Exercise & { progression: RepsProgression }
): RepsProgressionResult {
  if (sessions.length === 0) {
    return { mode: "reps", action: "hold", reason: "No logged sessions yet." };
  }

  const last = sessions[sessions.length - 1]!;
  const repsLogged = last.sets.map((s) => s.reps ?? 0);
  const topReps = repsLogged.length ? Math.max(...repsLogged) : 0;
  const cap = exercise.progression.cap;

  if (cap == null || topReps < cap) {
    return {
      mode: "reps",
      action: "hold",
      reason: cap == null ? "No rep cap set — keep building reps." : `Hasn't hit the rep cap (${cap}) yet.`,
    };
  }

  const ladder = exercise.progression.load_ladder_lb;
  if (ladder && ladder.length > 0) {
    const currentLoad = exercise.load_lb ?? mostCommonWeight(last.sets);
    const idx = currentLoad != null ? ladder.indexOf(currentLoad) : -1;
    if (idx >= 0 && idx < ladder.length - 1) {
      return { mode: "reps", action: "advance_rung", fromLoadLb: currentLoad!, nextLoadLb: ladder[idx + 1]! };
    }
    // Already at (or above) the top rung, or the current load isn't recognized on the ladder.
    return { mode: "reps", action: "no_viable_rung" };
  }

  return { mode: "reps", action: "add_set_or_progress", note: exercise.progression.then ?? exercise.progression.note };
}

/** Dispatches to the right evaluator based on the exercise's progression mode. */
export function evaluateProgression(sessions: SessionSetSummary[], exercise: Exercise): ProgressionResult | null {
  if (!exercise.progression) return null;
  switch (exercise.progression.mode) {
    case "load":
      return evaluateLoadProgression(sessions, exercise as Exercise & { progression: LoadProgression });
    case "reps":
      return evaluateRepsProgression(sessions, exercise as Exercise & { progression: RepsProgression });
    case "distance":
      return { mode: "distance", action: "hold" };
    default:
      return null;
  }
}
