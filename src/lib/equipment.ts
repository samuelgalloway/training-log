import type { AppConfig, Block, Implement, PlateInventory } from "./types";

export interface ResolvedEquipment {
  implementsById: Record<string, Implement>;
  inventory: PlateInventory;
}

/**
 * Setup-screen equipment (config) is the source of truth once the user has
 * filled it in, since it persists across blocks and reflects real gear
 * changes; the active block's own implements/plate_inventory are the
 * fallback so the app is usable immediately after importing a block, before
 * anyone has touched Setup.
 */
export function resolveEquipment(block: Block | null, config: AppConfig | null): ResolvedEquipment {
  const configImplements = config?.equipment.implements ?? [];
  const blockImplements = block?.implements ?? [];
  const implementsById: Record<string, Implement> = {};
  for (const im of blockImplements) implementsById[im.id] = im;
  for (const im of configImplements) implementsById[im.id] = im;

  // Setup's "Kettlebell sizes owned" list is the live source of truth for the
  // "kb" implement's fixed-size ladder once set — buying a new bell shouldn't
  // require hand-editing the block JSON to see it in plate math.
  const kbSizes = config?.equipment.kettlebell_sizes_owned ?? [];
  if (kbSizes.length > 0 && implementsById["kb"]) {
    implementsById["kb"] = { ...implementsById["kb"]!, sizes_lb: [...kbSizes].sort((a, b) => a - b) };
  }

  const configInventory = config?.equipment.plate_inventory;
  const hasConfigPairs = configInventory && Object.keys(configInventory.pairs ?? {}).length > 0;
  const inventory = hasConfigPairs ? configInventory! : block?.plate_inventory ?? { unit: "lb", pairs: {} };

  return { implementsById, inventory };
}
