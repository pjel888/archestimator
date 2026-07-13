# 04 — Requirements Specification

Stable IDs: `REQ-D1-*`, `REQ-R2-*`, `REQ-OPS-*`, `REQ-SEC-*`, `REQ-PERF-*`,
`REQ-DOC-*`. Every requirement has a source, priority, acceptance criteria,
validation method, affected code area, and shadow-path coverage. Priorities:
**P0** (blocking), **P1** (must), **P2** (should).

## D1 requirements

### REQ-D1-01 — Document D1 backup assumptions for the free-tier posture (P0)
- **Statement**: The pack states, with citations, that D1 relies on (a) automatic Time Travel (7-day free / 30-day paid retention, per-minute granularity, restore by timestamp/bookmark), (b) manual `wrangler d1 export` (full `.sql` dump, no incremental), and (c) the absence of any other native backup feature.
- **Rationale**: PROMPT "D1 backup assumptions"; prevents acting on the stale "daily backups" wording.
- **Source**: PROMPT.md; `AGENTS.md`; official docs (D1 Time Travel, D1 Limits, D1 import/export).
- **Acceptance**: A table in `07_…` lists each mechanism, retention/cadence, free-tier bound, and citation URL; no claim of automated daily export as a *current* fact.
- **Validation**: Local static review (citations present + URLs resolve in `19_…`).
- **Affected area**: docs only.
- **Shadow path**: N/A (documentary).

### REQ-D1-02 — Define a safe restore target-isolation procedure (P0)
- **Statement**: The pack documents a free-tier-safe procedure to restore into an **isolated** D1 target (preview `363c756a-…` or a named staging DB), never the production `database_id` `9bdb29bb-…`, including the exact `wrangler` invocations and a pre-flight assertion that the target id ≠ production id.
- **Rationale**: PROMPT "safe target isolation"; a destructive `time-travel restore` or `execute --remote --file=…` against production is the highest-risk action in the whole domain.
- **Source**: PROMPT.md; `wrangler.jsonc`; D1 wrangler-commands docs.
- **Acceptance**: `07_…` + `13_…` contain a numbered procedure with (1) target selection, (2) id-difference assertion, (3) export-from-source, (4) import-into-target, (5) post-restore checks; and an explicit "NEVER run against `9bdb29bb-…` in a drill" rule.
- **Validation**: Local static review; Phase-1 task builds the assertion script.
- **Affected area**: (new) `scripts/generate-cloudflare-d1-restore-target-isolation.ts`.
- **Shadow path**: see D1 flow shadow matrix (empty/missing export, wrong target id, partial import, FK violation, authz-denial regression).

### REQ-D1-03 — Maintain a local SQLite restore rehearsal (P1)
- **Statement**: Keep the existing local-only rehearsal (`cf:d1-restore-rehearsal`) as the always-available, secret-free proof that the dump/import mechanism round-trips with matching row counts, checksums, and a clean FK check.
- **Rationale**: PROMPT "restore rehearsal procedure"; it is the only proof runnable without provider access.
- **Source**: `scripts/generate-cloudflare-d1-restore-rehearsal.ts`.
- **Acceptance**: `bun run cf:d1-restore-rehearsal` exits 0 with `restoreRehearsalReady: true`, `tempArtifactsRemoved: true`, `foreignKeyViolations: 0`.
- **Validation**: Local automated (run the script).
- **Affected area**: existing script (extend in Phase 1).
- **Shadow path**: N/A (covered by existing checks array).

### REQ-D1-04 — Specify a provider-backed restore rehearsal gated by owner approval (P0)
- **Statement**: Define (but do not execute in this plan) a provider-backed drill: export from an isolated staging DB → re-import into a *second* isolated DB → row/checksum/FK/authorization-denial proof. Execution requires OPEN-01.
- **Rationale**: PROMPT stop condition requires the executor to "know exactly what evidence proves restore readiness"; local-only is insufficient for hosted readiness.
- **Source**: PROMPT.md; D1 import/export + wrangler-commands docs.
- **Acceptance**: `11_…` Phase 1 specifies the exact commands, the isolated targets, the proof gates, and the OPEN-01 gate; `19_…` records that hosted readiness is `CONDITIONALLY READY` until OPEN-01 closes.
- **Validation**: Local static review; provider-backed proof deferred to OPEN-01.
- **Affected area**: (new) provider-backed rehearsal variant.
- **Shadow path**: export quota exhaustion, oversized dump, partial import, schema drift, authz-denial failure post-restore.

## R2 requirements

