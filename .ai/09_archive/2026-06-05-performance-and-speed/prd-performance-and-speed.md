<!-- Docs-only performance PRD. Created 2026-06-05. -->

# Performance and Speed PRD

## Problem

Archestimator’s Vercel Speed Insights score is reported as low. The app must become faster without breaking closed-beta auth, estimating workflows, cost library, share/publication, proposal export, analytics privacy, or existing design-system consistency.

## Users affected

- Public visitors evaluating Archestimator on marketing pages.
- Closed-beta users navigating protected workshop/project/estimate routes.
- Estimators editing large estimate sheets.
- Clients opening public share/proposal links.
- Owners exporting proposal workbooks.

## Goals

1. Capture exact Speed Insights baseline by route/device/metric.
2. Improve the worst measured Core Web Vital route bucket first.
3. Reduce public route LCP/INP costs from fonts/scripts/animation where measured.
4. Reduce protected route TTFB/query cost without weakening auth.
5. Reduce estimate workspace INP/render cost without breaking editing/tree/collaboration behavior.
6. Preserve no-store/security invariants for tokenized share routes.
7. Attach before/after evidence before claiming completion.

## Non-goals

- No code changes in this planning turn.
- No provider/dashboard mutations in this planning turn.
- No speculative database migrations.
- No auth shortcut from `getUser()` to session-only checks in proxy.
- No removal of analytics, visual effects, or UX behavior without measured evidence and owner approval.

## Acceptance criteria

- `01-vercel-speed-insights-and-metrics-intake.md` has numeric baseline values before implementation.
- Each future PR targets one measured bottleneck surface.
- Each future PR includes tests and before/after evidence from `06-test-spec-and-validation-protocol.md`.
- Any CRITICAL blast-radius auth/data/share work has explicit security/risk review.
- Completion language stays `IMPLEMENTED LOCALLY` until production/provider evidence is attached.

## Canonical plan

Use `05-performance-roadmap-and-workstream-plan.md` as the implementation plan and `06-test-spec-and-validation-protocol.md` as the test spec.
