"use client";

import type { BjjSession, LoggedSession, MobilitySession, RunSession } from "@/lib/types";

export default function SimpleSessionCard({
  session,
  meta,
  onChange,
  onSync,
  syncStatus,
}: {
  session: RunSession | BjjSession | MobilitySession;
  meta: LoggedSession;
  onChange: (patch: Partial<LoggedSession>) => void;
  onSync: () => void;
  syncStatus: string | null;
}) {
  const isRun = session.type === "run";
  const isMobility = session.type === "mobility";
  const title = isRun ? `Run${session.subtype ? ` — ${session.subtype}` : ""}` : isMobility ? "Mobility" : "BJJ";

  return (
    <div className="card flex flex-col gap-3">
      <h3 className="text-lg font-semibold">{title}</h3>

      {isRun && (
        <>
          <p className="text-sm text-ink/60">
            {session.distance_mi} mi{session.effort ? ` · ${session.effort}` : ""}
          </p>
          {session.hr_target?.cap_bpm && (
            <p className="text-sm text-ink/60">HR cap: {session.hr_target.cap_bpm} bpm{session.hr_target.zone ? ` (${session.hr_target.zone})` : ""}</p>
          )}
          {session.note && <p className="text-sm italic text-ink/70">{session.note}</p>}
          <label className="text-sm text-ink/60">
            Avg HR (from watch)
            <input
              type="number"
              inputMode="numeric"
              className="field-input mt-1"
              value={meta.avg_hr ?? ""}
              onChange={(e) => onChange({ avg_hr: e.target.value === "" ? null : Number(e.target.value) })}
            />
          </label>
        </>
      )}

      {isMobility && session.duration_min != null && <p className="text-sm text-ink/60">{session.duration_min} min</p>}
      {!isRun && session.note && <p className="text-sm italic text-ink/70">{session.note}</p>}
      {!isRun && !isMobility && session.optional && <span className="tag w-fit">optional</span>}

      <div className="flex gap-2">
        {(["done", "partial", "skipped"] as const).map((status) => (
          <button
            key={status}
            className={meta.status === status ? "btn-primary flex-1" : "btn-secondary flex-1"}
            onClick={() => onChange({ status })}
          >
            {status}
          </button>
        ))}
      </div>

      <label className="text-sm text-ink/60">
        RPE
        <input
          type="number"
          inputMode="numeric"
          min={1}
          max={10}
          className="field-input mt-1"
          value={meta.rpe ?? ""}
          onChange={(e) => onChange({ rpe: e.target.value === "" ? null : Number(e.target.value) })}
        />
      </label>

      <label className="text-sm text-ink/60">
        Note
        <textarea className="field-input mt-1 min-h-[3rem] text-base" value={meta.note ?? ""} onChange={(e) => onChange({ note: e.target.value })} />
      </label>

      <button className="btn-primary" onClick={onSync}>
        🔄 Sync to Sheets
      </button>
      {syncStatus && <p className="text-sm text-ink/60">{syncStatus}</p>}
    </div>
  );
}