### REQ-R2-01 — Document the R2 backup reality (no versioning, durability, lifecycle) (P0)
- **Statement**: State, with citations, that R2 has **no native object versioning** (docs 404), durability is a design target (11 nines, not a contractual SLA), lifecycle rules govern retention/transition (not version history), and `wrangler r2 object list` does not exist.
- **Rationale**: PROMPT "R2 inventory/export/restore strategy"; the "no versioning" fact drives the entire R2 RPO discussion.
- **Source**: PROMPT.md; R2 durability/lifecycles/wrangler-commands/release-notes docs.
- **Acceptance**: `07_…` contains the reality table with citations; `09_…` derives R2 RPO from it.
- **Validation**: Local static review.
- **Affected area**: docs only.
- **Shadow path**: N/A (documentary).

### REQ-R2-02 — Define an R2 object inventory + reconciliation design (P1)
- **Statement**: Specify a tool that lists objects in the physical bucket `archestimator-proof-uploads` (via REST `/objects/list`, S3 `ListObjectsV2`, or Worker `bucket.list()`), and reconciles them against the **composite `(storage_bucket, storage_path)`** populations of **two** D1 tables — `upload_assets` (filter: `storage_bucket IS NOT NULL AND storage_path IS NOT NULL AND status NOT IN ('deleted','removed','aborted','failed')`) and `cost_library_item_variant_attachments` (filter: `is_current_approved = 1`) — reporting (a) orphan objects (in bucket, not in either table) and (b) dangling rows (in a table, not in bucket). De-duplicate `component-attachments/…` keys that legitimately appear in both tables.
- **Rationale**: PROMPT "R2 object inventory"; you cannot restore or prove completeness without an inventory.
- **Source**: PROMPT.md; `migrations/0010_upload_metadata.sql:44-113` (real schema — no `object_key` column); `migrations/0022_component_attachment_metadata.sql:1-45`; R2 list API docs.
- **Source strength**: `repo evidence` (the schema is read from migrations, not the sanitized fixture).
- **Acceptance**: `11_…` Phase 2 specifies the tool path, API choice, pagination, the corrected reconciliation query (`07_…`), two-table coverage with de-dup, and the output report shape (orphan + dangling counts + sampled keys, redacted).
- **Validation**: Local static review + mocked unit test; provider-backed inventory deferred to implementation.
- **Affected area**: (new) `scripts/generate-cloudflare-r2-inventory.ts`.
- **Shadow path**: see R2 flow shadow matrix (empty bucket, large bucket/pagination, missing table rows, key-traversal, quota exhaustion, component-attachments in both tables).

### REQ-R2-03 — Define a selective R2 export/restore drill (P1)
- **Statement**: Specify a drill that samples one non-orphan object (a key in the bucket present in at least one reconciliation table), downloads it (`wrangler r2 object get --remote` or Worker `get`), re-uploads it (`put --remote`) into a **`_drill/`-prefixed key in the preview bucket**, and verifies sha256/etag are unchanged.
- **Rationale**: PROMPT "object restoration"; proves the get→put round-trip without bulk-copying the bucket (free-tier-safe).
- **Source**: PROMPT.md; R2 wrangler-commands docs.
- **Acceptance**: `11_…` Phase 3 specifies the sample selection, the get/put commands (with `--remote`), the sha256/etag comparison, and cleanup; output report mirrors the D1 rehearsal shape.
- **Validation**: Local static review; provider-backed drill deferred.
- **Affected area**: (new) `scripts/generate-cloudflare-r2-restore-rehearsal.ts`.
- **Shadow path**: object-not-found, checksum mismatch, partial upload, quota exhaustion, key-unsafe path.

### REQ-R2-04 — State the R2 backup/retention strategy for the free-tier posture (P1)
- **Statement**: Recommend a free-tier R2 "backup" posture: rely on R2's 11-nines durability for infra failure (RPO≈0), accept that user-error delete/overwrite is unrecoverable without an app-owned copy, and define a sampled-object local-export drill as the cheap recovery rehearsal. A second bucket or bulk copy is OPEN-03 (owner decision).
- **Rationale**: PROMPT "R2 inventory/export/restore strategy" + free-tier constraint.
- **Source**: PROMPT.md; R2 durability/pricing docs.
- **Acceptance**: `06_…`/`07_…` contain the recommendation with the OPEN-03 gate.
- **Validation**: Local static review.
- **Affected area**: docs only.
- **Shadow path**: N/A (strategy).

## RTO/RPO requirements

