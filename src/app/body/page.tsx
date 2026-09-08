"use client";

import { useEffect, useState } from "react";
import Sparkline from "@/components/Sparkline";
import { rollingBodyweightSeries } from "@/lib/body";
import { toIsoDate } from "@/lib/dateUtils";
import type { BodyEntry } from "@/lib/types";

function emptyEntry(): BodyEntry {
  return { date: toIsoDate(new Date()), bodyweight_lb: null, waist_in: null, chest_in: null, arm_in: null, thigh_in: null };
}

export default function BodyPage() {
  const [entries, setEntries] = useState<BodyEntry[]>([]);
  const [draft, setDraft] = useState<BodyEntry>(emptyEntry());
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/body");
      const json = await res.json();
      if (json?.error) throw new Error(json.error);
      setEntries(json);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function submit() {
    setStatus("Saving…");
    try {
      const res = await fetch("/api/body", { method: "POST", body: JSON.stringify(draft) });
      const json = await res.json();
      if (json?.error) throw new Error(json.error);
      setStatus("Saved ✓");
      setDraft(emptyEntry());
      await load();
    } catch (err) {
      setStatus(`Failed: ${(err as Error).message}`);
    }
  }

  const series = rollingBodyweightSeries(entries);
  const latest = series[series.length - 1];
  const sorted = [...entries].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold">Body</h1>

      {error && <div className="card border-warn bg-warn/10 text-warn">{error}</div>}

      <div className="card flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Weekly entry</h2>
        <label className="text-sm text-ink/60">
          Date
          <input type="date" className="field-input mt-1" value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })} />
        </label>
        {(
          [
            ["bodyweight_lb", "Bodyweight (lb)"],
            ["waist_in", "Waist (in)"],
            ["chest_in", "Chest (in)"],
            ["arm_in", "Arm (in)"],
            ["thigh_in", "Thigh (in)"],
          ] as const
        ).map(([field, label]) => (
          <label key={field} className="text-sm text-ink/60">
            {label}
            <input
              type="number"
              inputMode="decimal"
              className="field-input mt-1"
              value={draft[field] ?? ""}
              onChange={(e) => setDraft({ ...draft, [field]: e.target.value === "" ? null : Number(e.target.value) })}
            />
          </label>
        ))}
        <button className="btn-primary" onClick={() => void submit()}>
          Save entry
        </button>
        {status && <p className="text-sm text-ink/60">{status}</p>}
      </div>

      <div className="card flex flex-col gap-2">
        <h2 className="text-lg font-semibold">7-day rolling average bodyweight</h2>
        {loading && <p className="text-sm text-ink/60">Loading…</p>}
        {!loading && series.length === 0 && <p className="text-sm text-ink/60">No entries yet.</p>}
        {series.length > 1 && <Sparkline values={series.map((p) => p.avg)} />}
        {latest && <p className="text-sm text-ink/60">Latest: {latest.avg.toFixed(1)} lb (as of {latest.date})</p>}
      </div>

      <div className="card flex flex-col gap-2">
        <h2 className="text-lg font-semibold">Log</h2>
        {sorted.length === 0 && <p className="text-sm text-ink/60">No entries yet.</p>}
        <ul className="flex flex-col gap-1 text-sm">
          {sorted.map((e) => (
            <li key={e.date} className="flex justify-between border-b border-line/60 py-1">
              <span>{e.date}</span>
              <span>
                {e.bodyweight_lb != null ? `${e.bodyweight_lb} lb` : "—"}
                {e.waist_in != null ? ` · waist ${e.waist_in}in` : ""}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
