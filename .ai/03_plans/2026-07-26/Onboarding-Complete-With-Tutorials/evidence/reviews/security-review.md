# Onboarding Q2 Security And Data-Boundary Re-Review

**Verdict:** PASS / APPROVE

**Security/data-integrity assessment:** PASS - no unresolved HIGH or CRITICAL finding

**Profile:** `Q2_CRITICAL_CHANGE_GATE`

**Reviewed at:** 2026-07-27T01:43:31.2918732+08:00

**Reviewed HEAD:** `8e19d90ddf2220df38ae9c0d054d6cc041a7001b` plus the current dirty test/evidence worktree

**Review mode:** independent current-source review plus focused executor evidence handoff; no heavy commands run in the reviewer lane

The current repair closes the earlier stale-holder overlap, orphan-liveness, and untyped stale-CAS defects. Expired leases are atomically reclaimed, the new holder's token is threaded through `InstallContext`, and every ordinary starter mutation executes as one D1 batch containing exact-token renewal, an exact-token foreign-key guard insert, the business statement(s), and guard deletion. Restore acquisition additionally places an exact workspace-revision trigger guard in the same batch as lease takeover and the state transition. A mismatched lease token or stale restore revision aborts and rolls back the whole batch before business writes; token-qualified release cannot delete a successor lease. The action maps the internal stale abort to a discriminated result containing the current revision.

No security, data-integrity, or specification blocker remains in this review scope. The member/viewer authorization, estimate-bound proof, server-derived proof, migration constraints, D1/Playwright isolation, and secret-safety checks also pass.

## Code Review Summary

**Files reviewed:** 23 production, migration, test, configuration, plan, and evidence files

**Total issues:** 0

### By Severity

- CRITICAL: 0
- HIGH: 0
- MEDIUM: 0
- LOW: 0

## Stage 1 - Specification And Boundary Compliance

Passed:

- Cross-user batch reconciliation is owner/admin-gated. A complete-workspace member resume writes only the authenticated member's user scope, and viewers/unknown memberships are denied.
- Automatic bootstrap contention remains narrow and read-only on a lease conflict; it returns persisted readiness rather than claiming an install succeeded.
- Restore uses `beta_starter_pack_states.revision` as the workspace CAS token. Stale pre-acquisition revision performs no claim/resource/state mutation.
- Restore returns `{ status: "stale", currentRevision }` for an exact-revision mismatch and `{ status: "restored", ... }` on success, satisfying `DEC-AUTO-004` without exposing the internal database abort.
- Expired-holder recovery now makes forward progress without permitting a displaced holder's next write.
- First-value completion is bound to the run's persisted estimate and requires same-user, same-workspace, same-estimate `first_valid_total` user-domain evidence.
- Guided practice and library completion derive proof from persisted current-run events. Client-link completion revalidates a signed, expiring receipt and current publication state.
- Migration constraints, tenant scoping, normalized Playwright configuration, isolated local D1 persistence, and secret handling remain correct.

Not passed: none.

## Lease Fencing Verification

- `InstallContext` carries `mutationLeaseToken` (`src/lib/onboarding/starter-pack-actions.ts:56`).
- `prepareFencedMutationStatements` builds one transaction-sized sequence: exact-token renewal, exact-token guard insert, business statements, and exact-token guard deletion (`src/lib/onboarding/starter-pack-actions.ts:114`).
- Migration `0117` makes `(workspace_id, pack_version, lease_token)` a unique parent key and gives the guard table an `ON DELETE CASCADE` foreign key to that exact lease identity (`migrations/0117_onboarding_starter_mutation_fences.sql:1`).
- The ordinary single-write and multi-write helpers submit the complete sequence in one D1 batch and validate the renewal/guard/delete result cardinality (`src/lib/onboarding/starter-pack-actions.ts:183`, `src/lib/onboarding/starter-pack-actions.ts:210`).
- On batch failure, `throwIfStarterMutationLeaseChanged` preserves the original failure unless current lease identity differs, in which case it returns the narrow typed lease-conflict error; it does not convert unrelated persistence failures into success (`src/lib/onboarding/starter-pack-actions.ts:161`).
- Static enumeration found no other direct production business `.run()` or `.batch()` path: acquisition is the only direct acquisition batch, and release is the only direct token-qualified write (`src/lib/onboarding/starter-pack-actions.ts:1958`, `src/lib/onboarding/starter-pack-actions.ts:2076`).
- Acquisition deletes an expired workspace/version row, inserts the successor, and optionally applies restore CAS in one D1 batch. Release deletes only the exact holder token.
- D1 serializes the batch boundary: if the old holder wins first, it renews and completes one bounded mutation before takeover; if the successor wins first, the old holder's guard FK fails and its business statements roll back.

