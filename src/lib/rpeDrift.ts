// RPE-at-fixed-load drift: the best under-recovery signal available without
// a lab. If the same weight is trending up in RPE across sessions, something
// (fatigue, sleep, stress) is eating into the lift even though the load on
// the bar hasn't moved.

import type { LoggedSet } from "./types";

export interface RpeDriftPoint {
  session_id: string;
  date: string;
  weightLb: number;
  avgRpe: number;
}

export interface RpeDriftFlag {
  exercise: string;
  implement: string;
  weightLb: number;
  points: RpeDriftPoint[];
}

/**
 * Groups sets at the SAME weight (for one exercise+implement) into one
 * average-RPE point per session, then flags a run of 3+ consecutive
 * sessions (chronological, at that weight) with strictly increasing
 * average RPE.
 */
export function findRpeDrift(sets: LoggedSet[], exercise: string, implement: string): RpeDriftFlag[] {
  const relevant = sets.filter(
    (s) => s.exercise === exercise && s.implement === implement && s.weight_lb != null && s.rpe != null
  );

  const byWeight = new Map<number, Map<string, { date: string; rpes: number[] }>>();
  for (const s of relevant) {
    const w = s.weight_lb!;
    if (!byWeight.has(w)) byWeight.set(w, new Map());
    const bySession = byWeight.get(w)!;
    const entry = bySession.get(s.session_id) ?? { date: s.date, rpes: [] };
    entry.rpes.push(s.rpe!);
    bySession.set(s.session_id, entry);
  }

  const flags: RpeDriftFlag[] = [];

  for (const [weightLb, bySession] of byWeight) {
    const points: RpeDriftPoint[] = Array.from(bySession.entries())
      .map(([session_id, { date, rpes }]) => ({
        session_id,
        date,
        weightLb,
        avgRpe: rpes.reduce((a, b) => a + b, 0) / rpes.length,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Find the longest trailing strictly-increasing run.
    let runStart = points.length - 1;
    for (let i = points.length - 1; i > 0; i--) {
      if (points[i]!.avgRpe > points[i - 1]!.avgRpe) {
        runStart = i - 1;
      } else {
        break;
      }
    }
    const run = points.slice(runStart);
    if (run.length >= 3) {
      flags.push({ exercise, implement, weightLb, points: run });
    }
  }

  return flags;
}

/** Runs findRpeDrift across every exercise+implement pair present in the log. */
export function findAllRpeDrift(sets: LoggedSet[]): RpeDriftFlag[] {
  const pairs = new Set(sets.map((s) => `${s.exercise}::${s.implement}`));
  const flags: RpeDriftFlag[] = [];
  for (const pair of pairs) {
    const [exercise, implement] = pair.split("::") as [string, string];
    flags.push(...findRpeDrift(sets, exercise, implement));
  }
  return flags;
}
