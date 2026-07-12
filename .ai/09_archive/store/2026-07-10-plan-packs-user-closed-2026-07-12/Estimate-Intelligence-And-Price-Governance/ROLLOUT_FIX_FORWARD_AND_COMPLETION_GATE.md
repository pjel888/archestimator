# Rollout, Fix-Forward, And Completion Gate

## Release Boundary

This artifact is the independent rollout/final-check surface for `OPS-001`,
`AC-014`, `GATE-005`, and UNIT-008. Local implementation can complete without a
hosted D1 mutation or deploy. It cannot set production/provider release ready.

## Staged Adoption

| Stage | Scope | Go evidence | No-go/fix-forward |
|---|---|---|---|
| 0 - Compatibility dark path | Nullable schema, policy table, origin/facts, pure engine, repository tests; UI unchanged | Local clean apply/replay, legacy-null behavior, policy fallback/parity | Disable consumption; retain additive schema; fix migration/evaluator forward |
| 1 - Internal cockpit | Server-side bounded route enablement using an existing flag or temporary route constant | Existing totals/charts green, auth/query/payload/perf budgets pass | Disable cockpit read; preserve compatible writes and current UI |
| 2 - Beta cohort | Health and drill-through; revision visibly unavailable when facts are incomplete | Fixture false-positive/negative review, a11y, support recovery, redacted signals | Narrow rules/visibility; never fabricate revision or log customer facts |
| 3 - Default/release evaluation | Remove temporary branch after fresh local proof; use repository release process separately | Fresh deployed/provider evidence outside this pack | Keep release non-ready; no local inference |

If policy reclassification is unsafe, pin reads to the 90/180 fallback while
retaining policy rows for repair. Additive columns/tables are fixed forward, not
destructively removed during an incident. Revision-fact writes remain atomic;
invalid/incomplete historical ranges stay unavailable.

## Cross-Pack Receipts

- Migration work consumes the current five-owner Program generation receipt.
- Revision integration consumes a current Activity contract receipt/lease before
  shared edits.
- Final UNIT-008 emits `ACT-RECEIPT-ESTIMATE-HEALTH-v1` only after the Activation
  producer contract freezes and the authoritative `health_reviewed` path, tests,
  same-transaction outbox behavior, safe logging, and unavailable semantics pass.
- Missing/stale/mismatched receipt yields `not_available`; plan readiness cannot
  fabricate producer evidence.

## Final Audit Matrix

The independent verifier records evidence-backed `PASS|FAIL|BOUNDARY|N/A` for:

1. Every `BETA-P1-01/02/03/08` requirement and linked criterion/test/gate.
2. `BETA-P1-10-ESTIMATE-RECEIPT-v1` records the required caller map,
   pre-change characterization, bounded extract-or-retain decision, exact changed
   files/hashes, focused and regression tests, and independent verifier result;
   it is limited to touched analytics and leaves output-parity and Publisher
   identity/funnel outside the diff.
3. Existing provenance/source/date/confidence/history behavior is preserved;
   producer origin is durable before fallback and legacy null remains missing.
4. One evaluator owns health/freshness/grade; no stray 90/180 rule constant or UI
   formula survives outside compatibility/config tests.
5. Project fields and policies are nullable/typed/validated/authorized, migration
   lease/order/constraints/apply/replay/fix-forward are proven.
6. Repository DTO/query/cache contracts expose only authorized bounded facts;
   every KPI/risk has exact drill-through or explicit no-action rationale.
7. Empty, healthy, warning, error, mixed, truncated, unavailable, stale, and
   unauthorized states are distinct and accessible.
8. Revision facts are complete/atomic, deltas reconcile or expose explicit
   residual/unavailable, and no named-version/restore surface was introduced.
9. Query, payload, render, pure evaluation, 50k truncation, structured error, and
   redaction budgets/gates pass on fresh fixtures.
10. Existing project-data/chart/library regressions, type, lint, error handling,
    local migration, Cloudflare build, diff, and plan validation checks pass.
11. All Program/Activity/Activation receipts are current and no shared-file edit
    lacks its lease/integration proof.
12. No temp D1, fixture row, server, browser, scratch report, lease, or raw
    customer-like evidence remains after sanitized digest capture.
13. Manifest/evidence hashes and statuses reflect actual receipts; `next_unit`
    clears only after all units are `VERIFIED`.

Any `FAIL` reopens the earliest causal unit and invalidates downstream evidence.
A missing hosted/provider claim is a release boundary, not a local PASS.

## Resume And Handback

Resume from manifest `next_unit`, then load only its packet and implicated risk
artifact. Completion handback includes source/diff/manifest hashes, Program and
cross-pack receipts, commands/exits, criteria/gate status, proof digests,
resource cleanup, remaining release boundaries, and the next safe action. The
stop condition is verified local behavior with no unresolved P0/P1, not artifact
creation or validator success alone.
