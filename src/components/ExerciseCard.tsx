"use client";

import { useState } from "react";
import { buildSessionSummariesFromSets, evaluateProgression } from "@/lib/progression";
import type { Exercise, Implement, LoggedSession, LoggedSet, PlateInventory } from "@/lib/types";
import PlateMath from "./PlateMath";

function progressionSuggestion(exercise: Exercise, historySets: LoggedSet[]): string | null {
  if (!exercise.progression) return null;
  const summaries = buildSessionSummariesFromSets(historySets, exercise.name, exercise.implement);
  const result = evaluateProgression(summaries, exercise);
  if (!result) return null;
  if (result.mode === "load") {
    if (result.action === "advance") return `Suggested: advance to ${result.nextLoadLb} lb.`;
    if (result.action === "deload") return `Suggested: deload to ${result.nextLoadLb} lb (${result.reason})`;
    return result.currentLoadLb != null ? `Suggested: hold at ${result.currentLoadLb} lb.` : null;
  }
  if (result.mode === "reps") {
    if (result.action === "advance_rung") return `Cap hit — advance ${result.fromLoadLb} → ${result.nextLoadLb} lb, reset reps.`;
    if (result.action === "no_viable_rung") return "Cap hit — already at the top of the load ladder.";
    if (result.action === "add_set_or_progress") return result.note ? `Cap hit — ${result.note}` : "Cap hit — progress per note.";
  }
  return null;
}

export default function ExerciseCard({
  exercise,
  implement,
  inventory,
  sessionId,
  sessionSeed,
  lastTime,
  historySets,
  pendingSets,
  onLogSet,
}: {
  exercise: Exercise;
  implement: Implement | undefined;
  inventory: PlateInventory;
  sessionId: string;
  sessionSeed: LoggedSession;
  lastTime: LoggedSet[];
  historySets: LoggedSet[];
  pendingSets: LoggedSet[];
  onLogSet: (set: LoggedSet) => void;
}) {
  const numSets = exercise.sets;
  const suggestion = progressionSuggestion(exercise, historySets);

  function setFor(idx: number): LoggedSet | undefined {
    return pendingSets.find((s) => s.set_index === idx);
  }

  function update(idx: number, patch: Partial<LoggedSet>) {
    const current = setFor(idx);
    const next: LoggedSet = {
      session_id: sessionId,
      date: sessionSeed.date,
      exercise: exercise.name,
      implement: exercise.implement,
      set_index: idx,
      weight_lb: current?.weight_lb ?? null,
      reps: current?.reps ?? null,
      rpe: current?.rpe ?? null,
      ...patch,
    };
    onLogSet(next);
  }

  function copyLast(idx: number) {
    const source = idx > 1 ? setFor(idx - 1) : lastTime.find((s) => s.set_index === idx);
    if (!source) return;
    update(idx, { weight_lb: source.weight_lb, reps: source.reps, rpe: source.rpe });
  }

  return (
    <div className="card flex flex-col gap-3">
      <div>
        <h3 className="text-lg font-semibold">{exercise.name}</h3>
        <p className="text-sm text-ink/60">
          {exercise.sets} × {exercise.reps}
          {exercise.target_rpe != null ? ` @ RPE ${exercise.target_rpe}` : ""}
        </p>
        <div className="mt-1 flex flex-wrap gap-1">
          {exercise.ceiling_modified && <span className="tag">low ceiling</span>}
          {exercise.sub && <span className="tag">sub: {exercise.sub}</span>}
        </div>
        {exercise.note && <p className="mt-1 text-sm italic text-ink/70">{exercise.note}</p>}
        {suggestion && <p className="mt-1 text-sm font-medium text-accent">{suggestion}</p>}
      </div>

      {lastTime.length > 0 && (
        <div className="rounded-lg bg-line/30 p-2 text-sm">
          <span className="font-medium">Last time: </span>
          {lastTime.map((s) => `${s.weight_lb ?? "–"}×${s.reps ?? "–"}${s.rpe != null ? ` @${s.rpe}` : ""}`).join(", ")}
        </div>
      )}

      {implement && <PlateMath implement={implement} inventory={inventory} defaultTarget={exercise.load_lb ?? lastTime[0]?.weight_lb ?? undefined} fixedSizeLadder={exercise.progression?.mode === "reps" ? exercise.progression.load_ladder_lb : undefined} />}

      <div className="flex flex-col gap-2">
        {Array.from({ length: numSets }, (_, i) => i + 1).map((idx) => {
          const set = setFor(idx);
          return (
            <div key={idx} className="flex items-center gap-2">
              <span className="w-5 text-center text-sm text-ink/60">{idx}</span>
              <input
                type="number"
                inputMode="decimal"
                aria-label={`Set ${idx} weight`}
                placeholder="lb"
                className="field-input min-h-tap flex-1"
                value={set?.weight_lb ?? ""}
                onChange={(e) => update(idx, { weight_lb: e.target.value === "" ? null : Number(e.target.value) })}
              />
              <input
                type="number"
                inputMode="numeric"
                aria-label={`Set ${idx} reps`}
                placeholder="reps"
                className="field-input min-h-tap flex-1"
                value={set?.reps ?? ""}
                onChange={(e) => update(idx, { reps: e.target.value === "" ? null : Number(e.target.value) })}
              />
              <input
                type="number"
                inputMode="numeric"
                min={1}
                max={10}
                aria-label={`Set ${idx} RPE`}
                placeholder="RPE"
                className="field-input min-h-tap w-20"
                value={set?.rpe ?? ""}
                onChange={(e) => update(idx, { rpe: e.target.value === "" ? null : Number(e.target.value) })}
              />
              <button className="btn-ghost px-2 text-sm" onClick={() => copyLast(idx)} aria-label={`Repeat set ${idx - 1}`}>
                ⟲
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
