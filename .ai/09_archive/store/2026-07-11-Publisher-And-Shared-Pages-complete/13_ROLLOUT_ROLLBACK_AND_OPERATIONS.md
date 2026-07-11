# 13 - Rollout, Rollback, And Operations

## Authority And Status

This pack is `IMPLEMENTATION_READY` with `implementation_status=COMPLETE` and
`release_status=NOT_EVALUATED`. Last observed scope remains `PLAN_ONLY`; the
action ceiling is `IMPLEMENT_LOCAL`. No command in this document is evidence that
it has run.

The Archestimator resources bound in `wrangler.jsonc`, including D1 `ARCH_DB`,
have standing repository authorization. This `PLAN_ONLY` run performs no hosted
mutation. Implementation may create local code, tests, and migration 0066. The
release run separately evaluates hosted migration, provider proof, and production
deployment; `wrangler deploy` is outside this pack.

## Local Delivery Sequence

1. Execute only the five-unit dependency-closed `SLICE-001` from exact
   `next_unit=UNIT-001`, one implementation unit at a time under the
   serialization contract.
2. Run each unit's focused test before moving to a dependent unit.
3. Incorporate and validate Program `PUB-DELTA-01..04`; only then promote the
   affected units whose updated packets and dependencies validate.
4. Immediately before editing migration 0066, validate the durable Program
   migration-generation receipt for generation, current tail, Publisher owner
   manifest, unclaimed exact allocation/path, allocation hashes, and receipt
   hash. Drift or collision blocks and requires Program reissue.
5. For migration 0066, produce preflight/postflight count, row-digest, FK, index,
   trigger, and constraint reports on disposable/local D1 only.
6. After all dependencies and delta/Activation/Activity preconditions verify,
   UNIT-022 runs the exact validation matrix, emits the cross-pack receipts, and
   runs only the targeted browser-only proofs.
7. Change criterion, test, gate, implementation, and release statuses only from
   fresh evidence in the scope that produced it.

## Migration Rollout Contract

Before any hosted apply:

- local clean upgrade and per-edge orphan failure injection pass;
- mid-copy rollback leaves source digests unchanged;
- reverse rebuild succeeds on a disposable database;
- `bun run cf:d1-restore-rehearsal` supplies current restore evidence;
- hosted preflight reports zero orphan/FK findings without deleting rows;
- the migration is reviewed against the exact bound D1 database.

Any preflight mismatch is a stop condition. Do not delete orphaned rows, use
`INSERT OR IGNORE`, or proceed with a partial table set.

## Rollback Matrix

| Surface | Trigger | Rollback |
|---|---|---|
| Bounded body reader | Valid requests reject or mutation order changes | Revert the helper and route integration as one reviewed unit; retain focused regression fixture |
| Durable limiter integration | Legitimate decisions denied or limiter skipped | Restore prior durable call contract; do not replace with isolate-only state |
| Manager preview | Any auth bypass, metadata leak, or public-route regression | Remove the protected preview route and entry links; no credential cleanup is needed |
| Wizard/roster/share UX | Critical workflow or accessibility regression | Revert owning UI unit while retaining server hardening |
| Recipient inbox | Partial metadata or integrity regression | Restore the known fail-closed repository path immediately |
| Migration 0066 before release | Local parity or failure-injection mismatch | Do not apply; fix forward in migration/test plan |
| Migration 0066 after hosted apply | Confirmed schema/data regression | Tested reverse table rebuild or approved D1 restore; never `DROP CONSTRAINT` |
| Production release | Release gates or hosted smoke fail | Use the established Cloudflare version rollback process in the release run |

## Operational Proof Boundaries

Local tests can prove code and local D1 behavior. They cannot prove hosted D1,
Cloudflare secret bindings, Workers runtime, production logs, alert delivery, or
deployment health. Those remain `release_status=NOT_EVALUATED` until a release
run collects the corresponding hosted artifacts.

## Local Verification

```bash
bun run type-check
bun run lint
bun run validate:error-handling
bun run validate
git diff --check
bun run validate:plan-pack -- .ai/03_plans/2026-07-10/Publisher-And-Shared-Pages
```

## Stop Conditions

Stop and replan on a concurrent shared-file edit, schema/digest mismatch,
authorization uncertainty, unredacted diagnostic evidence, failing mapped test,
or any request to exceed `IMPLEMENT_LOCAL`. Do not reinterpret a blocked release
boundary as an implementation pass.
