import json, datetime

START = datetime.date(2026, 9, 21)  # Monday

# ---------------------------------------------------------------- implements
implements = [
    {"id": "bb",      "name": "Olympic barbell",          "bar_weight_lb": 45, "loadable": True},
    {"id": "tb",      "name": "Trap bar (open-ended)",     "bar_weight_lb": 58, "loadable": True},
    {"id": "tbh",     "name": "Trap bar w/ handles",       "bar_weight_lb": 74, "loadable": True},
    {"id": "kb",      "name": "Kettlebell",                "loadable": False,
     "note": "One bell per size. Load is fixed; progress reps, then step up a size."},
    {"id": "sandbag", "name": "Training sandbag",          "bar_weight_lb": 100, "loadable": False},
    {"id": "rings",   "name": "Gymnastic rings",           "loadable": False},
    {"id": "bw",      "name": "Bodyweight",                "loadable": False},
]

# ---------------------------------------------------------------- lift days
def lift_a(sets_main, sets_acc, deload=False):
    return {
        "type": "lift", "name": "A — Lower Strength", "slot": "A",
        "exercises": [
            {"name": "Trap Bar Deadlift", "implement": "tb", "sets": sets_main, "reps": 5,
             "target_rpe": 7,
             "progression": {"mode": "load", "increment_lb": 10, "rule": "all_sets_at_reps_and_rpe<=8"},
             "note": "Low handles. This is the anchor lift of the block.",
             "sub": "Conventional deadlift off the barbell if the trap bar is tied up."},
            {"name": "Back Squat", "implement": "bb", "sets": sets_acc, "reps": 8,
             "target_rpe": 7,
             "progression": {"mode": "load", "increment_lb": 5, "rule": "all_sets_at_reps_and_rpe<=8"},
             "note": "Spotter arms set at depth. Never train to failure alone in the basement.",
             "sub": "Goblet squat if the back is unhappy."},
            {"name": "Rear-Foot-Elevated Split Squat", "implement": "kb", "sets": sets_acc, "reps": "10/side",
             "target_rpe": 7,
             "progression": {"mode": "reps", "cap": 15, "then": "step up one KB size, reset to 10"},
             "note": "KB in each hand or goblet. Back foot on the bench."},
            {"name": "Ab Roller", "implement": "bw", "sets": sets_acc, "reps": 12,
             "progression": {"mode": "reps", "cap": 18},
             "note": "Full brace, no lumbar sag."},
        ],
    }

def lift_b(sets_main, sets_acc, deload=False):
    return {
        "type": "lift", "name": "B — Upper Strength", "slot": "B",
        "exercises": [
            {"name": "Barbell Bench Press", "implement": "bb", "sets": sets_main, "reps": 5,
             "target_rpe": 7,
             "progression": {"mode": "load", "increment_lb": 5, "rule": "all_sets_at_reps_and_rpe<=8"},
             "note": "Spotter arms up. 2-3 min rest."},
            {"name": "Barbell Pendlay Row", "implement": "bb", "sets": sets_main, "reps": 6,
             "target_rpe": 7,
             "progression": {"mode": "load", "increment_lb": 5, "rule": "all_sets_at_reps_and_rpe<=8"},
             "note": "Dead stop on the floor each rep."},
            {"name": "Half-Kneeling Landmine Press", "implement": "bb", "sets": sets_acc, "reps": "8/side",
             "target_rpe": 7,
             "progression": {"mode": "load", "increment_lb": 5, "rule": "all_sets_at_reps_and_rpe<=8"},
             "note": "Overhead substitute — half-kneeling keeps you under the ceiling.",
             "ceiling_modified": True},
            {"name": "Ring Chin-Up", "implement": "rings", "sets": sets_acc, "reps": "AMRAP-1",
             "progression": {"mode": "reps", "note": "Leave one rep in the tank. Add reps before adding load."},
             "sub": "Feet-assisted ring row if strict chins aren't there yet."},
            {"name": "KB Lateral Raise", "implement": "kb", "load_lb": 18, "sets": sets_acc, "reps": 15,
             "progression": {"mode": "reps", "cap": 20, "then": "step up one KB size, reset to 15"},
             "note": "One arm at a time, slow negative."},
        ],
    }

