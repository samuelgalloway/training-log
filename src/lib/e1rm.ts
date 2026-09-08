// Estimated 1RM, Epley formula, off the top set of a session.
//
// Implement is part of a set's identity — a lift's e1RM trend must be
// tracked per (exercise, implement) pair, never pooled across implements.

import type { LoggedSet } from "./types";

/** Epley: 1RM = weight * (1 + reps / 30). Reps of 0 or 1 return the weight itself. */
export function epley1RM(weightLb: number, reps: number): number {
  if (weightLb <= 0 || reps <= 0) return 0;
  if (reps === 1) return weightLb;
  return weightLb * (1 + reps / 30);
}

export interface SetGroupKey {
  exercise: string;
  implement: string;
}

/** Sets grouped by exercise+implement, so history/e1RM never pools different implements together. */
export function groupSetsByExerciseImplement(sets: LoggedSet[]): Map<string, LoggedSet[]> {
  const groups = new Map<string, LoggedSet[]>();
  for (const set of sets) {
    const key = `${set.exercise}::${set.implement}`;
    const arr = groups.get(key);
    if (arr) arr.push(set);
    else groups.set(key, [set]);
  }
  return groups;
}

export interface E1rmPoint {
  session_id: string;
  date: string;
  topSetWeightLb: number;
  topSetReps: number;
  e1rm: number;
}

/**
 * One e1RM point per session: takes that session's heaviest logged set for
 * this exercise+implement (by weight, reps as tiebreaker) and runs Epley on
 * it. Sets with no weight or no reps logged are ignored (e.g. a skipped set).
 */
export function e1rmTrend(sets: LoggedSet[]): E1rmPoint[] {
  const bySession = new Map<string, LoggedSet[]>();
  for (const set of sets) {
    if (set.weight_lb == null || set.reps == null) continue;
    const arr = bySession.get(set.session_id);
    if (arr) arr.push(set);
    else bySession.set(set.session_id, [set]);
  }

  const points: E1rmPoint[] = [];
  for (const [session_id, sessionSets] of bySession) {
    const top = sessionSets.reduce((best, s) =>
      s.weight_lb! > best.weight_lb! || (s.weight_lb === best.weight_lb && s.reps! > best.reps!) ? s : best
    );
    points.push({
      session_id,
      date: top.date,
      topSetWeightLb: top.weight_lb!,
      topSetReps: top.reps!,
      e1rm: epley1RM(top.weight_lb!, top.reps!),
    });
  }

  return points.sort((a, b) => a.date.localeCompare(b.date));
}
