# LOOP_LEDGER.md — Corporate Accounts

## Run Identity

- **Run ID:** `PLAN-2026-07-11-corporate-accounts`
- **Goal:** Corporate accounts feature with org-level roles, team leaders, workspace linking, and admin management UI.
- **Baseline HEAD:** current main
- **Started:** 2026-07-11

## Current Run Scope

`IMPLEMENT_LOCAL` — planning + implementation in one session.

## Task DAG Status

| Unit | Status | Layer |
|---|---|---|
| UNIT-001 migration | IN_PROGRESS | 0 |
| UNIT-002 repository | IN_PROGRESS | 1 |
| UNIT-003 actions | IN_PROGRESS | 1 |
| UNIT-004 accounts list page | PLANNED | 2 |
| UNIT-005 account detail page and team-leader view | IN_PROGRESS | 2 |
| UNIT-006 integration | PLANNED | 2 |

## Next Action

Design and implement an atomic workspace-move audit boundary, then close the remaining Corporate account UI and authenticated-route evidence gaps.

## 2026-07-11 - Implementation Audit and Integrity Repair

- **Discover:** re-audited the Corporate source, migration, actions, UI, and tests. The feature is partially implemented, not complete. In particular, team leaders still have no view-only account route, archived accounts have no recovery listing, unlinked workspaces have no explicit admin state, and workspace move auditing is not atomic.
- **Execute:** added `0053_corporate_account_owner_integrity.sql` and focused tests. New accounts require a nonblank creator and receive that creator as owner; direct D1 deletion/demotion of a sole owner is denied while account deletion still cascades. Repository mutations now return not-found/no-op failures, and the membership upsert cannot demote the sole owner.
- **Verify:** `bunx vitest run tests/vitest/corporate-account-owner-integrity-migration.test.ts tests/vitest/corporate-account-repository.test.ts ... --maxWorkers=1` passed 41/41 focused tests with the Teamwork-adjacent suite; `bun run type-check` and `git diff --check` passed. This is local proof only; the normal local Miniflare fixture still does not apply the Corporate migrations.
- **Record:** UNIT-001 and the ownership portion of UNIT-002 are `IN_PROGRESS`, not verified. No UI, hosted D1, browser, or release claim is implied. The plan pack remains active and must not be archived.
- **Decide:** next repair work is the Corporate visibility/recovery/audit gaps, then their targeted tests and local migration fixture coverage.

## 2026-07-11 - Archive Recovery Surface

- **Discover:** archived accounts were deliberately excluded from the default list, but no alternate list made the existing detail-page Restore action reachable.
- **Execute:** added an archived-only mode to `listCorporateAccountsWithCounts` and `/admin/accounts?status=archived`. The default list still excludes archived rows; the recovery view links to their detail pages and hides account creation.
- **Verify:** `tests/vitest/corporate-account-admin-recovery.test.ts`, the Corporate migration/repository tests, TypeScript, and `git diff --check` passed. Browser proof was intentionally not run in this Codex App loop; the remaining risk is authenticated-route rendering/navigation behavior.
- **Record:** REQ-008 is more complete but remains unverified as a product requirement because the suspended badge, restore action, and authenticated UI flow do not yet have end-to-end evidence. The pack stays active.
- **Decide:** prioritize the missing team-leader read surface and atomic workspace-move audit next.

## 2026-07-11 - Team-Leader Read-Only Organization Surface

- **Discover:** organization membership was only reachable through `/admin`; a team leader had no route that could read account members and linked workspaces without receiving administrative mutation capability.
- **Execute:** added `listCorporateAccountReadOnlyViewsForMember` and `/workshop/settings/organization`. The D1 account, member, and workspace reads independently require the authenticated user to be an `owner` or `team_leader` of a non-archived account. The page imports no corporate-account server action and is exposed through the standard workshop settings panel.
- **Verify:** `bunx vitest run tests/vitest/corporate-account-team-leader-view.test.ts tests/vitest/corporate-account-repository.test.ts tests/vitest/corporate-account-admin-recovery.test.ts tests/vitest/corporate-account-owner-integrity-migration.test.ts --maxWorkers=1` passed 9/9; `bun run type-check` and `git diff --check` passed.
- **Record:** this is focused local server-contract proof for REQ-006 only. Authenticated route rendering and navigation have not received browser evidence, and no criterion is marked verified or release-ready. The pack remains active.
- **Decide:** do not disguise the workspace-move audit gap with a post-write audit call; its atomicity needs a dedicated D1 transaction or trigger design before REQ-010 can advance.

## 2026-07-11 - Atomic Workspace-Move Audit Boundary

