// Plate math. Pure, no I/O.
//
// The question is never "what plates make 225" — it's "what is the closest
// achievable load to 225 on THIS implement given the plate pairs owned."
// Trap bar loads never land on round numbers (58 and 74 lb bars aren't
// multiples of 5) — report achievable loads exactly, never snap to a round
// number.

import type { Implement, PlateInventory } from "./types";

export interface LoadablePlateResult {
  loadable: true;
  target: number;
  barWeightLb: number;
  /** Weight added to ONE side (the bar carries the rest). */
  perSideLb: number;
  /** Denomination (lb, as string) -> count of that plate on ONE side. */
  perSide: Record<string, number>;
  achievableTotalLb: number;
  deltaLb: number;
  /** True if some pair inventory existed but no combination could be tried (e.g. empty inventory). */
  exact: boolean;
}

export interface FixedLoadResult {
  loadable: false;
  target: number;
  achievableTotalLb: number;
  deltaLb: number;
  /** Present when the implement/exercise offers a ladder of fixed sizes to choose from. */
  sizeUsedLb?: number;
  noViableSize?: boolean;
}

export type PlateResult = LoadablePlateResult | FixedLoadResult;

/**
 * Closest fixed size to a target from a list of owned/available sizes
 * (kettlebells, med balls, fixed-weight sandbags, etc). Ties break toward
 * the lower size (never oversell what's achievable).
 */
export function closestFixedSize(target: number, sizes: number[]): number | undefined {
  if (sizes.length === 0) return undefined;
  let best = sizes[0]!;
  let bestDiff = Math.abs(target - best);
  for (const size of sizes) {
    const diff = Math.abs(target - size);
    if (diff < bestDiff - 1e-9 || (Math.abs(diff - bestDiff) < 1e-9 && size < best)) {
      best = size;
      bestDiff = diff;
    }
  }
  return best;
}

/**
 * Given a target TOTAL load and a plate inventory (pairs owned per
 * denomination), find the per-side plate combination whose total load is
 * closest to the target. Exhaustive search — inventories are small (a
 * handful of denominations, at most a few pairs each) so this is instant
 * and exact, unlike a greedy largest-plate-first approach which can miss
 * the true closest combination when pair counts are limited.
 */
function closestPerSideCombo(
  perSideTarget: number,
  pairs: Record<string, number>
): { sum: number; combo: Record<string, number> } {
  const denoms = Object.entries(pairs)
    .map(([d, count]) => ({ denom: Number(d), count: Math.max(0, Math.floor(count)) }))
    .filter((p) => p.count > 0 && Number.isFinite(p.denom) && p.denom > 0)
    .sort((a, b) => b.denom - a.denom);

  let bestSum = 0;
  let bestCombo: Record<string, number> = {};
  let bestDiff = Math.abs(perSideTarget - 0);

  const combo: Record<string, number> = {};

  function dfs(idx: number, sum: number) {
    if (idx === denoms.length) {
      const diff = Math.abs(perSideTarget - sum);
      if (diff < bestDiff - 1e-9) {
        bestDiff = diff;
        bestSum = sum;
        bestCombo = { ...combo };
      }
      return;
    }
    const { denom, count } = denoms[idx]!;
    for (let use = count; use >= 0; use--) {
      combo[denom] = use;
      dfs(idx + 1, sum + use * denom);
    }
    delete combo[denom];
  }

  dfs(0, 0);

  return { sum: bestSum, combo: bestCombo };
}

export function calcPlateLoad(
  target: number,
  implement: Implement,
  inventory: PlateInventory,
  opts?: { fixedSizeLadder?: number[] }
): PlateResult {
  if (!implement.loadable) {
    const sizes = opts?.fixedSizeLadder ?? implement.sizes_lb ?? [];
    if (sizes.length === 0) {
      // No size options at all — the "load" is whatever the implement/exercise fixes it at.
      const fixed = implement.bar_weight_lb ?? target;
      return {
        loadable: false,
        target,
        achievableTotalLb: fixed,
        deltaLb: fixed - target,
        noViableSize: true,
      };
    }
    const size = closestFixedSize(target, sizes)!;
    return {
      loadable: false,
      target,
      achievableTotalLb: size,
      deltaLb: size - target,
      sizeUsedLb: size,
    };
  }

  const barWeightLb = implement.bar_weight_lb ?? 0;
  const perSideTarget = (target - barWeightLb) / 2;

  const pairs = inventory.pairs ?? {};
  const hasAnyPlates = Object.values(pairs).some((c) => c > 0);

  if (perSideTarget <= 0 || !hasAnyPlates) {
    return {
      loadable: true,
      target,
      barWeightLb,
      perSideLb: 0,
      perSide: {},
      achievableTotalLb: barWeightLb,
      deltaLb: barWeightLb - target,
      exact: perSideTarget <= 0,
    };
  }

  const { sum, combo } = closestPerSideCombo(perSideTarget, pairs);
  const achievableTotalLb = barWeightLb + sum * 2;

  return {
    loadable: true,
    target,
    barWeightLb,
    perSideLb: sum,
    perSide: combo,
    achievableTotalLb,
    deltaLb: achievableTotalLb - target,
    exact: true,
  };
}

/**
 * The reverse of calcPlateLoad: given the plates already on the bar (one
 * side's worth — the other side is assumed to mirror it), what's the total?
 * Trivial arithmetic, but it lives here so the "plates on the bar → total"
 * direction is covered by the same tests as "target → plates" instead of
 * hand-rolled in a component.
 */
export function totalFromPlates(barWeightLb: number, perSide: Record<string, number>): number {
  const perSideLb = Object.entries(perSide).reduce((sum, [denom, count]) => sum + Number(denom) * Math.max(0, count), 0);
  return barWeightLb + perSideLb * 2;
}

/**
 * The smallest possible load increment on a given implement, given the
 * inventory — i.e. 2x the smallest-denomination pair owned. Used to explain
 * why progression is stalling at a coarser jump than the plan calls for.
 */
export function smallestIncrement(inventory: PlateInventory): number | undefined {
  const denoms = Object.entries(inventory.pairs ?? {})
    .filter(([, count]) => count > 0)
    .map(([d]) => Number(d))
    .filter((d) => Number.isFinite(d));
  if (denoms.length === 0) return undefined;
  return Math.min(...denoms) * 2;
}
