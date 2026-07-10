# Test And Adversarial QA

This supporting QA plan expands `TEST-001..008` and the applicability gates.
Stable test and gate records remain mapped to
`VERIFICATION_ROLLOUT_AND_FINAL_AUDIT.md`.

## Proof-First Strategy

Before each behavior edit, run the nearest current characterization test or add a
red test that fails for the exact missing contract. Data/security units use temp
D1 fixtures and deterministic clocks; UI units use DOM characterization before
the bounded component split. A maker does not write the final verifier receipt.

| Area | Happy proof | Adversarial proof | Cleanup/isolation |
|---|---|---|---|
| D1 ledger/outbox | Mutation plus intent yields one event/max stage | Direct-SQL chain mismatch, replay, cross-tenant nonce, crash, lease expiry, concurrent workers, dead/repair | Temp D1; deterministic clock/IDs; no default dev log |
| Retention/privacy | Due rows purge/export/erase exactly | TTL edges, active/expired hold, partial erase injection, consent withdrawal | Temp D1 snapshot restored or discarded |
| Zero-state UI | Creator sees three paths | Search/status regression, viewer, loading, pending, error, 320px/200% | DOM cleanup and stable fixture |
| Path orchestration | Sample/template/blank persist | Duplicate submit, missing/deleted/cross-workspace template, downstream failure, cleanup replay | Run-scoped project IDs; delete only owned partial state |
| Checklist | Facts derive completion and reopen | Click-only, late/out-of-order event, deleted project, unavailable receipt, refresh/relogin | Reset component/query fixture only |
| Producer contract | Every vocabulary/resource rule validates | Unknown/regressive stage, forged IDs, unsafe metadata/log, non-transactional/stale receipt | Immutable in-memory fixtures |
| Cohort | Bounded privacy DTO and stable pages | Non-admin, invalid cursor/filter, limit 101, empty D1, 10k plan drift | Temp D1 and injected clock |
| Rollout/support | Exact threshold/support states | Boundary timestamps, no events, partial setup, all support states | No automated outreach or Admin UI mutation |

## Evidence Procedure

Run targeted test files in the order recorded by
`VERIFICATION_ROLLOUT_AND_FINAL_AUDIT.md`, then type-check, lint,
`validate:error-handling`, pack validation, and scoped `git diff --check`.
Each receipt records command, producer version, commit/baseline, environment,
migration set, fixture/clock size, exit/result, artifact digest, redaction, and
collection time.

## Browser-Only Claim

One routed case proves zero state -> guided sample -> persisted estimate ->
refresh -> checklist reopen plus focus/reflow at 320px. DOM and repository tests
prove the remaining non-browser-only states. Planning artifacts cannot satisfy
the routed browser claim.

## Adversarial Final Check

The independent checker rejects orphan IDs, stale source or evidence, a READY
slice missing a transitive dependency, any completion inferred from planned
proof, a migration without a current Program lease, raw diagnostic secrets,
cross-pack receipt mismatches, or release/status inflation. Failure returns to
the owning canonical unit and produces a later ledger entry; it is not waived.
