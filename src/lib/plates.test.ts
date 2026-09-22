import { describe, expect, it } from "vitest";
import { calcPlateLoad, closestFixedSize, smallestIncrement, totalFromPlates } from "./plates";
import type { Implement, PlateInventory } from "./types";

// Inventory lifted straight from data/block-01-strength-base.json.
const inventory: PlateInventory = {
  unit: "lb",
  pairs: {
    "1.25": 1,
    "2.5": 1,
    "5": 1,
    "10": 2,
    "25": 1,
    "35": 1,
    "45": 1,
    "55": 1,
  },
};

const trapBar58: Implement = { id: "tb", name: "Trap bar (open-ended)", bar_weight_lb: 58, loadable: true };
const trapBar74: Implement = { id: "tbh", name: "Trap bar w/ handles", bar_weight_lb: 74, loadable: true };
const barbell: Implement = { id: "bb", name: "Olympic barbell", bar_weight_lb: 45, loadable: true };
const kettlebell: Implement = { id: "kb", name: "Kettlebell", loadable: false, sizes_lb: [18, 36, 54] };
const sandbag: Implement = { id: "sandbag", name: "Training sandbag", bar_weight_lb: 100, loadable: false };

describe("calcPlateLoad — trap bar never lands on round numbers", () => {
  it("225 target on the 58 lb trap bar resolves to 225.5, never rounded to 225", () => {
    const result = calcPlateLoad(225, trapBar58, inventory);
    expect(result.loadable).toBe(true);
    if (result.loadable) {
      expect(result.achievableTotalLb).toBe(225.5);
      expect(result.deltaLb).toBeCloseTo(0.5);
      // 45 + 35 + 2.5 + 1.25 = 83.75 per side
      expect(result.perSideLb).toBeCloseTo(83.75);
    }
  });

  it("225 target on the 74 lb trap bar resolves to 224", () => {
    const result = calcPlateLoad(225, trapBar74, inventory);
    expect(result.loadable).toBe(true);
    if (result.loadable) {
      expect(result.achievableTotalLb).toBe(224);
      expect(result.deltaLb).toBe(-1);
      // 45 + 25 + 5 = 75 per side
      expect(result.perSideLb).toBe(75);
    }
  });
});

describe("calcPlateLoad — barbell", () => {
  it("finds an exact 225 on a 45 lb barbell with two 45s per side", () => {
    const result = calcPlateLoad(225, barbell, inventory);
    expect(result.loadable).toBe(true);
    if (result.loadable) {
      expect(result.achievableTotalLb).toBe(225);
      expect(result.deltaLb).toBe(0);
    }
  });

  it("respects a limited inventory (only one pair of 45s) rather than assuming unlimited plates", () => {
    // Empty-bar target below the bar weight itself is a degenerate case: never go negative.
    const result = calcPlateLoad(20, barbell, inventory);
    expect(result.loadable).toBe(true);
    if (result.loadable) {
      expect(result.achievableTotalLb).toBe(45); // can't unload the bar itself
      expect(result.perSideLb).toBe(0);
    }
  });
});

describe("calcPlateLoad — fixed-load implements", () => {
  it("returns the closest kettlebell size with no plate breakdown", () => {
    const result = calcPlateLoad(40, kettlebell, inventory);
    expect(result.loadable).toBe(false);
    if (!result.loadable) {
      expect(result.sizeUsedLb).toBe(36);
      expect(result.achievableTotalLb).toBe(36);
      expect(result.deltaLb).toBe(-4);
    }
  });

  it("a size exactly between two rungs breaks toward the lower one", () => {
    const result = calcPlateLoad(45, kettlebell, inventory); // exactly between 36 and 54
    expect(result.loadable).toBe(false);
    if (!result.loadable) {
      expect(result.sizeUsedLb).toBe(36);
    }
  });

  it("an implement with no size ladder returns its fixed load untouched", () => {
    const result = calcPlateLoad(150, sandbag, inventory);
    expect(result.loadable).toBe(false);
    if (!result.loadable) {
      expect(result.achievableTotalLb).toBe(100);
      expect(result.noViableSize).toBe(true);
    }
  });

  it("an exercise-specific size ladder (e.g. RFESS mixing a KB rung with a med ball) overrides the implement's own sizes", () => {
    const result = calcPlateLoad(40, kettlebell, inventory, { fixedSizeLadder: [18, 36, 40, 54] });
    expect(result.loadable).toBe(false);
    if (!result.loadable) {
      expect(result.sizeUsedLb).toBe(40);
    }
  });
});

describe("totalFromPlates — the reverse direction: plates on the bar, what's the total", () => {
  it("matches calcPlateLoad's own answer for the trap bar 225 example", () => {
    // 45 + 35 + 2.5 + 1.25 per side, on the 58 lb trap bar → 225.5
    expect(totalFromPlates(58, { "45": 1, "35": 1, "2.5": 1, "1.25": 1 })).toBe(225.5);
  });

  it("bar only (no plates) is just the bar weight", () => {
    expect(totalFromPlates(74, {})).toBe(74);
  });

  it("ignores zero/negative counts rather than subtracting", () => {
    // bar 45 + (2×45 per side, 25s and the negative 10 ignored) × 2 = 45 + 180
    expect(totalFromPlates(45, { "45": 2, "25": 0, "10": -1 })).toBe(225);
  });
});

describe("closestFixedSize", () => {
  it("returns undefined for an empty ladder", () => {
    expect(closestFixedSize(100, [])).toBeUndefined();
  });
});

describe("smallestIncrement", () => {
  it("is twice the smallest owned plate pair", () => {
    expect(smallestIncrement(inventory)).toBe(2.5);
  });

  it("is undefined with no plates owned", () => {
    expect(smallestIncrement({ unit: "lb", pairs: {} })).toBeUndefined();
  });
});
