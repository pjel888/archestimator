# 05 — Database, RLS & Security Audit

**Lens:** Schema correctness, indexes, RLS, the SECURITY DEFINER insert path, the origin plan's 9 denial scenarios, and the live-vs-local-only reality. Live reads were SELECT/metadata only against project `ebxxqidacheyapmmzavr`; no mutation, no other project touched.

**Two headlines:**
1. **The entire estimate-tabs DB foundation + hardened RPCs are NOT applied to the live database.** Live `list_migrations` ends at `20260606095935_legal_terms_acceptance`; `public.estimate_tabs`, `estimate_nodes.estimate_tab_id`, and the hardened RPCs do not exist live.
2. **The live template-insert RPC authorizes on workspace membership only — not `can_edit_estimate`** — a workspace-member *viewer* on a restricted estimate can insert content (privilege escalation past viewer). The hardened version exists only in the unapplied migration.

---

## Schema map

### Custom templates (`20260522091621_component_library_templates.sql`) — LIVE
| Object | Evidence | Notes |
|---|---|---|
| `estimate_templates` | `:4-15` | workspace-scoped; FK→workspaces CASCADE, created_by→auth.users SET NULL |
| `estimate_template_nodes` | `:17-33` | composite FK `(template_id,parent_id)→(template_id,id)`; `kind in ('group','area')`; self-parent guard; deferred unique sort |
| `estimate_template_row_items` | `:35-60` | composite FK keeps rows in-template; CHECKs `quantity/unit_cost/misc_cost >= 0` |
| Indexes | `:62-67` | `estimate_templates(workspace_id, sort_order, name)`, nodes `(template_id, parent_id, sort_order)`, rows `(template_id, template_node_id, sort_order)` + FK indexes — **hot paths covered** |
| Triggers | `:69-75`, `:77-153`, `:180-205` | `updated_at`; `validate_estimate_template_tree` (SECURITY DEFINER, `search_path=public`); area-only-row enforcement |

### `estimate_tabs` + `estimate_nodes.estimate_tab_id` — LOCAL-ONLY (NOT LIVE)
| Object | Evidence (repo) | Notes |
|---|---|---|
| `estimate_tabs` | `20260612094734:12-30` | FK estimate_id→estimates CASCADE; `unique(estimate_id, id)`; partial unique `one_default_per_estimate`; CHECK archived ⇒ not default — **sound by reading** |
| `estimate_nodes.estimate_tab_id` | `:51-70` | NOT NULL post-backfill; composite FK `(estimate_id, estimate_tab_id)→estimate_tabs(estimate_id, id)` CASCADE — prevents cross-estimate tab pointers |
| Indexes | `:32-33,:72-73,:78-80` | `estimate_tabs(estimate_id, sort_order)`; `estimate_nodes(estimate_tab_id, parent_id, sort_order)`; partial event index — covered when applied |
| `validate_estimate_node_tree` (tab-aware) | `:208-295` | adds "parent from another tab" rejection + per-tab hierarchy checks |

**No table for project-derived sources** — confirmed (read-through only; correct).

---

## RLS policy table (LIVE-verified)

| Table | Policy (cmd) | USING / WITH CHECK | Verdict |
|---|---|---|---|
| `estimate_templates` | members manage (ALL) | `is_workspace_member(workspace_id)` | **Sound** |
| `estimate_template_nodes` | members manage (ALL) | `EXISTS(template … is_workspace_member(workspace_id))` | **Sound** |
| `estimate_template_row_items` | members manage (ALL) | same EXISTS via template_id | **Sound** |
| `estimate_tabs` (LOCAL-ONLY) | viewers SELECT `can_access_estimate`; editors ALL `can_edit_estimate`; platform-admin | `20260612094734:41-46` | **Sound by reading, NOT LIVE** — cannot prove until applied |
| reusable-source read path | RLS-scoped USER client only | `reusable-sources/actions.ts` + `createSupabaseServerClient` (anon key); `asEstimateTabsReadClient` is a cast of the same client | **Sound** — no service-role import (grep-clean) |
| `is_workspace_member` | SECURITY DEFINER, `search_path=public`, keyed on `auth.uid()` | live `pg_get_functiondef` | **Sound** |

`is_workspace_member` is a *looser* predicate than `can_access_estimate` — correct for **template** tables (workspace-shared assets), but the **wrong** gate when used to authorize inserting into a *restricted estimate* (see RPC review → SEC-1).

---

