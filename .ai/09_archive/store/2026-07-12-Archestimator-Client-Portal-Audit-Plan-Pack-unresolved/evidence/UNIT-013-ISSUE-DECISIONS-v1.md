# UNIT-013 — Explicit Issue-Wide Decisions

## Delivered

- Recipient submissions are issue-scoped, hash-bound, idempotent, signed, and policy-gated in `src/lib/client-portal/decision-service.ts`.
- The formal approval capability requires an active designated approver; review/decline use the review capability.
- Receipts name the exact issue, version, total, and currency. Contextual row/chart targets are not accepted by the decision API.
- Managers can append-only void an existing decision with a required reason; original records remain preserved.
- `ClientPortalDecisionSection` submits the manifest issue ID and immutable content hash only.

## Validation

- Focused Client Portal suite passed: 11 files, 32 tests.
- Decision/policy tests cover approver denial, stale hash rejection, exact receipt facts, and issue scope.
- Targeted ESLint and `git diff --check` passed.

## Boundary

- Hosted delivery, legal e-signature, and quorum workflows are out of scope. No hosted or browser proof is claimed.
