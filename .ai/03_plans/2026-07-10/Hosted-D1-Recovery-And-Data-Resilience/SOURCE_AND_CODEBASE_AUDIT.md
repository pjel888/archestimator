# Source And Codebase Audit

## Source Ledger

| ID | Source | Status | Relevant claim |
| --- | --- | --- | --- |
| `SRC-001` | `.ai/02_audits/archestimator_beta_readiness_audit_2026-07-10.md:608-641,752,1000-1042,1141-1149` | Current planning input | Hosted export-to-disposable-D1 recovery is a P0 gate. |
| `SRC-002` | `scripts/generate-cloudflare-d1-restore-rehearsal.ts:38-58,324-347` | Current source observation | Report is deliberately `localOnly:true`, `providerBacked:false`. |
| `SRC-003` | `scripts/check-cloudflare-d1-auth-realtime-readiness.ts:1169-1187` | Current source observation | Restore gate checks ready booleans but does not require provider-backed or reject local-only proof. |
| `SRC-004` | `tests/vitest/cloudflare-d1-restore-rehearsal-script.test.ts:18-30`; `tests/vitest/cloudflare-d1-auth-realtime-readiness-script.test.ts:474-535` | Current test observation | Tests preserve local truth and contain provider-backed fixtures, but do not catch the gate's false-positive predicate. |
| `SRC-005` | `migrations/0001_closed_beta_feedback.sql` through current workspace `migrations/0052_corporate_accounts.sql`; `wrangler.jsonc` | Current source observation | Active D1 schema, the concurrent untracked migration tail observed during planning, and bound resource identity for validation. |
| `SRC-006` | `src/lib/auth/better-auth-cloudflare.ts:188-260`; `src/lib/authz/d1-access.ts`; `scripts/generate-cloudflare-d1-authz-access-matrix.ts` | Current security observation | Recovery must verify access isolation and decide treatment of restored sessions. |

## Explicit Assumptions

- `ASSUMP-001`: provider credentials can authorize a temporary, unrouted,
  operator-only disposable D1 target in the same bound Archestimator account;
  this is not treated as true until `AUTH-001` discovery confirms account,
  target, ingress, and cleanup scope.
- `ASSUMP-002`: the active D1 schema and data types are export/import compatible
  within current provider limits. The hosted rehearsal must measure and verify
  that claim; an unsupported feature, size limit, or checksum mismatch blocks
  recovery readiness instead of being waived.

## Current State And Defect

The local rehearsal is useful: it creates sanitized SQLite fixtures, dumps/imports SQL, compares rows/checksums, runs foreign-key checks, and removes temporary files. Its report accurately says it does not call Cloudflare, create D1 databases, deploy Workers, or prove hosted recovery.

The consuming readiness gate is weaker than the producer's truth. It can report `d1-restore-rehearsal` ready when `d1ExportReady`, `d1ImportReady`, `restoreRehearsalReady`, and `destructiveRestoreDocumented` are true even if `localOnly` is true and `providerBacked` is false. That must be locked with a failing regression before the predicate changes.

## Official Provider Constraints

Accessed 2026-07-10; official docs define capabilities and risks, not completed proof.

