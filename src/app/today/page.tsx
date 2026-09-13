"use client";

import { useEffect, useMemo, useState } from "react";
import ExerciseCard from "@/components/ExerciseCard";
import RestTimer from "@/components/RestTimer";
import SessionEndForm from "@/components/SessionEndForm";
import SimpleSessionCard from "@/components/SimpleSessionCard";
import { findWeekForDate, isoDow, toIsoDate } from "@/lib/dateUtils";
import { resolveEquipment } from "@/lib/equipment";
import { computeLiftStatus, lastSessionSets } from "@/lib/history";
import { listPendingSessions, loadPendingSession, markSynced, type PendingSession, updateSessionMeta, upsertSet } from "@/lib/localStore";
import { makeSessionId } from "@/lib/sessionId";
import type { AppConfig, Block, Exercise, LoggedSession, LoggedSet, Session } from "@/lib/types";
import { applySwaps, getSwaps } from "@/lib/weekSwaps";

export default function TodayPage() {
  const [block, setBlock] = useState<Block | null | undefined>(undefined);
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [historySets, setHistorySets] = useState<LoggedSet[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pendingBySessionId, setPendingBySessionId] = useState<Record<string, PendingSession>>({});
  const [syncStatus, setSyncStatus] = useState<Record<string, string>>({});

  const today = useMemo(() => new Date(), []);
  const todayIso = toIsoDate(today);
  const dow = isoDow(today);

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    try {
      const [blockRes, configRes, historyRes] = await Promise.all([
        fetch("/api/blocks/active"),
        fetch("/api/config"),
        fetch("/api/history"),
      ]);
      const blockJson = await blockRes.json();
      const configJson = await configRes.json();
      const historyJson = await historyRes.json();
      if (blockJson?.error) throw new Error(blockJson.error);
      if (configJson?.error) throw new Error(configJson.error);
      if (historyJson?.error) throw new Error(historyJson.error);
      setBlock(blockJson);
      setConfig(configJson);
      setHistorySets(historyJson.sets ?? []);
    } catch (err) {
      setError((err as Error).message);
      setBlock(null);
    }
  }

  const rawWeek = block ? findWeekForDate(block, today) : undefined;
  const week = block && rawWeek ? applySwaps(rawWeek, getSwaps(block.block.id, rawWeek.week)) : rawWeek;
  const day = week?.days.find((d) => d.dow === dow);
  const { implementsById, inventory } = resolveEquipment(block ?? null, config);

  // Seed pending-session state from localStorage once we know today's sessions.
  useEffect(() => {
    if (!block || !day) return;
    const next: Record<string, PendingSession> = {};
    for (const session of day.sessions) {
      const id = sessionIdFor(block, todayIso, session);
      const seed = seedFor(block, week!, todayIso, dow, session, id);
      next[id] = loadPendingSession(id) ?? { session: seed, sets: [], synced: false, updated_at: new Date().toISOString() };
    }
    setPendingBySessionId(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [block?.block.id, day?.dow]);

  function sessionIdFor(b: Block, date: string, session: Session): string {
    if (session.type === "lift") return makeSessionId(b.block.id, date, "lift", session.slot);
    return makeSessionId(b.block.id, date, session.type, session.type);
  }

  function seedFor(b: Block, w: NonNullable<typeof week>, date: string, dowVal: typeof dow, session: Session, id: string): LoggedSession {
    return {
      session_id: id,
      date,
      block_id: b.block.id,
      week: w.week,
      dow: dowVal,
      type: session.type,
      name:
        session.type === "lift"
          ? session.name
          : session.type === "run"
            ? `Run${session.subtype ? ` (${session.subtype})` : ""}`
            : session.type === "mobility"
              ? "Mobility"
              : "BJJ",
      status: "skipped",
    };
  }

  function onLogSet(sessionId: string, seed: LoggedSession, set: LoggedSet) {
    const next = upsertSet(sessionId, seed, set);
    setPendingBySessionId((prev) => ({ ...prev, [sessionId]: next }));
  }

  function onSessionMetaChange(sessionId: string, seed: LoggedSession, patch: Partial<LoggedSession>) {
    const next = updateSessionMeta(sessionId, seed, patch);
    setPendingBySessionId((prev) => ({ ...prev, [sessionId]: next }));
  }

  async function sync(sessionId: string, liftExercisesForStatus?: Exercise[]) {
    const pending = pendingBySessionId[sessionId] ?? loadPendingSession(sessionId);
    if (!pending) return;

    let session = pending.session;
    if (liftExercisesForStatus) {
      session = { ...session, status: computeLiftStatus(liftExercisesForStatus, pending.sets) };
    }

    setSyncStatus((prev) => ({ ...prev, [sessionId]: "Syncing…" }));
    try {
      const res = await fetch("/api/sync", { method: "POST", body: JSON.stringify({ session, sets: pending.sets }) });
      const json = await res.json();
      if (json?.error) throw new Error(json.error);
      markSynced(sessionId);
      setPendingBySessionId((prev) => ({ ...prev, [sessionId]: { ...pending, session, synced: true } }));
      setSyncStatus((prev) => ({ ...prev, [sessionId]: "Synced ✓" }));
    } catch (err) {
      setSyncStatus((prev) => ({ ...prev, [sessionId]: `Sync failed — will retry later: ${(err as Error).message}` }));
    }
  }

  const unsyncedCount = listPendingSessions().filter((p) => !p.synced).length;

  if (block === undefined) return <p className="py-8 text-center text-ink/60">Loading today…</p>;

  if (error) {
    return (
      <div className="card border-warn bg-warn/10 text-warn">
        <p className="font-semibold">Couldn't load today's session.</p>
        <p className="text-sm">{error}</p>
      </div>
    );
  }

  if (!block) {
    return (
      <div className="card">
        <p className="font-semibold">No active training block.</p>
        <p className="mt-1 text-sm text-ink/60">Import one from the Setup screen to get started.</p>
      </div>
    );
  }

  if (!week || !day) {
    const notStartedYet = todayIso < block.block.start_date;
    return (
      <div className="card">
        <p className="font-semibold">{notStartedYet ? "This block hasn't started yet." : "No planned week found for today."}</p>
        <p className="mt-1 text-sm text-ink/60">
          {notStartedYet ? `Starts ${block.block.start_date} — check Week for a preview.` : "Check the active block's date range in Setup."}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-bold">Today</h1>
        <p className="text-sm text-ink/60">
          {todayIso} · {dow} · week {week.week} ({week.phase}){unsyncedCount > 0 ? ` · ${unsyncedCount} unsynced` : ""}
        </p>
        {week.coach_note && <p className="mt-1 text-sm italic text-ink/70">{week.coach_note}</p>}
      </div>

      {day.sessions.length === 0 && <p className="text-ink/60">Rest day.</p>}

      {day.sessions.map((session, i) => {
        const id = sessionIdFor(block, todayIso, session);
        const seed = seedFor(block, week, todayIso, dow, session, id);
        const pending = pendingBySessionId[id];

        if (session.type === "lift") {
          return (
            <div key={i} className="flex flex-col gap-3">
              <RestTimer />
              {session.exercises.map((exercise, j) => {
                const implement = implementsById[exercise.implement];
                const last = lastSessionSets(historySets, exercise.name, exercise.implement, todayIso);
                const pendingSets = (pending?.sets ?? []).filter((s) => s.exercise === exercise.name && s.implement === exercise.implement);
                return (
                  <ExerciseCard
                    key={j}
                    exercise={exercise}
                    implement={implement}
                    inventory={inventory}
                    sessionId={id}
                    sessionSeed={seed}
                    lastTime={last}
                    historySets={historySets}
                    pendingSets={pendingSets}
                    onLogSet={(set) => onLogSet(id, seed, set)}
                  />
                );
              })}
              <SessionEndForm
                meta={pending?.session ?? seed}
                onChange={(patch) => onSessionMetaChange(id, seed, patch)}
                onSync={() => void sync(id, session.exercises)}
                syncStatus={syncStatus[id] ?? null}
              />
            </div>
          );
        }

        return (
          <SimpleSessionCard
            key={i}
            session={session}
            meta={pending?.session ?? seed}
            onChange={(patch) => onSessionMetaChange(id, seed, patch)}
            onSync={() => void sync(id)}
            syncStatus={syncStatus[id] ?? null}
          />
        );
      })}
    </div>
  );
}