- **Discover:** `linkWorkspaceAction` first wrote the workspace link, then wrote one or two audit events through separate D1 calls. A request failure or concurrent move between those operations could leave the assignment and its corporate-account audit history inconsistent.
- **Execute:** added `linkWorkspaceToCorporateAccountWithAudit`. It reads the current assignment, conditionally updates only that observed value, and batches the update plus applicable old-account and new-account audit inserts. Audit inserts are guarded by the resulting workspace assignment and timestamp. The admin action now uses this boundary and no longer writes its move audits separately.
- **Verify:** `bunx vitest run tests/vitest/corporate-account-repository.test.ts tests/vitest/corporate-account-owner-integrity-migration.test.ts tests/vitest/corporate-account-admin-recovery.test.ts tests/vitest/corporate-account-team-leader-view.test.ts --maxWorkers=1` passed 12/12. The repository test covers a move, a lost conditional-update race, and a binding without `batch`; `bun run type-check` and `git diff --check` passed earlier in this loop. D1 batch production behavior still needs bound-database integration evidence.
- **Record:** the local code-level portion of REQ-010 is implemented with fail-closed transaction support, but REQ-010 remains unverified as a product/release requirement pending D1 integration, authenticated UI, and hosted evidence. The pack remains `ACTIVE` and `IN_PROGRESS`.
- **Decide:** continue the Teamwork invitation/command-invariant work, then return for remaining Corporate UI and D1 integration proof rather than archiving either pack.

## 2026-07-11 - Explicit Workspace Link State

- **Discover:** the account-detail workspace picker listed every workspace by name only. Administrators could not distinguish an unlinked workspace from one that would move out of another corporate account, leaving the required unlinked state invisible in the admin surface.
- **Execute:** extended the link-candidate DTO and D1 query with `corporate_account_id` and the current account name. The picker now labels candidates as `No corporate account` or `Move from <account>` while the existing server-side atomic move/audit boundary remains authoritative.
- **Verify:** `bunx vitest run tests/vitest/corporate-account-workspace-link-state.test.ts tests/vitest/corporate-account-repository.test.ts tests/vitest/corporate-account-admin-recovery.test.ts --maxWorkers=1` passed 8/8; `bun run type-check` and `git diff --check` passed.
- **Record:** AC-008 has source/component-contract evidence, but authenticated rendering and mutation interaction have not received browser proof. Corporate remains `ACTIVE` and `IN_PROGRESS`; no release or archive status changes.
- **Decide:** continue remaining Teamwork policy/realtime/UI work and Corporate D1/browser evidence; do not equate a picker-label contract with end-to-end completion.

## 2026-07-11 - Local D1 Migration Apply

- **Discover:** the local `ARCH_DB` preview database had not applied migrations `0050` through `0055`, so Corporate migration behavior had only been exercised through isolated SQLite fixtures.
- **Execute:** applied the pending migration sequence to the local Wrangler D1 database, including `0052_corporate_accounts.sql` and `0053_corporate_account_owner_integrity.sql`.
- **Verify:** `bunx wrangler d1 migrations apply ARCH_DB --local` completed all six pending files; a follow-up `bunx wrangler d1 execute ARCH_DB --local --command "SELECT name FROM d1_migrations WHERE name IN ('0053_corporate_account_owner_integrity.sql', '0054_collaboration_pending_invitation_uniqueness.sql', '0055_collaboration_manager_floor_integrity.sql') ORDER BY name;"` returned all three rows; sequential `bunx wrangler d1 migrations list ARCH_DB --local` reported no migrations to apply.
- **Record:** this is local preview-schema evidence only. No remote D1 mutation, live-data preflight, authenticated browser flow, or hosted release proof occurred. Corporate remains `ACTIVE` and `IN_PROGRESS`.
- **Decide:** retain the pack; use this migrated local substrate for follow-on integration evidence, without inferring provider or release readiness.

## 2026-07-11 - Admin User Membership Visibility Contract

