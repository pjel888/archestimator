# Legacy Cleanup Loop Ledger

## Package State

| Field | Value |
|---|---|
| Package | `PLAN-2026-07-15-legacy-cleanup` |
| Mode | plan pack / read-only audit |
| Package status | `CONDITIONALLY_READY` |
| Implementation status | `NOT_STARTED` |
| Release status | `BOUNDARY` |
| Plan lifecycle | `ACTIVE` |
| Terminal status | `ACTIVE` |
| Exact next unit | `UNIT-002` |
| Ready slice | `UNIT-001`, `UNIT-002`, `UNIT-003`, `UNIT-004` |

## Requirements Traceability

| ID | Role | Requirement | Units | Criteria | Status |
|---|---|---|---|---|---|
| `REQ-001` | Core | Remove production-dead source symbols and obsolete compatibility aliases without changing active behavior. | `UNIT-001` | `AC-001` | Accepted; not implemented. |
| `REQ-002` | Core | Remove proven obsolete tracked artifacts, scaffold assets, duplicate commands, and superseded provider-era executable capability while preserving the minimal Vercel guard, current Cloudflare/provider-exit truth, historical evidence, provenance-uncertain visuals, and owner assets. | `UNIT-002`, `UNIT-003` | `AC-002`, `AC-003` | Accepted; not implemented. |
| `REQ-003` | Core | Make active plan/index/archive and current architecture/feature authority truthful while preserving every unresolved obligation and historical provider lineage. | `UNIT-004`, `UNIT-010` | `AC-004`, `AC-010` | Accepted; not implemented. |
| `REQ-004` | Core | Prove external demand before retiring alternate Client Portal APIs or legacy recipient URL aliases. | `UNIT-005`, `UNIT-006` | `AC-005`, `AC-006` | Accepted; evidence pending. |
| `REQ-005` | Core | Complete and verify legacy publication cutover before removing migration, rollback, write-freeze, mapping, or schema compatibility. | `UNIT-005`, `UNIT-007`, `UNIT-008`, `UNIT-010` | `AC-005`, `AC-007`, `AC-008`, `AC-010` | Accepted; evidence pending. |
| `DATA-001` | Core | Normalize auth aliases, legacy blank rows, and historical financial fallback data before deleting compatibility reads. | `UNIT-005`, `UNIT-008` | `AC-005`, `AC-008` | Accepted; evidence pending. |
| `OPS-001` | Core | Retain callback normalization until direct provider behavior is proven; the owner conditionally authorizes bounded removal after that proof with rollback readiness. | `UNIT-009`, `UNIT-010` | `AC-009`, `AC-010` | Accepted; 2026-07-15 readback supports `RETAIN`, proof boundary remains active. |

## Acceptance Criteria

