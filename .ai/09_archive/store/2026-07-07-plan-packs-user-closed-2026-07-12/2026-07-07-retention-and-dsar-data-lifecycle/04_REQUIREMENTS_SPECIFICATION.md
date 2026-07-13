# 04 — Requirements Specification

Every requirement has a stable `REQ-<domain>-<n>` ID, objective acceptance criteria, a validation method, affected code areas, and shadow-path coverage. Priority: `P0` (blocks release/proof), `P1` (important), `P2` (polish/deferred). Source strength legend: `brief` (PROMPT), `repo` (current source), `doc` (`.ai/` doc), `official` (framework/provider docs), `derived` (synthesized from evidence), `owner` (owner-delegated planning decision).

Status values: `pending`, `planned`, `blocked-external`, `deferred`, `out-of-scope`.

---

## REQ-INV — Data inventory

### REQ-INV-001 — Codified per-class data inventory (P0)
- **Statement**: A single inventory maps every retention/DSAR-relevant D1 table + R2 namespace + log surface to its data class, PII classification, owner, source, and current lifecycle state.
- **Rationale**: PROMPT requires "data inventory"; the schedule doc lists classes but not the full table→class map.
- **Source**: `brief` + `doc` (`retention-schedule.md`).
- **Acceptance**:
  - The inventory (in `07_` §inventory) lists all 14 retention classes + their backing tables/namespaces + PII flag.
  - It includes `beta_feedback_submissions`, `legal_terms_acceptances`, `user_onboarding_profiles.marketing_consent_at`, `profiles`, `publication_digest_log`, `mass_deletion_events` (the non-`RetentionClassName` tables that still hold personal data).
  - Each row names the data owner (workspace / platform / processor-managed).
- **Validation**: doc review; cross-check against `migrations/` table list.
- **Affected code areas**: none (planning artifact); informs `07_` and the DSAR export builder scope.
- **Risks**: missing a personal-data table → incomplete DSAR export.
- **Status**: `planned` (Phase 0).

---

## REQ-RET — Retention policy and TTLs

### REQ-RET-001 — Single source of truth for TTLs (P0)
- **Statement**: TTL values are defined in exactly one place (a code constant today; optionally a `retention_policy` D1 table in a later phase), and every rule reads from it. The schedule doc and code never drift.
- **Source**: `repo` (`DEFAULT_RETENTION_RULES`) + `doc` (`retention-schedule.md`).
- **Acceptance**: exactly one constant/object owns the TTLs; the schedule doc links to it; no duplicate TTL literals scattered.
- **Validation**: `rg` for TTL literals confirms one source.
- **Affected**: `src/lib/compliance/retention-core.ts`.
- **Status**: `planned` (Phase 1).

### REQ-RET-002 — TTL values pinned to draft schedule pending OPEN-DEC-004 (P0)
- **Statement**: TTLs default to the draft schedule (`retention-schedule.md`). No TTL is presented as final policy. The constant carries a `DRAFT — pending OPEN-DEC-004` marker. After sign-off, values update in one place.
- **Source**: `doc` + `owner`.
- **Acceptance**: constant docstring states draft status; `15_` records `OPEN-DEC-004` as the gate; no compliance claim in code/docs.
- **Validation**: doc review.
- **Status**: `planned` (Phase 1); `blocked-external` for the *final* values (`OPEN-DEC-004`).

