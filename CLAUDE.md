# Training Log — project context

Personal training tracker. Single user (Sam). Mobile-first: it gets used on a
phone, in a basement gym, between sets, with chalky hands. Latency and tap-target
size matter more than visual polish.

## Stack

- Next.js (App Router) + API routes. Deploy to Vercel.
- No auth. Single user, unlisted URL.
- Google Sheets for logged data (OAuth, `drive.file` scope — not a service
  account; see README's "Why OAuth" section). Tabs: `sets`, `sessions`, `body`.
- Google Drive for plan JSON files, one per block.
- Credentials via env vars only. Never hard-coded, never in the client bundle.

## Non-obvious constraints

- **Never block a mid-set tap on a network call.** Log to local state, batch-append
  to Sheets at session end plus a manual sync button. This is the single most
  important UX rule in the project.
- **Runs are not tracked here.** A watch owns pace, GPS, and distance. A run session
  is a planned target the user marks complete with an RPE and a note. Never prompt
  for pace or splits.
- **Implement is part of a set's identity.** 3x5 @ 245 on the 58 lb trap bar and on
  the 74 lb trap bar are different lifts. Never pool them in history or e1RM charts.
- **Fixed-load implements exist.** One kettlebell per size, one 100 lb sandbag.
  Exercises carry `progression.mode` of `load`, `reps`, or `distance`. Never suggest
  a weight increase on a `reps`-mode exercise.
- **Plate math is inventory-constrained.** The question is never "what plates make
  225" — it's "what is the closest achievable load to 225 on this implement given
  the plate pairs owned." Answer with achievable load + plates per side.
- **Trap bar loads never land on round numbers.** The bars weigh 58 and 74 lb, which
  aren't multiples of 5, and plates add in even amounts. Closest to 225 is 225.5 on
  the 58 and 224 on the 74. Show achievable loads exactly; never snap to a round
  number. This is the first unit test to write.
- **Kettlebell sizes are 18/36/54.** A size step is a 50-100% jump, so exercises use
  an explicit `load_ladder_lb` rather than "next size up." Show the actual next load
  and the size of the jump. Some exercises have no viable next rung — respect that.
- **Runs carry an HR cap.** Zones are in the block JSON under `heart_rate`. Log
  `avg_hr` on runs so the brief can show whether easy days were actually easy.
- **Ceiling height is limited.** Exercises may carry `ceiling_modified: true`
  (seated/half-kneeling variants). Surface that note in the session view.

## Plan format

Blocks are JSON conforming to `schema_version: 1`. See `SPEC.md` and
`data/block-01-strength-base.json`. Blocks are authored in conversation with
Claude and pasted in via the Setup screen. The app renders and logs against a
block; it does not generate training plans itself.

Archive completed blocks with their outcome summary. Never overwrite. Designing
block N depends on seeing blocks 1..N-1 and what happened in each.

## Two separate decision layers

- `progression` rules in the plan handle week-to-week loading automatically.
- Block-level questions (is the ramp too aggressive, is this a stall or fatigue,
  what should the next block prioritize) are for a human conversation. The app's
  job is to produce a good brief, not to answer these.

## This is a standalone repo

Nothing here is shared with any other project. If context from another app appears
to be loaded, that's a mistake — this project has no dependency on any of them.

## Scope discipline

Ship small and specific. Don't generalize this into a fitness platform, don't add
social features, don't build a plan editor UI. v2 items (weather-driven session
swaps, embedded API coaching calls) are deliberately deferred — do not start them.
