# 04 — Requirements Specification

Requirements use stable IDs. Categories: FR (functional), DATA, SEC, PERF, REL, OPS, TEST, DOC, ARCH. Each requirement maps to source, acceptance criteria, validation, code areas, risks, and status. Traceability consolidated in `16_REQUIREMENTS_TRACEABILITY_MATRIX.md`.

## Orphan taxonomy (referenced by all requirements)

- **Class A — D1 row without parent:** a child row whose referenced parent row does not exist (e.g., `shared_link_comments.publication_id` pointing at a deleted `project_publications`).
- **Class B — R2 object without D1 row:** an R2 object whose owning D1 metadata row is gone or never finalized.
- **Class C — D1 row referencing deleted R2 object:** a D1 row whose `storage_path` points at an R2 object that no longer exists (or was deleted out-of-band).
- **Class D — Cross-store drift after partial failure:** D1 and R2 disagree because a multi-step operation committed on one store but not the other (e.g., project delete batch committed, R2 cleanup threw).

## Requirements

### FR-001 — Enumerate all ownership relationships
- **Statement:** The audit capability must enumerate every D1 parent→child ownership edge and every D1↔R2 linkage, classified by declared on-delete behavior and by whether the reference is FK-enforced or plain.
- **Rationale:** PROMPT.md "List every ownership relationship." Cannot detect what is not enumerated.
- **Source:** PROMPT.md §Required Plan Pack; `03` §1–3.
- **Priority:** P0.
- **Dependencies:** none.
- **Acceptance criteria:** (1) A static relationship manifest covers all 69 tables and the 4 R2-key columns. (2) Each edge is tagged `{declared: CASCADE|SET NULL|none, enforced: yes|no|unknown}`. (3) The manifest is generated/derived, not hand-maintained, so it cannot drift from migrations.
- **Validation:** unit test asserts manifest count matches `migrations/` table count; snapshot test asserts no edge lost vs `03` §2.
- **Code areas:** new audit module (see `11`); reads `migrations/`.
- **Risks:** manifest drifts if hand-maintained → mitigate by parsing migrations.
- **Status:** designed.

### FR-002 — Dry-run orphan detection (read-only)
- **Statement:** The audit must run a read-only dry-run that detects all four orphan classes (A/B/C/D) and emits a redacted report without writing to D1 or deleting from R2.
- **Rationale:** PROMPT.md "orphan SQL/object checks" + "No destructive cleanup without a dry-run."
- **Source:** PROMPT.md; `03` §7.
- **Priority:** P0.
- **Dependencies:** FR-001.
- **Acceptance criteria:** (1) Dry-run covers all ORPH-001…ORPH-015 targets in `03` §7. (2) Zero D1 writes and zero R2 deletes during a dry-run (verified by a test that instruments the D1/R2 stubs). (3) Produces a structured report (see FR-004). (4) Exit code 0 when no orphans, non-zero when any P0/P1 orphan found (configurable threshold).
- **Validation:** seeded-fixture test: plant known orphans of each class, assert the detector finds exactly them; read-only-instrumentation test.
- **Code areas:** new audit module; reuses `node:sqlite` `DatabaseSync` harness pattern for local; provider-backed query path for preview/prod.
- **Risks:** detection query itself is slow on large tables → mitigate with indexed `LEFT JOIN` and `NOT EXISTS` patterns, paginated R2 `list()`.
- **Status:** designed.

### FR-003 — R2↔D1 reconciliation
- **Statement:** The audit must reconcile the R2 object-key set against the D1 `storage_path` set (and vice versa) to detect Class B (R2-without-D1) and Class C (D1-without-R2) orphans.
- **Rationale:** `03` §4.1–4.4 show multiple paths that desync the two stores.
- **Source:** PROMPT.md; `03` §3, §4.
- **Priority:** P0.
- **Dependencies:** FR-002.
- **Acceptance criteria:** (1) Enumerates R2 keys via paginated `R2.list()` bounded by logical-bucket prefix. (2) Compares against the union of `upload_sessions.storage_path`, `upload_assets.storage_path` + `thumbnail_path`, `cost_library_item_variant_attachments.storage_path`, `cost_library_items.thumbnail_path`. (3) Reports sets R2-only, D1-only, and matched. (4) Bounded cost (see PERF-002, `20`).
- **Validation:** fake-R2 test with seeded keys; paginated large-set test for cost bounding.
- **Code areas:** new reconciliation module; uses `ARCH_UPLOADS_R2.list()`.
- **Risks:** R2 `list()` is metered (Class B ops) → cost gate (OPEN owner approval); large key counts → paginate + sample.
- **Status:** designed.

