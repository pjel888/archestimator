# File Upload Audit And Improvement Plan

Planning package for making Archestimator uploads production-grade.

## Read In Order

1. `01_EXECUTIVE_SUMMARY.md`
2. `03_SOURCE_AND_CODEBASE_AUDIT.md`
3. `04_REQUIREMENTS_SPECIFICATION.md`
4. `06_ARCHITECTURE_AND_TECHNICAL_DESIGN.md`
5. `08_SECURITY_PRIVACY_THREAT_MODEL.md`
6. `11_IMPLEMENTATION_PLAN.md`
7. `12_TEST_AND_VALIDATION_STRATEGY.md`
8. `18_PLAN_AUDIT_SCORECARD.md`

## Primary Recommendation

Move all uploads behind a central upload broker with server-owned upload sessions, provider-neutral asset records, private-by-default storage, explicit authz before service-role writes, attachment scan/quarantine, audited downloads, durable cleanup, and shared upload UX states.

## Readiness Cutline

This package is ready as a planning handoff for Phase 0 safety hardening and staged implementation. It does not claim current upload production readiness. Closed-beta readiness, production readiness, and long-term upload-platform completion are separate gates in `02_FEATURE_BRIEF_AND_SCOPE.md` and `17_FINAL_READINESS_REVIEW.md`.

## Current High-Risk Findings

- Project image route must explicitly enforce edit authority before service-role storage writes.
- Direct storage policies can bypass route-level validation and attachment scanning.
- Attachments are not scanned or quarantined before future approval/download.
- Component images default to private/proxied in the target design unless a written product/security exception keeps a public derivative.
- Estimate-sheet inline project-component image uploads reuse the component image route, then persist the returned URL into row snapshot data; this must be treated as a current upload surface, not only a library-form detail.
- Component attachment metadata can reference arbitrary provider paths.
- Upload UX lacks unified cancel/retry/progress/finality semantics.
- Storage-denial and malicious upload tests are not production-complete.
- Upload-domain table RLS/grants, quotas, concurrent-upload caps, and scanner backpressure must be implemented before production rollout.

## Scope Reminder

This package is planning-only. It intentionally does not edit application source, tests, migrations, provider settings, or infrastructure.

For the required document inventory, initial/final scorecards, before/after comparison, and sub-100 score rationale, read `18_PLAN_AUDIT_SCORECARD.md`.
