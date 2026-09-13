"use client";

import { useEffect, useMemo, useState } from "react";
import { findWeekForDate, toIsoDate } from "@/lib/dateUtils";
import { validateSessionMove, type SwapWarning } from "@/lib/validator";
import { addSwap, applySwaps, getSwaps } from "@/lib/weekSwaps";
import { listPendingSessions } from "@/lib/localStore";
import { makeSessionId } from "@/lib/sessionId";
import type { Block, Day, Dow, LoggedSession, Session } from "@/lib/types";

const DOWS: Dow[] = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

function sessionLabel(session: Session): string {
  if (session.type === "lift") return session.name;
  if (session.type === "run") return `Run${session.subtype ? ` (${session.subtype})` : ""}`;
  if (session.type === "mobility") return "Mobility";
  return "BJJ";
}

function statusFor(day: Day, date: string, blockId: string, loggedSessions: LoggedSession[]): Record<number, "done" | "partial" | "skipped" | "upcoming"> {
  const pending = listPendingSessions();
  const result: Record<number, "done" | "partial" | "skipped" | "upcoming"> = {};
  const todayIso = toIsoDate(new Date());

  day.sessions.forEach((session, i) => {
    const idGuess = session.type === "lift" ? makeSessionId(blockId, date, "lift", session.slot) : makeSessionId(blockId, date, session.type, session.type);
    const localPending = pending.find((p) => p.session.session_id === idGuess);
    const logged = loggedSessions.find((s) => s.date === date && s.type === session.type && (session.type !== "lift" || s.name === session.name));

    if (localPending && localPending.sets.length + (localPending.session.status !== "skipped" ? 1 : 0) > 0) {
      result[i] = localPending.session.status === "done" || localPending.session.status === "partial" ? localPending.session.status : "skipped";
    } else if (logged) {
      result[i] = logged.status === "done" || logged.status === "partial" ? logged.status : "skipped";
    } else {
      result[i] = date > todayIso ? "upcoming" : "skipped";
    }
  });

  return result;
}

const STATUS_STYLE: Record<string, string> = {
  done: "bg-accent/20 text-accent",
  partial: "bg-amber-200/60 text-amber-800",
  skipped: "bg-warn/15 text-warn",
  upcoming: "bg-line/50 text-ink/50",
};

