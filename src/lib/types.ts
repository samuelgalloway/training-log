// Types for the block-plan JSON (schema_version: 1) and the app's own
// derived/logged data. See SPEC.md and data/block-01-strength-base.json for
// the canonical shape this was reverse-engineered from.

export type Dow = "MON" | "TUE" | "WED" | "THU" | "FRI" | "SAT" | "SUN";

export interface Implement {
  id: string;
  name: string;
  bar_weight_lb?: number;
  loadable: boolean;
  sizes_lb?: number[];
  note?: string;
}

export interface PlateInventory {
  unit: "lb" | "kg";
  /** denomination (as a string, e.g. "2.5") -> pairs owned */
  pairs: Record<string, number>;
  total_plate_weight_lb?: number;
  min_increment_lb?: number;
  max_load_lb?: Record<string, number>;
  display_rule?: string;
}

export type ProgressionMode = "load" | "reps" | "distance";

export interface LoadProgression {
  mode: "load";
  increment_lb: number;
  rule?: string;
}

export interface RepsProgression {
  mode: "reps";
  cap?: number;
  load_ladder_lb?: number[];
  then?: string;
  note?: string;
}

export interface DistanceProgression {
  mode: "distance";
  increment_mi?: number;
  note?: string;
}

export type Progression = LoadProgression | RepsProgression | DistanceProgression;

export interface Exercise {
  name: string;
  implement: string;
  /** Fixed load override for a loadable-implement exercise pinned to one weight (e.g. a lateral raise done at a set KB size). */
  load_lb?: number;
  sets: number;
  /** Usually a number, but the plan format also uses strings like "10/side" or "AMRAP-1". */
  reps: number | string;
  target_rpe?: number;
  progression?: Progression;
  note?: string;
  sub?: string;
  ceiling_modified?: boolean;
}

export interface LiftSession {
  type: "lift";
  name: string;
  slot: string;
  exercises: Exercise[];
}

export interface HrTarget {
  zone?: string;
  cap_bpm?: number;
  ideal_bpm?: [number, number];
  drift_allowance_bpm?: number;
  note?: string;
}

export interface RunSession {
  type: "run";
  subtype?: string;
  distance_mi: number;
  effort?: string;
  note?: string;
  hr_target?: HrTarget;
  data_source?: string;
  log: string[];
}

export interface BjjSession {
  type: "bjj";
  note?: string;
  optional?: boolean;
  log: string[];
}

export interface MobilitySession {
  type: "mobility";
  duration_min?: number;
  note?: string;
}

export type Session = LiftSession | RunSession | BjjSession | MobilitySession;

export interface Day {
  dow: Dow;
  movable: boolean;
  sessions: Session[];
}

export interface Week {
  week: number;
  phase: string;
  week_of: string;
  planned_mileage?: number;
  coach_note?: string;
  days: Day[];
}

export interface ConstraintRule {
  id: string;
  text: string;
  check?: string;
}

export interface Constraints {
  bjj_days: Dow[];
  anchored_days: Dow[];
  rules: ConstraintRule[];
}

export interface HrZone {
  zone: string;
  name: string;
  low: number | null;
  high: number | null;
}

export interface HeartRate {
  lthr: number;
  source?: string;
  model?: string;
  zones: HrZone[];
  notes?: string[];
}

export interface BlockMeta {
  id: string;
  name: string;
  sequence: number;
  weeks: number;
  priority?: string;
  start_date: string;
  end_date: string;
  goal_horizon?: string;
  summary?: string;
  rationale?: string[];
}

export type BlockStatus = "active" | "archived";

export interface Block {
  schema_version: number;
  block: BlockMeta;
  constraints: Constraints;
  implements: Implement[];
  plate_inventory?: PlateInventory;
  other_equipment?: string[];
  facility_notes?: string[];
  heart_rate?: HeartRate;
  progression_defaults?: {
    load_rule?: string;
    stall_rule?: string;
    min_increment_note?: string;
  };
  tracking?: {
    body?: { cadence?: string; fields?: string[]; note?: string };
    session_subjective?: string[];
  };
  weeks: Week[];
  /** Set by this app, not by the plan author: which blocks are live vs archived. */
  status?: BlockStatus;
  outcome_summary?: string;
  /** Drive file id this block was loaded from/saved to; set by the app on import. */
  drive_file_id?: string;
  imported_at?: string;
}

// ---------------------------------------------------------------------------
// App-level config (Setup screen), persisted as config.json in Drive.
// ---------------------------------------------------------------------------

export interface EquipmentConfig {
  plate_inventory: PlateInventory;
  kettlebell_sizes_owned: number[];
  implements: Implement[];
}

export interface AppConfig {
  equipment: EquipmentConfig;
  active_block_id: string | null;
}

/** Lightweight metadata for the Setup screen's block list — no `weeks` payload. */
export interface BlockSummary {
  id: string;
  name: string;
  sequence: number;
  status: BlockStatus | undefined;
  start_date: string;
  end_date: string;
  drive_file_id: string;
}

// ---------------------------------------------------------------------------
// Logged data (mirrors the `sets` / `sessions` / `body` Sheets tabs).
// ---------------------------------------------------------------------------

export interface LoggedSet {
  session_id: string;
  date: string; // ISO yyyy-mm-dd
  exercise: string;
  implement: string;
  set_index: number;
  weight_lb: number | null;
  reps: number | null;
  rpe: number | null;
  note?: string;
  /** Hit the reps, but it was a grind — the explicit "hold this weight" override, independent of RPE. */
  brutal?: boolean;
}

export type SessionStatus = "done" | "partial" | "skipped";

export interface LoggedSession {
  session_id: string;
  date: string;
  block_id: string;
  week: number;
  dow: Dow;
  type: Session["type"];
  name: string;
  status: SessionStatus;
  sleep?: number | null;
  soreness?: number | null;
  joint_flag?: string | null;
  note?: string;
  /** Non-lift extras, kept out of the Sheets schema's core columns but useful client-side. */
  rpe?: number | null;
  avg_hr?: number | null;
  distance_mi?: number | null;
}

export interface BodyEntry {
  date: string;
  bodyweight_lb: number | null;
  waist_in?: number | null;
  chest_in?: number | null;
  arm_in?: number | null;
  thigh_in?: number | null;
}
