# UNIT-012 · First-session guided-sample CTA + `seed.json` delete

- **Requirement:** REQ-013
- **Priority:** P1 · **Effort:** S · **Risk:** LOW · **Status:** PLANNED
- **Depends on:** —
- **Evidence:** EVID-012
- **Decision:** `DEC-AUTO-003` (default to guided sample; do not auto-seed),
  `DEC-AUTO-004` (delete `seed.json`).

## Goal

A first-time user landing on an empty workspace sees a clear primary CTA
"Start with a guided sample" that runs `startGuidedSample()`. The dead
`data/local/seed.json` is removed.

## Source evidence (commit `a41a07d01`)

- `src/app/workshop/page.tsx:119-145` — workshop home renders
  `<WorkshopDashboard>` inside `<WorkshopHomebaseClient>`. **No first-run
  branching**; always the dashboard shell.
- `src/components/workshop/projects-page-client.tsx:3282-3291` —
  `startGuidedSample` exists and works; buried under `FirstProjectZeroState`
  on `/workshop/projects`, one nav hop away from `/workshop`.
- `src/lib/onboarding/activation-actions.ts:85-146` — `startGuidedSample()`
  lazily creates project/estimate/area/row on demand.
- `data/local/seed.json` exists on disk (tracked); negative grep confirms
  **nothing in `src/` imports it** (dead weight from pre-D1 local-storage
  era).

## Implementation

- Add a first-run hero card on `/workshop` (or the dashboard) for users with
  zero projects that links to `startGuidedSample()`. Pass through the
  existing activation context so reaching `first_valid_total` advances the
  checklist (UNIT-003).
- Delete `data/local/seed.json` and `data/local/README.md` (if it only
  describes the seed).

## Acceptance evidence

- New-user session in dev shows the CTA.
- Clicking the CTA creates the sample project/estimate/area/row.
- `data/local/seed.json` no longer exists; no source path imports it.

## Test decision

`test_requirement: NOT_REQUIRED`. Source-diff + scoped new-user click proves
correctness.

## Recovery

The hero card is reversible by removing the import. `seed.json` deletion is
recoverable from git history if a future workspace-template option wants to
revive it.

## Completion signal

`% users completing guided sample` becomes a measurable activation signal;
`grep -r 'data/local/seed' src/` returns zero matches.