### REQ-RET-003 — All 14 retention classes enforced (P0)
- **Statement**: `DEFAULT_RETENTION_RULES` contains one entry per `RetentionClassName`. The 7 currently-missing classes (`ai_action_runs`, `ai_tool_calls`, `ai_data_access_events`, `logs_worker_observability`, `logs_email_delivery`, `uploads_orphaned`, `sessions_expired`) each have a rule with a defined action.
- **Source**: `repo` (type union vs registry mismatch).
- **Acceptance**: registry length === 14; each class tested.
- **Validation**: unit test asserting 14 rules.
- **Affected**: `src/lib/compliance/retention-core.ts`.
- **Status**: `planned` (Phase 1).
- **Notes**:
  - `logs_worker_observability` and `logs_email_delivery` rules write an **acceptance row** (`action: "purged"`, `rows_affected: 0`, note `platform-managed`) because the engine cannot purge platform logs; this records the operator's acceptance of the platform TTL.
  - `sessions_expired` accepts Better Auth's own session expiry (no D1 sweep needed if Better Auth handles it); the rule is a documented no-op acceptance unless a D1-side reference table exists.
  - `uploads_orphaned` reuses the existing upload-cleanup job's definition of "orphaned" (no associated record) and writes a `data_retention_events` row referencing the upload-cleanup correlation.

### REQ-RET-004 — Non-purge actions wired (P1)
- **Statement**: Where the schedule calls for `anonymized`/`tombstoned`/`soft_deleted`, the engine supports them with distinct SQL semantics (UPDATE not DELETE), and `skipped_legal_hold` honors a `legal_hold` flag when present.
- **Source**: `doc` (class-action matrix).
- **Acceptance**: DSAR erasure uses `anonymized` on audit tables; `soft_deleted` on `profiles`; `skipped_legal_hold` when `legal_hold=1` and the column exists.
- **Validation**: unit + repository tests per action.
- **Affected**: `src/lib/compliance/retention-core.ts`, new `anonymize`/`soft-delete` helpers.
- **Status**: `planned` (Phase 1 for `anonymized`/`soft_deleted`; Phase 2 for `skipped_legal_hold` gated on `OPEN-DEC-006`).

### REQ-RET-005 — Legal-hold support (P1, gated)
- **Statement**: A `legal_hold` column (or side-table) allows marking rows exempt from purge. When set, the retention pass records `skipped_legal_hold` instead of deleting.
- **Source**: `doc` (action enum) + `owner` (policy).
- **Acceptance**: setting `legal_hold=1` prevents purge; audit row records skip + reason; unset allows normal purge.
- **Validation**: repository test (hold vs no-hold).
- **Affected**: new migration; `retention-core.ts`.
- **Status**: `planned` (Phase 2) but **policy blocked on `OPEN-DEC-006`** (who can set, scope).

---

## REQ-DSAR — DSAR lifecycle

### REQ-DSAR-001 — Admin triage workflow (P0)
- **Statement**: A platform-admin can list, read, and transition a `privacy_requests` row through `submitted → in_triage → in_progress → completed | rejected`, with every transition audited (actor, timestamp, reason).
- **Source**: `repo` (intake exists, transitions absent) + `doc` (roadmap P1.8).
- **Acceptance**:
  - New repo functions `transitionPrivacyRequest(id, toStatus, actor, reason)` enforce the legal transition graph.
  - Illegal transitions are rejected with a typed error.
  - Each transition writes an audit row (to `data_retention_events` class `privacy_request_triage`, a new class, or a dedicated `privacy_request_events` table — see `07_`).
  - Admin route/action is platform-admin-gated; workspace-scoped users get 403/404.
- **Validation**: repo unit tests (all transitions + illegal ones) + role-matrix denial test.
- **Affected**: `src/lib/compliance/privacy-request-repository.ts`, new admin route/action, new audit write.
- **Status**: `planned` (Phase 2).

### REQ-DSAR-002 — DSAR export (data-subject package) (P0)
- **Statement**: For an `access` or `portability` request, an admin action builds a structured data-subject package containing all personal data held for the requester (across workspaces), with a defined format, size cap, and rate limit.
- **Source**: `brief` ("DSAR export/delete workflow") + `repo` (proposal-export pattern).
- **Acceptance**:
  - Export covers: `profiles` row, `user_onboarding_profiles`, `legal_terms_acceptances`, `beta_feedback_submissions`, `account_security_events` (metadata, not raw IP), `collaboration_audit_events` (actor-labeled), `estimate_sheet_events` (actor-labeled), `shared_link_events`/`shared_link_recipients` (where requester is recipient), `upload_assets`/`upload_sessions` metadata, `project_members`/`estimate_sheet_members`/`workspace_members` membership rows, AI audit rows (`ai_action_runs` etc. actor-scoped).
  - Format: JSON (default); optional CSV/ZIP per `OPEN-DEC-008`. Size cap + node/row caps modeled on proposal-export.
  - Rate-limited per admin + per target user.
  - Output is stored as a signed R2 URL (short TTL) or in-app download — per `OPEN-DEC-008`.
