# 08 — Access, Security, and RLS Plan

**Date:** 2026-06-12 · Grounding: [01_CURRENT_STATE_AUDIT.md](01_CURRENT_STATE_AUDIT.md) §7, §11; schema: [03_DATABASE_MIGRATION_PLAN.md](03_DATABASE_MIGRATION_PLAN.md) §5.

---

## 1. Current access model (verified)

- Helper family (SECURITY DEFINER, `supabase/migrations/20260526142913`): `collaboration_role_rank` (owner=40/admin=30/editor=20/viewer=10, `:156-168`), `current_project_access_rank` (max of platform-admin=100, workspace rank, project_members rank, `:187-216`), `can_access_project` (**includes** `estimate_sheet_members` so sheet-only collaborators see the project shell, `:218-245`), `can_edit_project` (`:247-270`), `estimate_inherits_project_access` (default true, `:348-363`), `can_access_estimate` (`:365-386`, re-asserted `20260601151500:5-26`), `can_edit_estimate` (`:388-410`), `can_manage_estimate_access` (rank ≥ 30, `:438-446`), `can_change_estimate_access_settings` (`:513-539`).
- `estimate_sheet_access_settings` (PK `estimate_id`, `inherit_project_access`) and `estimate_sheet_members` (PK `(estimate_id, user_id)`, role enum) behave as: effective estimate rank = `max(inherits ? projectRank : 0, sheetRole)` — mirrored app-side at `src/lib/collaboration/actions.ts:173-193`.
- Estimate data tables: SELECT `can_access_estimate`, ALL `can_edit_estimate` (`20260526142913:726-754`).
- Collaboration member/invite mutations run through app-side rank asserts then a **service-role admin client** (`collaboration/actions.ts:80-98`) — RLS is not the enforcement path for those writes.
- **Known asymmetry (pre-existing):** the `*_with_history` RPCs authorize via `resolve_estimate_workspace` = raw **workspace membership** (`20260524033151:77-122`), not `can_edit_estimate`; only the unlink RPC adds the estimate-level check (`20260601184343:29-31`). A workspace member who is a restricted-estimate **viewer** can currently mutate rows through history RPCs. This feature must not widen that gap — and should narrow it where it touches (§4).

## 2. Tab-level access: in scope or deferred?

**Deferred — decision.** Tabs inherit estimate access wholesale. Rationale: no surface in the audit wants sub-estimate permissions; `estimate_sheet_members` already provides per-estimate granularity; per-tab ACLs would multiply the permission matrix and the service-role mutation surface for zero requested value. Revisit only on explicit product demand (logged in [12_OPEN_QUESTIONS_AND_DECISIONS.md](12_OPEN_QUESTIONS_AND_DECISIONS.md) D-5). Do not overbuild — the schema needs nothing reserved for it (a future `estimate_tab_members` table is purely additive).

## 3. RLS policies for `estimate_tabs`

Mirror `estimate_nodes` exactly (03 §5): SELECT → `can_access_estimate(estimate_id)`; ALL → `can_edit_estimate(estimate_id)`; platform-admin policy; grants to authenticated; RLS enabled after any seed/backfill with `set constraints all immediate` precedent respected (`20260522091621:570-573`).

## 4. RLS impacts of `estimate_nodes.estimate_tab_id` + RPC hardening

- Node policies are unchanged (they gate on `estimate_id`, which remains). The composite FK (03 §4.1) provides integrity, not authorization — correct separation.
- **New tab RPCs** (`create/rename/reorder/duplicate/archive/delete_estimate_tab_with_history`): SECURITY DEFINER following the family pattern (idempotent `correlation_id`, `resolve_estimate_workspace`) **plus an explicit `can_edit_estimate(target_estimate_id)` check** — adopting the unlink RPC's stricter posture (`20260601184343:29-31`) rather than the older family's workspace-only check, so the new surface doesn't inherit the §1 asymmetry.
- Recommended (non-blocking) hardening ride-along: where Phase 1 already edits `reorder_estimate_nodes`/`create_estimate_node_with_history` for tab awareness (03 §8), add the same `can_edit_estimate` guard. Flagged as a scoped improvement, not a silent behavior change — owner visibility via [12](12_OPEN_QUESTIONS_AND_DECISIONS.md) D-6.

