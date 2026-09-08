"use client";

import { useEffect, useState } from "react";
import type { AppConfig, Block, BlockSummary, Implement } from "@/lib/types";

function emptyConfig(): AppConfig {
  return { equipment: { plate_inventory: { unit: "lb", pairs: {} }, kettlebell_sizes_owned: [], implements: [] }, active_block_id: null };
}

export default function SetupPage() {
  const [config, setConfig] = useState<AppConfig>(emptyConfig());
  const [blocks, setBlocks] = useState<BlockSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  const [blockJsonText, setBlockJsonText] = useState("");
  const [outcomeSummary, setOutcomeSummary] = useState("");
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    void refresh();
  }, []);

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      const [configRes, blocksRes] = await Promise.all([fetch("/api/config"), fetch("/api/blocks")]);
      const configJson = await configRes.json();
      const blocksJson = await blocksRes.json();
      if (configJson?.error) throw new Error(configJson.error);
      if (blocksJson?.error) throw new Error(blocksJson.error);
      setConfig(configJson);
      setBlocks(blocksJson);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function saveConfig(next: AppConfig) {
    setConfig(next);
    setSaveStatus("Saving…");
    try {
      const res = await fetch("/api/config", { method: "POST", body: JSON.stringify(next) });
      const json = await res.json();
      if (json?.error) throw new Error(json.error);
      setSaveStatus("Saved.");
    } catch (err) {
      setSaveStatus(`Failed to save: ${(err as Error).message}`);
    }
  }

  function updatePairs(denom: string, count: number) {
    const pairs = { ...config.equipment.plate_inventory.pairs };
    if (count <= 0) delete pairs[denom];
    else pairs[denom] = count;
    void saveConfig({ ...config, equipment: { ...config.equipment, plate_inventory: { ...config.equipment.plate_inventory, pairs } } });
  }

  function addPairRow() {
    const denom = prompt("Plate denomination (lb), e.g. 45");
    if (!denom) return;
    updatePairs(denom, 1);
  }

  function toggleKbSize(size: number) {
    const owned = config.equipment.kettlebell_sizes_owned;
    const next = owned.includes(size) ? owned.filter((s) => s !== size) : [...owned, size].sort((a, b) => a - b);
    void saveConfig({ ...config, equipment: { ...config.equipment, kettlebell_sizes_owned: next } });
  }

  function addKbSize() {
    const raw = prompt("Kettlebell size (lb)");
    const size = raw ? Number(raw) : NaN;
    if (!Number.isFinite(size)) return;
    toggleKbSize(size);
  }

  function addImplement() {
    const name = prompt("Implement name, e.g. Trap bar (open-ended)");
    if (!name) return;
    const id = prompt("Short id, e.g. tb") ?? name.toLowerCase().slice(0, 6);
    const barWeightRaw = prompt("Bar weight (lb), blank if not loadable");
    const bar_weight_lb = barWeightRaw ? Number(barWeightRaw) : undefined;
    const implement: Implement = { id, name, bar_weight_lb, loadable: bar_weight_lb != null };
    void saveConfig({ ...config, equipment: { ...config.equipment, implements: [...config.equipment.implements, implement] } });
  }

  function removeImplement(idx: number) {
    const nextImplements = config.equipment.implements.filter((_, i) => i !== idx);
    void saveConfig({ ...config, equipment: { ...config.equipment, implements: nextImplements } });
  }

  async function importBlock() {
    setImportStatus(null);
    let parsed: Block;
    try {
      parsed = JSON.parse(blockJsonText);
    } catch {
      setImportStatus("That's not valid JSON.");
      return;
    }
    if (!parsed?.block?.id) {
      setImportStatus("Missing block.id — is this a schema_version 1 block?");
      return;
    }
    setImporting(true);
    try {
      const res = await fetch("/api/blocks", {
        method: "POST",
        body: JSON.stringify({ block: parsed, outcomeSummaryForPrevious: outcomeSummary || undefined }),
      });
      const json = await res.json();
      if (json?.error) throw new Error(json.error);
      setImportStatus(`Imported and activated "${parsed.block.name}".`);
      setBlockJsonText("");
      setOutcomeSummary("");
      await refresh();
    } catch (err) {
      setImportStatus(`Import failed: ${(err as Error).message}`);
    } finally {
      setImporting(false);
    }
  }

  if (loading) return <p className="py-8 text-center text-ink/60">Loading setup…</p>;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">Setup</h1>

      <section className="card flex flex-col gap-2">
        <h2 className="text-lg font-semibold">Google connection</h2>
        <p className="text-sm text-ink/60">
          Creates a private "Training Log" folder and Sheet in your own Google Drive, and gives this app access to only those two things — nothing
          else in your Drive. See README.md for the one-time Google Cloud Console setup this needs before the button below will work.
        </p>
        <a href="/api/auth/google/start" className="btn-primary w-fit">
          🔌 Connect Google
        </a>
      </section>

      {error && (
        <div className="card border-warn bg-warn/10 text-warn">
          <p className="font-semibold">Couldn't reach Google Sheets/Drive.</p>
          <p className="text-sm">{error}</p>
          <p className="mt-2 text-sm">Click "Connect Google" above, or if you've already connected, check the values pasted into Vercel match what it printed.</p>
        </div>
      )}

      <section className="card flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Plate inventory</h2>
        <p className="text-sm text-ink/60">Pairs owned, per denomination (lb).</p>
        <div className="flex flex-wrap gap-2">
          {Object.entries(config.equipment.plate_inventory.pairs)
            .sort((a, b) => Number(a[0]) - Number(b[0]))
            .map(([denom, count]) => (
              <div key={denom} className="flex items-center gap-2 rounded-xl border-2 border-line px-3 py-2">
                <span className="font-mono">{denom} lb</span>
                <button className="btn-ghost px-1 min-h-0" onClick={() => updatePairs(denom, count - 1)} aria-label={`Fewer ${denom}lb pairs`}>
                  −
                </button>
                <span className="w-6 text-center">{count}</span>
                <button className="btn-ghost px-1 min-h-0" onClick={() => updatePairs(denom, count + 1)} aria-label={`More ${denom}lb pairs`}>
                  +
                </button>
              </div>
            ))}
          <button className="btn-secondary" onClick={addPairRow}>
            + Denomination
          </button>
        </div>
      </section>

      <section className="card flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Kettlebell sizes owned</h2>
        <div className="flex flex-wrap gap-2">
          {config.equipment.kettlebell_sizes_owned.map((size) => (
            <button key={size} className="tag" onClick={() => toggleKbSize(size)}>
              {size} lb ✕
            </button>
          ))}
          <button className="btn-secondary" onClick={addKbSize}>
            + Size
          </button>
        </div>
      </section>

      <section className="card flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Implements &amp; bar weights</h2>
        <div className="flex flex-col gap-2">
          {config.equipment.implements.map((im, idx) => (
            <div key={idx} className="flex items-center justify-between gap-2 rounded-xl border-2 border-line px-3 py-2">
              <div>
                <p className="font-medium">{im.name}</p>
                <p className="text-xs text-ink/60">
                  id: {im.id} · {im.loadable ? `bar ${im.bar_weight_lb ?? "?"} lb, loadable` : "fixed load"}
                </p>
              </div>
              <button className="btn-ghost" onClick={() => removeImplement(idx)}>
                Remove
              </button>
            </div>
          ))}
          <button className="btn-secondary" onClick={addImplement}>
            + Implement
          </button>
        </div>
      </section>

      {saveStatus && <p className="text-sm text-ink/60">{saveStatus}</p>}

      <section className="card flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Training blocks</h2>
        <div className="flex flex-col gap-2">
          {blocks.length === 0 && <p className="text-sm text-ink/60">No blocks imported yet.</p>}
          {blocks.map((b) => (
            <div key={b.id} className="flex items-center justify-between rounded-xl border-2 border-line px-3 py-2">
              <div>
                <p className="font-medium">
                  {b.sequence}. {b.name}
                </p>
                <p className="text-xs text-ink/60">
                  {b.start_date} → {b.end_date}
                </p>
              </div>
              <span className={`tag ${b.status === "active" ? "bg-accent/20 text-accent" : ""}`}>{b.status}</span>
            </div>
          ))}
        </div>

        <h3 className="mt-2 font-semibold">Import a new block</h3>
        <textarea
          className="field-input min-h-[8rem] font-mono text-sm"
          placeholder="Paste block JSON here…"
          value={blockJsonText}
          onChange={(e) => setBlockJsonText(e.target.value)}
        />
        <label className="text-sm text-ink/60">
          Outcome summary for the block being replaced (optional)
          <textarea
            className="field-input mt-1 min-h-[4rem] text-base"
            placeholder="e.g. Hit every lift target, deadlift +30lb, stalled on bench week 6…"
            value={outcomeSummary}
            onChange={(e) => setOutcomeSummary(e.target.value)}
          />
        </label>
        <button className="btn-primary" disabled={importing || blockJsonText.trim().length === 0} onClick={() => void importBlock()}>
          {importing ? "Importing…" : "Import & activate"}
        </button>
        {importStatus && <p className="text-sm">{importStatus}</p>}
      </section>
    </div>
  );
}