- **Validation**: builder unit test (fixture user → expected package keys); integration test (D1 fixture → package); rate-limit denial test.
- **Affected**: new `src/lib/compliance/dsar-export-builder.ts`, admin action, R2 delivery.
- **Status**: `planned` (Phase 3); **format/delivery blocked on `OPEN-DEC-008`** (default JSON + signed R2 URL is the recommended interim).

### REQ-DSAR-003 — DSAR erasure propagation (P0)
- **Statement**: For an `erasure` request that reaches `completed`, the system propagates erasure across the personal-data surface: soft-delete/anonymize `profiles` + Better Auth `user` revocation; anonymize actor fields on audit tables; tombstone + delayed-purge R2 uploads owned by the user; keep the `privacy_requests` row as evidence.
- **Source**: `doc` (`retention-schedule.md:48-54`) + `repo` (mass-deletion pattern).
- **Acceptance**:
  - A propagation map (`07_`) lists each target table + the action (`soft_deleted` / `anonymized` / `tombstoned` / `kept`).
  - The erasure orchestrator runs the map inside a correlation ID (reuse `createBulkActionCorrelationId`), writes a `data_retention_events` row per class affected, and records an R2 tombstone list.
  - Idempotent: re-running with the same `privacy_request_id` does not double-affect rows (uses status guard + correlation ID).
  - Better Auth: `user` is soft-deleted (e.g., email scrambled to `erased:<request_id>@local`, `deleted_at` set via Better Auth API or a privacy ledger), and all `session`/`account`/`verification` rows for the user are revoked/expired.
  - `privacy_requests` row kept as evidence (per schedule).
- **Validation**: orchestrator unit test (fixture → expected propagation); R2 receipt test; idempotency test; denial test (non-admin).
- **Affected**: new `src/lib/compliance/dsar-erasure-orchestrator.ts`, new migration(s), R2 path.
- **Status**: `planned` (Phase 4); **identity-verification threshold blocked on `OPEN-DEC-007`** (wrongful-erasure risk).

### REQ-DSAR-004 — DSAR intake rate limit + identity (P1, exists)
- **Statement**: The existing public intake keeps its per-email/per-IP rate limit, HMAC-hashed PII, and 16 KiB cap. (No change required; documented for completeness.)
- **Source**: `repo`.
- **Acceptance**: existing tests remain green; no regression.
- **Validation**: existing `tests/vitest/` privacy-request tests.
- **Status**: `planned` (verify, Phase 0).

---

## REQ-CRON — Cron proof

### REQ-CRON-001 — Env-gated dry-run vs apply (P0)
- **Statement**: The retention pass in `worker.ts` honors an env flag (`RETENTION_DRY_RUN=1` → dry-run, no deletes) so staging can be proven before apply. Default is dry-run until the operator explicitly enables apply.
- **Source**: `repo` (upload-jobs already has this; retention does not).
- **Acceptance**: with `RETENTION_DRY_RUN=1`, no `DELETE`/`UPDATE` runs and audit rows record `skipped: dry-run`; with `RETENTION_DRY_RUN=0` + `RETENTION_ENABLED=1`, apply runs.
- **Validation**: worker unit/integration test (mock env).
- **Affected**: `worker.ts`, `retention-core.ts`/`retention-repository.ts`.
- **Status**: `planned` (Phase 5).