### FR-004 — Safe redacted reporting format
- **Statement:** The audit report must be safe to persist, share, and commit: counts, key prefixes, SHA-256 hashes of storage paths, and table names only — never raw object contents, private keys, passwords, tokens, recipient emails, or full sensitive URLs.
- **Rationale:** PROMPT.md "Keep secrets and object contents out of evidence files"; AGENTS.md GitHub security loop redaction rules.
- **Source:** PROMPT.md §Constraints.
- **Priority:** P0.
- **Dependencies:** FR-002.
- **Acceptance criteria:** (1) Report schema fields: `{class, table, orphan_count, sample_key_prefix (≤ first 2 path segments), storage_path_sha256 (first 12 hex chars), first_seen, last_seen, severity}`. (2) No field whose value could be a raw secret. (3) A dedicated redaction test scans sample reports for secret-like patterns (bearer, token, password, `eyJ`, private key headers) and fails on any hit.
- **Validation:** redaction regex test over fixture reports containing planted safe + (intentionally absent) unsafe values.
- **Code areas:** report formatter; redaction test.
- **Risks:** a future field addition leaks a secret → mitigate with a schema-locked reporter + redaction gate in CI.
- **Status:** designed.

### FR-005 — Owner-gated repair
- **Statement:** Repair (delete orphan rows / delete orphan R2 objects / re-link) must require `--confirm` after a successful dry-run, must produce a before/after count diff, and must be auditable.
- **Rationale:** PROMPT.md "No destructive cleanup without a dry-run, evidence output, and owner-review gate."
- **Source:** PROMPT.md §Constraints.
- **Priority:** P0.
- **Dependencies:** FR-002, FR-004.
- **Acceptance criteria:** (1) Repair refuses to run without a prior dry-run report file passed via `--from-report`. (2) Refuses without `--confirm`. (3) Each repair action is one of: delete-D1-row, delete-R2-object, set-null-D1-column — chosen per orphan class with a documented rule. (4) Writes a `data_retention_events`-style audit row (reuses `recordRetentionEventInD1` shape) for each repair batch. (5) Emits before/after counts per class.
- **Validation:** repair-dry-run-gate test (refuses without report/confirm); repair-idempotency test.
- **Code areas:** repair module; reuses retention audit writer.
- **Risks:** repair deletes a row that was not actually an orphan (false positive) → mitigate with a per-class allowlist of repair actions and a confirmation diff.
- **Status:** designed.

### FR-006 — Retention/DSAR interaction
- **Statement:** The audit must (a) treat legally-held retention rows (`data_retention_events` with `action='skipped_legal_hold'`) as NOT orphans even if their parent is gone, and (b) when DSAR erasure is later implemented, provide the per-user/per-workspace orphan query the erasure path must run to propagate deletes to R2.
- **Rationale:** PROMPT.md "interaction with retention/DSAR workflows"; `03` §5.
- **Source:** PROMPT.md; `03` §5.
- **Priority:** P1.
- **Dependencies:** FR-002.
- **Acceptance criteria:** (1) Audit report has a `legal_hold_excluded` count per class. (2) A documented query template exists for DSAR-scoped orphan detection (by `user_id`/`workspace_id`) that the future erasure path will call. (3) Audit does not delete retention-class rows.
- **Validation:** test with a planted legal-hold row; assert it is excluded from repair candidates.
- **Code areas:** audit module reads `data_retention_events`.
- **Risks:** DSAR erasure lands before the audit query template exists → mitigate by shipping the template in this pack.
- **Status:** designed.

### FR-007 — CI/operator cadence
- **Statement:** Define and wire a cadence: dry-run audit on preview D1+R2 after each migration apply; full audit weekly on prod; alert on non-zero P0 counts.
- **Rationale:** PROMPT.md "CI/operator cadence."
- **Source:** PROMPT.md.
- **Priority:** P1.
- **Dependencies:** FR-002, FR-004.
- **Acceptance criteria:** (1) A `cf:orphan-audit` script entry exists. (2) CI (when re-enabled) or an operator runbook step runs dry-run on preview post-migration. (3) Prod weekly run writes a redacted report to a known location and fails the run on P0>0.
- **Validation:** script-invocation test (dry-run on a seeded local D1); runbook step documented.
- **Code areas:** `package.json` script; `scripts/`; runbook in `13`.
- **Risks:** GitHub Actions currently disabled (`03`/fast-path) → runbook + manual gate until re-enabled.
- **Status:** designed.

