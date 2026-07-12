# Codex App Handoff: Complete Hosted D1 Recovery And Unblock Plan-Pack Archive

## Objective

Finish the remaining hosted-D1 recovery work so the July 10 plan packs can move
through their real completion checks and archive truthfully. Do not change pack
statuses or archive anything until the provider-backed recovery receipt is
actually green.

## Current Verified State

- Bound production D1 is `ARCH_DB` in `wrangler.jsonc`; read-only remote queries
  work.
- Cloudflare queues required by the Client Portal are present.
- Repository implementation work and focused local validation are largely in
  place. The unresolved critical path is the recovery proof consumed by the
  Beta Operating, Beta Readiness, Hosted D1 Recovery, and Release Integrity
  packs.
- `scripts/run-cloudflare-d1-hosted-recovery-rehearsal.ts` now has an explicit
  hosted gate, source binding check, disposable-target cleanup, encrypted local
  export handling, and redacted reporting.
- `scripts/e2e/beta-fixture-staging.ts` is an explicit non-production fixture
  runner. It must never target production.
- Focused tests passed before this handoff:
  `bunx vitest run tests/vitest/cloudflare-d1-hosted-recovery-rehearsal.test.ts tests/vitest/beta-golden-fixture.test.ts tests/vitest/beta-golden-fixture-staging.test.ts --maxWorkers=1`
  (`21` tests), plus `bun run type-check` and `git diff --check`.
- Provider cleanup was verified: no disposable `archestimator-recovery-*` or
  `archestimator-beta-staging-*` D1 database remains.

## Real Failure To Resolve

The direct `wrangler d1 export <bound-source> --remote` then `d1 execute
<disposable-target> --file <export>` rehearsal failed. The exported SQL creates
`workspaces` before `corporate_accounts`, although `workspaces` references that
table. Cloudflare rejects the import with `no such table: main.corporate_accounts`.

The raw export also contains Better Auth/session credential material. It must
not be logged, pasted into chat, committed, retained outside a restricted
temporary lifecycle, or blindly restored into a rehearsal target.

This is a repository-controlled implementation defect, not an authority or
provider-access blocker.

## Required Solution

Implement a **secret-safe, ordered recovery artifact** rather than importing
Cloudflare's raw export directly.

1. Build the disposable target schema from the current active `migrations/`
   sequence in dependency order, without altering production or `wrangler.jsonc`.
2. Generate a data artifact that:
   - restores only the explicitly approved application tables;
   - excludes Better Auth secrets, sessions, verification records, OAuth tokens,
     reset material, and other credential-bearing rows/columns;
   - preserves required foreign-key order and data integrity;
   - emits only hashes, counts, table names, and redacted failure identifiers.
3. Import that artifact into a newly created disposable D1 target.
4. Prove schema/table counts, key application row counts, foreign-key-safe data,
   and the required recovery/application checks from the recovery plan.
5. Prove excluded credential/session material is absent. Do not attempt to copy
   or display any raw credential values.
6. Delete the disposable D1 and all temporary plaintext/ciphertext artifacts;
   verify absence with Cloudflare inventory readback.
7. Produce the required redacted `D1-RECOVERY-RECEIPT-v1` for strict consumers
   in `scripts/check-cloudflare-d1-recovery-readiness.ts` and
   `scripts/check-cloudflare-release-gates.ts`.

## Guardrails

- Run `bun run supermemory:ensure` first.
- Work in the current shared worktree; do not reset, clean, rebase, switch
  branches, or overwrite unrelated changes.
- Use `apply_patch` for edits.
- Stay inside the Cloudflare resources bound in `wrangler.jsonc`; no paid
  add-ons, no unrelated accounts, and no production deployment.
- A disposable D1 must use a unique `archestimator-recovery-*` name and be
  removed in `finally`/failure paths.
- Never print raw database exports, signed export URLs, OAuth tokens, session
  values, password/reset values, private keys, or `.env` contents.
- Do not fabricate hosted evidence, release receipts, or plan completion.

## Likely Implementation Surfaces

- `scripts/run-cloudflare-d1-hosted-recovery-rehearsal.ts`
- `scripts/check-cloudflare-d1-recovery-readiness.ts`
- `scripts/check-cloudflare-release-gates.ts`
- `migrations/`
- `tests/vitest/cloudflare-d1-hosted-recovery-rehearsal.test.ts`
- `.ai/03_plans/2026-07-10/Hosted-D1-Recovery-And-Data-Resilience/`

## Completion Standard

Stop only when all of these are true:

- A provider-backed disposable recovery completes with the ordered, secret-safe
  artifact.
- The recovery receipt is valid, redacted, current, and accepted by its strict
  consumers.
- Temporary D1/database files and all disposable provider resources are gone
  with readback proof.
- Focused tests/typecheck/diff checks are green for the changed surfaces.
- The July 10 manifests and ledgers are updated from fresh evidence; only then
  evaluate the remaining Release/GitHub boundaries and archive eligibility.

## Exact Next Command

```sh
cd /Users/philiplewis/Documents/archestimator
bun run supermemory:ensure
```
