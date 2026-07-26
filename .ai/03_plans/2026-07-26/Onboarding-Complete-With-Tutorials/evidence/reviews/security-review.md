# Onboarding Q2 Security And Data-Boundary Re-Review

**Verdict:** FAIL / REQUEST CHANGES

**Profile:** `Q2_CRITICAL_CHANGE_GATE`

**Reviewed at:** 2026-07-27T01:22:34.7159425+08:00

**Reviewed HEAD:** `efa25a00413185aed6de64ad040d8b473c81a6ac` plus the current dirty worktree

**Review mode:** independent current-source and stored-receipt review; no heavy commands run

The member/viewer authorization, persisted domain-proof, and Playwright port findings are repaired in current source. The security review still fails because the latest lease change replaces the stale-holder race with an unrecoverable durable lock: an expired lease is never reclaimed, while no later mutation is fenced by the lease token. A terminated Worker can therefore leave a workspace permanently unable to install, resume, or restore starter content.

## Code Review Summary

**Files reviewed:** 19 production, migration, test, configuration, plan, and evidence files

**Total issues:** 1

### By Severity

- CRITICAL: 0
- HIGH: 1
- MEDIUM: 0
- LOW: 0

## Stage 1 - Specification And Boundary Compliance

Passed current-source review:

- Cross-user starter writes are now bounded correctly. Batch reconciliation remains owner/admin-only (`src/lib/onboarding/starter-pack-actions.ts:1968`, `:1986`, `:2112`). A complete-workspace member is routed only through `installUserScope`, while a viewer is denied before lease acquisition (`src/lib/onboarding/starter-pack-actions.ts:2166-2188`). The current SQLite test invokes the public resume action as a member and proves that shared completion and the other member's scope remain unchanged (`tests/vitest/starter-pack-actions.test.ts:397`).
- The caller-provided `proofSatisfied` boolean is removed. First-value completion requires a persisted `user_domain` activation event bound to the run's stored estimate resource, guided practice and Library reuse re-read persisted events, and the direct complete command remains denied without domain proof (`src/lib/onboarding/flow-repository.ts:1342-1503`; `tests/vitest/onboarding-flow-repository.test.ts:471`).
- `PLAYWRIGHT_PORT` is normalized through `Number`, restricted to safe integers in `1024..65535`, converted back to a numeric string, and only then used in paths and the server command (`playwright.config.ts:6-15`). No shell metacharacter can survive that normalization.
- Current reviewed SQL uses bound request values; interpolated fragments are internal closed enums or fixed placeholder lists. No hardcoded credential, private URL, raw token logging, cross-workspace proof acceptance, or production binding was found.

Failed specification requirement:

- `DEC-AUTO-004`, `REQ-001`, and `REQ-005` require recovery mutations to be atomic or protected by a usable fencing lease, plus decisive recovery evidence. The current implementation has neither safe expired-owner takeover nor an operational recovery path for an orphaned lease.

## Finding

### [HIGH] Expired leases are permanent orphan locks rather than recoverable fencing tokens

**Files:**

- `src/lib/onboarding/starter-pack-actions.ts:1849`
- `src/lib/onboarding/starter-pack-actions.ts:1929`
- `tests/vitest/starter-pack-actions.test.ts:475`
- `migrations/0105_onboarding_resource_bindings_and_starter_leases.sql:14`

`acquireStarterMutationLease` writes a ten-minute `expires_at`, but acquisition now refuses every existing workspace/version row regardless of expiry (`starter-pack-actions.ts:1863-1885`). The only deletion path is the token-qualified `finally` release at lines 1929-1953. If the Worker is terminated, times out, or loses execution after acquisition, `finally` is not guaranteed to run; the row persists indefinitely and every future install, resume, or restore receives `StarterMutationLeaseConflictError`.

The new test explicitly preserves an already-expired lease and expects all future resume work to fail (`starter-pack-actions.test.ts:475-512`). That prevents the earlier stale-holder interleave only by making crash recovery impossible. It is a masking workaround under the Q2 root-cause guard, not the required fix. The token also remains absent from `InstallContext`, so lifecycle, resource, claim, membership-revision, and final-state writes still do not prove ownership of a current fence.

