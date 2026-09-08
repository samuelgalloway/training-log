"use client";

import { useState } from "react";
import { calcPlateLoad } from "@/lib/plates";
import type { Implement, PlateInventory } from "@/lib/types";

const DENOM_ORDER_DESC = (a: string, b: string) => Number(b) - Number(a);

export default function PlateMath({
  implement,
  inventory,
  defaultTarget,
  fixedSizeLadder,
}: {
  implement: Implement;
  inventory: PlateInventory;
  defaultTarget?: number;
  fixedSizeLadder?: number[];
}) {
  const [open, setOpen] = useState(false);
  const [target, setTarget] = useState<string>(defaultTarget != null ? String(defaultTarget) : "");

  const targetNum = Number(target);
  const result = open && Number.isFinite(targetNum) && target !== "" ? calcPlateLoad(targetNum, implement, inventory, { fixedSizeLadder }) : null;

  return (
    <div className="rounded-xl border-2 border-line">
      <button className="btn-ghost w-full justify-between px-3 py-2 no-underline" onClick={() => setOpen((v) => !v)}>
        <span>🧮 Plate math</span>
        <span>{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div className="flex flex-col gap-2 border-t border-line p-3">
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
          {result && result.loadable && (
            <div className="rounded-lg bg-line/30 p-3">
              <p className="text-lg font-bold">{result.achievableTotalLb} lb</p>
              <p className="text-sm text-ink/60">
                {result.deltaLb === 0 ? "exact" : `${result.deltaLb > 0 ? "+" : ""}${result.deltaLb} lb from target`} · bar {result.barWeightLb} lb
              </p>
              <p className="mt-1 text-sm">
                Per side:{" "}
                {Object.entries(result.perSide)
                  .filter(([, count]) => count > 0)
                  .sort((a, b) => DENOM_ORDER_DESC(a[0], b[0]))
                  .map(([denom, count]) => `${count}×${denom}`)
                  .join(", ") || "bar only"}
              </p>
            </div>
          )}
          {result && !result.loadable && (
            <div className="rounded-lg bg-line/30 p-3">
              <p className="text-lg font-bold">{result.achievableTotalLb} lb</p>
              <p className="text-sm text-ink/60">
                {result.noViableSize ? "Fixed load — no size options configured." : `closest available size (${result.deltaLb > 0 ? "+" : ""}${result.deltaLb} lb from target)`}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
