# Implementation Plan

## Coordination Contract

The lead `executor` owns integration. A `test-engineer` owns fail-closed fixtures and integrity probes, a `researcher` refreshes official D1/Better Auth constraints, and a distinct `verifier` checks the hosted artifact and cleanup. Only the authorized hosted operator may create/export/import/deploy/destroy resources. No worker edits the existing Activity or Publisher packs.

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

**Paths:** `scripts/check-cloudflare-d1-auth-realtime-readiness.ts`, `scripts/check-cloudflare-release-gates.ts`, their focused Vitest suites, restore report types.

**Steps:** first add fixtures proving the current local artifact incorrectly satisfies the restore gate; split local mechanics from provider readiness; require `providerBacked === true`, `localOnly === false`, schema/app/authz/session/cleanup flags, revision identity, and freshness for provider/release gates; preserve truthful local report behavior.

**Verification:** targeted restore/readiness/release script tests. Expected: local rehearsal stays green for mechanics and red for provider/release readiness; malformed or contradictory evidence is red.

### `UNIT-002` — Build safe hosted orchestration

**Paths:** extend `scripts/generate-cloudflare-d1-restore-rehearsal.ts` through a separate provider mode or new narrowly named hosted runner; focused parser/dry-run tests; current Wrangler config readers.

**Steps:** require explicit mode and env gate; discover/redact account/source/
target/backend/plan/size/features; refuse production Time Travel and identical
IDs; preflight free-tier use, full-disk/encrypted-volume status, temp root, and
`0700/0600` permissions; render create/export/import/bind/deploy/destroy commands;
use unique names/run ID; immediately encrypt retained/transported export bytes
with a random per-run key held only in process/OS credential storage; bound every
plaintext/decrypt window; capture timings/digests; trap partial failure into
cleanup of plaintext, ciphertext, key alias, D1, Worker, variables, and routes;
never print data, paths containing secrets, or key material.

**Verification:** dry-run fixture matrix for missing/invalid account, same target, non-disposable name, excessive size, virtual tables, free-tier violation, command failure, and cleanup failure. Expected: no Cloudflare call in default/test mode.

### `UNIT-003` — Implement layered integrity checks

**Paths:** new recovery query/check module and tests; `migrations/`; existing D1 proof patterns.

**Steps:** compare migration ledger/head, table/index/trigger inventory, critical row counts, deterministic keyed checksums, FK violations, known orphan relationships, enum/invariant queries, and large-integer sentinels; record only aggregates/digests; tie every result to export digest and target ID.

**Verification:** local/temp-D1 fixtures with missing migration, extra/missing schema object, row mutation, FK/orphan, checksum, and integer cases. Expected: each defect has one stable failed label and nonzero exit.

### `UNIT-004` — Prove restored application, authz, and session behavior

**Paths:** disposable Worker binding overlay outside canonical `wrangler.jsonc`, existing hosted route/auth verification scripts, `src/lib/authz/d1-access.ts` contracts, Better Auth session APIs/tests.

**Steps:** bind only the disposable target while the Worker has
`workers_dev=false` and no custom/preview route. Before deploying or enabling any
HTTP ingress, revoke/delete restored sessions directly in the isolated target and
prove the pre-recovery token row cannot authenticate through offline auth/session
adapters. Only then enable a temporary operator-only, one-run authenticated
ingress that rejects all missing/invalid proof headers before application code;
never attach the canonical domain. Run representative protected reads; confirm
unauthenticated/foreign-workspace/public-share denials; run one uniquely labeled
controlled write then rollback/delete; prove repository paths use restored data;
verify pre-restore tokens fail and a fresh disposable authentication succeeds.

**Verification:** local contract tests plus hosted matrix in Unit 006. Expected: isolation and denial predicates match source behavior; no session token appears in output.

### `UNIT-005` — Version the recovery artifact and runbook

**Paths:** recovery JSON/Markdown producer, schema fixtures, release/readiness consumers, `.ai/99_scratch/` output, operator runbook under canonical `.ai/` system/ops location selected during implementation.

**Steps:** include producer/schema version, exact source/target/account hashes, export digest, migration/app/auth revisions, start/end milestones, RTO/RPO, every check, session treatment, operator, failures, cleanup inventory, validity; make release truth reject incomplete/stale/failed cleanup; document escalation and rerun rules.

**Verification:** artifact fixture suite and strict release-gate fixtures. Expected: no hosted claim from local mode and no release green without complete cleanup.

### `UNIT-006` — Execute one provider-backed rehearsal

**Status:** blocked by `AUTH-001`.

**Steps after authorization:** capture before-state; create disposable D1 with no
Worker ingress; export the authorized hosted source into the restricted encrypted
lifecycle during the approved window; import; run integrity checks; invalidate
restored sessions offline and prove the canary is dead; deploy/enable only the
temporary operator-only ingress; run app/authz/session checks; measure RTO/RPO;
verify controlled write rollback; generate redacted evidence; remove ingress,
Worker, variables, D1, plaintext, ciphertext, and key; independently read back
absence at every surface; feed the artifact to the release manifest.

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
