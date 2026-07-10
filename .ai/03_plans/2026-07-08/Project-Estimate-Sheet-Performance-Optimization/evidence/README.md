# Evidence Index

Planning evidence:

- `2026-07-10-frontier-plan-readiness.md`: source/research/audit/validator evidence plus the open independent-review gate for the future `IMPLEMENTATION_READY` plan claim.
- `EVID-001` in `plan-pack.json` proves the positive planning checks already completed; it deliberately excludes `AC-012`, `TEST-007`, `GATE-VERIFY-001`, and `GATE-CLEAN-001` until the frozen independent reviews are clean.
- `EVID-012` points to `LOOP_LEDGER.md` and records the current failed/provisional disposition of those four review-readiness claims. The final atomic readiness transition moves their current proof links to the refreshed planning receipt; history remains in the append-only ledger.

Canonical runtime evidence is created later under `evidence/runtime/` by `UNIT-001` through `UNIT-011`:

1. `fixture-manifest.json`
2. `jsdom-baseline.json`
3. `browser-baseline.json`
4. `d1-local-baseline.json`
5. `bottleneck-decision.json`
6. `unit-005-route-d1.json`
7. `unit-006-graph.json`
8. `unit-007-derived-state.json`
9. `unit-008-render-a11y.json`
10. `unit-009-mutations.json`
11. `integrated-local-proof.json`
12. `hosted-d1-proof.json`
13. `release-evaluation.md`
14. `evidence-index.json`

Runtime files do not exist during this planning-only revision. Their absence means implementation is `NOT_STARTED`, not that the plan is unready.

Every runtime JSON uses the `estimate-sheet-performance-report.v1` contract, records source/input fingerprints, labels its evidence class (`jsdom`, `local-browser`, `local-d1`, or `hosted-d1`), and redacts credentials and sensitive identifiers.