export default function WeekPage() {
  const [block, setBlock] = useState<Block | null | undefined>(undefined);
  const [loggedSessions, setLoggedSessions] = useState<LoggedSession[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedFrom, setSelectedFrom] = useState<Dow | null>(null);
  const [pendingMove, setPendingMove] = useState<{ from: Dow; to: Dow; result: ReturnType<typeof validateSessionMove> } | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);

  const today = useMemo(() => new Date(), []);

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    try {
      const [blockRes, historyRes] = await Promise.all([fetch("/api/blocks/active"), fetch("/api/history")]);
      const blockJson = await blockRes.json();
      const historyJson = await historyRes.json();
      if (blockJson?.error) throw new Error(blockJson.error);
      if (historyJson?.error) throw new Error(historyJson.error);
      setBlock(blockJson);
      setLoggedSessions(historyJson.sessions ?? []);
    } catch (err) {
      setError((err as Error).message);
      setBlock(null);
    }
  }

  // Before the block's first week_of, findWeekForDate has nothing to return
  // (there's no week whose start date has passed yet) — fall back to the
  // earliest week so "today" still shows a preview instead of a blank screen.
  const earliestWeek = block ? [...block.weeks].sort((a, b) => a.week - b.week)[0] : undefined;
  const blockNotStartedYet = !!block && !findWeekForDate(block, today);
  const baseWeek = block ? (findWeekForDate(block, today) ?? earliestWeek) : undefined;
  const targetWeekNum = baseWeek ? baseWeek.week + weekOffset : undefined;
  const rawWeek = block?.weeks.find((w) => w.week === targetWeekNum);
  const swaps = block && rawWeek ? getSwaps(block.block.id, rawWeek.week) : [];
  const week = block && rawWeek ? applySwaps(rawWeek, swaps) : rawWeek;

  function dateFor(dow: Dow): string {
    if (!week) return "";
    const monday = new Date(week.week_of + "T00:00:00Z");
    const idx = DOWS.indexOf(dow);
    const d = new Date(monday);
    d.setUTCDate(monday.getUTCDate() + idx);
    return toIsoDate(d);
  }

  function onDayTap(dow: Dow) {
    if (!week || !block) return;
    if (selectedFrom == null) {
      setSelectedFrom(dow);
      return;
    }
    if (selectedFrom === dow) {
      setSelectedFrom(null);
      return;
    }
    const result = validateSessionMove(week, selectedFrom, dow, block.constraints);
    setPendingMove({ from: selectedFrom, to: dow, result });
    setSelectedFrom(null);
  }

  function confirmMove() {
    if (!pendingMove || !block || !week) return;
    addSwap(block.block.id, week.week, pendingMove.from, pendingMove.to);
    setPendingMove(null);
    setRefreshTick((t) => t + 1);
  }

  if (block === undefined) return <p className="py-8 text-center text-ink/60">Loading week…</p>;
  if (error) return <div className="card border-warn bg-warn/10 text-warn">{error}</div>;
  if (!block) return <div className="card">No active block. Import one from Setup.</div>;
  if (!week) return <div className="card">No week {targetWeekNum} in this block.</div>;

  return (
    <div key={refreshTick} className="flex flex-col gap-4">
      {blockNotStartedYet && weekOffset === 0 && (
        <div className="card border-accent/40 bg-accent/10 text-sm text-accent">
          <p className="font-semibold">This block hasn't started yet.</p>
          <p>Starts {block.block.start_date} — this is a preview of week 1.</p>
        </div>
      )}
      <div className="flex items-center justify-between">
        <button className="btn-ghost" onClick={() => setWeekOffset((o) => o - 1)} disabled={targetWeekNum === 1}>
          ← Prev
        </button>
        <h1 className="text-xl font-bold">
          Week {week.week} · {week.phase}
        </h1>
        <button className="btn-ghost" onClick={() => setWeekOffset((o) => o + 1)} disabled={targetWeekNum === block.block.weeks}>
          Next →
        </button>
      </div>

      {week.coach_note && <p className="card text-sm italic text-ink/70">{week.coach_note}</p>}
      {week.planned_mileage != null && <p className="text-sm text-ink/60">Planned mileage: {week.planned_mileage} mi</p>}

      <p className="text-sm text-ink/60">
        {selectedFrom ? `Move ${selectedFrom}'s session(s) to — tap the destination day.` : "Tap a day, then tap another to move its session(s)."}
      </p>

      <div className="flex flex-col gap-2">
        {week.days.map((day) => {
          const date = dateFor(day.dow);
          const statuses = statusFor(day, date, block.block.id, loggedSessions);
          const isAnchored = block.constraints.anchored_days.includes(day.dow) || day.movable === false;
          return (
            <button
              key={day.dow}
              onClick={() => onDayTap(day.dow)}
              className={`card flex flex-col gap-1 text-left ${selectedFrom === day.dow ? "ring-2 ring-accent" : ""}`}
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold">
                  {day.dow} <span className="font-normal text-ink/50">{date}</span>
                </span>
                {isAnchored && <span className="tag">anchored</span>}
              </div>
              {day.sessions.length === 0 && <span className="text-sm text-ink/50">Rest</span>}
              {day.sessions.map((session, i) => (
                <div key={i} className="flex items-center justify-between">
                  <span className="text-sm">{sessionLabel(session)}</span>
                  <span className={`tag ${STATUS_STYLE[statuses[i] ?? "upcoming"]}`}>{statuses[i]}</span>
                </div>
              ))}
            </button>
          );
        })}
      </div>

      {pendingMove && (
        <div className="fixed inset-0 z-30 flex items-end bg-black/40" onClick={() => setPendingMove(null)}>
          <div className="card m-4 w-full" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold">
              Move {pendingMove.from} → {pendingMove.to}?
            </h2>
            {pendingMove.result.blocked ? (
              <p className="mt-2 text-warn">🚫 {pendingMove.result.blockReason}</p>
            ) : (
              <>
                {pendingMove.result.warnings.map((w: SwapWarning) => (
                  <p key={w.ruleId} className="mt-2 text-warn">
                    ⚠️ {w.message}
                  </p>
                ))}
                <div className="mt-3 flex gap-2">
                  <button className="btn-primary flex-1" onClick={confirmMove}>
                    Confirm move
                  </button>
                  <button className="btn-secondary flex-1" onClick={() => setPendingMove(null)}>
                    Cancel
                  </button>
                </div>
              </>
            )}
            {pendingMove.result.blocked && (
              <button className="btn-secondary mt-3 w-full" onClick={() => setPendingMove(null)}>
                OK
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