| ID | Requirement(s) | Pass condition | Current status | Evidence path | Test decision |
|---|---|---|---|---|---|
| `AC-001` | `REQ-001` | Deleted source has no production consumer, useful tests target canonical source, and active Client Portal migration code remains. | `FAIL` | Audit plus `UNIT-001` diff/reference proof. | `TEST_TASK`; scoped test edits and targeted commands explicitly authorized on 2026-07-15. |
| `AC-002` | `REQ-002` | Exact scratch/raw artifacts, seven owner-approved root screenshots, and five proven Next starter SVGs are absent; the separate public screenshot plus retained design/owner assets and disabled workflows are unchanged. | `FAIL` | Audit plus `UNIT-002` tracked-file/reference proof. | `NOT_REQUIRED`. |
| `AC-003` | `REQ-002` | Canonical dev/lint/performance/provider-exit callers and Worker cron truth remain; `vercel.json` is a minimal deployment-disabled guard with no stale region/crons; `.vercel/` is ignored; retired Supabase collectors/generators/provider tests and stale allowlist paths are coherently reconciled without deleting historical evidence or still-consumed closure tooling. | `FAIL` | Audit plus `UNIT-003` package/config/caller proof and dated Vercel readback. | `TEST_TASK`; scoped test edits and targeted commands explicitly authorized on 2026-07-15. |
| `AC-004` | `REQ-003` | Active plan index paths exist, archive paths are truthful, no unresolved requirement was lost, five named current-authority documents match current Cloudflare/D1/Better Auth source truth, and historical provider plans are clearly retained or superseded. | `FAIL` | `UNIT-004` validator/path/current-authority reconciliation. | `NOT_REQUIRED`; plan validators and static source/path checks are allowed contracts. |
| `AC-005` | `REQ-004`, `REQ-005`, `DATA-001` | A dated read-only receipt records every environment, route/method count, complete 30-day log window, issued-link state, D1 mapping/data counts, environment readback, Vercel linkage, and provider limits; incomplete evidence forces retention. | `FAIL` | `UNIT-005` compatibility receipt. | `NOT_REQUIRED`; read-only operational evidence is decisive. |
| `AC-006` | `REQ-004` | Alternate API routes and `rt` alias are removed only where demand and issued-link gates passed; `/api/share` remains canonical. | `FAIL` | `UNIT-006` route/reference proof. | `NOT_REQUIRED` until an explicit test task is granted. |
| `AC-007` | `REQ-005` | Every eligible legacy publication is verified/cut over with recipient, comment, decision, issue, and history reconciliation; a complete incident-free 30-day window proves no UI or external write endpoint needs migration/rollback/write-freeze behavior. | `FAIL` | `UNIT-007` migration and demand receipts. | `NOT_REQUIRED`; D1 reconciliation and real request evidence are primary proof. |
| `AC-008` | `REQ-005`, `DATA-001` | Exact pre/post mutation counts and environment readbacks prove normalization; any schema retirement is an enumerated new forward D1 migration, otherwise schema is explicitly retained. | `FAIL` | `UNIT-008` mutation manifest, counts, migration, and source proof. | `NOT_REQUIRED`; data/static evidence is decisive. |
| `AC-009` | `OPS-001` | Callback normalization ends with `UNIT-009=VERIFIED` and an evidence-backed manifest decision stating either `REMOVE` after direct proof and rollback readiness or `RETAIN` after current routing is revalidated without mutation. | `BOUNDARY` | 2026-07-15 read-only route/deployment readback supports interim `RETAIN`; `UNIT-005` and the final `UNIT-009` provider/retention receipt remain pending. | `NOT_REQUIRED`; real provider evidence is required instead. |
| `AC-010` | `REQ-003`, `REQ-005`, `OPS-001` | Final reference/graph/validator checks pass, retained evidence is intact, and all status/archive claims are reconciled. | `FAIL` | `UNIT-010` closeout receipt. | `NOT_REQUIRED`; static validators and graph review are decisive. |

## Gates

| Gate | Status | Meaning |
|---|---|---|
| `GATE-COMPLETION-001` | `FAIL` | The cleanup program is not complete until implementation criteria and retained/removed terminal dispositions reconcile. |

## Risk Register