- **Discover:** the admin user detail already loaded the user’s corporate memberships, linked each account, and rendered the assigned role, but its section label did not match the accepted Corporate membership language. The member/workspace action controls also used text glyphs despite the established Phosphor icon surface.
- **Execute:** aligned the admin user-detail heading to `Corporate membership`, preserved account links and role badges, and replaced the remove/unlink text glyphs with labeled Phosphor icons. Added a focused contract test for the membership query, section, role, and account-link boundary.
- **Verify:** `bunx vitest run tests/vitest/corporate-account-owner-integrity-migration.test.ts tests/vitest/corporate-account-repository.test.ts tests/vitest/corporate-account-admin-recovery.test.ts tests/vitest/corporate-account-team-leader-view.test.ts tests/vitest/corporate-account-workspace-link-state.test.ts tests/vitest/corporate-account-user-membership.test.ts --maxWorkers=1` passed 15/15; `bun run type-check` and `git diff --check` passed.
- **Record:** this is local source/component-contract proof for the admin user membership criterion. It does not prove authenticated browser rendering, role mutation interactions, local D1 integration seeded with representative users, hosted D1 migration, or release readiness. Corporate remains `CONDITIONALLY_READY / IN_PROGRESS / NOT_EVALUATED / ACTIVE / ACTIVE`.
- **Decide:** leave the pack active. Do not archive until the remaining authenticated UI and hosted evidence gates have passed.

## 2026-07-11 - Corporate Server-Action Audit Contract

- **Discover:** Corporate action mutations had repository and component coverage, but no focused action-level regression proof for the required admin-authentication, audit, cache-invalidation, and atomic workspace-link delegation sequence.
- **Execute:** added `tests/vitest/corporate-account-actions.test.ts`. The suite proves normalized account creation, admin audit fields for account/member/status mutations, invalid-input non-mutation behavior, repository-failure non-audit behavior, and that workspace linking delegates only to the repository-owned atomic audit boundary rather than adding a second action-layer audit event.
- **Verify:** `bunx vitest run tests/vitest/corporate-account-actions.test.ts tests/vitest/corporate-account-repository.test.ts tests/vitest/corporate-account-owner-integrity-migration.test.ts tests/vitest/corporate-account-team-leader-view.test.ts tests/vitest/corporate-account-admin-recovery.test.ts --maxWorkers=1` passed 17/17. Fresh `bun run type-check` passed. Browser proof was intentionally not run because this is a server-action contract change; the remaining risk is authenticated UI integration and bound/hosted D1 behavior.
- **Record:** UNIT-003 is `IN_PROGRESS` with focused local action-contract proof. This does not verify end-to-end account management, migration deployment, provider behavior, release readiness, or archive eligibility. Corporate remains `CONDITIONALLY_READY / IN_PROGRESS / NOT_EVALUATED / ACTIVE / ACTIVE`.
- **Decide:** keep the pack active. Next Corporate evidence should use the existing local D1 substrate for representative action integration or an authenticated UI proof when that browser-only claim is in scope.

## 2026-07-11 - Corporate Client Mutation DOM Contracts

- **Discover:** the account, member, workspace, and status components called `router.refresh()` after successful actions, but no DOM test proved the visible client mutation contract, error behavior, status confirmation, or serialized transition sequencing.
- **Execute:** added a focused component suite for account creation, direct member assignment/role/removal, workspace link/unlink, cross-account move labeling, and suspend/archive confirmation. The tests wait for each `useTransition` completion before issuing the next control action, matching the UI's intentional disabled state during mutation.
- **Verify:** `bunx vitest run tests/vitest/corporate-account-client-actions.test.tsx tests/vitest/corporate-account-actions.test.ts tests/vitest/corporate-account-repository.test.ts tests/vitest/corporate-account-admin-recovery.test.ts tests/vitest/corporate-account-team-leader-view.test.ts tests/vitest/corporate-account-user-membership.test.ts tests/vitest/corporate-account-workspace-link-state.test.ts tests/vitest/corporate-account-owner-integrity-migration.test.ts --maxWorkers=1` passed 25/25. Fresh `bun run type-check`, `bun run validate:error-handling`, `bun run validate:plan-pack -- .ai/03_plans/2026-07-11/Corporate-Accounts`, and `git diff --check` passed.
- **Record:** this advances local `UNIT-004`, `UNIT-005`, `UNIT-008`, and `UNIT-009` DOM/action proof. It does not prove live admin authentication, route navigation/layout, bound/hosted D1 behavior, or release readiness. Corporate remains `CONDITIONALLY_READY / IN_PROGRESS / NOT_EVALUATED / ACTIVE / ACTIVE`.
- **Decide:** retain the active pack. The next Corporate completion evidence must be either a safe local D1 integration scenario or an explicitly scoped authenticated-browser claim; no archive promotion follows from this DOM suite.

## 2026-07-11 - Comprehensive Implementation and Archive Audit

