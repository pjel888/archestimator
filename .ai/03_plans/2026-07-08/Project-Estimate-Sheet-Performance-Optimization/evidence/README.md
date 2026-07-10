# Evidence Index

Planning evidence:

- `2026-07-10-frontier-plan-readiness.md`: source/research/audit/validator/reviewer evidence for the `IMPLEMENTATION_READY` plan claim.

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

Runtime files do not exist during this planning-only revision. Their absence means implementation is `NOT_STARTED`, not that the plan is unready.

Every runtime JSON uses the `estimate-sheet-performance-report.v1` contract, records source/input fingerprints, labels its evidence class (`jsdom`, `local-browser`, `local-d1`, or `hosted-d1`), and redacts credentials and sensitive identifiers.
