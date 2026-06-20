# Shared Link Feature Audit + Upgrade Index

Date: 2026-06-20

## Current Status

This folder is the working audit and implementation ledger for the shared-link/publication upgrade.

Implemented in this pass:
- Restored strict snapshot-version equality for public comment and decision writes.
- Added server-side sanitization/truncation for direct API decision notes.
- Moved `/api/share/[token]` open-event telemetry off the response path with `after()`.
- Moved recipient session-start analytics off the `/session` response path with `after()`.
- Added a `/share/[token]` loading boundary to avoid a blank transition during dynamic token resolution.
- Added a branded 404 state for unavailable shared proposal links.
- Fixed keyboard access for navigable leaf rows in the receiver tree panel.
- Added a visible, non-secret failure state when personalized recipient session setup fails.
- Added print-only full-package output for all shared estimates.
- Hardened recipient session creation with public CSRF and durable rate limiting.
- Rate-limited deferred public open telemetry writes.
- Added manager regression coverage for mutation authorization ordering and rotate/revoke duplicate-submit guards.
- Replaced unsalted public structured-log IP hashes with the existing HMAC-peppered telemetry hash helper.
- Added password-form invalid-state ARIA and explicit comment keyboard-submit behavior.
- Throttled durable rate-limit cleanup so expired-row deletes do not run on every protected attempt.
- Replaced activity `snapshot_json` reads with compact `activity_target_labels_json` metadata populated at publish/republish/rotate time.
- Redacted public activity comment bodies so the receiver activity feed shows comment events without bypassing the recipient-session comment API.
- Capped inline tree row rendering for large receiver trees and kept mobile quantity/unit context visible.
- Capped large Grid Preview row rendering and deferred the full print package until browser print intent.
- Narrowed publish snapshot row-image reads to `source_snapshot->>imageUrl` instead of transferring full row source JSON.
- Returned the canonical inserted comment from public comment POST and reconciled optimistic comments without a full list reload.
- Raised receiver session-banner action hit areas and removed remaining tertiary banner copy.
- Changed recipient invitation sends from strict serial waits to bounded concurrent pipelines with per-recipient result reporting.
- Mounted the public-safe receiver activity feed on `/share/[token]` and cleaned up its muted/notice styling.

Verified:
- Final focused shared-link matrix: `bunx vitest run tests/vitest/project-publication-actions.test.ts tests/vitest/project-publication-header.test.tsx tests/vitest/project-publication-page.test.tsx tests/vitest/project-publication-route.test.ts tests/vitest/share-no-store-invariants.test.ts tests/vitest/share-estimate-tree-panel-a11y.test.tsx tests/vitest/share-estimate-tree-view-performance.test.tsx tests/vitest/share-recipient-session-initializer.test.tsx tests/vitest/project-publication-comments.test.tsx tests/vitest/project-publication-decision.test.tsx tests/vitest/project-publication-public-repository.test.ts tests/vitest/project-publication-activity.test.tsx tests/vitest/project-publication-rotate-resend.test.ts tests/vitest/recipient-email-composer.test.tsx tests/vitest/security-findings-publication-contracts.test.ts --maxWorkers=1`
- Result: 15 files passed, 295 tests passed.
- Focused ESLint passed for the changed shared-link source files.
- `bun run type-check` passed.
- `git diff --check` passed.

Browser/visual QA was intentionally not run in this pass because the changed claims are covered by static/component/route tests and the Codex App guardrail says browser automation is not a default completion gate.

## Audit Reports

- `10_SECURITY_PRIVACY_API_AUDIT.md` - token/password/session/CSRF/rate-limit/public API/privacy.
- `20_RECEIVER_UX_UI_ACCESSIBILITY_AUDIT.md` - public receiver UX, accessibility, mobile, print, state coverage.
- `30_MANAGER_WORKFLOW_AUDIT.md` - manager modal/workflow: create, publish, rotate, revoke, recipients, activity.
- `40_TEST_QA_ULTRAQA_MATRIX.md` - existing test inventory, coverage gaps, adversarial scenario matrix.
- `50_PERFORMANCE_SPEED_AUDIT.md` - hot-path performance, perceived speed, public/manager route costs.
- `60_SPEC_TRACEABILITY_ARCHITECTURE_AUDIT.md` - current architecture vs archived/spec intent.
- `70_CONSOLIDATED_FINDINGS_AND_BACKLOG.md` - cross-lane severity register and recommended next work.
- `80_IMPLEMENTATION_AND_VERIFICATION_LOG.md` - exact fixes, files, tests, and known validation gaps.

## Stop Condition For This Iteration

The iteration is complete when:
- P1 stale-snapshot write correctness is fixed in app routes and migration contract.
- P0/P1 direct API content safety gaps have route-level tests.
- High-confidence performance, security, manager-regression, and receiver UX/a11y improvements are landed.
- The audit folder contains cross-lane findings, upgrade backlog, and verification evidence.
- Remaining open work is explicitly documented as product/migration/large-architecture backlog rather than hidden as completed.