### REQ-CRON-002 — Per-run audit + idempotency (P0)
- **Statement**: Each cron run writes `data_retention_events` rows tagged with a `cron_run_id`; re-runs within the same idempotency window do not double-affect rows.
- **Source**: `repo` (`cronRunId` already passed).
- **Acceptance**: `cron_run_id` populated; idempotency key prevents duplicate deletes within the same run.
- **Validation**: repository test.
- **Affected**: `retention-core.ts`.
- **Status**: `planned` (Phase 5).

### REQ-CRON-003 — Hosted 30-day observation gate (P0)
- **Statement**: Before any compliance claim, the deployed Worker must have run the retention cron for 30 consecutive days with `data_retention_events` rows present and zero (or below-threshold) `skipped: error` rows.
- **Source**: `doc` (P1.8 acceptance: "cron runs for 30 days without error").
- **Acceptance**: hosted query returns ≥30 distinct `ran_at` days; error-skip count below threshold (default 0).
- **Validation**: hosted D1 query (provider-backed proof).
- **Affected**: none (observation).
- **Status**: `planned` (Phase 5 gate); **hosted proof required**.

---

## REQ-R2 — R2 deletion proof

### REQ-R2-001 — DSAR R2 tombstone + delayed purge (P0)
- **Statement**: DSAR erasure of a user's uploads tombstones the R2 object metadata immediately and purges the object after a 30-day window (per schedule), with a receipt written to R2 (`provider-proof/dsar/<requestId>.json`) and a `data_retention_events` row.
- **Source**: `doc` (schedule: "tombstone metadata, keep file for 30 days then purge") + `repo` (provider-proof pattern).
- **Acceptance**: tombstone metadata set at T0; object deleted at T0+30d; receipt exists; re-running erasure is idempotent.
- **Validation**: R2 receipt test + cron-driven purge test.
- **Affected**: new migration (`upload_assets.dsar_erased_at`/`dsar_purge_after`), DSAR orchestrator, cron hook.
- **Status**: `planned` (Phase 4).

### REQ-R2-002 — R2 deletion receipt format (P1)
- **Statement**: The receipt is a structured JSON object (request ID, correlation ID, affected object keys, tombstone timestamp, purge-after timestamp, actor, status) stored under `provider-proof/dsar/<requestId>.json`.
- **Source**: `repo` (provider-proof pattern).
- **Acceptance**: receipt schema documented in `07_`; written for every erasure.
- **Validation**: receipt schema test.
- **Status**: `planned` (Phase 4).

---

## REQ-LOG — Log retention boundaries

### REQ-LOG-001 — Workers Observability retention documented + observed (P1)
- **Statement**: Cloudflare Workers Observability log retention (default ~3–30d depending on plan) is documented as the boundary for `logs_worker_observability`; the engine records an acceptance row; no claim that the engine purges platform logs.
- **Source**: `official` (Cloudflare docs) + `doc`.
- **Acceptance**: `18_` states the platform TTL; `data_retention_events` records acceptance; no false purge claim.
- **Validation**: doc review + hosted readback of observability config.
- **Status**: `planned` (Phase 1 + `13_` proof).

### REQ-LOG-002 — Email delivery log retention documented (P1)
- **Statement**: Cloudflare Email delivery logs (90d per schedule) are documented as platform-managed; acceptance recorded.
- **Source**: `doc`.
- **Acceptance**: same as REQ-LOG-001 for `logs_email_delivery`.
- **Status**: `planned` (Phase 1).

### REQ-LOG-003 — Structured-log redaction (P1)
- **Statement**: Worker structured logs (`worker.ts`, retention pass, DSAR actions) redact PII; logs never include raw emails, IPs, tokens, or `metadata_json` contents beyond aggregate counts.
- **Source**: `repo` (existing opaque logging pattern).
- **Acceptance**: log-grep test for fixture PII strings returns nothing.
- **Status**: `planned` (Phase 5/6).

---

