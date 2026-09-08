import { toIsoDate } from "./dateUtils";
import type { BodyEntry } from "./types";

export interface RollingPoint {
  date: string;
  avg: number;
}

/** A 7-day (calendar) rolling average series — never chart daily bodyweight values directly. */
export function rollingBodyweightSeries(entries: BodyEntry[], windowDays = 7): RollingPoint[] {
  const sorted = entries
    .filter((e): e is BodyEntry & { bodyweight_lb: number } => e.bodyweight_lb != null)
    .sort((a, b) => a.date.localeCompare(b.date));

  return sorted.map((entry) => {
    const cutoff = new Date(entry.date + "T00:00:00Z");
    cutoff.setUTCDate(cutoff.getUTCDate() - windowDays + 1);
    const cutoffIso = toIsoDate(cutoff);
    const windowEntries = sorted.filter((e) => e.date >= cutoffIso && e.date <= entry.date);
    const avg = windowEntries.reduce((sum, e) => sum + e.bodyweight_lb, 0) / windowEntries.length;
    return { date: entry.date, avg };
  });
}
