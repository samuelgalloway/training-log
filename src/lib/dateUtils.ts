import type { Block, Day, Dow, Week } from "./types";

const DOW_ORDER: Dow[] = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

export function isoDow(date: Date): Dow {
  // getDay(): 0=Sun..6=Sat. DOW_ORDER is MON-first.
  const jsDay = date.getDay();
  return DOW_ORDER[(jsDay + 6) % 7]!;
}

export function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Finds the block week whose date range contains `date`, using each week's `week_of` (a Monday). */
export function findWeekForDate(block: Block, date: Date): Week | undefined {
  const target = toIsoDate(date);
  const weeksSorted = [...block.weeks].sort((a, b) => a.week_of.localeCompare(b.week_of));
  let found: Week | undefined;
  for (const week of weeksSorted) {
    if (week.week_of <= target) found = week;
    else break;
  }
  return found;
}

export function findDay(week: Week, dow: Dow): Day | undefined {
  return week.days.find((d) => d.dow === dow);
}

/** The date (yyyy-mm-dd) of a given day-of-week within a week, derived from week_of (a Monday). */
export function dateForDow(week: Week, dow: Dow): string {
  const monday = new Date(week.week_of + "T00:00:00Z");
  const offset = DOW_ORDER.indexOf(dow);
  const d = new Date(monday);
  d.setUTCDate(monday.getUTCDate() + offset);
  return toIsoDate(d);
}

export function rollingAverage(values: number[], window: number): number | null {
  if (values.length === 0) return null;
  const slice = values.slice(-window);
  return slice.reduce((a, b) => a + b, 0) / slice.length;
}
