// Constraint validator for manual day swaps in the Week view. Pure function,
// no I/O — this is deliberately the foundation the v2 weather-rescheduling
// engine plugs into, so keep it standalone and dependency-free.
//
// Per SPEC.md: validate and WARN, don't block — except a day marked
// `movable: false` (BJJ/anchored days), which cannot be dragged at all.

import type { Constraints, Day, Dow, Session, Week } from "./types";

const DOW_ORDER: Dow[] = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

export interface SwapWarning {
  ruleId: string;
  message: string;
}

export interface SwapValidationResult {
  blocked: boolean;
  blockReason?: string;
  warnings: SwapWarning[];
}

function dayByDow(week: Week, dow: Dow): Day | undefined {
  return week.days.find((d) => d.dow === dow);
}

function nextDow(dow: Dow): Dow {
  const idx = DOW_ORDER.indexOf(dow);
  return DOW_ORDER[(idx + 1) % 7]!;
}

function prevDow(dow: Dow): Dow {
  const idx = DOW_ORDER.indexOf(dow);
  return DOW_ORDER[(idx + 6) % 7]!;
}

function isHardSession(session: Session): boolean {
  if (session.type === "lift") return true;
  if (session.type === "bjj") return true;
  if (session.type === "run") {
    const subtype = (session.subtype ?? "").toLowerCase();
    const effort = (session.effort ?? "").toLowerCase();
    if (subtype === "long" || subtype === "tempo" || subtype === "interval") return true;
    if (effort && !effort.includes("easy") && !effort.includes("conversational")) return true;
    return false;
  }
  return false;
}

function isHeavyLegSession(session: Session): boolean {
  if (session.type !== "lift") return false;
  const label = `${session.name} ${session.slot}`.toLowerCase();
  return label.includes("lower") || label.includes("leg") || label.includes("squat") || label.includes("deadlift");
}

function isLongRun(session: Session): boolean {
  return session.type === "run" && (session.subtype ?? "").toLowerCase() === "long";
}

function dayHasAny(day: Day | undefined, predicate: (s: Session) => boolean): boolean {
  return !!day && day.sessions.some(predicate);
}

/**
 * Validates moving everything scheduled on `fromDow` to `toDow` within the
 * same week. Movable:false days and anchored days block the move outright;
 * everything else is a warning the user can override.
 */
export function validateSessionMove(week: Week, fromDow: Dow, toDow: Dow, constraints: Constraints): SwapValidationResult {
  const fromDay = dayByDow(week, fromDow);
  const toDay = dayByDow(week, toDow);
  const warnings: SwapWarning[] = [];

  if (!fromDay || !toDay) {
    return { blocked: true, blockReason: "Unknown day.", warnings };
  }

  if (fromDow === toDow) {
    return { blocked: false, warnings };
  }

  if (fromDay.movable === false) {
    return {
      blocked: true,
      blockReason: `${fromDow} is not movable.`,
      warnings,
    };
  }

  if (constraints.anchored_days?.includes(fromDow)) {
    return {
      blocked: true,
      blockReason: `${fromDow} is anchored to the gym schedule and cannot be swapped ("bjj_anchored").`,
      warnings,
    };
  }

  // no_heavy_legs_before_long_run: moving a heavy-leg lift session onto a day
  // immediately before a long run.
  if (fromDay.sessions.some(isHeavyLegSession)) {
    const after = dayByDow(week, nextDow(toDow));
    if (dayHasAny(after, isLongRun)) {
      warnings.push({
        ruleId: "no_heavy_legs_before_long_run",
        message: `No heavy lower-body session in the 24h before the long run — ${nextDow(toDow)} has one scheduled.`,
      });
    }
  }

  // no_adjacent_hard_days: the destination day would now sit next to another hard day.
  const movedIsHard = fromDay.sessions.some(isHardSession);
  if (movedIsHard) {
    const before = dayByDow(week, prevDow(toDow));
    const after = dayByDow(week, nextDow(toDow));
    if ((before && before.dow !== fromDow && dayHasAny(before, isHardSession)) ||
        (after && after.dow !== fromDow && dayHasAny(after, isHardSession))) {
      warnings.push({
        ruleId: "no_adjacent_hard_days",
        message: "Two hard sessions would sit back to back.",
      });
    }
  }

  return { blocked: false, warnings };
}
