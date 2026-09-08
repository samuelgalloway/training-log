import type { Exercise, LoggedSet, SessionStatus } from "./types";

/** Infers a lift session's completion status from how many of its planned sets got a weight/reps logged. */
export function computeLiftStatus(exercises: Exercise[], sets: LoggedSet[]): SessionStatus {
  const totalPlanned = exercises.reduce((sum, ex) => sum + ex.sets, 0);
  const logged = sets.filter((s) => s.weight_lb != null || s.reps != null).length;
  if (logged === 0) return "skipped";
  if (logged >= totalPlanned) return "done";
  return "partial";
}

/** The most recent prior session's logged sets for one exercise+implement, sorted by set index — "last time" numbers. */
export function lastSessionSets(sets: LoggedSet[], exercise: string, implement: string, beforeDate: string): LoggedSet[] {
  const relevant = sets.filter((s) => s.exercise === exercise && s.implement === implement && s.date < beforeDate);
  if (relevant.length === 0) return [];
  const lastDate = relevant.reduce((max, s) => (s.date > max ? s.date : max), relevant[0]!.date);
  const sameDate = relevant.filter((s) => s.date === lastDate);
  const lastSessionId = sameDate[sameDate.length - 1]!.session_id;
  return sameDate.filter((s) => s.session_id === lastSessionId).sort((a, b) => a.set_index - b.set_index);
}