## 5. Project-derived template browsing and insertion

- **Browse (read):** all listing/outline/search actions use RLS-scoped user clients (06 §8). No service-role reads. Therefore: a project-derived tree can never contain an estimate the user cannot `can_access_estimate`, and pending-invite projects stay excluded (`src/lib/component-library/actions.ts:1116-1119`).
- **Drag prevention:** UI only renders sources the read path returned — a user cannot drag what they cannot read. Defense-in-depth: the insert RPC re-checks source readability server-side, so a forged payload (hand-crafted drag data or direct action call with someone else's `estimateId`) fails closed.
- **Insertion (write):** `insert_estimate_subtree_into_estimate_with_history` (06 §7) enforces, in order: (1) `can_access_estimate(source_estimate_id)`; (2) `can_edit_estimate(target_estimate_id)`; (3) source and target resolve to the **same workspace** (template-RPC precedent `20260522091621:250-252`); (4) target parent is a group in the target estimate/tab; (5) tree validation post-copy. App-side, the wrapping action calls `assertCanEditEstimate` (`src/lib/estimates/actions.ts:333-337`) before invoking the RPC.
- **Save as template:** `createEstimateTemplateFromEstimateNode` already verifies workspace scoping (`component-library/actions.ts:672-827`); it gains an explicit `can_access_estimate(source)` posture check when invoked from the panel (its current project-scoped read achieves this via RLS — verify in implementation **[D]**).

## 6. Read/write permission matrices

Read matrix — "Can this actor see X in the Projects section of the templates panel?" (X = project P / estimate E / tab T / node N; T and N inherit E):

| Actor | Sees P listed | Sees E (inheriting) | Sees E (restricted) |
|---|---|---|---|
| Workspace owner/admin | ✅ | ✅ | ❌ unless also explicit estimate sheet member or platform admin (`can_access_estimate` ignores project rank when `inherit_project_access=false`, `20260601151500:12-25`) |
| Workspace member (editor) | ✅ | ✅ | only if sheet member |
| Workspace viewer | ✅ | ✅ (read) | only if sheet member |
| Project member (any role) | ✅ | ✅ | only if sheet member |
| Estimate sheet member only | ✅ (project shell via `can_access_project` `:218-245`) | their estimate only | their estimate only |
| Invited (pending) | ❌ (excluded, `src/lib/component-library/actions.ts:1119`) | ❌ | ❌ |
| Shared-link recipient | ❌ (anonymous/public surface; share pages read frozen snapshots only — 01 §13) | ❌ | ❌ |
| Anonymous | ❌ (`requireCurrentUserContext` redirect, `src/lib/auth/session.ts:87-91`) | ❌ | ❌ |

Write matrix — "Can this actor insert into target estimate/tab?" (insert requires `can_edit_estimate(target)` = effective rank ≥ editor, `20260526142913:388-410`):

| Actor on target estimate | Insert custom template | Insert project-derived source | Tab CRUD |
|---|---|---|---|
| Workspace/project owner/admin | ✅ only when target inherits project access, or actor is explicit estimate sheet editor/admin/owner, or platform admin | ✅ only under the same target rule and if source readable | ✅ only under the same target rule |
| Editor (project or sheet role) | ✅ | ✅ (if source readable) | ✅ |
| Viewer (any path) | ❌ | ❌ | ❌ |
| Sheet member on a *different* estimate | ❌ | ❌ | ❌ |
| Anonymous / pending invite | ❌ | ❌ | ❌ |

Cross-workspace and cross-project denial: source workspace ≠ target workspace → RPC error (matrix row independent of roles); browsing never lists other workspaces (`ensureDefaultWorkspace` scoping, `workspace-repository.ts:640-699`).

## 7. Denial scenarios that must be tested (feeds [09](09_TEST_AND_VALIDATION_PLAN.md) §4)

1. Workspace owner/admin or member, restricted estimate, not an estimate sheet member and not platform admin → estimate absent from Projects section; direct `getReusableEstimateOutline(estimateId)` returns empty/denied.
2. Sheet-member-only user → sees exactly their estimate under its project; sibling estimates absent.
3. Project owner/admin, restricted estimate, not an estimate sheet member and not platform admin → project shell may be visible, but restricted estimate/tab/node source stays absent and direct outline call is denied.
4. Forged insert: viewer on target calls `insertProjectSourceIntoEstimate` directly → RPC error, no rows written, no event.
5. Forged source: editor on target supplies an unreadable `source_estimate_id` → error, nothing written.
6. Cross-workspace source → error (template precedent parity).
7. Deleted source between browse and insert → typed "source missing" error (06 §11).
8. Anonymous export of a tabbed estimate → login redirect unchanged (`route.ts` auth chain).
9. RLS proof harness cases for `estimate_tabs`: select/deny and write/deny across two users, including restricted-estimate workspace/project rank denial, via the ephemeral-Postgres pattern (03 §13).

## 8. Audit event additions

- Tab CRUD events `tab_*` with actor + correlation (04 §7); insertion of project sources writes a `project_source_inserted` event (sibling of `template_inserted`, `20260524033151:1050`) with payload `{sourceEstimateId, sourceTabId, sourceNodeId, insertedNodeCount, insertedRowItemCount}`.
- AI audit: `ai_data_access_events` has no tab column (01 §14); new AI reads that become tab-scoped should record tab ids inside the existing `metadata`/source-tables fields — additive, deferred to the AI surface's own pass **[D]**.

## 9. Service-role-only operations

None added by this feature. Existing service-role surfaces stay as-is: collaboration member/invite writes (`collaboration/actions.ts:80-98`), publication snapshot builds (`publication/actions.ts:342-437`), share-page RPC executions (service-role-only grants, `20260528220000:324-328`). The new insert RPC is authenticated-user-facing (SECURITY DEFINER with explicit checks, granted to `authenticated` — exactly like `insert_estimate_template_into_estimate_with_history`, `20260524033151:1715`). Keeping the new path off service-role is deliberate: every check in §5 remains attributable to `auth.uid()`.

## 10. Supabase advisory note — `public.profile_role_hardening_audit` (unrelated existing risk)

A live Supabase advisory reports RLS disabled on `public.profile_role_hardening_audit`. Local-evidence corroboration: the table is created in `supabase/migrations/20260602090000_harden_beta_allowlist_admin.sql:14-22` with **grants revoked** from public/anon/authenticated (`:24`) but **no `enable row level security` statement in any migration** (verified across all 84 files); it is also absent from generated `src/lib/supabase/types.ts` (stale types). PostgREST exposure is blocked by the revokes, so practical risk is low, but the advisory will keep firing. **Disposition: documented as an unrelated, pre-existing risk. Remediation (enable RLS + default-deny policy, then regen types) is NOT part of this feature implementation and requires separate authorization.** Cross-referenced in [11_RISK_REGISTER.md](11_RISK_REGISTER.md) (R-ADV) and [16_COMPLETION_AUDIT.md](16_COMPLETION_AUDIT.md).

## Evidence Used

- `supabase/migrations/20260526142913_project_sheet_collaboration_access.sql` (helper family, policies, composite FKs)
- `supabase/migrations/20260601151500_restrict_sheet_collaborator_estimate_inheritance.sql`; `20260601184343_unlink_estimate_row_items.sql:29-31` (strict-RPC precedent)
- `supabase/migrations/20260524033151_estimate_sheet_version_control.sql:77-122, 1000-1064, 1715` (resolve_estimate_workspace, insert-RPC grant pattern)
- `supabase/migrations/20260522091621_component_library_templates.sql:250-252` (cross-workspace guard precedent)
- `supabase/migrations/20260602090000_harden_beta_allowlist_admin.sql:14-24` (advisory table)
- `src/lib/collaboration/actions.ts:45-216, 80-98` (rank math, admin-client boundary)
- `src/lib/estimates/actions.ts:333-337` (assertCanEditEstimate)
- `src/lib/component-library/actions.ts:1116-1119` (pending-invite exclusion)
- `src/lib/repositories/workspace-repository.ts:640-830` (workspace scoping + access resolver)
- `src/lib/auth/session.ts:87-91`; `src/lib/publication/actions.ts:342-437` (anonymous + service-role boundaries)