| ID | Risk | Units | Mitigation | Status |
|---|---|---|---|---|
| `RISK-001` | Static dead-code tools misclassify framework entrypoints, re-exports, tests, or externally consumed routes. | `UNIT-001`, `UNIT-002` | Require direct source/reference and impact evidence; keep false-positive register. | Open. |
| `RISK-002` | Removing public APIs or `?rt=` breaks external callers or bookmarked recipient links. | `UNIT-005`, `UNIT-006` | Combine logs, issued-link state, route inventory, and an explicit observation window. | Open. |
| `RISK-003` | Closing migration/write-freeze paths early loses recipient access, comments, decisions, immutable issue content, or rollback. | `UNIT-005`, `UNIT-007`, `UNIT-008` | Per-publication dry-run/apply reconciliation and delayed schema retirement. | Open. |
| `RISK-004` | Editing applied migrations or deleting historical tables/evidence destroys lineage. | `UNIT-008`, `UNIT-010` | Forward migration only; retain historical evidence and verify diff scope. | Open. |
| `RISK-005` | Removing auth aliases, callback normalization, or still-consumed provider-exit tooling before environment/provider and audit closure breaks login or erases closure proof. | `UNIT-003`, `UNIT-004`, `UNIT-005`, `UNIT-009` | Trace current consumers, preserve final reports, read back every env/route, canonicalize first, and keep the external deployment authorization boundary. | Open. |
| `RISK-006` | Stale plan repair overwrites concurrent July work or archives unresolved obligations. | `UNIT-004`, `UNIT-010` | Fresh dirty-state read, additive transfer, validator-backed terminal tuples. | Open. |
| `RISK-007` | Broad artifact/provider/config cleanup deletes current design evidence, public assets, owner-retained collateral, disabled workflows, Worker truth, historical provider proof, active closure tooling, or the Vercel deployment guard. | `UNIT-002`, `UNIT-003`, `UNIT-004`, `UNIT-005` | Exact owner-approved delete/retain lists, caller classification, provenance review, hosted linkage readback, current-versus-historical document classification, and retained-path verification. | Open. |

## Unit Ledger

| Unit | Status | Dependencies | Resume instruction |
|---|---|---|---|
| `UNIT-001` | `READY` | none | Recheck references/impact; use only the authorized focused test edits and targeted commands. |
| `UNIT-002` | `READY` | none | Delete the seven exact root screenshots and five Next scaffold SVGs; retain the separate public screenshot, owner assets, and disabled workflows. |
| `UNIT-003` | `READY` | none | Minimize but retain the Vercel guard; use only the authorized focused tests and preserve current closure tooling plus historical evidence. |
| `UNIT-004` | `READY` | none | Re-read concurrent plan dirty state, repair current authority and index truth, and transfer obligations additively without rewriting historical lineage. |
| `UNIT-005` | `PLANNED` | `UNIT-001`–`UNIT-004` | Collect the exact read-only 30-day demand/D1/env/provider/Vercel receipt; mutate nothing. |
| `UNIT-006` | `PLANNED` | `UNIT-005` | Execute only candidates whose demand gates pass. |
| `UNIT-007` | `PLANNED` | `UNIT-005` | Migrate/reconcile every eligible publication; keep rollback until observation closes. |
| `UNIT-008` | `PLANNED` | `UNIT-006`, `UNIT-007` | Amend exact mutation/SQL scope, normalize with pre/post counts, and retain any unproven schema. |
| `UNIT-009` | `PLANNED` | `UNIT-005` | End `VERIFIED` with an evidence-backed `REMOVE` or `RETAIN` decision; never mutate external routing without `AUTH-001`. |
| `UNIT-010` | `PLANNED` | `UNIT-004`, `UNIT-008`, `UNIT-009` | Run final reference/graph/validator reconciliation and archive only after all core units verify. |

## Criterion Challenge

- **Value:** the pack identifies a safe local cleanup slice while protecting active public-link, migration, provider, and historical-evidence obligations.
- **Necessity:** every unit either removes a classified candidate, proves a retirement gate, performs required normalization/cutover, or reconciles final authority; no review-only unit remains.
- **Sufficiency:** each core requirement maps to an outcome criterion and dependency-closed unit; unknown external demand or provenance forces retention rather than speculation.
- **Feasibility:** `UNIT-001` through `UNIT-004` are ready from current repository evidence plus the scoped 2026-07-15 test authorization; external-state units stay planned until their named boundary is satisfied.
- **Verifiability:** criteria use exact path/reference checks, redacted route/D1/provider receipts, pre/post counts, forward-migration inspection, and static validators.
- **Minimality:** readiness is expressed only through unit status, `ready_slices`, and `next_unit`; the former review-specific criterion and local-slice gate were removed as redundant.

## Resume Rule

On resume, read this ledger, inspect scoped dirty state, and execute `next_unit` from `plan-pack.json`. Do not skip to a planned compatibility unit merely because its source looks unused; promote it only after its prerequisite evidence is attached and the manifest is updated.