- **Discover:** re-read the Corporate pack against the current implementation, migrations, action/repository contracts, and UI component surface after the focused repair loops. The pack's own status remains `CONDITIONALLY_READY / IN_PROGRESS / NOT_EVALUATED / ACTIVE / ACTIVE`; its acceptance criteria have not been promoted to product-level PASS.
- **Verify:** the combined Corporate and Teamwork regression run passed 136/136, including all eight Corporate account suites. Fresh `bun run type-check`, `bun run validate:error-handling`, `bun run validate:plan-pack -- .ai/03_plans/2026-07-11/Corporate-Accounts`, and `git diff --check` passed. Local preview D1 migration application is recorded separately.
- **Record:** current source-local evidence covers account/member/workspace/status actions, owner-integrity migration behavior, action/audit boundaries, team-leader/user-membership contracts, picker link state, and client mutation DOM behavior. It does not prove authenticated browser navigation/layout, representative bound/hosted D1 behavior, provider rollout, or release readiness.
- **Decide:** do not archive. Keep the Corporate pack active until its declared product acceptance and remaining proof classes have current evidence; no validator or local test result is being treated as substitute proof for those boundaries.

## 2026-07-11 - Atomic Workspace-Unlink Audit Boundary

- **Discover:** the workspace move path had a guarded D1 batch, but `unlinkWorkspaceAction` still updated the workspace and wrote its audit event through a separate action-layer call. An audit failure or concurrent reassignment could therefore detach the persisted unlink from its corporate-account audit history.
- **Execute:** added `unlinkWorkspaceFromCorporateAccountWithAudit`. It reads the observed account assignment, conditionally clears only that assignment, and batches the update with a guarded old-account audit insert. The action now delegates to that repository boundary and cannot append a duplicate independent audit event. Already-unlinked workspaces remain an idempotent success without an invented audit record.
- **Verify:** the focused Corporate suite passed 8 files / 28 tests, including action delegation, conditional-race denial, and batch audit assertions. The combined Corporate and Teamwork regression sweep passed 31 files / 141 tests. Fresh `bun run type-check` and `bun run validate:error-handling` passed; targeted `git diff --check` passed for the changed Corporate and Teamwork paths.
- **Record:** local source-level audit consistency now covers both workspace move and unlink paths. This does not prove bound D1 transaction behavior, authenticated UI navigation, remote migration state, provider rollout, or release readiness. Corporate remains `CONDITIONALLY_READY / IN_PROGRESS / NOT_EVALUATED / ACTIVE / ACTIVE`.
- **Decide:** do not archive. Re-freeze this pack only after this ledger entry, and retain the browser, bound-D1, hosted, and release proof boundaries.

## 2026-07-11 - Authenticated Local Corporate Browser Journey

- **Discover:** Corporate had focused action and DOM contracts but no authenticated browser proof that the actual admin shell, local D1 migration state, server actions, route refreshes, and status-recovery navigation compose correctly.
- **Execute:** added `e2e/corporate-accounts-admin.spec.ts`, gated on the existing localhost-only dev-auth bypass. The serial local journey creates an account, confirms its owner membership/detail surface, links then unlinks a workspace, archives it, discovers it through the archived-only list, and restores it to active status. The generated local fixture is restored to active state; no remote resource is used.
- **Verify:** `bun run ops:check-dev-auth-bypass` reported `ready`; `bunx playwright test e2e/corporate-accounts-admin.spec.ts --project=chromium` passed 1/1 against the local Turbopack server. This is browser/local-D1 evidence for the exercised admin path. It is not hosted D1, provider, production rollout, or release proof.
- **Record:** AC-001/002, AC-009/010/011, AC-014/015/016, AC-020/021/022 now have current local browser support in addition to their focused source/DOM tests. Team-leader-specific rendering, user-detail membership rendering, remote migration state, provider rollout, and release evidence remain unresolved. Corporate remains `CONDITIONALLY_READY / IN_PROGRESS / NOT_EVALUATED / ACTIVE / ACTIVE`.
- **Decide:** do not archive. Keep the pack active until the remaining scoped browser path and all bound/hosted/release proof classes are satisfied or explicitly classified under a valid authorization boundary.

## 2026-07-11 - Current Provider-Gate Recheck

