# Legacy Cleanup Loop Ledger

## Package State

| Field | Value |
|---|---|
| Package | `PLAN-2026-07-15-legacy-cleanup` |
| Mode | plan pack / plan-only readiness |
| Package status | `IMPLEMENTATION_READY` |
| Implementation status | `NOT_STARTED` |
| Release status | `BOUNDARY` |
| Plan lifecycle | `ACTIVE` |
| Terminal status | `ACTIVE` |
| Exact next unit | `UNIT-002` |
| Ready slice | `UNIT-001` through `UNIT-010` (dependency-closed) |

## Requirements Traceability

| ID | Role | Requirement | Units | Criteria | Status |
|---|---|---|---|---|---|
| `REQ-001` | Core | Remove production-dead source and obsolete compatibility aliases without changing active behavior. | `UNIT-001` | `AC-001` | Accepted; ready. |
| `REQ-002` | Core | Remove the exact obsolete artifact/tooling/config set while preserving owner assets, disabled workflows, historical evidence, current Cloudflare truth, and the minimal Vercel guard. | `UNIT-002`, `UNIT-003` | `AC-002`, `AC-003` | Accepted; ready. |
| `REQ-003` | Core | Make current plan/index/archive and architecture/feature authority truthful without losing unresolved obligations or historical lineage. | `UNIT-004`, `UNIT-010` | `AC-004`, `AC-010` | Accepted; ready. |
| `REQ-004` | Core | Classify every alternate Client Portal API method and legacy recipient alias from complete evidence, defaulting to retention when proof is incomplete. | `UNIT-005`, `UNIT-006` | `AC-005`, `AC-006` | Accepted; ready. |
| `REQ-005` | Core | Preserve the active publication migration/write-freeze/mapping corridor unless a separately scoped cutover proves it removable. | `UNIT-005`, `UNIT-007`, `UNIT-010` | `AC-005`, `AC-007`, `AC-010` | Accepted; ready. |
| `DATA-001` | Core | Preserve auth aliases, blank-row/history readers, adjustment fallbacks, and mapping lineage where current or immutable compatibility cannot be safely normalized in this pack. | `UNIT-005`, `UNIT-008` | `AC-005`, `AC-008` | Accepted; ready. |
| `OPS-001` | Core | Verify-retain callback normalization; separate future real-domain proof from future Cloudflare production routing mutation. | `UNIT-009`, `UNIT-010` | `AC-009`, `AC-010` | Accepted; ready through retain. |

## Acceptance Criteria

| ID | Requirement(s) | Pass condition | Current status | Planned receipt | Test decision |
|---|---|---|---|---|---|
| `AC-001` | `REQ-001` | Exact dead source is removed, useful tests target canonical source, active migration code remains, and the authorized focused command passes. | `FAIL` | `evidence/UNIT-001-dead-source-cleanup.json` | `TEST_TASK`; exact command in canonical plan. |
| `AC-002` | `REQ-002` | Exact scratch/raw/script-owned/approved/scaffold files are absent and every named retention is unchanged. | `FAIL` | `evidence/UNIT-002-artifact-cleanup.json` | `NOT_REQUIRED`. |
| `AC-003` | `REQ-002` | Duplicate commands and obsolete provider-era executable loops are removed; four Worker crons, historical evidence, current D1 tooling, minimal Vercel guard, and negative analytics contract remain; focused command passes. | `FAIL` | `evidence/UNIT-003-provider-tooling-cleanup.json` | `TEST_TASK`; exact command in canonical plan. |
| `AC-004` | `REQ-003` | Current index paths exist; Shared-Link, Workshop, Estimate-Tree, Templates, and auth follow-up states are truthful; five current-authority documents match current source/provider truth. | `FAIL` | `evidence/UNIT-004-planning-truth-repair.json` | `NOT_REQUIRED`; static validators allowed. |
| `AC-005` | `REQ-004`, `REQ-005`, `DATA-001` | A redacted receipt records exact production/preview D1 aggregate queries, route/method contract mapping, hostname/log completeness, and deterministic downstream dispositions; no mutation or sensitive evidence occurs. | `FAIL` | `evidence/UNIT-005-compatibility-readback.json` | `NOT_REQUIRED`. |
| `AC-006` | `REQ-004` | Every legacy method independently records `REMOVE|RETAIN`; removal requires complete 30-day zero demand plus contract equivalence; `rt` is retained. | `FAIL` | `evidence/UNIT-006-public-contract-dispositions.json` | `NOT_REQUIRED`; no later test task granted. |
| `AC-007` | `REQ-005` | Publication UI/actions/services, mappings, write freeze, applied migrations, data, and rollback corridor remain unchanged with an evidence-backed `RETAIN` decision. | `FAIL` | `evidence/UNIT-007-publication-corridor-retention.json` | `NOT_REQUIRED`. |
| `AC-008` | `DATA-001` | Auth aliases, blank-row/history compatibility, adjustment fallbacks, and mapping lineage each record `RETAIN`; no source/data/secret/schema/issued-content mutation occurs. | `FAIL` | `evidence/UNIT-008-data-compatibility-retention.json` | `NOT_REQUIRED`. |
| `AC-009` | `OPS-001` | Callback normalizer ends `VERIFIED + RETAIN`, current ownership is recorded, and no browser proof, route mutation, deploy, or source/config deletion occurs. | `FAIL` | `evidence/UNIT-009-callback-normalizer-retention.json` | `NOT_REQUIRED`; future browser/deploy work is authorization-bound through separate gates. |
| `AC-010` | `REQ-003`, `REQ-005`, `OPS-001` | All units/receipts/statuses reconcile, risks close or are accepted, validators and graph/reference checks pass, and the pack archives without external-release claims. | `FAIL` | `evidence/UNIT-010-closeout.json` | `NOT_REQUIRED`. |

