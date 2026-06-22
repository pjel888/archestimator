# Attachment Download Authz Evidence

- Date/time: 2026-06-22.
- Unit and QA/ADV IDs: U5/security; QA-021; ADV-016.
- Claim: attachment access and cleanup remain workspace-scoped, private, and
  review-aware; draft cleanup cannot remove reviewed or current-approved
  attachments.
- Proof category: local route/static tests and provider schema/grant probes.
- Files under test:
  `src/app/api/component-library/attachments/route.ts`,
  `tests/vitest/component-library-attachment-lifecycle.test.ts`.
- Commands/results:
  attachment lifecycle tests passed as part of the `3`-file governance schema
  slice.
- Provider proof:
  attachment governance columns present; broad write grants `0`; no attachment
  rows existed in provider preflight, so no path values were recorded.
- Residual risk:
  signed download URL issuance was not introduced in this implementation; this
  evidence covers upload/delete cleanup and durable review-state guard.
- Owner lane: attachment/security.
- Evidence privacy check: pass.