## Denial-scenario matrix (origin §7)

| # | Scenario | Enforced by | Verdict |
|---|---|---|---|
| 1 | restricted estimate absent from Projects; direct outline denied | tab/node read RLS via `can_access_estimate` | **At-risk** — logic sound but depends on `estimate_tabs` RLS that is **not live**; today the outline path 500s before RLS is reached |
| 2 | sheet-member-only sees only their estimate | `can_access_estimate` + pending-invite filter (`actions.ts:59,73,100`) | **At-risk** (tabs not live) |
| 3 | project owner, restricted estimate stays absent | `can_access_estimate` | **At-risk** (helper sound + live; tabs not live) |
| 4 | viewer-on-target forged insert → error | **SHOULD be** `assert_can_edit_estimate_for_history` | **GAP (LIVE)** — live RPC uses workspace-membership only (SEC-1); a member-viewer can insert |
| 5 | editor supplies unreadable source → error | RPC same-workspace check | **Partial** — holds for custom templates (`20260522091621:250-252`); for project sources the source-read guarantee rides on the action's RLS read, not an RPC |
| 6 | cross-workspace source → error | RPC `source_workspace <> target_workspace` (`:250-252`) | **Proven (LIVE)** for custom templates |
| 7 | source deleted between browse & insert → typed error | RPC null-check (`:246-248`) | **Proven (LIVE)** for custom templates; for project sources surfaces as the action's "node no longer exists" (`actions.ts:703`) |
| 8 | anonymous export → login redirect | `requireCurrentUserContext` / `authenticated`-only grants | **Proven (code)**; no in-route auth assertion test (see [06](06_BLAST_RADIUS_ANALYSIS.md)/test gaps) |
| 9 | `estimate_tabs` RLS select/deny + write/deny across two users | `scripts/prove-estimate-tabs-postgres.mjs` (ephemeral Postgres) | **Covered by harness** — but the harness applies the local migration; not proven against the live (unapplied) DB |

Scenarios 4–7 for **project sources specifically** are moot today because the project-source insert path does not exist ([07](07_FUNCTIONAL_DEFECTS_AND_COMPLETENESS.md)).

---

## SECURITY DEFINER RPC review

The origin plan's `insert_estimate_subtree_into_estimate_with_history` **does not exist** (0 hits in `supabase/` and `src/`). There are two real insert RPCs and one app-layer save-as-template flow:

