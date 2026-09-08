# 🏋️ Training Log

A personal lifting logger and plate calculator. It renders a training block
(a JSON file you author elsewhere, in conversation with Claude), tracks what
actually got done, and produces a coaching brief good enough to hand to a
human. Single user, no accounts, mobile-first — see `CLAUDE.md` and
`SPEC.md` for the full design context this was built from.

## Screens

- **Today** — today's planned session(s): a lift session with per-exercise
  targets, last-time numbers, inline plate math, per-set logging, and a rest
  timer; or a run/BJJ session with a completed/partial/skipped toggle, RPE,
  and note. Ends with a sleep/soreness/joint-flag/note form and a **Sync**
  button.
- **Week** — a 7-day grid of the current week, planned vs. actual status per
  session. Tap a day, then tap another to propose moving its session(s) —
  anchored/non-movable days are blocked outright, everything else just warns
  (per the block's `constraints.rules`) and lets you confirm anyway.
- **History** — per exercise+implement: e1RM trend (Epley, off the top set),
  RPE-at-fixed-load drift flags, and current progression status. Also has the
  **Copy brief** button (`/api/brief`), which builds a one-page markdown
  coaching summary and copies it to your clipboard.
- **Body** — weekly bodyweight/measurement entry, charted as a 7-day rolling
  average (never daily values).
- **Setup** — plate inventory (pairs owned per denomination), kettlebell
  sizes owned, implements and bar weights, and importing/activating a new
  training block (JSON, pasted in).

## Why local-first logging

The single most important UX rule in this app: **never block a mid-set tap
on a network call.** Every weight/reps/RPE tap during a session writes to
`localStorage` only (see `src/lib/localStore.ts`). The only network call in
the whole logging flow is the batched **Sync** at the end of a session — if
it fails (bad connection in a basement gym), the data stays safe locally and
you can retry.

## Stack

- Next.js 16 (App Router) + API routes, deployed to Vercel.
- Google Sheets for logged data (`sets`, `sessions`, `body` tabs), via a
  service account.
- Google Drive for the equipment/plate-inventory config and one JSON file
  per training block (active + archived, never overwritten wholesale).
- No auth — this is meant to run at an unlisted URL for one person.

## Setup

### 1. Install and configure

```bash
npm install
cp .env.example .env
```

### 2. Create a Google service account

1. In [Google Cloud Console](https://console.cloud.google.com/), create (or
   pick) a project, then enable the **Google Sheets API** and **Google Drive
   API**.
2. Create a service account (IAM & Admin → Service Accounts), then create a
   JSON key for it and download it.
3. From that JSON key file, copy `client_email` into
   `GOOGLE_SERVICE_ACCOUNT_EMAIL` and `private_key` into
   `GOOGLE_PRIVATE_KEY` in your `.env` (keep the `\n` escapes literal — the
   app converts them to real newlines at startup).

### 3. Create the Google Sheet

Create a new Google Sheet with **three tabs**, named exactly:

- `sets` — header row: `session_id, date, exercise, implement, set_index, weight_lb, reps, rpe, note`
- `sessions` — header row: `session_id, date, block_id, week, dow, type, name, status, sleep, soreness, joint_flag, note, rpe, avg_hr, distance_mi`
  (the last three columns extend SPEC.md's base list — RPE/HR/distance need
  somewhere to live for non-lift sessions and the brief's mileage/HR checks)
- `body` — header row: `date, bodyweight_lb, waist_in, chest_in, arm_in, thigh_in`

**Share the sheet with your service account's email** (Editor access), then
copy its spreadsheet ID (from the URL, between `/d/` and `/edit`) into
`GOOGLE_SHEETS_ID`.

### 4. Create the Google Drive folder

Create a folder in Drive for this app's data, **share it with the service
account's email** (Editor access), and copy its folder ID (from the URL,
after `/folders/`) into `GOOGLE_DRIVE_FOLDER_ID`. The app writes two kinds of
file into it: `config.json` (equipment/plate inventory) and
`block-<id>.json` (one per training block).

### 5. Run it

```bash
npm run dev
```

Open http://localhost:3000, go to **Setup**, fill in your plate inventory
and equipment, then paste in a block JSON (see
`data/block-01-strength-base.json` for a real example, and `SPEC.md` for the
schema) to import and activate it.

### 6. Run the tests

```bash
npm test
```

All of the domain logic — plate math, progression rules, e1RM, RPE drift,
the constraint validator, the brief generator — is pure and unit-tested in
`src/lib/`. The trap-bar plate-math test (`src/lib/plates.test.ts`) is the
one called out in `CLAUDE.md` as the first thing to get right: 225 lb on the
58 lb trap bar resolves to 225.5, and to 224 on the 74 lb bar — never
rounded to a clean 225.

## Deploying to Vercel

This is a stock Next.js App Router project — connect the repo in Vercel and
it deploys with zero extra config. Add the same four env vars
(`GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_PRIVATE_KEY`, `GOOGLE_SHEETS_ID`,
`GOOGLE_DRIVE_FOLDER_ID`) in the Vercel project settings. Keep the URL
unlisted (don't link it anywhere public) since there's no auth.

## Project layout

```
src/
  app/
    today/ week/ history/ body/ setup/    — the five screens
    api/                                   — route handlers (server-only Google calls)
  components/                              — client UI pieces
  lib/                                      — pure domain logic (isomorphic, unit-tested)
    server/                                — server-only Sheets/Drive/auth wrappers
data/block-01-strength-base.json           — a real block for reference/import
scripts/gen_block1.py                      — the script used to author that sample block
                                              (dev reference only — this app never
                                              generates plans itself; blocks are
                                              authored elsewhere and pasted in)
```

## Out of scope for v1

Per `SPEC.md`: weather-driven auto-rescheduling, embedded Anthropic API calls
for in-app coaching, a plan editor UI, multi-user/accounts/sharing, and
anything that duplicates what a running watch already does (pace, GPS,
splits — this app only ever logs a completed/partial/skipped toggle, RPE,
and note for runs).