## REQ-EVID — Evidence format

### REQ-EVID-001 — Unified retention/DSAR audit trail (P0)
- **Statement**: All retention + DSAR actions write to `data_retention_events` (with new classes for DSAR triage/export/erasure). `upload_events` remains upload-domain detail. The evidence format (columns, class enums, action enums, metadata schema) is documented in `07_`.
- **Source**: `brief` ("evidence format") + `repo`.
- **Acceptance**: every retention/DSAR action produces a queryable audit row; `07_` documents the schema.
- **Status**: `planned` (Phase 1 + DSAR phases).

### REQ-EVID-002 — Operator-visible runbook + dashboard queries (P1)
- **Statement**: `13_` provides SQL queries for the operator dashboard (last run, error-skip count, backlog by class, DSAR queue, R2 purge backlog) and a runbook for common incidents.
- **Source**: `brief`.
- **Acceptance**: queries runnable against D1; runbook covers cron-failure, erasure-failure, R2-purge-failure, legal-hold conflict.
- **Status**: `planned` (`13_`).

---

## REQ-LEGAL — Legal/owner signoff points

### REQ-LEGAL-001 — OPEN-DEC-004 isolated (P0)
- **Statement**: Final TTL values are gated on `OPEN-DEC-004`. The pack presents draft values and never claims policy status.
- **Source**: `doc`.
- **Status**: `blocked-external` for final values.

### REQ-LEGAL-002 — OPEN-DEC-002 isolated (P1)
- **Statement**: DSAR email confirmation (intake → requester) is gated on `OPEN-DEC-002` (privacy-notice wording). The pack designs the send path but marks it disabled until sign-off.
- **Status**: `planned` (Phase 2, disabled-by-default).

### REQ-LEGAL-003 — New gates OPEN-DEC-006/007/008 (P1)
- **Statement**: Legal-hold policy (`OPEN-DEC-006`), DSAR SLA + identity-verification threshold (`OPEN-DEC-007`), export format/delivery (`OPEN-DEC-008`) are recorded in `15_` with options + recommendations.
- **Status**: `blocked-external` for the policy decisions; `planned` for the interim defaults.

---

## REQ-TEST — Tests

### REQ-TEST-001 — Full test coverage (P0)
- **Statement**: Every REQ with runtime behavior has a test entry in the `12_` matrix (unit/repository/role-matrix/denial/cron-dry-run-vs-apply/R2-receipt/adversarial).
- **Source**: `brief` ("tests") + directive.
- **Acceptance**: `12_` matrix complete; no REQ untraced.
- **Status**: `planned` (Phase 6).

---

## Shadow-path matrices

### Matrix A — Privacy request intake (existing POST `/api/compliance/privacy-requests`)

| Flow | Happy path | Nil/missing input | Empty input/result | Invalid input | Auth denied | Upstream/network error | Concurrency/race | Retry/idempotency | User-visible result | Test |
|---|---|---|---|---|---|---|---|---|---|---|
| Intake | 201 `{id,status,createdAt}` | 400 missing kind/description | 400 empty description | 400 bad kind | N/A (anonymous) | 500 opaque; reservation released | Rate limit reserve+release atomic | Reserve-release on validation fail; idempotent only via rate-limit window | Opaque success/error message | existing + new denial test |

### Matrix B — Admin triage transition

| Flow | Happy path | Nil/missing input | Empty input/result | Invalid input | Auth denied | Upstream/network error | Concurrency/race | Retry/idempotency | User-visible result | Test |
|---|---|---|---|---|---|---|---|---|---|---|
| Transition | 200 updated status + audit row | 404 unknown request id | N/A | 409 illegal transition | 403/404 non-admin | 500; status unchanged | Optimistic guard on status | Idempotent only if same transition + reason hash | Admin UI status change | repo unit + role-matrix denial |

### Matrix C — DSAR export

