# UNIT-011 · Beta agreement + ops runbook

- **Requirement:** REQ-010, REQ-014
- **Priority:** P0 · **Effort:** S · **Risk:** LOW · **Status:** PLANNED
- **Depends on:** UNIT-004 (runbook cross-links restore)
- **Evidence:** EVID-011

## Goal

Every invited design partner receives a one-page beta agreement covering
data backup expectation, support SLA, feedback cadence, founder-member offer
terms placeholder. The beta operations workflow is documented in a single
runbook.

## Source evidence (commit `a41a07d01`)

- `src/lib/legal/terms-gate.ts:1-26` — Terms clickwrap is the only pre-access
  acceptance. No standalone beta agreement, expectations doc, or risk
  disclosure.
- `src/components/auth/ClosedBetaGate.tsx:37-39` — request-access copy is one
  line.
- No founder-ops runbook exists. `src/app/admin/README.md:29-34` describes
  flag-based rollback only.

## Implementation

- `.ai/06_specs/design-partner-agreement.md` (new) — one-page agreement:
  data backup expectation (user keeps spreadsheet), support SLA (none /
  best-effort), feedback expectation (weekly 15-min), founder-member offer
  terms (placeholder pending FD-06).
- Email template the founder sends on invite; optionally an in-product
  acceptance step.
- `.ai/00_system/BETA_OPS_RUNBOOK.md` (new) — grant access, suspend/reactivate,
  announce, pause cohort (criteria in `03-…md` §E), weekly review cadence,
  incident triage, restore (cross-link to BACKUP_AND_RESTORE_RUNBOOK.md from
  UNIT-004).
- Cite the runbook from `src/app/admin/README.md`.

## Acceptance evidence

- First design partner acknowledges the agreement before access.
- Runbook exists and is linked from `/admin/README.md`.
- Pause criteria are unambiguous and actionable.

## Test decision

`test_requirement: NOT_REQUIRED`. Documentation.

## Recovery

Documentation is reversible by editing. The beta agreement copy evolves
with the cohort.

## Completion signal

Runbook + agreement exist; first invited partner acknowledges agreement;
onboarding minutes per user ≤30.