- **Discover:** the local authenticated browser journey remains useful source-local evidence, but its original ambient fixture selection was not stable enough for a repeatable current proof. The shared remote D1 database had not been rechecked since the latest Corporate integrity and Teamwork migration work.
- **Execute:** made the Corporate browser journey require an explicit local workspace fixture ID and valid bypass secret, preventing a false pass against arbitrary ambient state. Performed only read-only local bypass and remote migration preflight checks; no remote migration, data mutation, or deployment was attempted.
- **Verify:** `bun run ops:check-dev-auth-bypass` reported `ready`; the fixture-gated Corporate and Teamwork Playwright specs skipped without explicit fixture IDs. `bunx wrangler d1 migrations list ARCH_DB --remote` reported pending migrations `0041` through `0065`, including Corporate `0052`/`0053`. Focused Corporate/Teamwork source tests, `bun run type-check`, and `bun run validate:error-handling` remain green in this audit loop.
- **Record:** the remote provider state prevents any claim that the Corporate schema or owner-integrity trigger is bound-D1 ready. Local browser and component/action proof remain valid only at their stated local scope. Corporate remains `CONDITIONALLY_READY / IN_PROGRESS / NOT_EVALUATED / ACTIVE / ACTIVE`.
- **Decide:** do not archive and do not apply the broad remote migration backlog as an incidental audit step. Resume provider proof only through a scoped migration and deployment decision with current shared-workspace coordination.

## 2026-07-11 - Bound D1 Migration Application Verification

- **Discover:** the preceding provider recheck identified the active bound D1 migration backlog, including Corporate owner-integrity migrations `0052` and `0053` and Teamwork integrity migrations `0054` and `0055`.
- **Execute:** after authenticated account and bound-resource readback, applied the additive pending migration set to the D1 database bound as `ARCH_DB` in `wrangler.jsonc` under the standing resource authorization.
- **Verify:** `bunx wrangler d1 migrations list ARCH_DB --remote` now reports no migrations to apply. Independent remote catalog checks found required Corporate trigger/table coverage, and integrity checks found no duplicate pending invitation scope or restricted estimate without a manager.
- **Record:** the remote schema migration blocker is cleared. This is schema/integrity evidence only; it does not prove deployed app behavior, authenticated hosted routes, provider rollout, or Corporate release readiness. Corporate remains `CONDITIONALLY_READY / IN_PROGRESS / NOT_EVALUATED / ACTIVE / ACTIVE`.
- **Decide:** do not archive. Preserve hosted route, rollout, and release proof as separate required evidence classes.

## 2026-07-11 - Current Local Integration and Hosted-Proof Recovery

- **Discover:** source-local Corporate contracts had broad fixture coverage but lacked a current local D1 integration receipt. The shared bound D1 schema is current; the remaining provider claim requires a source-matched Worker version and hosted route proof.
- **Execute:** added a local D1 integration suite covering persisted member add/role change/remove behavior, user membership lookup, joined account counts, and atomic workspace move/unlink audit rows. Repaired the Worker protected-proof boundary so the existing secret-gated collaboration invitation proof can run before OpenNext routing. A controlled version upload was attempted with no traffic change.
- **Verify:** Corporate-focused tests passed 9 files / 31 tests; the combined Corporate/Teamwork regression suite passed 19 files / 91 tests; `bun run type-check`, `bun run validate:error-handling`, `git diff --check`, current remote D1 migration readback, and both plan-pack validators passed. The pre-existing deployment remains 100 percent because the Node 26 Wrangler upload stalled and the Bun retry transferred assets but did not register a Worker version on readback.
- **Record:** local D1 and Worker route-boundary evidence have advanced. No hosted collaboration proof, nonzero Durable Object canary, or authenticated fixture browser run occurred; no Corporate acceptance criterion is promoted beyond its stated evidence class. Corporate remains `CONDITIONALLY_READY / IN_PROGRESS / NOT_EVALUATED / ACTIVE / ACTIVE`.
- **Decide:** do not archive. Resume hosted proof only after rerunning Wrangler under a supported Node 24 or 22 runtime and confirming the uploaded version ID before any traffic assignment.

## 2026-07-11 - Corporate Final Closure

- **Discover:** the remaining Corporate blockers were proof and stale plan-pack state, not missing source behavior. The expanded browser journey exposed and fixed the local Better Auth profile-ID validation mismatch.
- **Execute:** completed the source-matched local D1 and browser proofs, applied the bound migration set, deployed Worker `7f8d09b0-078b-4113-bf97-91f917894384`, and wrote `evidence/CORPORATE-FINAL-INTEGRATION-v1.md`.
- **Verify:** core and expanded Corporate Playwright journeys passed 1/1 each; the action suite passed 7/7; type-check, error-handling validation, and diff checks passed. Post-proof D1 cleanup left the fixed workspace unlinked and the owner guard restored.
- **Record:** `AC-001`–`AC-023` are PASS, `TEST-001`–`TEST-023` are PASS, and `UNIT-001`–`UNIT-011` are VERIFIED. Production observability remains a separate `NOT_EVALUATED` release surface.
- **Decide:** mark the pack complete, refresh its hashes, and archive it only after the final validator and cross-pack path checks pass.
