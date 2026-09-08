"use client";
// localStorage-backed, local-first pending-session state.
//
// This is the single most important file in the UX contract: never block a
// mid-set tap on a network call. Every tap during a session writes here
// only. The network call happens once, at sync time (end of session, or the
// manual sync button), from whatever is sitting in this local state.

import type { LoggedSession, LoggedSet } from "./types";

export interface PendingSession {
  session: LoggedSession;
  sets: LoggedSet[];
  synced: boolean;
  updated_at: string;
}

const KEY_PREFIX = "training-log:pending-session:";

function key(sessionId: string): string {
  return `${KEY_PREFIX}${sessionId}`;
}

function safeParse(raw: string | null): PendingSession | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as PendingSession;
  } catch {
    return null;
  }
}

export function loadPendingSession(sessionId: string): PendingSession | null {
  try {
    return safeParse(localStorage.getItem(key(sessionId)));
  } catch {
    return null;
  }
}

export function savePendingSession(state: PendingSession): void {
  try {
    localStorage.setItem(key(state.session.session_id), JSON.stringify({ ...state, updated_at: new Date().toISOString() }));
  } catch {
    // localStorage can throw (private browsing, quota exceeded). Losing the
    // write is bad, but it must never throw mid-tap — swallow and move on.
  }
}

export function listPendingSessions(): PendingSession[] {
  const result: PendingSession[] = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k || !k.startsWith(KEY_PREFIX)) continue;
      const parsed = safeParse(localStorage.getItem(k));
      if (parsed) result.push(parsed);
    }
  } catch {
    // ignore
  }
  return result.sort((a, b) => b.updated_at.localeCompare(a.updated_at));
}

export function listUnsyncedSessions(): PendingSession[] {
  return listPendingSessions().filter((p) => !p.synced);
}

export function markSynced(sessionId: string): void {
  const existing = loadPendingSession(sessionId);
  if (existing) savePendingSession({ ...existing, synced: true });
}

export function deletePendingSession(sessionId: string): void {
  try {
    localStorage.removeItem(key(sessionId));
  } catch {
    // ignore
  }
}

export function upsertSet(sessionId: string, sessionSeed: LoggedSession, set: LoggedSet): PendingSession {
  const existing = loadPendingSession(sessionId) ?? {
    session: sessionSeed,
    sets: [],
    synced: false,
    updated_at: new Date().toISOString(),
  };
  const idx = existing.sets.findIndex(
    (s) => s.exercise === set.exercise && s.implement === set.implement && s.set_index === set.set_index
  );
  const sets = [...existing.sets];
  if (idx >= 0) sets[idx] = set;
  else sets.push(set);
  const next: PendingSession = { ...existing, sets, synced: false };
  savePendingSession(next);
  return next;
}

export function updateSessionMeta(sessionId: string, sessionSeed: LoggedSession, patch: Partial<LoggedSession>): PendingSession {
  const existing = loadPendingSession(sessionId) ?? {
    session: sessionSeed,
    sets: [],
    synced: false,
    updated_at: new Date().toISOString(),
  };
  const next: PendingSession = { ...existing, session: { ...existing.session, ...patch }, synced: false };
  savePendingSession(next);
  return next;
}
