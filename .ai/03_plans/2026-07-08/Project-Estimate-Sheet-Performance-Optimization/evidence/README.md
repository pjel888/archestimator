# Evidence Index

Planning evidence:

- `2026-07-10-frontier-plan-readiness.md`: source/research/audit/validator evidence plus the open independent-review gate for the future `IMPLEMENTATION_READY` plan claim.
- `EVID-001` in `plan-pack.json` proves the positive planning checks already completed; it deliberately excludes `AC-012`, `TEST-007`, `GATE-VERIFY-001`, and `GATE-CLEAN-001` until the frozen independent reviews are clean.
- `EVID-012` points to `LOOP_LEDGER.md` and records the current failed/provisional disposition of those four review-readiness claims. The final atomic readiness transition moves their current proof links to the refreshed planning receipt; history remains in the append-only ledger.
- `EVID-002` is reserved for `UNIT-001` fixture/jsdom outputs produced by its exact atomic dual-output command. `EVID-013` is reserved for the independently transitionable `UNIT-004` bottleneck decision. Both contribute to `TEST-002`; neither may claim the other unit.

The following stable runtime inventory is created later by `UNIT-001` through `UNIT-011`: the first 13 are **current evidence projections** and the last is the **current registry**.

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

Runtime files do not exist during this planning-only revision. Producers will write immutable artifacts under `evidence/runtime/runs/<unit>/<run-id>-<application-short>-<input-short>/`; only `perf:estimate:index` may create or replace the 13 evidence projections and the registry above. Every transition also writes an immutable registry snapshot. The registry lists the 13 evidence mappings but not its own hash; its immutable path/hash is external in the journal and committed manifest. Their absence means implementation is `NOT_STARTED`, not that the plan is unready.

Complete measurement JSON uses `estimate-sheet-performance-report.v1` with `jsdom`, `local-browser`, `local-d1`, or `hosted-d1`; incomplete operations use non-indexable `estimate-sheet-performance-attempt.v1`. UNIT-001's fixture uses `estimate-sheet-performance-fixture.v1` plus constructible reciprocal payload/bundle hashes. Conditional test reporters write `estimate-sheet-test-receipt.v1`; fixture-bound receipts require `fixtureMutation:{fixtureRole,namespaceIdSha256,preStateSha256,postStateSha256,declaredMutationSha256,commandId}`. Non-test gates write `estimate-sheet-command-receipt.v1`, and `perf:estimate:modes` writes `estimate-sheet-mode-proof.v1`. UNIT-005/010 use `estimate-sheet-performance-integration.v1`; Units 006-009 use `estimate-sheet-performance-unit-proof.v1`. Local cleanup, hosted recovery, decisions, supersession, release, and index use their named `.v1` schemas. Every envelope child is `{role,schemaId,immutablePath,sha256}` with one run/fingerprint pair; the later index recursively revalidates all dependencies plus cleanup and stores `dependencySources[]`. Cleanup-only never writes canonical hosted proof.

Every schema records application and producer content fingerprints and redacts credentials and sensitive identifiers. The executable `estimate-sheet-source-fingerprint.v2` reference stays at `evidence/source-fingerprint-v1.mjs`: its full HEAD/status/diff record is the pre-edit planning admission receipt; runtime application/producer digests govern measurement comparability. UNIT-001 verifies admission before editing, then ports/tests current reference equivalence. Units 001-004 share a frozen pair; Units 005-009 admit against and record before/after values for both digests, with producer changes confined to activated packet-owned product tests; superseded units change neither scope. Units 010-011 share the final pair.

For a local run, prepare gives each mutating mode/browser/D1 command a distinct ID namespace from one logical checkpoint. Complete children finalize before cleanup and record pre/post state. UNIT-002 uses one explicitly journaled nonblocking all-off baseline preview; activated mode proofs record every closed intermediate process and the sole active final `on|all-activated` preview. Playwright consumes the exclusive active descriptor and never launches an implicit server. Cleanup stops/drains every journaled PID, proves every exit and port closure, deletes every role namespace, proves role/table zero, and writes a redacted receipt. Only uninterrupted `CLEANUP_VERIFIED` authorizes `VERIFIED`; exact-zero response-loss recovery releases an invalidated run but cannot verify it.

From durable `evidence/`, every first-run directory is child-fsynced then parent-fsynced. The transition journal records immutable source hashes, all projection targets, created directories, and `oldProjection:{exists,sha256,bytesBase64}`. Before the manifest commit it restores bytes or unlinks a formerly absent projection and fsyncs the parent; after commit it rebuilds projection records and verifies existing immutable bytes without reconstructing them. It prunes only journal-created empty directories. An unresolved journal blocks every transition except explicit recovery.