- Cloudflare [D1 Time Travel](https://developers.cloudflare.com/d1/reference/time-travel/) is always enabled on production-backend databases, retains seven days on Workers Free and 30 days on Paid, restores destructively in place, cancels in-flight work, returns a prior bookmark for undo, and cannot clone/fork a database. It is not the safe first rehearsal on `ARCH_DB`.
- D1 [import/export guidance](https://developers.cloudflare.com/d1/best-practices/import-export-data/) supports SQL export/import but export blocks other database requests, import is limited to 5 GB, virtual tables are unsupported, and large integers have documented caveats. The runbook must measure/export during a controlled window and validate affected data types.
- D1 [platform limits](https://developers.cloudflare.com/d1/platform/limits/) cap a Free database at 500 MB, total Free account storage at 5 GB, and imports at 5 GB. The runner must also read the current database count and provider-reported Free database-count limit before creating a disposable target; no failed limit may enable a paid plan or continue optimistically.
- Cloudflare [Wrangler D1 commands](https://developers.cloudflare.com/d1/wrangler-commands/) document export, execute/import, migrations, and Time Travel. A migration backup/rollback is not disaster-recovery proof.
- Cloudflare's [D1-to-R2 Workflow example](https://developers.cloudflare.com/workflows/examples/backup-d1/) is explicitly simplified. Any scheduled retention extension requires separate production design, bounded R2 access, monitoring, and restore proof.

## Better Auth Recovery Boundary

Better Auth's [session documentation](https://better-auth.com/docs/concepts/session-management) and [database schema](https://better-auth.com/docs/concepts/database) describe a database `session.token` used by the session cookie, seven-day default expiry, and revoke-current/other/all APIs. The docs do not claim hashing/encryption for the database token. Inference: a D1 export can contain bearer-equivalent tokens, and restoring an older database can reintroduce sessions revoked after the restore point. Recovery proof must never publish the export and must explicitly invalidate or accept restored sessions before traffic.

## Target Contract Index

Source/provider facts remain here; target design is separated for independent
review:

- `PROVIDER_CAPABILITY_AND_CONSTRAINTS.md`: current provider capabilities,
  free-tier limits, identity invariants, external proof boundary, and failures.
- `RECOVERY_ARTIFACT_SCHEMA_AND_DATA_INTEGRITY.md`: strict receipt schema,
  migration/schema/data/domain checks, encryption, idempotency, and consumers.
- `RESTORE_ORCHESTRATION_AND_DISPOSABLE_INGRESS_THREAT_MODEL.md`: phase ordering,
  run-scoped resource lifecycle, request-bound HMAC, denials, and crash cleanup.
- `SESSION_AUTHZ_AND_APPLICATION_INTEGRITY_PROOF.md`: offline restored-session
  invalidation, application target marker, authz/tenant denial, and controlled
  write rollback.
- `RTO_RPO_PERFORMANCE_AND_FAILURE_MODEL.md`: milestone definitions, measured
  evaluators, run-specific stop thresholds, and failure recovery.
- `PROVIDER_REHEARSAL_TEST_PLAN.md`, `RUNBOOK_ROLLBACK_CLEANUP_AND_INCIDENT.md`,
  and `AUTHORIZATION_PACKET_AND_FINAL_AUDIT.md`: proof, runbook, authorization,
  absence readback, handback, and final requirement audit.

## Evidence Classes And Freshness

- `EVID-001`: collected plan/source audit; stale on source/schema/provider-doc changes.
- `EVID-002`: planned verification/rehearsal artifact; invalid until hosted execution.
- Local unit tests can prove fail-closed predicates and orchestration parsing.
- Temp/local D1 can prove query/check mechanics.
- Only Cloudflare control-plane and disposable-target evidence can prove provider-backed recovery.
- The release program defines the maximum evidence age; any schema migration, auth/session contract change, binding change, or failed cleanup invalidates the prior artifact immediately.

## Baseline And Stale Triggers

Re-audited at current HEAD
`e373bc865b978e237deb1d92011c96b0a3639fb4`. The concurrent untracked
`migrations/0051_profiles_account_status.sql` first advanced the observed tail
beyond 0050 and invalidated generation 2. The later concurrent
`migrations/0052_corporate_accounts.sql` then occupied Publisher's generation-3
slot and invalidated that receipt before any planned owner claimed it. The
Program therefore supersedes generation 3 with generation 4 and reissues the
five provisional owner slots as 0053..0057. No recovery implementation or
provider claim is inferred from either concurrent migration. This audit remains
planning evidence only; scoped status/diff hashes are recomputed from the
settled current workspace before freeze using `PLAN-PACK-SCOPED-BASELINE-v1`.

Ordered literal pathspecs:

1. `scripts`
2. `tests/vitest`
3. `migrations`
4. `src/lib/auth`
5. `src/lib/authz`
6. `src/lib/observability`
7. `wrangler.jsonc`
8. `package.json`
9. `bun.lock`

Refresh on changes to migrations, D1 bindings/account, restore producer/schema, readiness/release gates, Better Auth version/config, session/access predicates, official D1 limits, source database size/features, or incident/recovery policy.
