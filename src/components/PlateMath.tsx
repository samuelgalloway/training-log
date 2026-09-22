"use client";

import { useState } from "react";
import { calcPlateLoad, totalFromPlates } from "@/lib/plates";
import type { Implement, PlateInventory } from "@/lib/types";

const DENOM_ORDER_DESC = (a: string, b: string) => Number(b) - Number(a);

export default function PlateMath({
  implement,
  inventory,
  defaultTarget,
  fixedSizeLadder,
  barOptions,
}: {
  implement: Implement;
  inventory: PlateInventory;
  defaultTarget?: number;
  fixedSizeLadder?: number[];
  /** Other loadable implements the actual bar might be, if not this exercise's default (grabbed the 74 lb trap bar because the 58 was in use, etc). Ignored for fixed-load implements. */
  barOptions?: Implement[];
}) {
  const [open, setOpen] = useState(false);
  const [barId, setBarId] = useState(implement.id);
  const [mode, setMode] = useState<"target" | "plates">("target");
  const [target, setTarget] = useState<string>(defaultTarget != null ? String(defaultTarget) : "");
  const [plateCounts, setPlateCounts] = useState<Record<string, number>>({});

  // Bar choice only makes sense for loadable implements (plates on a bar) —
  // a kettlebell/sandbag/med ball has no "which bar" question.
  const bars = implement.loadable ? (barOptions ?? [implement]).filter((b) => b.loadable) : [];
  const activeBar = bars.find((b) => b.id === barId) ?? implement;

  const targetNum = Number(target);
  const targetResult =
    open && mode === "target" && Number.isFinite(targetNum) && target !== "" ? calcPlateLoad(targetNum, activeBar, inventory, { fixedSizeLadder }) : null;

  const ownedDenoms = Object.entries(inventory.pairs ?? {})
    .filter(([, count]) => count > 0)
    .map(([d]) => d)
    .sort(DENOM_ORDER_DESC);

  function setCount(denom: string, delta: number) {
    setPlateCounts((prev) => ({ ...prev, [denom]: Math.max(0, (prev[denom] ?? 0) + delta) }));
  }

  const plateModeTotal = activeBar.loadable ? totalFromPlates(activeBar.bar_weight_lb ?? 0, plateCounts) : null;

  return (
    <div className="rounded-xl border-2 border-line">
      <button className="btn-ghost w-full justify-between px-3 py-2 no-underline" onClick={() => setOpen((v) => !v)}>
        <span>🧮 Plate math</span>
        <span>{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div className="flex flex-col gap-3 border-t border-line p-3">
          {bars.length > 1 && (
            <div>
              <p className="text-sm text-ink/60">Bar</p>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {bars.map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    className={`tag ${b.id === activeBar.id ? "bg-accent/20 text-accent" : ""}`}
                    onClick={() => setBarId(b.id)}
                  >
                    {b.name} · {b.bar_weight_lb} lb
                  </button>
                ))}
              </div>
            </div>
          )}

          {activeBar.loadable && (
            <div className="flex gap-1.5">
              <button
                type="button"
                className={mode === "target" ? "btn-secondary min-h-0 flex-1 py-1.5 text-sm" : "btn-ghost min-h-0 flex-1 py-1.5 text-sm"}
                onClick={() => setMode("target")}
              >
                Target → plates
              </button>
              <button
                type="button"
                className={mode === "plates" ? "btn-secondary min-h-0 flex-1 py-1.5 text-sm" : "btn-ghost min-h-0 flex-1 py-1.5 text-sm"}
                onClick={() => setMode("plates")}
              >
                Plates → total
              </button>
            </div>
          )}

          {mode === "target" && (
            <>
              <label className="text-sm text-ink/60">
                Target total weight (lb)
                <input
                  type="number"
                  inputMode="decimal"
                  className="field-input mt-1"
                  value={target}
                  onChange={(e) => setTarget(e.target.value)}
                  placeholder="e.g. 225"
                />
              </label>
              {targetResult && targetResult.loadable && (
                <div className="rounded-lg bg-line/30 p-3">
                  <p className="text-lg font-bold">{targetResult.achievableTotalLb} lb</p>
                  <p className="text-sm text-ink/60">
                    {targetResult.deltaLb === 0 ? "exact" : `${targetResult.deltaLb > 0 ? "+" : ""}${targetResult.deltaLb} lb from target`} · bar{" "}
                    {targetResult.barWeightLb} lb
                  </p>
                  <p className="mt-1 text-sm">
                    Per side:{" "}
                    {Object.entries(targetResult.perSide)
                      .filter(([, count]) => count > 0)
                      .sort((a, b) => DENOM_ORDER_DESC(a[0], b[0]))
                      .map(([denom, count]) => `${count}×${denom}`)
                      .join(", ") || "bar only"}
                  </p>
                </div>
              )}
              {targetResult && !targetResult.loadable && (
                <div className="rounded-lg bg-line/30 p-3">
                  <p className="text-lg font-bold">{targetResult.achievableTotalLb} lb</p>
                  <p className="text-sm text-ink/60">
                    {targetResult.noViableSize
                      ? "Fixed load — no size options configured."
                      : `closest available size (${targetResult.deltaLb > 0 ? "+" : ""}${targetResult.deltaLb} lb from target)`}
                  </p>
                </div>
              )}
            </>
          )}

          {mode === "plates" && activeBar.loadable && (
            <div className="flex flex-col gap-2">
              <p className="text-sm text-ink/60">Per side — what's actually on the bar:</p>
              {ownedDenoms.length === 0 && <p className="text-sm italic text-ink/50">No plate inventory set up yet — see Setup.</p>}
              {ownedDenoms.map((denom) => (
                <div key={denom} className="flex items-center gap-2">
                  <span className="w-14 font-mono text-sm">{denom} lb</span>
                  <button className="btn-ghost px-2 min-h-0" onClick={() => setCount(denom, -1)} aria-label={`Fewer ${denom}lb`}>
                    −
                  </button>
                  <span className="w-6 text-center">{plateCounts[denom] ?? 0}</span>
                  <button className="btn-ghost px-2 min-h-0" onClick={() => setCount(denom, 1)} aria-label={`More ${denom}lb`}>
                    +
                  </button>
                </div>
              ))}
              {plateModeTotal != null && (
                <div className="rounded-lg bg-line/30 p-3">
                  <p className="text-lg font-bold">{plateModeTotal} lb</p>
                  <p className="text-sm text-ink/60">bar {activeBar.bar_weight_lb} lb, plated the same on both sides</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
