# Verification, Rollout, And Final Audit

This file retains the stable `TEST-*`/`GATE-*` records and evidence index. Review
details are split by risk into `TEST_AND_ADVERSARIAL_QA.md`,
`PERFORMANCE_RELIABILITY_AND_OBSERVABILITY.md`, and
`ROLLOUT_FIX_FORWARD_AND_COMPLETION_GATE.md`; those support review and do not create
competing test IDs or proof.

## Applicability gates

| Gate | Why it applies | Required proof before completion |
|---|---|---|
| `GATE-UX-001` | zero state, path chooser, checklist, support/recovery | DOM state matrix plus routed focus/reflow proof |
| `GATE-NEXT-01` | Server Components, client islands, Server Actions, revalidation | installed-doc decisions, serializable props, action authz, read-your-own-writes |
| `GATE-CONTRACT-001` | milestone and cohort DTO/receipt contracts | runtime validation, provider/consumer fixtures, reciprocal program receipt schemas |
| `GATE-DATA-001` | additive D1 schema/query/outbox/lifecycle | migration tests, constraints/index/query-plan, crash/retry/lease/dead repair, retention/hold/export/erase, fix-forward |
| `GATE-SEC-001` | auth, roles, tenant/admin/privacy | actor matrix and direct deny/replay tests |
| `GATE-VERIFY-001` | multi-path async behavior/failure semantics | red-first tests, partial/retry/idempotency/concurrency/recovery |
| `GATE-PERF-001` | cohort cardinality and projects page load | 10k query plan; zero-state-only template seed; no N+1 |
| `GATE-OPS-001` | cohort/support handoff and rollout | safe logs, query contract, rollout/rollback, proof surfaces |
| `GATE-CLEAN-01` | giant Projects client receives new behavior | characterization, extracted islands, no unrelated refactor |

## Test matrix

| Test | Claim | Fixtures and failure signal | Expected pass signal |
|---|---|---|---|
| `TEST-001` migration/repository/outbox/lifecycle | composite tenant FKs, same-transaction outbox intent, tenant-scoped dedupe, monotonic progress, bounded retry/dead repair, exact retention/consent/hold/privacy lifecycle | duplicate/out-of-order, crash after domain commit or lease claim, expired lease, concurrent workers, attempt-10 dead/repair, each TTL edge, analytics withdrawal, export/erase, active/expired hold, direct SQL chain mismatch, same nonce across tenants | every mismatch is denied; committed intent survives crashes; concurrent retries produce one event/max stage; TTLs execute; withdrawal preserves functional state without provider emission; shaped export and atomic erase pass; active hold records `skipped_legal_hold` |
| `TEST-002` zero state DOM | true zero and all UI/access states | All/search/status/viewer/pending/error/320px | three eligible choices; existing empties unchanged; viewer denied |
| `TEST-003` path actions | persisted sample/template/blank and recovery | replay, missing/cross-workspace template, downstream failure | one project/estimate, visible sample, resumable partial state |
| `TEST-004` checklist | authoritative derivation and reopen | click-only, late event, reload, deleted project, unavailable integration | state persists; no fabricated completion; deep links valid |
| `TEST-005` auth/privacy | action and cohort denial matrix | unauth, viewer, forged IDs, recipient token, non-admin | denial before unauthorized read/write; shaped safe errors |
| `TEST-006` producer/receipt contract | complete `ACTIVATION-PRODUCER-CONTRACT-v1` vocabulary, transactional delivery, and reciprocal external compatibility | unknown source/stage, replay, late events, non-transactional producer receipt, wrong manifest/contract hash, missing unavailable behavior, safe-log snapshot | the producer contract and valid Estimate/Publisher/Beta Operating receipt schemas and fixtures pass locally; invalid/stale receipts reject; receipt absence is reported to program integration rather than blocking local verification |
| `TEST-007` cohort performance/privacy | bounded query and DTO | 10k users, cursor edges, limit 101, query plan, DTO snapshot | index use, <=100 rows, stable pages, no sensitive fields |
| `TEST-008` abandonment/support/rollout | deterministic stopped stage and recovery | injected clocks, no events, partial setup, all support states | exact boundary classification and actionable recovery |

## Command sequence

Run smallest proof first and stop on the first unexplained failure:

```bash
bun test tests/vitest/beta-activation-migration.test.ts \
  tests/vitest/beta-activation-repository.test.ts \
  tests/vitest/beta-activation-outbox.test.ts \
  tests/vitest/beta-activation-retention.test.ts \
  tests/vitest/beta-activation-privacy.test.ts

bun test tests/vitest/first-project-zero-state.test.tsx \
  tests/vitest/activation-path-actions.test.ts \
  tests/vitest/first-estimate-checklist.test.tsx

bun test tests/vitest/activation-event-producer-contract.test.ts \
  tests/vitest/admin-activation-cohort-repository.test.ts \
  tests/vitest/admin-activation-cohort-access.test.ts

bun run type-check
bun run lint
bun run validate:error-handling
bun run validate:plan-pack -- \
  .ai/03_plans/2026-07-10/First-User-Activation-And-Cohort-Operations
git diff --check -- migrations src tests \
  .ai/03_plans/2026-07-10/First-User-Activation-And-Cohort-Operations
```

Run broader `bun run validate` only after targeted checks because this touches
auth/data/shared actions. Run browser proof only for routed persistence,
cross-navigation focus, and responsive composition; static/DOM tests prove all
other UI claims. Use explicit `PLAYWRIGHT_STORAGE_STATE` and `PLAYWRIGHT_PORT`
with a healthy local server if the browser case is run.

## Evidence destinations and freshness

Each receipt records command/test name, producer version, baseline/commit SHA,
exact environment/scope, migration set, fixture/clock size, exit/result, artifact
hash, redaction statement, and timestamp. Evidence classes:

- local: unit/DOM/repository/type/lint/migration proof;
- browser: routed persistence/focus/reflow only;
- hosted/provider: not claimed by this pack;
- operator/policy: Beta Operating emits `ACT-RECEIPT-COHORT-CONSUMER-v1`;
- producer contract: Activation emits `ACTIVATION-PRODUCER-CONTRACT-v1` and its
  deterministic fixtures;
- external owner: Estimate/Publisher emit their versioned producer receipts;
- program integration: `Beta-Readiness-Program` `UNIT-003` validates receipt
  presence/freshness without becoming an Activation implementation prerequisite.

Invalidate on source/config/dependency/migration/fixture/contract hash change,
provider binding change, consumer pack manifest change, threshold/policy change,
or expired validity window. Do not refresh hashes over stale proof.

## Operations And Final Review Index

The staged rollout, bounded disable points, D1 fix-forward rules, final
requirement audit, cleanup, and exact resume packet live in
`ROLLOUT_FIX_FORWARD_AND_COMPLETION_GATE.md`. Security/privacy denials and retention
are independently reviewable in `SECURITY_PRIVACY_RETENTION_AND_ACTOR_MATRIX.md`;
the evaluator and degraded-mode contract live in
`PERFORMANCE_RELIABILITY_AND_OBSERVABILITY.md`.

Closeout still requires every stable test/gate above to have current evidence,
all units to be `VERIFIED`, a distinct checker receipt, no status promotion from
local-only proof, lead-owned hash refresh, and archive only after umbrella
acceptance. Temporary D1/browser/logger resources are removed according to the
supporting cleanup contract.
