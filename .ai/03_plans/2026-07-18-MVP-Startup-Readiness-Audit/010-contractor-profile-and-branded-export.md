# UNIT-010 · Contractor profile + branded export

- **Requirement:** REQ-011
- **Priority:** P1 · **Effort:** S · **Risk:** LOW · **Status:** PLANNED
- **Depends on:** —
- **Evidence:** EVID-010

## Goal

XLSX export carries the estimator's name, logo/letterhead, default payment
terms, and validity period — not workspace-name placeholders and "To be
confirmed" rows.

## Source evidence (commit `a41a07d01`)

- `src/app/api/projects/[projectId]/estimates/[estimateId]/export/proposal.xlsx/route.ts:240-241`
  — contractor identity is interim workspace name only.
- `src/lib/proposal-export/create-proposal-workbook.ts:588-607` — Commercial
  Terms sheet is placeholder-only: *"Payment Terms — To be confirmed"*,
  *"Validity — Pricing validity to be confirmed"*, *"Warranty — Warranty
  terms to be confirmed"*.
- `create-proposal-workbook.ts:524` — "Estimated duration" hardcoded
  *"To be confirmed"*.
- No contractor profile table exists (negative grep over `migrations/`).

## Implementation

- Migration `00XX_contractor_profiles.sql`:
  `contractor_profiles` table — `workspace_id, legal_name, dba,
  logo_r2_key, letterhead_r2_key, default_payment_terms,
  default_validity_days, default_warranty_terms, updated_at`.
- Workspace settings UI at `src/app/workshop/settings/contractor-profile/`.
- `build-proposal-export-model.ts` and `create-proposal-workbook.ts` read
  the profile and populate the Commercial Terms sheet and letterhead.
- Logo / letterhead stored in `ARCH_UPLOADS_R2` (existing binding).

## Acceptance evidence

- Export from a workspace with a profile carries real terms and letterhead,
  not placeholders.
- Logo renders in the title block.
- Commercial Terms rows are editable in workspace settings.

## Test decision

`test_requirement: NOT_REQUIRED`. Source-diff + scoped export proves
correctness.

## Recovery

A workspace without a profile falls back to current placeholder behavior;
no breaking change. The migration is additive.

## Completion signal

A workspace with a configured contractor profile produces an XLSX with
real letterhead, real payment terms, and the contractor's legal name.
