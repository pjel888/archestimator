# Verification, Rollout, And Final Audit

## Applicability gates

| Gate | Why it applies | Required proof before completion |
|---|---|---|
| `GATE-UX-001` | zero state, path chooser, checklist, support/recovery | DOM state matrix plus routed focus/reflow proof |
| `GATE-NEXT-01` | Server Components, client islands, Server Actions, revalidation | installed-doc decisions, serializable props, action authz, read-your-own-writes |
| `GATE-CONTRACT-001` | milestone and cohort DTO contracts | runtime validation, consumer/provider tests, compatibility packet |
| `GATE-DATA-001` | additive D1 schema/query/lifecycle | migration tests, constraints/index/query-plan, export/erase, fix-forward |
| `GATE-SEC-001` | auth, roles, tenant/admin/privacy | actor matrix and direct deny/replay tests |
| `GATE-VERIFY-001` | multi-path async behavior/failure semantics | red-first tests, partial/retry/idempotency/concurrency/recovery |
| `GATE-PERF-001` | cohort cardinality and projects page load | 10k query plan; zero-state-only template seed; no N+1 |
| `GATE-OPS-001` | cohort/support handoff and rollout | safe logs, query contract, rollout/rollback, proof surfaces |
| `GATE-CLEAN-01` | giant Projects client receives new behavior | characterization, extracted islands, no unrelated refactor |

## Test matrix

| Test | Claim | Fixtures and failure signal | Expected pass signal |
|---|---|---|---|
| `TEST-001` migration/repository | composite tenant FKs on progress/events, tenant-scoped server-derived dedupe, monotonic progress, privacy lifecycle | duplicate/out-of-order/concurrent/erase, direct SQL membership/project/estimate mismatch on each table, same nonce across tenants; unauthorized row or cross-tenant suppression is failure | every mismatch is denied, one same-tenant event is deduped, cross-tenant events remain independent, max stage and export/erase complete |
| `TEST-002` zero state DOM | true zero and all UI/access states | All/search/status/viewer/pending/error/320px | three eligible choices; existing empties unchanged; viewer denied |
| `TEST-003` path actions | persisted sample/template/blank and recovery | replay, missing/cross-workspace template, downstream failure | one project/estimate, visible sample, resumable partial state |
| `TEST-004` checklist | authoritative derivation and reopen | click-only, late event, reload, deleted project, unavailable integration | state persists; no fabricated completion; deep links valid |
| `TEST-005` auth/privacy | action and cohort denial matrix | unauth, viewer, forged IDs, recipient token, non-admin | denial before unauthorized read/write; shaped safe errors |
| `TEST-006` producer contract | complete vocabulary and external compatibility | unknown source/stage, replay, late events, safe-log snapshot | all valid fixtures accepted idempotently; invalid rejected |
| `TEST-007` cohort performance/privacy | bounded query and DTO | 10k users, cursor edges, limit 101, query plan, DTO snapshot | index use, <=100 rows, stable pages, no sensitive fields |
| `TEST-008` abandonment/support/rollout | deterministic stopped stage and recovery | injected clocks, no events, partial setup, all support states | exact boundary classification and actionable recovery |

## Command sequence

Run smallest proof first and stop on the first unexplained failure:

```bash
bun test tests/vitest/beta-activation-migration.test.ts \
  tests/vitest/beta-activation-repository.test.ts

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
- operator/policy: consumer acceptance in Beta Operating pack;
- external owner: Estimate/Publisher contract handoff receipts.

Invalidate on source/config/dependency/migration/fixture/contract hash change,
provider binding change, consumer pack manifest change, threshold/policy change,
or expired validity window. Do not refresh hashes over stale proof.

## Rollout

1. Apply additive migration in local/test and validate privacy lifecycle.
2. Ship repository/actions dark: readers tolerate no progress row; event failures
   do not block successful domain mutations and are retryable/observable.
3. Enable true zero state and paths for an internal seeded account; verify
   sample label, partial recovery, and reload.
4. Enable checklist for the limited Beta cohort; preserve dismiss/reopen and
   fallback to ordinary editing.
5. Enable admin query consumption only after `Beta-Operating-Contract` verifies
   admin gating, DTO semantics, and policy/retention scope.
6. Add external health/Publisher producers after their owner pack freezes and
   passes contract tests.
7. Release Integrity runs the complete staging golden path and cross-browser
   matrix before external-Beta go.

## Rollback/fix-forward

Triggers: authz/privacy breach, duplicate projects, mislabeled sample, progress
regression, checklist blocking editing, material project-page regression,
cohort query leak/timeout, or misleading stalled state.

- Disable UI/readers/producers at their bounded integration seam; ordinary
  project creation/editing remains available.
- Preserve additive D1 tables and fix forward; do not drop user progress during
  incident response.
- Stop cohort consumption and outreach if query semantics are suspect.
- Reconcile duplicate/partial projects with the idempotency/setup ledger and an
  authorized cleanup action; never silently delete user-edited data.
- Mark downstream evidence stale and resume at the earliest owning unit.

## Final audit checklist

- all eight requirements have passing acceptance evidence;
- all seven units are verified with distinct checker review;
- current program-issued migration sequence, both-table composite tenant FKs,
  and privacy export/erase are proven;
- every actor/deny/replay/partial/recovery case is covered;
- existing search/status/project creation behaviors remain green;
- sample is persisted, positive-value, editable, and visibly labeled;
- checklist completion is authoritative, nonblocking, and reopenable;
- cohort DTO is bounded, paginated, indexed, admin-only, and privacy-minimized;
- external producer packets are accepted without overlapping file ownership;
- no raw token/email/IP/UA/free text/log secret or machine-local artifact is committed;
- release status is not promoted from local evidence.

## Cleanup and closeout

Delete temporary D1 fixtures, Playwright storage state, screenshots/traces not
retained by the evidence policy, and temp logger files. Release file/migration
leases, update current project truth if implementation changes reality, append
final receipts to the ledger, refresh artifact/self hashes through the lead, and
archive only after verified completion and umbrella acceptance.