### REQ-PERF-01 — State RTO/RPO targets derived from the free-tier posture (P0)
- **Statement**: State: D1 RPO ≤ 7 days (free Time Travel) or ≤ 1 day if OPEN-02 enables daily export; D1 RTO = drill-measured (target < 30 min at current volume); R2 RPO ≈ 0 for infra failure, **undefined for user error** (no versioning); R2 RTO = single-object get→put, drill-measured. None is a contractual SLA.
- **Rationale**: PROMPT "RTO/RPO targets"; Cloudflare publishes no contractual RTO/RPO.
- **Source**: PROMPT.md; D1/R2 docs (research lane).
- **Acceptance**: `09_…` contains the RTO/RPO table with derivable bounds + the proof command for each.
- **Validation**: Local static review; measurement deferred to OPEN-01.
- **Affected area**: docs only.
- **Shadow path**: N/A.

## Operations requirements

### REQ-OPS-01 — Produce an operator runbook (P1)
- **Statement**: Produce a runbook covering: when to run each drill, pre-flight checks (confirm target id ≠ prod, confirm free-tier headroom), the drill commands, post-restore verification, and rollback of the drill itself.
- **Rationale**: PROMPT "operator runbook readiness".
- **Source**: PROMPT.md.
- **Acceptance**: `13_…` contains the runbook with numbered steps + rollback.
- **Validation**: Local static review.
- **Affected area**: docs only.
- **Shadow path**: drill-mid-failure rollback covered in failure matrix.

### REQ-OPS-02 — Define a failure drill matrix (P0)
- **Statement**: Define a matrix of failure scenarios (D1 corruption, accidental R2 delete, partial restore, oversized export, provider outage, drill rollback) with setup, command/harness, expected signal, and cleanup.
- **Rationale**: PROMPT "failure drills".
- **Source**: PROMPT.md.
- **Acceptance**: `12_…` contains the matrix (UltraQA-style) with every cell answered or N/A-with-reason.
- **Validation**: Local static review.
- **Affected area**: docs only.
- **Shadow path**: the matrix *is* the shadow-path superset.

### REQ-OPS-03 — Define drill cadence + evidence artifacts (P2)
- **Statement**: Recommend a cadence (e.g., local SQLite rehearsal on every change; provider-backed drill quarterly or pre-release) and the evidence artifacts to retain (rehearsal JSON/MD, inventory report, restore report, runbook execution log).
- **Rationale**: PROMPT "evidence artifacts".
- **Source**: PROMPT.md.
- **Acceptance**: `13_…` states cadence + artifact paths (under `.ai/03_plans/<pack>/evidence/` or a sibling evidence folder).
- **Validation**: Local static review.
- **Affected area**: docs only.
- **Shadow path**: N/A.

### REQ-OPS-04 — State the local-vs-provider proof boundary explicitly (P0)
- **Statement**: A table stating, per claim, whether it is provable locally, locally-with-simulation, or only provider-backed — so readiness is never falsely claimed from a local check.
- **Rationale**: PROMPT "what is impossible to prove locally"; Multi-Agent Execution Directive evidence classes.
- **Source**: PROMPT.md; suite prompt.
- **Acceptance**: `19_…` contains the boundary table; `17_…` applies the readiness cap.
- **Validation**: Local static review.
- **Affected area**: docs only.
- **Shadow path**: N/A.

## Security requirements

### REQ-SEC-01 — Restore drills must be secret-free and redacting (P0)
- **Statement**: No drill tool reads `.env*`, prints account IDs/tokens/keys in clear, or persists raw object bytes beyond the drill; account/bucket ids are redacted to prefixes/hashes in artifacts.
- **Rationale**: `AGENTS.md` secret hygiene; Multi-Agent Directive redaction.
- **Source**: `AGENTS.md`; suite prompt.
- **Acceptance**: `08_…` + tool specs in `11_…` enforce no-env-read + redaction.
- **Validation**: Local static review; existing rehearsal script already complies (audited).
- **Affected area**: new tools must inherit the posture.
- **Shadow path**: secret-in-object-bytes (redact/sample), token-leak-in-log (redact).

### REQ-SEC-02 — Restore target isolation must be enforced, not advised (P0)
- **Statement**: The target-isolation procedure includes a hard assertion (script-level) that the destination `database_id` ≠ `9bdb29bb-…` before any `execute --remote --file` or `time-travel restore`.
- **Rationale**: a destructive restore against production is the catastrophic failure mode.
- **Source**: PROMPT "safe target isolation".
- **Acceptance**: `11_…` Phase 1 task includes the assertion; `08_…` lists it as a control.
- **Validation**: Local static review; provider-backed assertion deferred to OPEN-01.
- **Affected area**: (new) target-isolation pre-flight script.
- **Shadow path**: wrong-id-passed (assertion blocks), env-override (assert against `wrangler.jsonc` parsed value).