- **`insert_estimate_template_into_estimate` (inner, NOT SECURITY DEFINER)** — `20260522091621:207`. Runs as caller, so RLS on `estimate_nodes`/`estimate_row_items` (ALL = `can_edit_estimate`) is the backstop. Checks: args → estimate∈project → template exists → **same workspace** (`:250-252`) → parent is `group` → tree validation. Ordering correct; `search_path=public` pinned.
- **`insert_estimate_template_into_estimate_with_history` (SECURITY DEFINER wrapper)** — the granted-to-`authenticated` entry point. Because it is SECURITY DEFINER it **bypasses RLS on the inner writes**, so its own pre-check IS the authorization.
  - **LIVE (via `pg_proc`):** authorizes via `resolve_estimate_workspace` = raw workspace membership (`20260524033151:111-118`); `has_can_edit=false`. **→ SEC-1: a workspace member who is only a viewer on a restricted estimate (`inherit_project_access=false`, not a sheet editor) can insert.**
  - **LOCAL (hardened, unapplied):** replaces the gate with `assert_can_edit_estimate_for_history` (`20260612094734:1002,180-206`) = `resolve_estimate_workspace` THEN `can_edit_estimate(target)`. `search_path=public` pinned; `estimate_sheet_can_bypass_auth()` keys off `auth.role()='service_role'` (not the definer's `current_user`), so the bypass isn't an escalation. **This is the correct design — it just isn't deployed.**

**Project-derived insertion (actual path):** no SECURITY DEFINER subtree RPC; instead `createEstimateTemplateFromEstimateNode` (`actions.ts:672`) reads the source on the RLS user client (source-read enforced by RLS) and persists a template, then the standard insert runs — inheriting the **same live `can_edit` gap** (SEC-2). No `assertCanEditEstimate` call was found in `insertEstimateTemplateIntoEstimate`/`wrapEstimateAreaAndInsertTemplate` (contrary to the plan's claim).

---

## Findings

| ID | Sev | Finding | Evidence | Impact | Fix |
|---|---|---|---|---|---|
| SEC-1 | **P1** | Live insert RPC authorizes on workspace membership only, not `can_edit_estimate`; member-viewers can insert into restricted estimates. | live `pg_proc` (`security_definer=true, has_can_edit=false, uses_resolve_ws=true`); gate `20260524033151:111-118` | Privilege escalation past viewer role. Pre-existing, but the Templates UX widens who reaches the RPC. | Apply / port the hardened `assert_can_edit_estimate_for_history` (`20260612094734:1002`). |
| SEC-2 | P2 | The template-insert actions don't **call** `assertCanEditEstimate` before the definer RPC, despite the plan claiming it. (The helper exists at `actions.ts:345` and guards other paths — e.g. `detachEstimateRowItemFromLibrary:2606` — but is not invoked by the insert path.) | `estimates/actions.ts:2157-2184`, `:2389+` (only `getCurrentWorkspaceProject` + `requireCurrentUserContext`) | Defense-in-depth missing; with SEC-1 unfixed, nothing stops the viewer write. | Add `assertCanEditEstimate(supabase, estimateId)` at the top of both actions. |
| DB-1 | **P1** | The estimate-tabs DB foundation + hardened RPCs are **unapplied**; the live DB serves the old unhardened RPC and has no tabs schema. | live `list_migrations` ends `20260606095935`; `pg_class` shows `estimate_tabs` absent | Denial scenarios 1–3/9 unenforceable in prod; the project-source outline path 500s ([07](07_FUNCTIONAL_DEFECTS_AND_COMPLETENESS.md)); any "shipped/merge-ready" claim is inaccurate for prod. | Owner-authorize the apply of `20260612094734` (+ intervening) + regen `types.ts`; then remove the `asEstimateTabsReadClient` casts. **OR** ship the fallback fix (U1) first so the app degrades safely without the apply. |
| DB-2 | P3 | `insert_estimate_subtree_into_estimate_with_history` (plan Phase-5 RPC) was never built; project sources reuse the template path via a persisted row. | grep: 0 hits; `actions.ts:672` | Plan/implementation drift; auditors expecting the RPC mis-assess. | Update plan docs to reflect reality, or build the dedicated RPC (see [08](08_SOLUTIONS_AND_OPTIMIZATIONS.md) U2). |
| SEC-3 | P3 | `public.profile_role_hardening_audit` has RLS disabled, 0 policies. | live `pg_class` (rls_enabled=false); created `20260602090000` | Low practical risk — grants only postgres/service_role, so PostgREST does not expose it. **Out of scope** per origin §10. | If remediating: enable RLS + default-deny (separate authorization). |
| SEC-4 | P3 | 110 advisories (106 WARN, 0 ERROR): 69 `authenticated_security_definer_function_executable`, 33 anon-exec, 4 `rls_enabled_no_policy` (none template/tab tables), 3 `function_search_path_mutable` (incl. `set_updated_at`, used by template triggers). | parsed advisor dump | No ERROR-level advisory touches this feature; not introduced by Templates. | Track separately; optionally pin `set_updated_at` search_path. |

No template/tab/reusable table appears in `rls_enabled_no_policy`; no ERROR-level advisory touches this feature.

---

## Evidence used

Live (read-only, project `ebxxqidacheyapmmzavr`): `list_migrations`, `pg_class`/`pg_policy`/`pg_proc`/`role_table_grants`, advisors. Migrations: `20260522091621_component_library_templates.sql` (live), `20260612094734_estimate_tabs_foundation.sql` (local-only), `20260524033151`, `20260601153000`, `20260602090000`. Code: `reusable-sources/actions.ts`, `workspace-repository.ts`, `component-library/actions.ts:672`, `estimates/actions.ts`, `src/lib/supabase/server.ts`. Harness: `scripts/prove-estimate-tabs-postgres.mjs`.

## Truth & integrity

- **VERIFIED (live reads / code):** template RLS sound; live RPC lacks `can_edit` (SEC-1); `estimate_tabs` not live (DB-1); subtree RPC absent (DB-2); reusable read path admin-free; `profile_role_hardening_audit` RLS off but unexposed (SEC-3); search_path pinning on template/tab functions.
- **ASSUMPTION / manual-proof-pending:** denial scenarios 1–3 and 9 against the **live** DB (RLS policies are sound by reading but `estimate_tabs` is not live, and no two-user harness was run here); minor migration-history drift on `profile_role_hardening_audit` (table exists live but its creating migration is absent from `list_migrations`).
