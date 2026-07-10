# Implementation Plan

## Coordination Contract

The lead `executor` owns integration. A `test-engineer` owns fail-closed fixtures and integrity probes, a `researcher` refreshes official D1/Better Auth constraints, and a distinct `verifier` checks the hosted artifact and cleanup. Only the authorized hosted operator may create/export/import/deploy/destroy resources. No worker edits the existing Activity or Publisher packs.

## Domain Contract Inputs

The units below remain the only executable plan. Revalidate these support
contracts immediately before their matching units:

- `UNIT-001/002`: `PROVIDER_CAPABILITY_AND_CONSTRAINTS.md`.
- `UNIT-002/004/006`: `RESTORE_ORCHESTRATION_AND_DISPOSABLE_INGRESS_THREAT_MODEL.md`.
- `UNIT-003/005/006`: `RECOVERY_ARTIFACT_SCHEMA_AND_DATA_INTEGRITY.md`.
- `UNIT-004/006`: `SESSION_AUTHZ_AND_APPLICATION_INTEGRITY_PROOF.md`.
- `UNIT-002/005/006`: `RTO_RPO_PERFORMANCE_AND_FAILURE_MODEL.md`.
- Every unit: `PROVIDER_REHEARSAL_TEST_PLAN.md`; hosted phases also use `RUNBOOK_ROLLBACK_CLEANUP_AND_INCIDENT.md` and `AUTHORIZATION_PACKET_AND_FINAL_AUDIT.md`.

## DAG And Ready Slice

```text
UNIT-001 Fail-closed evidence predicates
  -> UNIT-002 Safe hosted orchestration
UNIT-002 -> UNIT-003 Integrity probes
UNIT-002 + UNIT-003 -> UNIT-004 App/authz/session probes
UNIT-001 + UNIT-003 + UNIT-004 -> UNIT-005 Evidence/runbook/release integration
UNIT-005 + AUTH-001 -> UNIT-006 Hosted rehearsal and cleanup
```

`SLICE-001 = UNIT-001, UNIT-002, UNIT-003, UNIT-004, UNIT-005`. Unit 006 is blocked.

### `UNIT-001` — Repair recovery evidence semantics

**Paths:**
`scripts/generate-cloudflare-d1-restore-rehearsal.ts:CloudflareD1RestoreRehearsalReport`,
`scripts/check-cloudflare-d1-auth-realtime-readiness.ts:RestoreRehearsalReport`,
`scripts/check-cloudflare-d1-auth-realtime-readiness.ts:checkCloudflareD1AuthRealtimeReadiness`,
`scripts/check-cloudflare-release-gates.ts:D1AuthRealtimeReadinessReport`,
`scripts/check-cloudflare-release-gates.ts:buildCloudflareReleaseGateReport`,
`tests/vitest/cloudflare-d1-restore-rehearsal-script.test.ts`,
`tests/vitest/cloudflare-d1-auth-realtime-readiness-script.test.ts`, and
`tests/vitest/cloudflare-release-gates-script.test.ts`.

**Steps:** first add fixtures proving the current local artifact incorrectly satisfies the restore gate; split local mechanics from provider readiness; require `providerBacked === true`, `localOnly === false`, schema/app/authz/session/cleanup flags, revision identity, and freshness for provider/release gates; preserve truthful local report behavior.

**Verification:** targeted restore/readiness/release script tests. Expected: local rehearsal stays green for mechanics and red for provider/release readiness; malformed or contradictory evidence is red.

### `UNIT-002` — Build safe hosted orchestration

**Paths:** new `scripts/run-cloudflare-d1-hosted-recovery-rehearsal.ts` is the
only provider-backed orchestrator; local-only
`scripts/generate-cloudflare-d1-restore-rehearsal.ts` remains unchanged except
for shared exported types that preserve `localOnly:true` and
`providerBacked:false`; new
`tests/vitest/cloudflare-d1-hosted-recovery-rehearsal.test.ts` owns parser,
preflight, command-plan, and dry-run fixtures; `wrangler.jsonc` is read-only
binding identity input.

