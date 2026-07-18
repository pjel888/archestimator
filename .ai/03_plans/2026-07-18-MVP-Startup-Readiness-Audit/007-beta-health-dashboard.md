# UNIT-007 · Beta-health dashboard card

- **Requirement:** REQ-006
- **Priority:** P0 · **Effort:** S · **Risk:** LOW · **Status:** PLANNED
- **Depends on:** UNIT-001 (leads table), UNIT-002 (events)
- **Evidence:** EVID-007

## Goal

`/admin` shows one card with: leads (count by status), activation funnel
(12-step cohort aggregate), week-1 retained workspaces (filled by UNIT-009),
open feedback (count by severity), open support (count), open incidents
(count). Replaces the placeholder `"Active teams — Repository lane pending"`
metric.

## Source evidence (commit `a41a07d01`)

- `src/app/admin/page.tsx:107` — `"Active teams", value: "—", hint:
  "Repository lane pending"`.
- `src/app/admin/page.tsx:106` — signup metric hint: *"Profile rows in D1;
  canonical auth-signup tracking is F8"*.
- `src/app/admin/page.tsx:197-210` — analytics is three external link-out
  tiles (Cloudflare Web Analytics, Microsoft Clarity, Google Analytics 4).
- The cohort aggregate query already exists:
  `getActivationCohortAggregateForPlatformAdmin`
  (`activation-cohort-repository.ts:126-155`) and `listActivationCohort`
  (`:224-332`).
- The full admin route count is exactly 21
  (`find src/app/admin -name page.tsx | wc -l`), not "~22".

## Implementation

- `src/lib/admin/beta-health-repository.ts` (new) — composed queries:
  `countBetaAccessRequestsByStatus` (UNIT-001 table),
  `countBetaFeedbackBySeverity` (existing `beta_feedback_submissions`),
  `getActivationCohortAggregateForPlatformAdmin` (existing),
  `countOpenSupport`, `countOpenIncidents` (existing patterns).
- Replace the placeholder card on `/admin/page.tsx` with a composed view
  reusing the existing card shape.
- Refresh on page-load; admin-only.

## Acceptance evidence

- Card renders real numbers from D1 on `/admin`.
- Refresh on page-load; no manual query needed.
- Admin-only (existing `isPlatformAdmin` gate).

## Test decision

`test_requirement: NOT_REQUIRED`. Source-diff + scoped admin page load proves
correctness.

## Recovery

The card is additive; revert by restoring the placeholder `"—"` line.

## Completion signal

`/admin` shows real numbers for leads, activation, feedback, support,
incidents in one view. Founder's weekly review is bounded by this card.
