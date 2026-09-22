"use client";

import { useEffect, useState } from "react";
import Sparkline from "@/components/Sparkline";
import { e1rmTrend, groupSetsByExerciseImplement } from "@/lib/e1rm";
import { localIsoDate } from "@/lib/dateUtils";
import { buildSessionSummariesFromSets, evaluateProgression } from "@/lib/progression";
import { findRpeDrift } from "@/lib/rpeDrift";
import type { Block, Exercise, LoggedSet } from "@/lib/types";

function progressionLine(exercise: Exercise, result: ReturnType<typeof evaluateProgression>): string {
  if (!result) return "";
  if (result.mode === "load") {
    if (result.action === "advance") return `✅ Advance to ${result.nextLoadLb} lb next session.`;
    if (result.action === "deload") return `⚠️ Deload to ${result.nextLoadLb} lb — ${result.reason}`;
    return result.currentLoadLb != null ? `Hold at ${result.currentLoadLb} lb — ${result.reason}` : result.reason;
  }
  if (result.mode === "reps") {
    if (result.action === "advance_rung") return `✅ Advance ladder: ${result.fromLoadLb} → ${result.nextLoadLb} lb.`;
    if (result.action === "no_viable_rung") return "At the top of the load ladder — no further rung available.";
    if (result.action === "add_set_or_progress") return result.note ? `Cap hit — ${result.note}` : "Cap hit — progress per exercise note.";
    return result.reason;
  }
  return "";
}

function collectExerciseCatalog(block: Block): Map<string, Exercise> {
  const catalog = new Map<string, Exercise>();
  for (const week of block.weeks) {
    for (const day of week.days) {
      for (const session of day.sessions) {
        if (session.type !== "lift") continue;
        for (const ex of session.exercises) catalog.set(`${ex.name}::${ex.implement}`, ex);
      }
    }
  }
  return catalog;
}

export default function HistoryPage() {
  const [block, setBlock] = useState<Block | null | undefined>(undefined);
  const [sets, setSets] = useState<LoggedSet[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [briefMarkdown, setBriefMarkdown] = useState<string | null>(null);
  const [briefStatus, setBriefStatus] = useState<string | null>(null);
  const [briefLoading, setBriefLoading] = useState(false);

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
      setSets(historyJson.sets ?? []);
    } catch (err) {
      setError((err as Error).message);
      setBlock(null);
    }
  }

  async function copyBrief() {
    setBriefLoading(true);
    setBriefStatus(null);
    try {
      // The server has no idea what timezone Sam is in — pass today's real
      // local date so the brief's adherence cutoff matches what Week shows,
      // instead of the server's own (UTC) notion of "today".
      const res = await fetch(`/api/brief?asOf=${localIsoDate(new Date())}`);
      const json = await res.json();
      if (json?.error) throw new Error(json.error);
      setBriefMarkdown(json.markdown);
      await navigator.clipboard.writeText(json.markdown);
      setBriefStatus("Copied to clipboard ✓");
    } catch (err) {
      setBriefStatus(`Couldn't build brief: ${(err as Error).message}`);
    } finally {
      setBriefLoading(false);
    }
  }

  if (block === undefined) return <p className="py-8 text-center text-ink/60">Loading history…</p>;
  if (error) return <div className="card border-warn bg-warn/10 text-warn">{error}</div>;
  if (!block) return <div className="card">No active block. Import one from Setup.</div>;

  const catalog = collectExerciseCatalog(block);
  const grouped = groupSetsByExerciseImplement(sets);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">History</h1>
        <button className="btn-primary" onClick={() => void copyBrief()} disabled={briefLoading}>
          {briefLoading ? "Building…" : "📋 Copy brief"}
        </button>
      </div>
      {briefStatus && <p className="text-sm text-ink/60">{briefStatus}</p>}
      {briefMarkdown && (
        <details className="card">
          <summary className="cursor-pointer font-medium">Coaching brief preview</summary>
          <pre className="mt-2 whitespace-pre-wrap font-mono text-xs">{briefMarkdown}</pre>
        </details>
      )}

      {grouped.size === 0 && <p className="text-ink/60">No sets logged yet.</p>}

      {Array.from(grouped.entries()).map(([key, groupSets]) => {
        const [name, implement] = key.split("::") as [string, string];
        const trend = e1rmTrend(groupSets);
        if (trend.length === 0) return null;
        const drift = findRpeDrift(sets, name, implement);
        const exercise = catalog.get(key);
        const progression = exercise ? evaluateProgression(buildSessionSummariesFromSets(sets, name, implement), exercise) : null;

        return (
          <div key={key} className="card flex flex-col gap-2">
            <h2 className="text-lg font-semibold">
              {name} <span className="text-sm font-normal text-ink/50">({implement})</span>
            </h2>

            <Sparkline values={trend.map((p) => p.e1rm)} />

            <p className="text-sm text-ink/60">
              e1RM: {trend[0]!.e1rm.toFixed(0)} → {trend[trend.length - 1]!.e1rm.toFixed(0)} lb over {trend.length} session(s)
            </p>

            {exercise && progression && <p className="text-sm font-medium">{progressionLine(exercise, progression)}</p>}

            {drift.length > 0 && (
              <div className="rounded-lg bg-warn/10 p-2 text-sm text-warn">
                {drift.map((f) => (
                  <p key={f.weightLb}>
                    ⚠️ RPE drifting up at {f.weightLb} lb: {f.points.map((p) => p.avgRpe.toFixed(1)).join(" → ")} — possible under-recovery.
                  </p>
                ))}
              </div>
            )}

            <details>
              <summary className="cursor-pointer text-sm text-ink/60">All sessions ({trend.length})</summary>
              <ul className="mt-1 text-sm">
                {trend.map((p) => (
                  <li key={p.session_id}>
                    {p.date}: {p.topSetWeightLb}×{p.topSetReps} → e1RM {p.e1rm.toFixed(0)}
                  </li>
                ))}
              </ul>
            </details>
          </div>
        );
      })}
    </div>
  );
}