**Fix:** implement the root-cause contract: either put the guarded restore mutations into one atomic D1 transaction/batch, or use a monotonic fencing generation/token that permits expired-owner takeover and makes every mutation conditional on the currently owned fence. A stale holder must fail before any later write, while a crashed holder must be recoverable after expiry. Return a typed stale-CAS/lease outcome. Add deterministic tests for active contention, crash/expiry takeover, stale-holder writes after takeover, membership-only interleave, and final claim/resource/state cardinality.

## Reconciled Prior Findings

| Prior finding | Current verdict | Evidence |
| --- | --- | --- |
| Member cross-user starter writes | RESOLVED IN SOURCE | Manager-gated batch reconciliation and self-scope-only member resume; current SQLite member test passes. A direct viewer denial test is still advisable, but the source denies viewers before mutation. |
| Restore CAS/lease fencing | NOT RESOLVED | Stale takeover was disabled, but no write fence or atomic recovery transaction exists and an orphaned expired row is permanent. |
| Caller-provided proof boolean | RESOLVED IN SOURCE | Boolean removed; repository re-reads persisted, tenant/resource-bound proof. |
| Unvalidated Playwright port | RESOLVED IN SOURCE | Safe-integer/range normalization precedes path and command construction. A hostile-value config regression test is still advisable. |

## Evidence Inspected

- `artifacts/quality/onboarding-sqlite.json`: PASS, 24/24, zero failed/pending; includes 10/10 current starter tests and was generated after the latest starter source/test edits. SHA-256 `267f9e3d0338d5a3b4a590e74f2e4d19d5cfaeaac24496d385641e2a99f420a4`.
- `artifacts/quality/onboarding-focused.json`: PASS, 271/271, zero failed/pending. It predates the latest starter edits, so it is used only for unchanged proof/flow coverage, not as current lease evidence. SHA-256 `591c9739a1e6d74fc34f116200d4902776d4466ea851ddc50a0bbfbf17376eda`.
- `artifacts/quality/onboarding-typecheck-scoped.json`: PASS after the latest starter edits. SHA-256 `eca7b68526f983295ff48bd746e0cd40db8d1e578ae9803d740f9b3e2ff58d0d`.
- `artifacts/quality/onboarding-lint-scoped.json`: PASS after the latest starter edits. SHA-256 `38b39f16bd0b63317f7d5f49cf0cecbe88b1eabfa7db86d5fd0ff07714228250`.
- `artifacts/quality/onboarding-first-value-playwright-matrix.json`: PASS, 35 expected across seven browser/device projects, zero skipped/unexpected/flaky. SHA-256 `d899e2fc41d2eeabb053074990226817e02ffaf43db66f133e08e9ae0cdb004d`.
- `artifacts/quality/onboarding-diff-coverage.json`: FAIL; required 100% critical changed-branch proof is absent. SHA-256 `48d1c1070b5c0aa30a0e0aeb71e3ace7f961bb2658065fc78e7130eba13ddbfd`.
- `artifacts/quality/mutation.json`: FAIL before mutation execution and contains no onboarding lease/proof mutation evidence. SHA-256 `19b0205aa987012174d3f6bace4c43780b4fa66f27324deb00b76b6a2c896568`.
- Static inspection found no hardcoded secret pattern; `git diff --check` passed for the reviewed onboarding scope.

No new tests, build, browser, mutation, coverage, graph indexing, or other heavy command was run by this reviewer.

## Recommendation And Stop Condition

**REQUEST CHANGES.** Stop this security review at FAIL. Re-review after expired-holder recovery and stale-holder exclusion are both implemented by an atomic transaction or real fencing token, and fresh SQLite adversarial evidence proves takeover, zero stale writes, and correct final state. Aggregate Q2 completion additionally requires current PASS changed-critical coverage and onboarding mutation evidence with no unresolved high/critical finding.
