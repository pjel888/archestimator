# UNIT-003 · Activation UI mount + `health_reviewed` resolve

- **Requirement:** REQ-003, REQ-012
- **Priority:** P0 · **Effort:** S · **Risk:** LOW · **Status:** READY
- **Depends on:** —
- **Evidence:** EVID-003

## Goal

The activation-progress UI is wired (checklist mounted + missing producers
emitted) OR removed; the cohort funnel must not show a permanent gap.

## Source evidence (commit `a41a07d01`)

- `src/app/workshop/onboarding/page.tsx` — entire file is 5 lines:
  `redirect("/workshop/settings")`. Not an onboarding flow.
- `src/app/workshop/getting-started/page.tsx` — also a 5-line redirect to
  `/workshop`.
- `src/components/workshop/FirstEstimateChecklist.tsx` (55 lines) — built,
  has 6 items including "Publish when ready (not_available)", has
  dismiss/reopen handlers. **Zero production consumers.** Grep across
  `src/app/` and `src/components/workshop/` shows it is imported only by its
  own definition and by tests.
- `src/lib/onboarding/activation-types.ts:7` — `health_reviewed` is in the
  12-milestone taxonomy.
- Negative grep for `prepareActivationOutboxIntent({ milestone: "health_reviewed"`
→ zero matches in `src/`. So `health_reviewed` is declared but never emitted.
- `src/lib/admin/activation-cohort-repository.ts:144,146` — cohort aggregate
  counts users whose `last_milestone` reaches `health_reviewed`. The
  permanent funnel hole distorts this aggregate.
- Cross-reference: quality master `CONSISTENCY-008` refutes the old claim that
  the checklist was mounted and reclassifies the entire subsystem as dead code.
  UNIT-003 absorbs that refutation: the *display side* is dead
  AND the *producer side* is dead.

## Implementation

Per `DEC-AUTO-005`:

1. **Resolve `health_reviewed`:** grep for any health-review action call site.
   - If a UI call site exists (e.g. a "Review estimate health" button
     somewhere live): emit `prepareActivationOutboxIntent({ milestone:
     "health_reviewed", …})` there.
   - If no live call site exists: remove `health_reviewed` from
     `ACTIVATION_MILESTONES` (`activation-types.ts:7`) and from
     `activation-producer-contract.ts:26` and from the cohort aggregate
     query (`activation-cohort-repository.ts:144,146`).
2. **Mount `FirstEstimateChecklist`:** add `<FirstEstimateChecklist />` to
   `WorkshopDashboard.tsx` for users whose `last_milestone` is below
   `export_completed`. Pass the existing activation context.
3. **Optionally** redirect `/workshop/onboarding` to `/workshop` (the
   dashboard) rather than to `/workshop/settings`, so any external link to
   onboarding lands somewhere useful.

## Acceptance evidence

- Either `health_reviewed` is wired (producer fires on the action) or it is
  removed (grep returns zero references).
- New-user dashboard renders the checklist.
- Reaching the activation steps advances checklist state.

## Test decision

`test_requirement: NOT_REQUIRED`. Source-diff + scoped manual click proves
correctness.

## Recovery

Removing `health_reviewed` is reversible: re-add the constant and emit on
demand. Mounting the checklist is reversible: remove the import.

## Completion signal

`grep -r 'health_reviewed' src/` returns either (a) ≤1 producer + taxonomy
entry, or (b) zero references. New-user `/workshop` shows the checklist.