**Steps:** require explicit mode and env gate; discover/redact account/source/
target/backend/plan/features, current database count and provider-reported Free
count limit, current account storage, source/export size, and expected target size;
refuse production Time Travel and identical IDs; fail before target creation unless
the 500 MB per-database target limit, 5 GB total Free account storage limit, 5 GB
import ceiling, database-count limit, and free-tier plan all pass. Never enable or
recommend a paid plan as fallback. Preflight full-disk/encrypted-volume status,
temp root, and `0700/0600` permissions; render create/export/import/bind/deploy/
destroy commands;
use unique names/run ID; immediately encrypt retained/transported export bytes
with a random per-run key held only in process/OS credential storage; bound every
plaintext/decrypt window; capture timings/digests; trap partial failure into
cleanup of plaintext, ciphertext, key alias, D1, Worker, variables, and routes;
never print data, paths containing secrets, or key material.

**Verification:** dry-run fixture matrix for missing/invalid account, same target,
non-disposable name, database-count exhaustion, source/target over 500 MB, account
storage over 5 GB after the target, import over 5 GB, virtual tables, paid/non-Free
plan, command failure, and cleanup failure. Expected: no Cloudflare call in
default/test mode and every Free-limit failure stops before creation.

### `UNIT-003` — Implement layered integrity checks

**Paths:** new `scripts/lib/cloudflare-d1-recovery-integrity.ts`, new
`tests/vitest/cloudflare-d1-recovery-integrity.test.ts`, read-only `migrations/`,
and the hosted runner in
`scripts/run-cloudflare-d1-hosted-recovery-rehearsal.ts`.

**Steps:** compare migration ledger/head, table/index/trigger inventory, critical row counts, deterministic keyed checksums, FK violations, known orphan relationships, corporate account/member/workspace-link rows, profile-orphan policy, role/status sets, membership `CASCADE`, workspace-link `SET NULL`, enum/invariant queries, and large-integer sentinels; record only aggregates/digests; tie every result to export digest and target ID.

**Verification:** local/temp-D1 fixtures with missing migration, extra/missing schema object, row mutation, FK/orphan, corporate role/status/delete-semantic drift, checksum, and integer cases. Expected: each defect has one stable failed label and nonzero exit.

### `UNIT-004` — Prove restored application, authz, and session behavior

**Paths:** new `scripts/lib/cloudflare-d1-recovery-probe.ts` owns the HMAC,
request-cap, denial-label, nonce, and response contract; new
`scripts/generate-cloudflare-d1-recovery-worker.ts` emits only
`.ai/99_scratch/cloudflare-d1-recovery/<run-id>/worker.ts` and
`.ai/99_scratch/cloudflare-d1-recovery/<run-id>/wrangler.jsonc`; new
`tests/vitest/cloudflare-d1-recovery-probe.test.ts` and
`tests/vitest/cloudflare-d1-recovery-worker-generator.test.ts` own local
contract/generator fixtures; `src/lib/authz/d1-access.ts`,
`src/lib/auth/better-auth-cloudflare.ts`, and existing hosted auth-route proof
scripts are read-only behavior inputs.

**Steps:** do not deploy a Worker during import or offline validation. Revoke/delete
restored sessions directly in the isolated target and prove the pre-recovery token
row cannot authenticate through offline auth/session adapters. Only then generate
a per-run key with at least 256 random bits and a configured expected run ID. Retain
their raw values only in the operator process/OS credential store and disposable
Worker secrets. Generate a run-scoped overlay with a unique
`archestimator-recovery-<run-digest>` Worker name, `workers_dev=true`, `routes=[]`,
no custom domains, and only the disposable D1 binding; deploy it solely to its
noncanonical `workers.dev` URL. No preview alias or canonical route may be attached.
Expose only `POST /__recovery/probe` with `application/json`; stream-cap the
body at 8 KiB before parsing and reject every other method, path, content type, or
oversized/indeterminate body before application dispatch. Compare the signed run
ID with the configured Worker-secret value before nonce/cardinality state. Require run ID,
five-minute timestamp, unique random nonce, and HMAC over
method/path/run/timestamp/nonce/body digest. Atomically store only nonce digests
and bounded attempt counters in a run-scoped table on the disposable target;
reject replay, expiry, signature mismatch, more than 32 successful probes, or
more than five failed attempts per minute. Log only redacted run/correlation IDs,
stable denial labels, and non-reversible digest prefixes, never proof headers,
keys, nonces, bodies, or restored row data. Run representative protected reads;
confirm unauthenticated/foreign-workspace/public-share denials and prove that a
corporate-only role or linked workspace cannot replace canonical workspace or
platform-admin authorization; run one uniquely labeled controlled write then
rollback/delete; prove repository paths use
restored data; verify pre-restore tokens fail and a fresh disposable
authentication succeeds. Delete the disposable Worker (thereby removing its
`workers.dev` ingress), nonce/attempt table, Worker secrets, overlay, operator key
aliases, and raw process values. Read back Worker absence and prove the exact URL no
longer serves the probe before declaring cleanup.