| Flow | Happy path | Nil/missing input | Empty input/result | Invalid input | Auth denied | Upstream/network error | Concurrency/race | Retry/idempotency | User-visible result | Test |
|---|---|---|---|---|---|---|---|---|---|---|
| Export | 200 package/signed URL | 404 unknown user | 200 empty package (no data) | 400 bad format | 403/404 non-admin | 500; partial package discarded | Rate limit per admin+target | Same request id returns cached package within TTL | Admin download link | builder unit + integration + rate-limit |

### Matrix D — DSAR erasure

| Flow | Happy path | Nil/missing input | Empty input/result | Invalid input | Auth denied | Upstream/network error | Concurrency/race | Retry/idempotency | User-visible result | Test |
|---|---|---|---|---|---|---|---|---|---|---|
| Erasure | 200 propagation complete + receipt | 404 unknown user | 200 no-op (already erased) idempotent | 400 bad confirmation phrase | 403/404 non-admin | 500; partial rollback via correlation; R2 tombstones reversible within 30d | Correlation guard prevents double-run | Re-run same request id → idempotent (status guard) | Admin confirmation dialog + audit | orchestrator unit + R2 receipt + idempotency + denial |

### Matrix E — Retention cron pass

| Flow | Happy path | Nil/missing input | Empty input/result | Invalid input | Auth denied | Upstream/network error | Concurrency/race | Retry/idempotency | User-visible result | Test |
|---|---|---|---|---|---|---|---|---|---|---|
| Cron | Audit rows per class; deletes applied | N/A (cron-driven) | Skipped classes with 0 rows | Bad rule SQL → skipped+error note | Worker-only (no public surface) | D1 error → skipped+error; next run catches up | Single-run lock via cron_run_id | Idempotent within run via select-then-delete | Worker log + audit rows | cron dry-run vs apply + error-injection |

### Matrix F — R2 DSAR tombstone+purge

| Flow | Happy path | Nil/missing input | Empty input/result | Invalid input | Auth denied | Upstream/network error | Concurrency/race | Retry/idempotency | User-visible result | Test |
|---|---|---|---|---|---|---|---|---|---|---|
| Tombstone | metadata set; receipt written | 404 no uploads | 200 no-op | bad object key → rejected | Worker/admin only | R2 delete fails → retried by next cron; status `purge_retry` | One tombstone per object per request | Re-run idempotent | Admin audit + receipt | R2 receipt test + purge-retry test |

---

## Credential-material taxonomy (DSAR + retention surface)

The DSAR/retention surface touches these distinct credential materials. None are raw-bearer URL materials except share tokens (existing, unchanged).

| Material | Raw/hash/encrypted/derived/public marker | Created by | Stored in | Read by | Client-visible? | Used for URL/cookie/session? | Rotation/revocation | Proof |
|---|---|---|---|---|---|---|---|---|
| `AUTH_AUDIT_HASH_PEPPER` | raw secret (env) | operator | Wrangler secret | `account-audit.ts` (server-only) | No | No | operator rotates; rehash backlog | `wrangler secret list` + prod-fail-closed test |
| Privacy requester email hash | derived (HMAC-SHA256) | intake route | `privacy_requests.requester_email_hash` | admin triage (server) | No | No | pepper rotation rehashes | repo test |
| DSAR export signed R2 URL | raw bearer (short TTL) | export action | R2 + signed URL | admin (delivery) | Yes (admin only) | Yes (download link) | TTL expiry | signed-URL TTL test |
| Share/publication tokens (unchanged) | raw hash + AES encrypted | `publication/security.ts` | `project_publications` | share route | Yes (recipient) | Yes (share URL) | revoke publication | existing tests |
| `AUTH_AUDIT_HASH_PEPPER` (DSAR erasure) | raw secret | operator | Wrangler secret | DSAR orchestrator (anonymize) | No | No | rotate rehashes actor fields | prod-fail-closed test |

No new client-visible raw bearer material is introduced beyond the DSAR export signed URL (admin-scoped, short TTL).
