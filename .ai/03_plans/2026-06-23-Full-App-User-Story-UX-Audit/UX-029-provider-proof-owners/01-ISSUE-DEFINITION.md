# 01 — Issue Definition

Date: 2026-06-23

## Problem Statement

Monitoring, live alert and drain, email delivery, legal and DSAR, and provider readiness cannot be proven from local tests. The codebase contains launch scripts that check provider state, but the results are not collected into owner-assigned artifacts, and there is no canonical matrix that records which providers have been proven, by whom, when, and with what evidence. This creates a launch-readiness gap: a beta operator cannot distinguish between "local tests pass" and "hosted provider behavior is verified."

## Evidence

The evidence for this gap comes from the test coverage and error map audit (`test-coverage-and-error-map.md`). The audit found that:

- Local Vitest and Bun tests cover route handlers, components, and server actions.
- Playwright E2E covers joined journeys but requires hosted Supabase and service-role keys.
- Provider-specific behavior (email inbox delivery, Supabase linked project health, Vercel env parity, monitoring alert routing, legal owner sign-off, Maps quota and billing) is not exercised by any automated test in the repo.
- The `launch:*` scripts exist and are bound in `package.json`, but their outputs are ephemeral console logs, not durable artifacts.

## Current Error

The current error is not a code bug. It is an operational blindness. The operator running a launch readiness check sees console output that disappears. There is no:

- Owner assigned per provider.
- Artifact path where output is stored.
- Timestamp recording when the check was last run.
- Pass/fail/blocked status that persists.
- Escalation path when a provider check fails.

## Best Fix

Keep a provider proof checklist for Resend, Supabase, Vercel, monitoring, legal, support, and Maps before wider launch. The checklist must be:

- Owner-assigned (one named person or role per provider).
- Script-mapped (every provider has a matching `bun run launch:*` script or documented manual step).
- Artifact-generating (every run produces a JSON or markdown file in a known directory).
- Status-tracked (the canonical spreadsheet or equivalent records pass/fail/blocked).

## Post-Fix Scenario

A beta operator opens the provider proof matrix and sees:

- Resend: owned by the Email Delivery Owner; last run 2026-06-23; artifact `provider-proof/resend-2026-06-23.json`; status PASS.
- Supabase linked readiness: owned by the Database Owner; last run 2026-06-23; artifact `provider-proof/supabase-linked-2026-06-23.json`; status PASS.
- Vercel production: owned by the Infrastructure Owner; last run 2026-06-23; artifact `provider-proof/vercel-production-2026-06-23.json`; status PASS.
- Monitoring: owned by the Incident Commander; last run 2026-06-23; artifact `provider-proof/monitoring-2026-06-23.json`; status BLOCKED (alert channel not configured).
- Legal owner: owned by the Product Owner; last run 2026-06-23; artifact `provider-proof/legal-owner-2026-06-23.json`; status PASS.
- Maps: owned by the Maps Owner; last run 2026-06-23; artifact `provider-proof/maps-2026-06-23.json`; status FAIL (quota exceeded; fallback confirmed).

The operator knows which providers are safe to claim, which are blocked pending configuration, and which have known failures with fallback paths documented.

## Affected Systems

- Provider proof runbook (`06-verification-matrix-and-proof-runbook.md`)
- Provider boundary register (`05-security-data-and-provider-blast-radius.md`)
- `TV-OPS-SUPPORT` verification gate
- `canonical-feature-status.csv` status rows for operational readiness

## Related Issues

- `UX-038` — Operations personas split (same conflict group, same IU-19)
- `UX-028` — QA route manifest (operations conflict group)
- `UX-039` — Notification campaign authoring (operations conflict group)
- `UX-040` — Admin repair workflow (support boundary)

## Risk If Not Fixed

- Launch proceeds with unverified provider claims.
- Email delivery fails silently because DNS or webhook verification was skipped.
- Supabase migration drift goes undetected because linked readiness was not checked.
- Legal or DSAR exposure because terms/privacy owner review was not recorded.
- Monitoring gaps because alert ownership was never assigned.
- Operator cannot distinguish "I ran the script" from "the provider is healthy."
- Provider failures are discovered by users rather than by proactive checks.
- Rollback decisions are delayed because no one owns the provider health signal.
- Compliance audits fail because proof of provider review is missing.
- Team churn causes provider knowledge to be lost because ownership was never documented.

## Post-Fix Scenario (the win)

A beta operator opens the provider proof matrix and sees:

- Resend: owned by the Email Delivery Owner; last run 2026-06-23; artifact `provider-proof/resend-2026-06-23.json`; status PASS.
- Supabase linked readiness: owned by the Database Owner; last run 2026-06-23; artifact `provider-proof/supabase-linked-2026-06-23.json`; status PASS.
- Vercel production: owned by the Infrastructure Owner; last run 2026-06-23; artifact `provider-proof/vercel-production-2026-06-23.json`; status PASS.
- Monitoring: owned by the Incident Commander; last run 2026-06-23; artifact `provider-proof/monitoring-2026-06-23.json`; status BLOCKED (alert channel not configured).
- Legal owner: owned by the Product Owner; last run 2026-06-23; artifact `provider-proof/legal-owner-2026-06-23.json`; status PASS.
- Maps: owned by the Maps Owner; last run 2026-06-23; artifact `provider-proof/maps-2026-06-23.json`; status FAIL (quota exceeded; fallback confirmed).

The operator knows which providers are safe to claim, which are blocked pending configuration, and which have known failures with fallback paths documented.

## Notes

- This issue is documentation-only; no `src/` or `scripts/` code changes are required.
- The fix is structural: define owners, assign scripts, and document artifacts.
- Owner confirmation of provider assignments is required before beta widening.
- The artifact schema must be consistent across all provider checks.
- The canonical CSV must be updated to reference the provider proof artifacts.

## Exit Criteria

This issue is resolved when every provider in the matrix has an assigned owner, a generated artifact, and a recorded status.