### REQ-SEC-03 — DSAR/retention interaction documented (P2)
- **Statement**: Note that a D1 restore resurrects soft-deleted/DSAR-erased rows (`privacy_request_register`, `data_retention_events`, `account_security_events`); the runbook states the post-restore re-erasure check.
- **Rationale**: restore must not silently undo privacy compliance.
- **Source**: `migrations/0033_privacy_request_register.sql`, `0034_data_retention_events.sql`, `0004`/`0035` security events.
- **Acceptance**: `08_…` + `13_…` contain the note + check.
- **Validation**: Local static review.
- **Affected area**: docs only.
- **Shadow path**: restore-resurrects-deleted-data (re-run erasure check).

## Documentation requirements

### REQ-DOC-01 — Cost model for the drills (P2)
- **Statement**: A free-tier cost model for each drill (rows-read/day for D1 export; Class A/B ops for R2 list/get/put) showing headroom at current volume.
- **Rationale**: PROMPT "keep costs inside free-tier/bundled limits".
- **Source**: PROMPT.md; D1/R2 pricing docs.
- **Acceptance**: `20_…` contains the model + headroom.
- **Validation**: Local static review.
- **Affected area**: docs only.

### REQ-DOC-02 — Provider parity matrix (P2)
- **Statement**: A matrix mapping each restore need to the D1/R2 capability that satisfies it (and the gap where none exists).
- **Rationale**: makes the "what's possible vs what's missing" explicit.
- **Source**: PROMPT.md.
- **Acceptance**: `21_…` contains the matrix.
- **Validation**: Local static review.
- **Affected area**: docs only.

## D1 flow shadow-path matrix

| Flow | Happy path | Nil/missing input | Empty input/result | Invalid input | Auth denied | Upstream/network error | Concurrency/race | Retry/idempotency | User-visible result | Test/proof |
|---|---|---|---|---|---|---|---|---|---|---|
| `wrangler d1 export ARCH_DB --remote` | `.sql` dump produced | N/A (binding fixed) | empty DB → tiny dump with schema only | wrong binding name → wrangler error | unauthenticated → wrangler 401 | network fail → retry-safe (re-run) | concurrent export OK (read) | idempotent (re-run) | file on disk | REQ-D1-03/04 drill |
| `wrangler d1 execute <target> --remote --file=…` | rows imported; counts printed | missing file → error | empty file → no-op | malformed SQL → partial import + error | unauthenticated → 401 | network fail mid-import → partial (must restart into fresh target) | **not safe** concurrent imports into same target | **not idempotent** (re-run duplicates without `IF NOT EXISTS`) | stdout counts | REQ-D1-04 isolated drill; assert target≠prod |
| `wrangler d1 time-travel restore ARCH_DB --timestamp=…` | DB rewound | missing ts → error | ts outside 7-day window → error | bad ts format → error | unauthenticated → 401 | network fail → unknown state (export first!) | n/a (single op) | **destructive, not idempotent** | DB state changed | REQ-D1-02: never in drill; runbook only |

## R2 flow shadow-path matrix

| Flow | Happy path | Nil/missing input | Empty input/result | Invalid input | Auth denied | Upstream/network error | Concurrency/race | Retry/idempotency | User-visible result | Test/proof |
|---|---|---|---|---|---|---|---|---|---|---|
| `POST /objects/list` (REST) or `bucket.list()` | paginated object list | bad bucket → 404 | empty bucket → empty list | bad prefix → empty/short list | unauthenticated → 401 | network fail → retry cursor | eventual consistency (recent puts may lag) | idempotent read | list JSON | REQ-R2-02 inventory |
| `wrangler r2 object get --remote <key>` | object bytes + metadata | missing key → 404 | n/a | unsafe path → provider error | unauthenticated → 401 | network fail → partial download (re-run) | concurrent overwrite → newer bytes | idempotent read | file on disk | REQ-R2-03 drill |
| `wrangler r2 object put --remote <key> --file=…` | object created/overwritten | missing file → error | empty file → 0-byte object | unsafe path → error | unauthenticated → 401 | network fail → no/partial upload (re-run) | concurrent put → last-write-wins | **overwrites** (no versioning) | etag returned | REQ-R2-03 drill; sha256 compare |
| Reconciliation query (both tables vs bucket list) | orphan + dangling counts | empty tables → all orphan | empty bucket → all dangling | bad key shape → ignored | n/a (local join) | n/a | snapshot-dependent | idempotent | report | REQ-R2-02 |

Every applicable cell is answered; N/A cells are marked with reason.
