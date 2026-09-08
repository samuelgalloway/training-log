// Planned-vs-actual adherence. A planned session with no matching logged
// row, whose date has already passed, is treated as skipped — silence in
// the log is itself the signal that it didn't happen.

import { dateForDow } from "./dateUtils";
import type { Block, Dow, LoggedSession, Session } from "./types";

export type AdherenceStatus = "done" | "partial" | "skipped" | "future";

export interface AdherenceRow {
  date: string;
  week: number;
  dow: Dow;
  type: Session["type"];
  name: string;
  status: AdherenceStatus;
}

function sessionLabel(session: Session): string {
  if (session.type === "lift") return session.name;
  if (session.type === "run") return `Run${session.subtype ? ` (${session.subtype})` : ""}`;
  if (session.type === "mobility") return "Mobility";
  return "BJJ";
}

export function computeAdherence(block: Block, sessions: LoggedSession[], asOfDate: string): AdherenceRow[] {
  const rows: AdherenceRow[] = [];

  for (const week of block.weeks) {
    for (const day of week.days) {
      const date = dateForDow(week, day.dow);
      for (const session of day.sessions) {
        const name = sessionLabel(session);
        const logged = sessions.find(
          (s) => s.date === date && s.type === session.type && (session.type !== "lift" || s.name === name)
        );

        let status: AdherenceStatus;
        if (logged) {
          status = logged.status === "done" || logged.status === "partial" ? logged.status : "skipped";
        } else {
          status = date > asOfDate ? "future" : "skipped";
        }

        rows.push({ date, week: week.week, dow: day.dow, type: session.type, name, status });
      }
    }
  }

  return rows;
}

export function summarizeAdherence(rows: AdherenceRow[]) {
  const past = rows.filter((r) => r.status !== "future");
  const done = past.filter((r) => r.status === "done").length;
  const partial = past.filter((r) => r.status === "partial").length;
  const skipped = past.filter((r) => r.status === "skipped");
  return { total: past.length, done, partial, skippedCount: skipped.length, skipped };
}