### DATA-001 — Full-schema D1 harness
- **Statement:** Build a test/audit harness that applies all 38 migrations to a single in-memory `node:sqlite` instance, so orphan queries and cascade tests run against the real cumulative schema (not toy fixtures).
- **Rationale:** `03` §6 — no full-schema harness exists; the restore rehearsal uses only 5 toy tables.
- **Source:** `03` §6.
- **Priority:** P0.
- **Dependencies:** none.
- **Acceptance criteria:** (1) Harness applies `migrations/0001…0038` in order to `DatabaseSync(":memory:")`. (2) `PRAGMA foreign_key_check` returns 0 on an empty seeded DB. (3) Reusable by both orphan-detection tests and cascade-behavior tests.
- **Validation:** harness smoke test; migration-order test.
- **Code areas:** new test helper under `tests/` (or `src/lib/audit/`).
- **Risks:** migration order sensitivity → apply in numeric filename order; capture failures per migration.
- **Status:** designed.

### DATA-002 — FK enforcement readback
- **Statement:** The audit must readback `PRAGMA foreign_keys` from the live D1 connection and report whether enforcement is on or off, because all cascade declarations depend on it.
- **Rationale:** `03` §0 — the load-bearing unverified fact.
- **Source:** `03` §0; ORPH-015.
- **Priority:** P0.
- **Dependencies:** FR-002.
- **Acceptance criteria:** (1) Dry-run report includes `fk_enforcement: on|off|unknown`. (2) If off, report flags every CASCADE-dependent edge as "unverified."
- **Validation:** readback test against `node:sqlite` (toggleable) and a mock for hosted readback.
- **Code areas:** audit module.
- **Risks:** hosted D1 readback path differs from local → document both.
- **Status:** designed.