The adversarial test replaces the token immediately before the fenced batch, then proves the old holder changes neither starter state nor claims and cannot delete the successor lease. The expired-takeover test proves the successor completes recovery and releases its own lease. The migration test independently proves an exact-token guard succeeds, a missing-token guard violates the FK, lease deletion cascades guard cleanup, and `PRAGMA foreign_key_check` is clean.

## Restore CAS Verification

- Migration `0117` defines a transient restore guard and `BEFORE INSERT` trigger that raises `starter_restore_stale` unless the exact workspace/version/owner/revision state exists (`migrations/0117_onboarding_starter_mutation_fences.sql:15`).
- Lease expiry cleanup/acquisition, restore guard insertion, state CAS transition, and guard deletion are submitted in one D1 batch (`src/lib/onboarding/starter-pack-actions.ts:1958`). A trigger abort therefore rolls back lease and state effects together.
- The action converts only the internal stale condition into the exported `StarterRestoreResult` union, preserving unrelated failures (`src/lib/onboarding/starter-pack-actions.ts:70`, `src/lib/onboarding/starter-pack-actions.ts:2337`).
- The stale test asserts the typed current revision, unchanged claim lifecycle and workspace revision, and zero residual lease/restore-guard rows. Success and action pass-through tests cover the `restored` branch.

## Other Security Checks Passed

- Shared add/restore requires owner/admin; restore cross-checks the current authenticated user with the resolved onboarding actor.
- Normal members can repair only their own claimed user scope; viewers perform no starter writes.
- Reviewed SQL binds request/tenant identifiers. Dynamic fragments are closed internal enums or placeholder counts.
- No hardcoded secret, raw token logging, private URL, unsafe provider binding, or production mutation was introduced.
- Client-link receipt HMAC binds user, workspace, project, publication, run, revision, action, and expiry and uses constant-time digest comparison.
- The `0105` lease table enforces one holder per workspace/version, positive versions, nonblank token/actor, a closed operation enum, workspace cascade, and an expiry index. Migration `0117` adds the exact-token fencing key and transient guard table.
- Playwright validates the port before command/path interpolation and uses the same isolated per-port persistence root for migration apply/check, Next bindings, and onboarding fixture D1 commands.

## Fresh Evidence

- Fresh focused executor evidence after the lease-fence and restore-CAS edits: **PASS**, 24/24 combined starter-action, onboarding-migration, and activation-action tests, including expired takeover, displaced-holder rollback, successor preservation, FK rejection, cascade cleanup, exact-revision trigger rejection, typed stale pass-through, and clean foreign-key checks.
- Fresh scoped TypeScript evidence after the final restore-CAS edit: **PASS**.
- The previously persisted `onboarding-sqlite`, scoped typecheck, and scoped lint receipts were generated before the uncommitted `0117` atomic-fence edit and are intentionally not presented as fresh proof of it.
- `git diff --check` passes for the repaired production/test surface and this review artifact.

The earlier broad coverage and browser receipts also predate the atomic-fence edit, so they are not presented as fresh proof of that code. Current source inspection plus the fresh focused adversarial/migration run is the decisive evidence for this security/data-boundary review; no heavy command was rerun in the reviewer lane.

## Aggregate Evidence Distinction

The unrelated shared-worktree build failure in untracked `src/lib/change-requests/service.ts`, the Stryker initialization failure in concurrent `scripts/quality/component-core.ts`, missing onboarding mutation selection, red changed-code coverage, and stale GitNexus index remain aggregate Q2 concerns. They are not findings in the current onboarding security/data-boundary implementation.

Supermemory remains unavailable because its pinned local server binary is missing; it supplied no review evidence and is not an onboarding blocker.

## Recommendation And Stop Condition

**APPROVE.** There are no findings in the onboarding security/data-boundary scope. The repaired authorization, proof, lease takeover, atomic mutation fencing, exact-revision restore CAS, and typed stale result pass current-source review and focused SQLite/action evidence. Aggregate plan completion separately remains the quality owner's responsibility for coverage, mutation, graph, build, and remaining acceptance-evidence gaps.
