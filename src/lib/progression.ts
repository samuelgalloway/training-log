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
  sets: { weight_lb: number | null; reps: number | null; rpe: number | null }[];
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
    entry.sets.push({ weight_lb: s.weight_lb, reps: s.reps, rpe: s.rpe });
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

function hitRule(session: SessionSetSummary, weight: number, targetReps: number | null): boolean {
  if (session.sets.length === 0) return false;
  return session.sets.every(
    (s) =>
      s.weight_lb === weight &&
      (targetReps == null || (s.reps ?? -Infinity) >= targetReps) &&
      (s.rpe == null || s.rpe <= 8)
  );
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

  if (hitRule(last, lastWeight, targetReps)) {
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
    if (prevWeight === lastWeight && !hitRule(prev, prevWeight, targetReps)) {
      // Two consecutive sessions failing at the same load: drop 10%, build back.
      const nextLoadLb = Math.round(lastWeight * 0.9 * 2) / 2;
      return {
        mode: "load",
        action: "deload",
        currentLoadLb: lastWeight,
        nextLoadLb,
        reason: "Two consecutive sessions missed the rep/RPE target at this load.",
      };
    }
  }

  return {
    mode: "load",
    action: "hold",
    currentLoadLb: lastWeight,
    reason: "Didn't hit target reps at RPE ≤ 8 last time — repeat the weight.",
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