def lift_c(sets_acc, deload=False):
    return {
        "type": "lift", "name": "C — Upper Hypertrophy & Carries", "slot": "C",
        "legs_light": True,
        "note": "Deliberately low leg fatigue — this sits the day before the long run.",
        "exercises": [
            {"name": "Ring Dip", "implement": "rings", "sets": sets_acc, "reps": "AMRAP-1",
             "progression": {"mode": "reps"},
             "sub": "Bench dip or push-up on rings if ring dips aren't there."},
            {"name": "Ring Row", "implement": "rings", "sets": sets_acc, "reps": 12,
             "progression": {"mode": "reps", "cap": 15, "then": "lower the rings / walk feet forward"}},
            {"name": "Seated KB Overhead Press", "implement": "kb", "sets": sets_acc, "reps": 10,
             "progression": {"mode": "reps", "cap": 12, "then": "step up one KB size, reset to 10"},
             "note": "Seated on the bench — ceiling clearance.",
             "ceiling_modified": True},
            {"name": "Sandbag Bear Hug Carry", "implement": "sandbag", "sets": sets_acc,
             "reps": "40 yd", "progression": {"mode": "distance", "note": "Add 10 yd when all sets are unbroken."},
             "note": "Trunk and grip work with no eccentric leg damage."},
            {"name": "Trap Bar Shrug", "implement": "tbh", "sets": sets_acc, "reps": 15,
             "target_rpe": 7,
             "progression": {"mode": "load", "increment_lb": 10, "rule": "all_sets_at_reps_and_rpe<=8"},
             "note": "High-handle bar. 1-sec squeeze at the top."},
            {"name": "KB Curl", "implement": "kb", "sets": sets_acc, "reps": 12,
             "progression": {"mode": "reps", "cap": 15, "then": "step up one KB size, reset to 12"}},
            {"name": "Hanging Knee Raise", "implement": "rings", "sets": sets_acc, "reps": 12,
             "progression": {"mode": "reps", "cap": 15}},
        ],
    }

# ---------------------------------------------------------------- week specs
# (week, phase, main_sets, acc_sets, tue_mi, thu_mi, sat_mi, strides, coach_note)
WEEKS = [
    (1, "intro", 3, 3, 3.0, 3.0, 4.0, 0,
     "Baseline week. Pick loads you could stop 3 reps short of. The numbers you log this week "
     "are the reference point for the whole block — don't inflate them."),
    (2, "intro", 4, 3, 3.0, 3.0, 5.0, 0,
     "Fourth set added to the mains. Still conservative on load. Expect real soreness — you haven't "
     "lifted properly in a month."),
    (3, "build", 4, 3, 3.5, 3.0, 5.0, 4,
     "Strides start today. Four 20-second accelerations after Tuesday's easy run, full walk recovery. "
     "This is the cheapest speed work there is."),
    (4, "build", 4, 3, 4.0, 3.0, 6.0, 5,
     "Load should be moving on all three mains by now. If bench has stalled two weeks running, "
     "that's a microplate problem, not a you problem."),
    (5, "build", 4, 4, 4.0, 3.5, 6.5, 6,
     "Heaviest week so far and the accessories pick up a set. Watch the RPE drift flag — "
     "same weight feeling harder is the signal to back off, not push."),
    (6, "deload", 2, 2, 3.0, 2.5, 4.0, 0,
     "DELOAD. Two sets, drop main lift loads 15%. Do less than you want to. This is where the "
     "adaptation from weeks 3-5 actually lands."),
    (7, "peak", 4, 4, 4.0, 3.5, 7.0, 6,
     "Back to full volume from week 5 loads. You should feel noticeably fresh — if you don't, "
     "the deload wasn't deep enough and we adjust block 2."),
    (8, "peak", 4, 4, 4.0, 3.5, 7.5, 6,
     "Last week of the block. Push the mains. Log everything cleanly — this is the data the next "
     "block gets designed from."),
]

def mk_run(distance, subtype, note, strides=0):
    s = {"type": "run", "subtype": subtype, "distance_mi": distance,
         "effort": "conversational / nasal", "note": note,
         "data_source": "watch", "log": ["completed", "rpe", "note"]}
    if strides:
        s["strides"] = {"count": strides, "duration_sec": 20,
                        "note": "Full walk recovery between. Fast but relaxed, not a sprint."}
    return s

BJJ = {"type": "bjj", "note": "1-2x/week, Tue and/or Thu. Anchored to the gym schedule.",
       "optional": True, "log": ["completed", "rpe", "note"]}
