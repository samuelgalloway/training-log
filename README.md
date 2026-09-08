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
- Google Sheets for logged data (`sets`, `sessions`, `body` tabs) and Google
  Drive for the equipment/plate-inventory config and one JSON file per
  training block (active + archived, never overwritten wholesale) — both via
  OAuth with a single narrow scope (`drive.file`), not a service account. See
  **Why OAuth, not a service account** below.
- No auth — this is meant to run at an unlisted URL for one person.

## Setup

### 1. Install and configure

```bash
npm install
cp .env.example .env
```

### 2. Create an OAuth client

1. In [Google Cloud Console](https://console.cloud.google.com/), create (or
   pick) a project, then enable the **Google Sheets API** and **Google Drive
   API** (APIs & Services → Library).
2. APIs & Services → **OAuth consent screen**: User type **External**, add
   your own Google account as a test user, then click **Publish app**. This
   step matters — an app left in "Testing" status gets refresh tokens that
   silently expire after 7 days, which would break syncing a week after you
   set it up. Publishing doesn't require Google's verification review here:
   verification is only required for sensitive scopes at 100+ users, and
   this app has one narrow scope and one user.
3. APIs & Services → **Credentials** → Create Credentials → **OAuth client
   ID** → Application type **Desktop app**. Copy the Client ID and Client
   Secret into `.env` as `GOOGLE_OAUTH_CLIENT_ID` / `GOOGLE_OAUTH_CLIENT_SECRET`.

### 3. Run the setup script — **from your own machine**, not a remote shell

```bash
npm run setup:google
```

This needs to open a real browser, so it won't work from a cloud/remote
session — run it locally. It:

1. Prints a Google authorization URL. Open it, sign in, and click through
   the **"Google hasn't verified this app"** warning (Advanced → Go to
   Training Log (unsafe)) — expected for a personal app that was never
   submitted for Google's verification process, which isn't needed for a
   single-user tool with a narrow scope.
2. Mints a refresh token.
3. Creates the Drive folder and Google Sheet (with its three tabs and header
   rows) itself, under your own Google account.
4. Prints `GOOGLE_OAUTH_REFRESH_TOKEN`, `GOOGLE_DRIVE_FOLDER_ID`, and
   `GOOGLE_SHEETS_ID` — paste all three into `.env`.

There's no "share this with a service account" step, because there's no
separate identity to share with — the app only has access to the two files
it just created for itself (that's what the `drive.file` OAuth scope means:
per-file access, granted only to files the app creates or opens). If you
ever want to cut off access entirely, revoke it at
[myaccount.google.com/permissions](https://myaccount.google.com/permissions)
and re-run this script to get a fresh token.

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
it deploys with zero extra config. Add the same env vars from your `.env`
(`GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET`,
`GOOGLE_OAUTH_REFRESH_TOKEN`, `GOOGLE_DRIVE_FOLDER_ID`, `GOOGLE_SHEETS_ID`)
in the Vercel project settings. Keep the URL unlisted (don't link it
anywhere public) since there's no auth.

## Why OAuth, not a service account

A service account would also work here, but it needs a separate identity
that you then manually share your Sheet and Drive folder with — an extra
step, and a static key that never expires on its own. OAuth with the
`drive.file` scope instead means: run the setup script once, and the app can
only ever see the two files it created for itself — nothing else in your
Drive, ever, structurally, not by configuration. It's also easier to revoke
(one click at myaccount.google.com/permissions) and the refresh token isn't
a bearer credential that grants broad account access if it ever leaked — it
only reaches those two app-created files.

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
scripts/
  setup-google-oauth.mjs                   — one-time OAuth + Drive/Sheets bootstrap (see Setup above)
  gen_block1.py                            — the script used to author the sample block
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