### DATA-003 — Track A: defense-in-depth explicit deletes
- **Statement:** Add explicit deletes for `estimate_sheet_events` and `estimate_sheet_adjustments` to the project-delete batch so correctness does not depend on transitive FK cascade.
- **Rationale:** O-1 (`03` §4.1); estimate-delete path already does this.
- **Source:** `03` §4.1, §4.2.
- **Priority:** P1.
- **Dependencies:** none (independent of OPEN-DEC-001).
- **Acceptance criteria:** (1) Project-delete batch deletes both tables explicitly. (2) Existing project-delete tests still pass. (3) With FK enforcement off, no `estimate_sheet_events`/`adjustments` rows survive project delete.
- **Validation:** cascade-off test using the harness from DATA-001.
- **Code areas:** `src/lib/projects/actions.ts` (batch region 602–754).
- **Risks:** batch size grows slightly → acceptable, still one atomic batch.
- **Status:** designed (implementation gated on this pack's approval).

### DATA-004 — Track B: enable + prove FK enforcement (gated)
- **Statement:** Enable `PRAGMA foreign_keys = ON` per D1 connection and prove cascade behavior with a test, IF OPEN-DEC-001 approves.
- **Rationale:** ORPH-015; makes declared cascades actually enforce.
- **Source:** `03` §0.
- **Priority:** P1 (gated on OPEN-DEC-001).
- **Dependencies:** OPEN-DEC-001.
- **Acceptance criteria:** (1) Worker sets the pragma on connection acquisition. (2) Cascade test: seed parent+child, delete parent, assert child gone (CASCADE) or null (SET NULL). (3) Pre-existing violations (if any) are surfaced by `PRAGMA foreign_key_check` before enabling, and the 0014 cluster (which has no FKs) is unaffected.
- **Validation:** cascade-behavior test suite using DATA-001 harness.
- **Code areas:** D1 connection helper (`src/lib/cloudflare/d1.ts`); test suite.
- **Risks:** enabling FKs can turn pre-existing silent orphans into hard errors → must run dry-run repair first.
- **Status:** designed; **gated** on OPEN-DEC-001.

### SEC-001 — Read-only guarantee
- **Statement:** Detection mode must be provably read-only at the D1 and R2 layer.
- **Rationale:** an audit that mutates state is a liability.
- **Source:** PROMPT.md mode.
- **Priority:** P0.
- **Dependencies:** FR-002.
- **Acceptance criteria:** (1) Detection uses only `SELECT`/`PRAGMA`/`R2.head`/`R2.list`. (2) A test wraps the D1/R2 stubs to fail on any `run()`/`delete()`/`put()` call in detection mode.
- **Validation:** instrumentation test.
- **Code areas:** audit module.
- **Risks:** a shared helper accidentally writes → type-level restriction (a `ReadOnlyD1` interface).
- **Status:** designed.

### SEC-002 — Redaction gate (alias of FR-004 acceptance)
- Covered by FR-004. Listed separately for traceability because it is a security control.

### SEC-003 — Repair authorization
- **Statement:** Repair runs only with an explicit operator secret/flag and only inside the bound Cloudflare resources.
- **Rationale:** AGENTS.md provider boundary; PROMPT.md owner gate.
- **Source:** AGENTS.md; PROMPT.md. **Source strength:** `repo evidence`.
- **Priority:** P0.
- **Dependencies:** FR-005.
- **Acceptance criteria:** (1) Repair refuses without `ORPHAN_AUDIT_REPAIR_TOKEN` env match (mirrors `CRON_SECRET` pattern). (2) The token is never persisted to a file, never logged, and is destroyed (unset) after the repair window. (3) Never touches resources outside `wrangler.jsonc` bindings.
- **Validation:** token-gate test (refuses without token); no-log assertion.
- **Code areas:** repair module.
- **Risks:** token leak → short-lived, operator-issued; rotation procedure documented in runbook.
- **Status:** designed.

### SEC-004 — Destroy-on-revoke for credential material (NEW, P0)
- **Statement:** On publication revoke/expire, `password_hash`, `encrypted_token`, and recipient/token material must be destroyed (set NULL or row-deleted), not merely flagged — because `password_hash` is a public-route-accepted scrypt hash, not a lookup key.
- **Rationale:** ORPH-014 + `08` credential taxonomy. Verified: `revokeProjectPublication` (`src/lib/publication/actions.ts:1012-1026`) only sets `status='revoked'`; the hash is retained and is accepted by `POST /api/share/[token]/password` (gated only by `isActivePublication`, `public-repository.ts:686`).
- **Source:** repo evidence (`actions.ts:1012-1026`, `public-repository.ts:686`, `security.ts:9,142-160`). **Source strength:** `repo evidence`.
- **Priority:** P0 (reclassified from prior draft's ORPH-014 P1).
- **Dependencies:** none (independent of OPEN-DEC-001).
- **Acceptance criteria:** (1) `revokeProjectPublication` nulls `password_hash` and `encrypted_token` on revoke (Track-A-style application patch). (2) ORPH-014 detection flags any `project_publications` row with `status='revoked'` AND non-null `password_hash` (selecting only `status`/presence, never the hash value — SEC-001 projection denylist). (3) Repair action for ORPH-014 = `set-password_hash-null` + `set-encrypted_token-null` on revoked rows (not delete-row — preserve the audit trail). (4) Denial test: a revoked publication's hash cannot unlock via the public route after the patch.
- **Validation:** revoke-clears-hash test; denial test against `POST /api/share/[token]/password`.
- **Code areas:** `src/lib/publication/actions.ts` (revoke path); audit detection (ORPH-014); repair (set-null action).
- **Risks:** nulling `password_hash` on a revoked pub later un-revoked would break unlock — mitigated: revoke is terminal (`revoked_at` monotonic; no un-revoke path).
- **Status:** designed (Track-A-class prevention task added to `11`).

### SEC-005 — Optional cron route auth gate (NEW, conditional)
- **Statement:** IF the optional `/api/internal/orphan-audit` cron route is implemented, it MUST validate `CRON_SECRET` (mirroring `/api/internal/upload-cleanup`) and MUST NOT be reachable without it; a gate test is mandatory before the route ships.
- **Rationale:** `08` residual-risk note; an unauthenticated integrity-probe endpoint is an abuse/exfil surface.
- **Source:** repo evidence (`src/app/api/internal/upload-cleanup` pattern); `Improve-Plan-Prompt.md:743-749`. **Source strength:** `repo evidence` + `derived`.
- **Priority:** P1 (conditional on the route being built).
- **Dependencies:** the optional cron route.
- **Acceptance criteria:** (1) Route returns 401 without `CRON_SECRET` match. (2) Gate test asserts refusal. (3) Abuse/rate-limit posture documented.
- **Validation:** gate test mirroring upload-cleanup route test.
- **Code areas:** optional route handler (not in core scope).
- **Risks:** route shipped without gate → abuse; mitigated by gate-as-prerequisite.
- **Status:** conditional (applies only if the route is built).

### SEC-006 — credentialVersion client-visible proof gate (NEW, P1)
- **Statement:** The `credentialVersion` derived from `password_hash` (22-char base64url SHA-256 slice, returned to the browser via `publication-access-v1` cookie + JSON) must have a proof gate asserting it is non-invertible and rotates on password change.
- **Rationale:** `Improve-Plan-Prompt.md:218-222` caps security readiness below 70 if a derived credential value reaches a client-visible surface without a source-cited reason + proof gate. Source-cited reason (cache-busting/credential-rotation signal) is in `08`'s taxonomy row.
- **Source:** repo evidence (`security.ts:194-196`, `password/route.ts:114-118`, `public-repository.ts:646,817`). **Source strength:** `repo evidence` + `derived`.
- **Priority:** P1.
- **Dependencies:** none.
- **Acceptance criteria:** (1) Test asserts `credentialVersion` changes when the password changes. (2) Test asserts the 22-char slice is structurally non-invertible (SHA-256 prefix). (3) `08` documents the source-cited reason it reaches the cookie.
- **Validation:** `tests/vitest/publication-credential-version.test.ts`.
- **Code areas:** `src/lib/publication/security.ts` (existing); new test.
- **Risks:** none beyond documentation.
- **Status:** designed (closes the standard's cap-rule exception).

### PERF-001 — Detection query cost budget
- **Statement:** Each orphan-detection query must use an index or a bounded scan; no full-table scan on a table expected to exceed 100k rows at 100x volume.
- **Rationale:** D1 query cost; `03` §1 cardinality.
- **Source:** `03`; `09`.
- **Priority:** P1.
- **Dependencies:** FR-002.
- **Acceptance criteria:** (1) Each detection query has an `EXPLAIN QUERY PLAN` artifact showing index use or a documented bounded-scan reason. (2) Regression threshold: query p95 ≤ 200ms at seeded 10x fixture volume.
- **Validation:** EXPLAIN capture in test; perf evaluator (see `09`).
- **Code areas:** audit module; perf fixture.
- **Risks:** missing index on a ref column → `0031_performance_indexes_additive.sql` may already cover; audit must verify.
- **Status:** designed.

### PERF-002 — R2 list() cost budget
- **Statement:** R2 reconciliation must be paginated, prefix-bounded, and scheduled off-peak; total Class B operations per run capped and reported.
- **Rationale:** R2 `list()` is metered; AGENTS.md free-tier posture.
- **Source:** `03` §3; `20`.
- **Priority:** P1.
- **Dependencies:** FR-003.
- **Acceptance criteria:** (1) `list()` paginated at ≤1000 keys/call. (2) Scoped to the three logical-bucket prefixes. (3) Run reports total `list()` call count and estimated Class B cost. (4) Hard cap aborts the scan if cost estimate exceeds an owner-set ceiling.
- **Validation:** fake-R2 pagination test; cost-cap abort test.
- **Code areas:** reconciliation module.
- **Risks:** unbounded growth → cap + sample-down.
- **Status:** designed.

### REL-001 — Partial-failure safety in repair
- **Statement:** Repair must be idempotent and safe to re-run after partial failure; a failed repair must leave the system no worse than before.
- **Rationale:** O-2/O-3 partial-failure gaps.
- **Source:** `03` §4.1.
- **Priority:** P0.
- **Dependencies:** FR-005.
- **Acceptance criteria:** (1) Each repair action is individually idempotent. (2) Repair writes a per-action audit row before/after. (3) Re-running repair on the same report produces zero changes.
- **Validation:** partial-failure injection test.
- **Code areas:** repair module.
- **Risks:** none beyond standard idempotency.
- **Status:** designed.

### OPS-001 — Runbook + alerting
- **Statement:** An operator runbook documents how to run dry-run, read the report, gate repair, and what to do on P0>0.
- **Rationale:** PROMPT.md cadence; AGENTS.md ops posture.
- **Source:** PROMPT.md.
- **Priority:** P1.
- **Dependencies:** FR-007.
- **Acceptance criteria:** (1) Runbook in `13_ROLLOUT_ROLLBACK_AND_OPERATIONS.md`. (2) Alert threshold defined (P0>0). (3) Escalation path to owner.
- **Validation:** runbook review.
- **Code areas:** docs only.
- **Risks:** runbook drifts → keep it next to the script.
- **Status:** designed.

### TEST-001 — Seeded-fixture orphan detection test
- **Statement:** A test plants known orphans of each class (A/B/C/D) into the harness DB + fake R2 and asserts the detector reports exactly those.
- **Rationale:** proves no false negatives/positives.
- **Source:** `12`.
- **Priority:** P0.
- **Dependencies:** DATA-001, FR-002.
- **Acceptance criteria:** (1) One fixture per ORPH-001…015 target. (2) Detector output matches expected set.
- **Validation:** the test itself.
- **Code areas:** `tests/vitest/orphan-audit-detection.test.ts`.
- **Risks:** fixture maintenance → derive from manifest (FR-001).
- **Status:** designed.

### TEST-002 — Read-only instrumentation test
- **Statement:** A test asserts detection makes zero D1 writes and zero R2 mutations.
- **Rationale:** SEC-001.
- **Source:** SEC-001.
- **Priority:** P0.
- **Dependencies:** FR-002.
- **Acceptance criteria:** stubs throw on `run/delete/put`; detection completes.
- **Validation:** the test itself.
- **Code areas:** `tests/vitest/orphan-audit-read-only.test.ts`.
- **Status:** designed.

### TEST-003 — Redaction test
- **Statement:** A test scans sample reports for secret-like patterns and fails on any hit.
- **Rationale:** FR-004/SEC-002.
- **Source:** FR-004.
- **Priority:** P0.
- **Dependencies:** FR-004.
- **Acceptance criteria:** regex over report JSON; zero hits.
- **Code areas:** `tests/vitest/orphan-audit-redaction.test.ts`.
- **Status:** designed.

### TEST-004 — Cascade-behavior test (Track B)
- **Statement:** If OPEN-DEC-001 approves, a test seeds parent+child and asserts cascade/SET NULL after parent delete.
- **Rationale:** DATA-004.
- **Source:** DATA-004.
- **Priority:** P1 (gated).
- **Dependencies:** DATA-001, DATA-004, OPEN-DEC-001.
- **Acceptance criteria:** one assertion per declared cascade edge.
- **Code areas:** `tests/vitest/d1-cascade-behavior.test.ts`.
- **Status:** designed; gated.

### DOC-001 — Ownership manifest published
- **Statement:** The generated ownership manifest is checked into the repo (or generated in CI) and referenced by the runbook.
- **Rationale:** FR-001.
- **Source:** FR-001.
- **Priority:** P2.
- **Dependencies:** FR-001.
- **Acceptance criteria:** manifest file exists; referenced from runbook.
- **Status:** designed.

### ARCH-001 — Audit module placement
- **Statement:** The audit module lives under `src/lib/audit/orphan/` with a clear port for the D1/R2 provider (local `node:sqlite` vs hosted Cloudflare).
- **Rationale:** repository-boundary pattern; testability.
- **Source:** repo conventions.
- **Priority:** P1.
- **Dependencies:** none.
- **Acceptance criteria:** module path; port interface; two adapters.
- **Status:** designed.

## Shadow-path matrix (audit + repair flows)

| Flow | Happy path | Nil/missing input | Empty input/result | Invalid input | Auth denied | Upstream/network error | Concurrency/race | Retry/idempotency | User-visible result | Test |
|---|---|---|---|---|---|---|---|---|---|---|
| Dry-run detection | report file written | error: missing binding | empty report (0 orphans) | error: bad threshold | n/a (operator-only) | partial report + logged gap | two dry-runs = same result (read-only) | re-run idempotent | report path printed | TEST-001 |
| R2 reconciliation | set-diff report | error: missing R2 binding | empty sets | error: bad prefix | n/a | paginated resume | same as above | re-run idempotent | counts printed | FR-003 test |
| Repair | before/after diff | refuse: no `--from-report` | refuse: report has 0 orphans | refuse: report schema mismatch | refuse: no token | per-action retry, idempotent | lock per class | re-run = no-op | diff printed | REL-001 test |
| Report readback | JSON parse | error: corrupt file | empty report | error: wrong version | n/a | n/a | n/a | n/a | parsed | TEST-003 |

Every applicable shadow-path cell is answered or marked n/a with reason.