## Gates

| Gate | Status | Meaning |
|---|---|---|
| `GATE-COMPLETION-001` | `FAIL` | Implementation has not started; all ten units are fully specified and ready. |
| `GATE-CALLBACK-PROOF-001` | `BOUNDARY` | `AUTH-001` is required only for a future credentialed production-domain OAuth proof branch, not for `RETAIN`. |
| `GATE-CALLBACK-DEPLOY-001` | `BOUNDARY` | `AUTH-002` is required only for a future production Cloudflare route/deployment mutation, not for `RETAIN`. |

## Risk Register

| ID | Risk | Units | Mitigation | Status |
|---|---|---|---|---|
| `RISK-001` | Static tools misclassify framework entrypoints, aliases, tests, or public routes. | `UNIT-001`, `UNIT-002`, `UNIT-006` | Exact source/impact/demand gates; candidate-level retain fallback. | Open. |
| `RISK-002` | Removing public methods or `rt` breaks external callers/bookmarks. | `UNIT-005`, `UNIT-006` | Method-level complete demand proof; `rt` fixed to retain. | Open. |
| `RISK-003` | Closing migration/write-freeze paths loses access, history, or rollback. | `UNIT-005`, `UNIT-007` | Fixed retain outcome; no migration or D1 write. | Open. |
| `RISK-004` | Editing applied migrations or historical data destroys lineage. | `UNIT-007`, `UNIT-008`, `UNIT-010` | Fixed retain outcome; explicit no-mutation checks. | Open. |
| `RISK-005` | Removing auth or callback compatibility breaks login. | `UNIT-005`, `UNIT-008`, `UNIT-009` | Fixed retain outcomes; separate future authorization gates. | Open. |
| `RISK-006` | Planning repair overwrites concurrent work or archives live obligations. | `UNIT-004`, `UNIT-010` | Single writer, fresh dirty-state read, no Unit-004 archive moves. | Open. |
| `RISK-007` | Broad artifact/provider cleanup deletes owner assets, disabled workflows, current evidence, Worker truth, or Vercel guard. | `UNIT-002`, `UNIT-003`, `UNIT-010` | Exact delete/retain lists and retained-path diff receipt. | Open. |

## Unit Ledger

| Unit | Status | Dependencies | Resume instruction |
|---|---|---|---|
| `UNIT-001` | `READY` | none | Execute exact dead-source edits and authorized focused command. |
| `UNIT-002` | `READY` | none | Exact next unit; delete only the enumerated artifact set. |
| `UNIT-003` | `READY` | none | Apply fixed delete/minimize decisions and authorized focused command. |
| `UNIT-004` | `READY` | `UNIT-003` | Repair current truth using fixed retain/no-archive decisions. |
| `UNIT-005` | `READY` | `UNIT-001`, `UNIT-002`, `UNIT-004` | Run aggregate read-only D1/provider evidence contract; incomplete means retain. |
| `UNIT-006` | `READY` | `UNIT-005` | Decide each method independently; retain `rt`. |
| `UNIT-007` | `READY` | `UNIT-005` | Record fixed publication-corridor retain outcome; mutate nothing. |
| `UNIT-008` | `READY` | `UNIT-006`, `UNIT-007` | Record four fixed compatibility-retain outcomes; mutate nothing. |
| `UNIT-009` | `READY` | `UNIT-005` | Record fixed callback-normalizer retain outcome; mutate nothing. |
| `UNIT-010` | `READY` | `UNIT-004`, `UNIT-008`, `UNIT-009` | Reconcile receipts, close statuses, validate, and archive exactly. |

## Resume Rule

Read `IMPLEMENTATION_PLAN.md`, inspect dirty state, and execute `next_unit` from `plan-pack.json`. Do not reopen fixed retention choices inside this pack. A future removal requires new evidence and, for callback production work, the exact active `AUTH-*` boundary.
