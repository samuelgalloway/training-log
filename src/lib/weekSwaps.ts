"use client";
// Manual day swaps from the Week view are a per-week override, layered on
// top of the authored block at render time — the block file in Drive is
// never mutated by a swap. Stored in localStorage since it's this device's
// working schedule, not part of the training record itself.

import type { Day, Dow, Week } from "./types";

export interface SwapRecord {
  from: Dow;
  to: Dow;
  appliedAt: string;
}

function key(blockId: string, week: number): string {
  return `training-log:week-swaps:${blockId}:${week}`;
}

export function getSwaps(blockId: string, week: number): SwapRecord[] {
  try {
    const raw = localStorage.getItem(key(blockId, week));
    return raw ? (JSON.parse(raw) as SwapRecord[]) : [];
  } catch {
    return [];
  }
}

export function addSwap(blockId: string, week: number, from: Dow, to: Dow): void {
  const swaps = getSwaps(blockId, week);
  swaps.push({ from, to, appliedAt: new Date().toISOString() });
  try {
    localStorage.setItem(key(blockId, week), JSON.stringify(swaps));
  } catch {
    // ignore
  }
}

export function clearSwaps(blockId: string, week: number): void {
  try {
    localStorage.removeItem(key(blockId, week));
  } catch {
    // ignore
  }
}

/** Applies a sequence of swaps to a week, exchanging the two days' sessions each time. Pure. */
export function applySwaps(week: Week, swaps: SwapRecord[]): Week {
  const byDow = new Map<Dow, Day>(week.days.map((d) => [d.dow, { ...d }]));
  for (const swap of swaps) {
    const a = byDow.get(swap.from);
    const b = byDow.get(swap.to);
    if (!a || !b) continue;
    const aSessions = a.sessions;
    a.sessions = b.sessions;
    b.sessions = aSessions;
  }
  return { ...week, days: week.days.map((d) => byDow.get(d.dow) ?? d) };
}