MOB = {"type": "mobility", "duration_min": 10,
       "note": "90/90, couch stretch, thoracic roll, ankle work."}

weeks = []
for (wk, phase, main_sets, acc_sets, tue, thu, sat, strides, note) in WEEKS:
    monday = START + datetime.timedelta(weeks=wk - 1)
    deload = phase == "deload"
    load_adj = "-15%" if deload else None

    a, b, c = lift_a(main_sets, acc_sets, deload), lift_b(main_sets, acc_sets, deload), lift_c(acc_sets, deload)
    if load_adj:
        for s in (a, b, c):
            s["load_adjustment"] = load_adj

    weeks.append({
        "week": wk,
        "phase": phase,
        "week_of": monday.isoformat(),
        "planned_mileage": round(tue + thu + sat, 1),
        "coach_note": note,
        "days": [
            {"dow": "MON", "movable": True,  "sessions": [a]},
            {"dow": "TUE", "movable": False, "sessions": [
                mk_run(tue, "easy", "Genuinely easy. Flush the legs from Monday.", strides), BJJ]},
            {"dow": "WED", "movable": True,  "sessions": [b]},
            {"dow": "THU", "movable": False, "sessions": [
                mk_run(thu, "easy", "Easy. Bring the setter."), BJJ]},
            {"dow": "FRI", "movable": True,  "sessions": [c]},
            {"dow": "SAT", "movable": True,  "sessions": [
                mk_run(sat, "long", "Nasal pace only. Time on feet, not a fitness test.")]},
            {"dow": "SUN", "movable": False, "sessions": [MOB]},
        ],
    })

block = {
    "schema_version": 1,
    "block": {
        "id": "block-01-strength-base",
        "name": "Strength Base",
        "sequence": 1,
        "weeks": 8,
        "priority": "strength",
        "start_date": START.isoformat(),
        "end_date": (START + datetime.timedelta(weeks=8, days=-1)).isoformat(),
        "goal_horizon": "2027-07",
        "summary": (
            "Post-race strength rebuild. Lifting is the priority; running holds a maintenance base "
            "with strides layered in to protect top-end speed. Running volume and speed become the "
            "priority in a later block."
        ),
        "rationale": [
            "Detrained from lifting after a 9-week running block — strength adapts fastest right now.",
            "Aerobic base is banked and cheap to hold at 10-15 mi/wk.",
            "Cleveland fall is the last reliably good outdoor running window before winter.",
            "Building through fall/winter leaves spring 2027 free for a running-priority block and "
            "a physique-focused phase ahead of July.",
        ],
    },
    "constraints": {
        "bjj_days": ["TUE", "THU"],
        "anchored_days": ["TUE", "THU", "SUN"],
        "rules": [
            {"id": "no_heavy_legs_before_long_run",
             "text": "No heavy lower-body session in the 24h before the long run.",
             "check": "session.legs_light == false && next_day.has(run.subtype=='long')"},
            {"id": "no_adjacent_hard_days",
             "text": "Two hard sessions should not sit back to back."},
            {"id": "bjj_anchored",
             "text": "BJJ days are fixed by the gym schedule and cannot be swapped."},
            {"id": "skip_wednesday_if_wrecked",
             "text": "If the Saturday long run wrecked your legs, dropping a lift session is the "
                     "correct call, not a failure."},
        ],
    },
    "implements": implements,
    "progression_defaults": {
        "load_rule": "If every set hit the target reps at RPE <= 8, add one increment next session.",
        "stall_rule": "Two consecutive sessions failing the rule at the same load: drop 10% and build back.",
        "min_increment_note": "Smallest increment is limited by your smallest plate pair. If bench "
                              "stalls at 5 lb jumps, a pair of 1.25 lb microplates is the fix.",
    },
    "tracking": {
        "body": {"cadence": "weekly", "fields": ["bodyweight_lb", "waist_in", "chest_in", "arm_in", "thigh_in"],
                 "note": "Same morning each week, fasted. Trend the 7-day rolling average, not the daily."},
        "session_subjective": ["sleep_1_5", "soreness_1_5", "joint_flag", "note"],
    },
    "weeks": weeks,
}

with open("/mnt/user-data/outputs/block-01-strength-base.json", "w") as f:
    json.dump(block, f, indent=2)

print("weeks:", len(block["weeks"]))
for w in block["weeks"]:
    print(w["week"], w["phase"], w["week_of"], w["planned_mileage"], "mi")