**Verification:** local contract tests plus hosted matrix in Unit 006 cover wrong
method/path/content type, missing/invalid/expired signature, reused nonce,
body-over-limit with and without `Content-Length`, attempt/success caps, direct
application-path bypass, request run ID differing from the configured expected run
ID, redacted logs, and URL/route/Worker/secret/table/key-alias absence.
Expected: every denial occurs before application dispatch; isolation predicates
match source behavior; no session or proof token appears in output.

### `UNIT-005` — Version the recovery artifact and runbook

**Paths:** new `scripts/check-cloudflare-d1-recovery-readiness.ts`, new
`tests/vitest/cloudflare-d1-recovery-readiness.test.ts`, generated
`.ai/99_scratch/cloudflare-d1-recovery-readiness-current.json` and `.md`, strict
consumers in `scripts/check-cloudflare-d1-auth-realtime-readiness.ts` and
`scripts/check-cloudflare-release-gates.ts` with their existing focused tests,
and the canonical operator procedure added to
`.ai/01_roadmap/09-support-incident-rollback-runbooks.md`.

**Steps:** `scripts/check-cloudflare-d1-recovery-readiness.ts` emits
`D1-RECOVERY-RECEIPT-v1` with producer and schema versions,
run ID, exact source/target/account identity hashes, export digest,
migration/app/auth revisions, start/end milestones, measured RTO/RPO, every
integrity/application/authz/session check and result, session invalidation result,
corporate table/link/delete integrity and corporate-only denial results,
operator identity label, failures, cleanup inventory and absence readback,
overall result, issued/expiry timestamps, and validity. Make release and
operating-contract consumers reject incomplete, stale, mismatched, failed, or
dirty-cleanup receipts; document escalation and rerun rules. Consumers only
validate and join the receipt; they never execute recovery.

**Verification:** artifact fixture suite and strict release-gate fixtures. Expected: no hosted claim from local mode and no release green without complete cleanup.

### `UNIT-006` — Execute one provider-backed rehearsal

**Status:** blocked by `AUTH-001`.

**Steps after authorization:** capture before-state; create disposable D1 with no
Worker ingress; export the authorized hosted source into the restricted encrypted
lifecycle during the approved window; import; run integrity checks; invalidate
restored sessions offline and prove the canary is dead; deploy/enable only the
temporary operator-only ingress; run app/authz/session checks; measure RTO/RPO;
verify controlled write rollback; generate the redacted
`D1-RECOVERY-RECEIPT-v1`; remove ingress,
nonce/attempt state, Worker, variables/secrets, operator key alias, D1, plaintext,
ciphertext, and encryption key; independently read back absence at every surface;
feed the receipt to the release-integrity and Beta Operating consumers. Emit the
Program `BETA-P1-10` explicit `N/A` receipt with a scoped changed-file/caller scan,
justification that recovery changes only proof scripts/runbooks, changed files,
exact tests, regression owner, and independent verifier result.

**Verification commands:** use only the exact approved commands from the packet; then run focused consumers and `CLOUDFLARE_RELEASE_REQUIRE_PRODUCTION=1 bun run cf:release-gates`. Expected: provider artifact green and cleanup proven, or fail-closed incident evidence.

## File Contention

`scripts/check-cloudflare-release-gates.ts` is also owned by the release pack. Serialize its changes: recovery lane first adds a versioned adapter/test fixture; release integrator performs the final shared-file merge. `src/lib/auth/**` is owned by the operating-contract/auth lane; consume a session-invalidation interface rather than editing in parallel.

## Cleanup And Resume

Local tests use a mode-checked temp root/files, temp D1, fake per-run keys, and
explicit `finally` cleanup. Hosted cleanup inventory includes D1,
Worker/environment, routes, secrets/vars created for the run, plaintext and
encrypted exports/R2 objects if explicitly approved, OS credential/key aliases,
and disposable credentials. The verifier lists/reads every surface after delete;
command success without absence readback is not proof. A failed deletion is an
open P0. Resume at `UNIT-001` with the two failing false-positive tests; never
resume directly at the hosted unit without revalidating the boundary packet and
provider constraints.
