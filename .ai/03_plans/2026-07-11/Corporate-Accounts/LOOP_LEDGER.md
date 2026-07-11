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
