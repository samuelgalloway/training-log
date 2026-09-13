"use client";

// Read-only preview of a planned session — used from the Week screen so you
// can see what a future day actually involves (exercises, targets, plate
// math) without waiting until it's Today. No logging inputs here; that's
// Today's job.

import { lastSessionSets } from "@/lib/history";
import type { Implement, LoggedSet, PlateInventory, Session } from "@/lib/types";
import PlateMath from "./PlateMath";

function LastTime({ sets }: { sets: LoggedSet[] }) {
  if (sets.length === 0) return null;
  return (
    <div className="rounded-lg bg-line/30 p-2 text-sm">
      <span className="font-medium">Last time: </span>
      {sets.map((s) => `${s.weight_lb ?? "–"}×${s.reps ?? "–"}${s.rpe != null ? ` @${s.rpe}` : ""}`).join(", ")}
    </div>
  );
}

export default function SessionDetail({
  session,
  date,
  implementsById,
  inventory,
  historySets,
}: {
  session: Session;
  date: string;
  implementsById: Record<string, Implement>;
  inventory: PlateInventory;
  historySets: LoggedSet[];
}) {
  if (session.type === "lift") {
    return (
      <div className="flex flex-col gap-3">
        {session.exercises.map((exercise, i) => {
          const implement = implementsById[exercise.implement];
          const lastTime = lastSessionSets(historySets, exercise.name, exercise.implement, date);
          return (
            <div key={i} className="flex flex-col gap-2 rounded-xl border-2 border-line p-3">
              <div>
                <p className="font-medium">{exercise.name}</p>
                <p className="text-sm text-ink/60">
                  {exercise.sets} × {exercise.reps}
                  {exercise.target_rpe != null ? ` @ RPE ${exercise.target_rpe}` : ""}
                </p>
                <div className="mt-1 flex flex-wrap gap-1">
                  {exercise.ceiling_modified && <span className="tag">low ceiling</span>}
                  {exercise.sub && <span className="tag">sub: {exercise.sub}</span>}
                </div>
                {exercise.note && <p className="mt-1 text-sm italic text-ink/70">{exercise.note}</p>}
              </div>
              <LastTime sets={lastTime} />
              {implement && (
                <PlateMath
                  implement={implement}
                  inventory={inventory}
                  defaultTarget={exercise.load_lb ?? lastTime[0]?.weight_lb ?? undefined}
                  fixedSizeLadder={exercise.progression?.mode === "reps" ? exercise.progression.load_ladder_lb : undefined}
                />
              )}
            </div>
          );
        })}
      </div>
    );
  }

  if (session.type === "run") {
    return (
      <div className="flex flex-col gap-1 rounded-xl border-2 border-line p-3">
        <p className="font-medium">Run{session.subtype ? ` — ${session.subtype}` : ""}</p>
        <p className="text-sm text-ink/60">
          {session.distance_mi} mi{session.effort ? ` · ${session.effort}` : ""}
        </p>
        {session.hr_target?.cap_bpm && (
          <p className="text-sm text-ink/60">
            HR cap: {session.hr_target.cap_bpm} bpm{session.hr_target.zone ? ` (${session.hr_target.zone})` : ""}
          </p>
        )}
        {session.note && <p className="text-sm italic text-ink/70">{session.note}</p>}
      </div>
    );
  }

  if (session.type === "mobility") {
    return (
      <div className="flex flex-col gap-1 rounded-xl border-2 border-line p-3">
        <p className="font-medium">Mobility{session.duration_min != null ? ` — ${session.duration_min} min` : ""}</p>
        {session.note && <p className="text-sm italic text-ink/70">{session.note}</p>}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1 rounded-xl border-2 border-line p-3">
      <p className="font-medium">BJJ</p>
      {session.note && <p className="text-sm italic text-ink/70">{session.note}</p>}
      {session.optional && <span className="tag w-fit">optional</span>}
    </div>
  );
}
