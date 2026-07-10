# Source And Codebase Audit

## Source Ledger

| ID | Source | Status | Relevant claim |
| --- | --- | --- | --- |
| `SRC-001` | `.ai/02_audits/archestimator_beta_readiness_audit_2026-07-10.md:608-641,752,1000-1042,1141-1149` | Current planning input | Hosted export-to-disposable-D1 recovery is a P0 gate. |
| `SRC-002` | `scripts/generate-cloudflare-d1-restore-rehearsal.ts:38-58,324-347` | Current source observation | Report is deliberately `localOnly:true`, `providerBacked:false`. |
| `SRC-003` | `scripts/check-cloudflare-d1-auth-realtime-readiness.ts:1169-1187` | Current source observation | Restore gate checks ready booleans but does not require provider-backed or reject local-only proof. |
| `SRC-004` | `tests/vitest/cloudflare-d1-restore-rehearsal-script.test.ts:18-30`; `tests/vitest/cloudflare-d1-auth-realtime-readiness-script.test.ts:474-535` | Current test observation | Tests preserve local truth and contain provider-backed fixtures, but do not catch the gate's false-positive predicate. |
| `SRC-005` | `migrations/0001_initial_schema.sql` through `migrations/0049_ops_run_events.sql`; `wrangler.jsonc` | Current source observation | Active D1 schema and bound resource identity for validation. |
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
- D1 [import/export guidance](https://developers.cloudflare.com/d1/best-practices/import-export-data/) supports SQL export/import but export blocks other database requests, import is limited to 5 GiB, virtual tables are unsupported, and large integers have documented caveats. The runbook must measure/export during a controlled window and validate affected data types.
- Cloudflare [Wrangler D1 commands](https://developers.cloudflare.com/d1/wrangler-commands/) document export, execute/import, migrations, and Time Travel. A migration backup/rollback is not disaster-recovery proof.
- Cloudflare's [D1-to-R2 Workflow example](https://developers.cloudflare.com/workflows/examples/backup-d1/) is explicitly simplified. Any scheduled retention extension requires separate production design, bounded R2 access, monitoring, and restore proof.

## Better Auth Recovery Boundary

Better Auth's [session documentation](https://better-auth.com/docs/concepts/session-management) and [database schema](https://better-auth.com/docs/concepts/database) describe a database `session.token` used by the session cookie, seven-day default expiry, and revoke-current/other/all APIs. The docs do not claim hashing/encryption for the database token. Inference: a D1 export can contain bearer-equivalent tokens, and restoring an older database can reintroduce sessions revoked after the restore point. Recovery proof must never publish the export and must explicitly invalidate or accept restored sessions before traffic.

## Target State

1. Local readiness fails closed unless a recovery artifact is provider-backed, non-local, current, schema-valid, data-valid, authz-valid, app-valid, and cleanup-complete.
2. A hosted run exports only the authorized staging source into a protected temporary location, fingerprints it without logging data, and imports into a uniquely named disposable D1 target.
3. Checks cover migration ledger, tables/indexes/triggers, row counts, critical deterministic checksums, foreign keys, orphans, account/workspace isolation, public/protected denial cases, representative application reads, and one controlled write/rollback.
4. Session invalidation is applied and verified according to the approved operating-contract decision before any restored environment receives user traffic.
5. Evidence records source/target IDs, account, backend/plan discovery, timestamps, tool versions, export/import duration, RTO/RPO, checks, exact failures, operator, cleanup, and artifact expiry without raw credentials or row contents.

## Evidence Classes And Freshness

- `EVID-001`: collected plan/source audit; stale on source/schema/provider-doc changes.
- `EVID-002`: planned verification/rehearsal artifact; invalid until hosted execution.
- Local unit tests can prove fail-closed predicates and orchestration parsing.
- Temp/local D1 can prove query/check mechanics.
- Only Cloudflare control-plane and disposable-target evidence can prove provider-backed recovery.
- The release program defines the maximum evidence age; any schema migration, auth/session contract change, binding change, or failed cleanup invalidates the prior artifact immediately.

## Baseline And Stale Triggers

Snapshot before implementation:

```bash
git status --short -- scripts/generate-cloudflare-d1-restore-rehearsal.ts scripts/check-cloudflare-d1-auth-realtime-readiness.ts scripts/check-cloudflare-release-gates.ts tests/vitest/cloudflare-d1-* migrations wrangler.jsonc src/lib/auth src/lib/authz
git diff --binary -- scripts tests/vitest migrations wrangler.jsonc src/lib/auth src/lib/authz | shasum -a 256
```

Refresh on changes to migrations, D1 bindings/account, restore producer/schema, readiness/release gates, Better Auth version/config, session/access predicates, official D1 limits, source database size/features, or incident/recovery policy.
