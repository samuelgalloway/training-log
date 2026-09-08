# Training Log — v1 spec

## What it is

A personal lifting logger and plate calculator that renders a training block
authored elsewhere, tracks what actually got done, and produces a summary good
enough to hand to a coach.

## Screens

### Today
The default landing screen. Shows the session(s) planned for today, pulled from
the active block.

For a **lift** session, each exercise shows:
- name, target sets × reps, target RPE
- the same exercise's numbers from last time (weight, reps, RPE per set) — this is
  the single most-used piece of information in the app, put it where a thumb lands
- any `note`, `sub`, or `ceiling_modified` flag
- inline plate math: tap a target weight, get achievable load + plates per side for
  that exercise's implement
- per-set logging: weight, reps, RPE. "Same as last set" one-tap repeat.
- a rest timer

For a **run** session: distance and effort target, plus a completed toggle, RPE,
and note. Nothing else. The watch has the rest.

For a **BJJ** session: completed toggle, RPE, note.

End of session: sleep 1–5, soreness 1–5, optional joint flag with body-part tag,
freeform note. Then sync to Sheets.

### Week
Seven-day grid for the current week. Planned vs actual, done/skipped/partial state
per session. Shows the week's phase and coach note from the block.

Manual day swap: drag a movable session to another day. Validate against
`constraints.rules` and warn (don't block) on violation. Sessions with
`movable: false` can't be dragged. This validator is the foundation the v2 weather
engine plugs into — build it as a standalone pure function.

### History
Per exercise, per implement:
- logged sets over time
- estimated 1RM trend (Epley off the top set)
- RPE-at-fixed-load drift — flag when the same weight trends upward in RPE across
  three or more sessions. This is the best under-recovery signal available.
- current progression status against the exercise's rule

### Body
Weekly entry: bodyweight and measurements. Chart the 7-day rolling average of
bodyweight, not daily values.

### Setup
- plate inventory: pairs owned per denomination, iron vs bumper
- kettlebell sizes owned
- implements and their bar weights
- paste/import a block JSON, set the active block, archive the previous one

## Derived stats + coaching brief

A `/api/brief` route (and a **Copy coaching brief** button) that produces a
one-page markdown summary of the current block to date:

- e1RM trend per exercise per implement
- RPE drift flags
- adherence: planned vs completed sessions, and specifically which were skipped
- weekly tonnage by movement pattern (squat / hinge / push / pull / carry)
- rep-progression status for fixed-load exercises
- bodyweight 7-day rolling average and measurement deltas
- planned vs actual weekly run mileage
- aggregated subjective data: sleep and soreness trends, joint flags with counts
  ("left shoulder flagged 6 of last 9 pressing sessions")
- the user's session notes verbatim

Compute all of this server-side. Do not design this to hand raw set rows to a model.

## Plate calculator

Input: target weight, implement.
Output: closest achievable load, plates per side, delta from target.

Rules:
- plates load in pairs; respect inventory counts
- respect sleeve capacity if physically limited
- report the smallest possible increment for that implement given inventory
- for `loadable: false` implements, return the fixed load and no plate breakdown

## Data model

Sheets tabs:

- `sets` — session_id, date, exercise, implement, set_index, weight_lb, reps, rpe, note
- `sessions` — session_id, date, block_id, week, dow, type, name, status, sleep,
  soreness, joint_flag, note
- `body` — date, bodyweight_lb, waist_in, chest_in, arm_in, thigh_in

Keep it flat and human-readable. It should be sortable and filterable by hand in
the Sheets UI without a decoder ring.

## Build order

1. Setup screen + plate inventory + plate calculator (pure logic, testable, no I/O)
2. Block import + Today screen rendering a lift session
3. Set logging with local-first state + batched Sheets sync
4. Week view
5. Constraint validator + manual swap
6. History and derived stats
7. Body tracking
8. `/api/brief` + copy button

Steps 1–3 are the usable product. Everything after is improvement on a working app.

## Explicitly out of scope for v1

- Weather-driven automatic rescheduling (v2 — plugs into the step 5 validator)
- Embedded Anthropic API calls for in-app coaching (v2 — the copy/paste round trip
  comes first, to learn what the prompt should be)
- A plan editor UI
- Multi-user, accounts, sharing
- Anything that duplicates what the running watch already does
