# Provider Capability And Constraints

## Authority And Proof Boundary

This provider review expands `REQ-001`, `REQ-002`, `REQ-007`, `AC-001`,
`AC-002`, `AC-007`, `RISK-001`, `RISK-002`, `UNIT-001`, `UNIT-002`, and
`UNIT-006`. `SRC-001..006` remain authoritative source-ledger records in
`SOURCE_AND_CODEBASE_AUDIT.md`. Provider documentation defines capability and
limits; only a current authorized control-plane rehearsal can prove provider
state or recovery readiness.

## Current Capability Baseline

| Capability/constraint | Planning consequence | Runtime proof required |
| --- | --- | --- |
| D1 SQL export/import | Use export into an isolated disposable D1 target for the first Beta rehearsal | Exact source/target/account identity, export/import commands, digests, timings, and result. |
| Time Travel restores in place and cannot fork | Exclude Time Travel on bound `ARCH_DB`; it is not a cloning mechanism | No Time Travel command appears in the rehearsal transcript; any later incident use needs separate authorization. |
| Free D1 database size 500 MB | Disposable target and source/expected import must fit before creation | Current provider-reported sizes and backend/plan. |
| Free account storage 5 GB | Source plus disposable target and other databases must fit | Current account inventory/storage before and after. |
| Import ceiling 5 GB | Export/import size must be measured and below the ceiling | Provider/file size readback bound to the run. |
| Free database-count limit | Creation cannot continue when the current account is at limit | Current provider-reported count and limit before target creation. |
| Export can block database requests | Use a named controlled source window and abort on unacceptable source impact | Start/end, observed source impact, and approved window. |
| Virtual tables unsupported; large integers have caveats | Preflight schema/features and include precision sentinels | Schema inventory and defect labels in integrity report. |

The current `wrangler.jsonc` binding establishes the authorized production
resource boundary only; it is not permission to create a disposable D1 database
or Worker. The standing free-tier constraint prohibits enabling or recommending
a paid plan as an automatic fallback.

## Identity And Resource Invariants

- Source account/database IDs are explicit and cannot be inferred only from a
  binding name. Target IDs must not equal any source or bound production ID.
- Disposable names include a unique run digest and match the approved packet.
- The proof Worker is `archestimator-recovery-<run-digest>`, uses
  `workers_dev=true`, `routes=[]`, no custom domains, and only the disposable D1
  binding. It is absent during import and offline session invalidation.
- No provider command may default to `ARCH_DB`, another account, or another
  project. Redacted preflight prints the identities it will use before any
  mutation.
- Every Free-limit, feature, plan, encryption, naming, identity, or authorization
  failure stops before target creation.

## Provider-State Failure Model

| Failure | Required behavior |
| --- | --- |
| Identity lookup unavailable/ambiguous | Fail closed; no create/export/import/deploy call. |
| Source/target collision | Reject before rendering executable mutation commands. |
| Non-Free plan or exhausted limit | Stop; do not enable paid capacity or continue optimistically. |
| Export blocks source beyond window | Abort, open the Operating incident path, clean partial artifacts. |
| Partial create/import/deploy | Enter cleanup trap and preserve only redacted failure labels/timings. |
| Provider reports success but readback disagrees | Treat operation as failed; use readback state as authority. |
| Provider docs or limits change | Mark prior source/proof stale and replan before a new run. |

## Ownership, Evidence, And Handback

The `researcher` refreshes official primary-source constraints; `UNIT-002`
implements non-mutating discovery and dry-run refusal; the authorized hosted
operator alone performs `UNIT-006`; a distinct verifier reads back resource and
cleanup state. Handback is provider metadata in `D1-RECOVERY-RECEIPT-v1`, not
raw CLI output, exports, secrets, or this planning artifact.
