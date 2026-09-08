"use client";

import type { LoggedSession } from "@/lib/types";

export default function SessionEndForm({
  meta,
  onChange,
  onSync,
  syncStatus,
}: {
  meta: LoggedSession;
  onChange: (patch: Partial<LoggedSession>) => void;
  onSync: () => void;
  syncStatus: string | null;
}) {
  return (
    <div className="card flex flex-col gap-3">
      <h3 className="text-lg font-semibold">End of session</h3>

      <label className="text-sm text-ink/60">
        Sleep (1–5)
        <input
          type="number"
          inputMode="numeric"
          min={1}
          max={5}
          className="field-input mt-1"
          value={meta.sleep ?? ""}
          onChange={(e) => onChange({ sleep: e.target.value === "" ? null : Number(e.target.value) })}
        />
      </label>

      <label className="text-sm text-ink/60">
        Soreness (1–5)
        <input
          type="number"
          inputMode="numeric"
          min={1}
          max={5}
          className="field-input mt-1"
          value={meta.soreness ?? ""}
          onChange={(e) => onChange({ soreness: e.target.value === "" ? null : Number(e.target.value) })}
        />
      </label>

      <label className="text-sm text-ink/60">
        Joint flag (optional — body part)
        <input
          type="text"
          className="field-input mt-1"
          placeholder="e.g. left shoulder"
          value={meta.joint_flag ?? ""}
          onChange={(e) => onChange({ joint_flag: e.target.value })}
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
