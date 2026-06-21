# 33 — DB, RLS, and Migration Contract

> **Status:** Living document. Initialized 2026-06-21; re-verified against the
> real `supabase/migrations/*.sql` and the keystone
> [19-VERIFIED-CODEBASE-BINDINGS-AND-PHASE-MAP.md](19-VERIFIED-CODEBASE-BINDINGS-AND-PHASE-MAP.md)
> on 2026-06-21. Every table name, column, RLS policy, helper function, and
> index name in §2–§6 was confirmed by `rg`/`fd` against the actual migration
> files; the citation after each fact is the `migration:line` where it is
> DEFINED or last `CREATE OR REPLACE`d. Deepens
> [13-DATA-CONTRACTS-ROUTE-CACHE.md](13-DATA-CONTRACTS-ROUTE-CACHE.md) and
> [14-SECURITY-AUTHZ-AND-DATA-EXPOSURE.md](14-SECURITY-AUTHZ-AND-DATA-EXPOSURE.md)
> with the schema/RLS/migration facts those docs delegate here.
>
> **Material liquid-glass layer** lives in
> [35-LIQUID-GLASS-LIBRARY-UX-SPEC.md](35-LIQUID-GLASS-LIBRARY-UX-SPEC.md);
> this doc is the data/RLS/migration layer only.
>
> **Scope:** per-table schema (verified columns), RLS policy contract (every
> policy name + clause summary + actor), the no-migration gate for 0A–5,
> query-optimization index contract, and Phase-later backfill plans.
>
> **Companion docs:** [13](13-DATA-CONTRACTS-ROUTE-CACHE.md),
> [14](14-SECURITY-AUTHZ-AND-DATA-EXPOSURE.md),
> [19](19-VERIFIED-CODEBASE-BINDINGS-AND-PHASE-MAP.md),
> [27](27-OWNERS-AND-ACCOUNTABILITY-MATRIX.md),
> [32](32-SECURITY-THREAT-MODEL-EXPANSION.md).

---

## 1. Purpose

The Library page persists on Supabase/Postgres. This doc is the **canonical
DB/RLS/migration contract** for the pack:

1. **Defines the verified schema** for every Library-relevant table, with the
   migration where each column was introduced (§2).
2. **Defines the RLS policy contract** — for every Library table, the real
   policy name(s), actor, and `USING`/`WITH CHECK` clause summary, with the
   migration:line citation (§3).
3. **Defines the no-migration gate** for 0A–5 — zero schema changes, with the
   explicit exception list (§4).
4. **Defines the query-optimization contract** — verified real indexes,
   Phase-0A-candidate indexes gated behind the perf seed, EXPLAIN ANALYZE
   requirement (§5).
5. **Defines Phase-later backfill plans** — only for items explicitly
   migration-gated in doc 19 (§6).
6. **Resolves C-011** from
   [26-CROSS-DOC-CONFLICTS-AND-RESOLUTIONS.md](26-CROSS-DOC-CONFLICTS-AND-RESOLUTIONS.md):
   Quick Add reuses existing columns; no schema change.

Doc 13 owns cache keys; doc 14 owns the authz narrative; doc 19 owns the
keystone binding registry; doc 32 owns the threat model. This doc is the
**single source of truth for SQL-level facts** (schema, policies, indexes) —
when any of those docs disagrees with this doc on a SQL fact, **this doc wins**
on SQL and the other doc is stale until reconciled.

---

## 2. Schema (verified)

### 2.1 Beta scope (0A–5): NO schema changes — gate row

> Owner: DB lead · Phase: 0A · Flag: n/a (schema gate) · Rollback: git revert;
> no migration to roll back · Evidence: EV-0A-NO-MIGRATION · Telemetry: n/a ·
> Copy: n/a · A11y: n/a · Perf: n/a · Browser-proof: n/a · i18n: n/a · Binding:
> [19](19-VERIFIED-CODEBASE-BINDINGS-AND-PHASE-MAP.md) §Data Layer

Per [25](25-AUDIT-SCORES-AND-IMPROVEMENT-PLAN.md) §3 and
[26](26-CROSS-DOC-CONFLICTS-AND-RESOLUTIONS.md) C-011:

- **Quick Add** reuses existing columns with application-layer validation.
- **Trust states** (`very stale` tier) are derived from existing `pricing_date`
  via application-layer threshold logic.
- **Dense mode** is a UI-only concern.
- **Templates** use existing template tables.
- **`last_reviewed` / `reviewed_at`** column does NOT exist anywhere
  (`rg -n 'last_reviewed|reviewed_at' supabase/migrations` returns 0 hits) —
  migration-gated, out of scope for 0A–5.
- **Controlled vocabulary for `confidence` / `category`** does NOT exist
  (`confidence` and `category` are free-text columns) — migration-gated, out
  of scope for 0A–5.

**Exception list (the ONLY schema changes permitted in 0A–5):** none. Even the
Phase-0A perf-seed extension to `scripts/seed-performance-test-data.ts`
([19](19-VERIFIED-CODEBASE-BINDINGS-AND-PHASE-MAP.md) §Performance Reality) is
seed DATA, not a schema migration — it does not enter `supabase/migrations/`.

### 2.2 `cost_library_items` — verified column provenance

Base schema: `supabase/migrations/20260518090000_archestimator_core_schema.sql:58-80`.
Subsequent `ALTER TABLE` additions/drops (verified by
`rg -n -i 'alter table public.cost_library_items' supabase/migrations/`):

| Column | Type / constraint | Introduced (or removed) by | Status |
|---|---|---|---|
| `id` | uuid PK | base :59 | exists |
| `workspace_id` | uuid NOT NULL, FK `workspaces(id)` ON DELETE CASCADE | base :60 | exists (tenancy key) |
| `kind` | `cost_library_item_kind` enum NOT NULL default `'material'` | base :61 | exists |
| `name` | text NOT NULL, CHECK `char_length(trim(name)) > 0` | base :62 | exists (Quick Add required) |
| `description` | text NOT NULL default `''` | base :63 | exists |
| `category` | text NOT NULL default `'General'` | base :64 | exists (Quick Add required; **plain text, NOT enum**) |
| `supplier` | text | base :65 | exists |
| `brand` | text | base :66 | exists |
| `sku` | text | base :67 | exists |
| `unit` | text NOT NULL default `'unit'` | base :68 | exists (Quick Add required) |
| `unit_cost` | numeric(14,2) NOT NULL default 0, CHECK `>= 0` | base :69 | exists (Quick Add required) |
| `labor_cost` | numeric(14,2) | base :70 | **DROPPED** by `20260522025929_combine_misc_cost.sql:17-18` |
| `supplementary_cost` | numeric(14,2) | base :71 | **DROPPED** by `20260522025929_combine_misc_cost.sql:17-18` |
| `misc_cost` | numeric(14,2) NOT NULL default 0, CHECK `>= 0` | `20260522025929_combine_misc_cost.sql:7-8` | exists (replaces labor+supplementary) |
| `pricing_source` | text | base :72 | exists (the canonical "source URL" home — free text) |
| `pricing_date` | date | base :73 | exists (freshness input; **no index today**) |
| `confidence` | text | base :74 | exists (**free text, NOT enum**) |
| `thumbnail_path` | text | base :75 | exists |
| `metadata` | jsonb NOT NULL default `'{}'` | base :76 | exists |
| `created_by` | uuid, FK `auth.users(id)` ON DELETE SET NULL | base :77 | exists |
| `created_at` / `updated_at` | timestamptz NOT NULL default now() | base :78-79 (`updated_at` maintained by trigger `cost_library_items_set_updated_at` :141) | exists (the real trust-cue fallback for "last touched") |
| `category_node_id` | text, FK `component_category_nodes(id)` ON DELETE SET NULL | `20260522064018_component_library_taxonomy_source.sql:32` | exists |
| `supplier_id` | uuid, FK `component_suppliers(id)` ON DELETE SET NULL | `20260522064018_component_library_taxonomy_source.sql:33` | exists |
| `library_folder_id` | uuid, FK `library_folders(id)` ON DELETE SET NULL | `20260523030333_library_folder_organization.sql:19-20` | exists (the optional "folder" axis — distinct from `category`/`category_node_id`) |
| `lifecycle_state` | `component_lifecycle_state` enum NOT NULL default `'available'` | `20260523120957_component_library_item_versioning.sql:20` | exists (5 values: `draft`/`in_production`/`available`/`discontinued`/`archived`) |
| `lifecycle_state_changed_at` | timestamptz NOT NULL default now() | `20260523120957_component_library_item_versioning.sql:21` | exists |
| `lifecycle_state_changed_by` | uuid, FK `auth.users(id)` ON DELETE SET NULL | `20260523120957_component_library_item_versioning.sql:22` | exists |
| `active_price_option_id` | uuid, FK `cost_library_item_price_options(id)` (added by trigger) | `20260523120957_component_library_item_versioning.sql:155-159` | exists (FK constraint added inside DO block) |
| `brand_id` | uuid, FK `component_brands(id)` ON DELETE SET NULL | `20260524053500_component_brand_library.sql:17-18` | exists |

> **Correction vs prior drafts:** earlier drafts of this doc and doc 19 listed
> only the base columns and missed `kind`/`description`/`sku`/`metadata`/
> `category_node_id`/`lifecycle_state_changed_by`/`active_price_option_id`.
> All are real and load-bearing for the library repository reads
> (`src/lib/repositories/component-library-repository.ts`). Also: `labor_cost`
> and `supplementary_cost` were DROPPED in favor of `misc_cost` — any code or
> doc still referencing them is stale.

### 2.3 Other Library tables (verified)

| Table | Base migration | Purpose | RLS enabled | Binding |
|---|---|---|---|---|
| `library_folders` | `20260523030333_library_folder_organization.sql:4-17` | folder org axis | ✓ :262 | [19](19-VERIFIED-CODEBASE-BINDINGS-AND-PHASE-MAP.md) §Data Layer |
| `estimate_templates` | `20260522091621_component_library_templates.sql:4-15` | reusable templates | ✓ `20260615145915_harden_estimate_template_editor_rls.sql:3` | [19](19-VERIFIED-CODEBASE-BINDINGS-AND-PHASE-MAP.md) §Data Layer |
| `estimate_template_nodes` | `20260522091621_component_library_templates.sql:17-33` | template tree nodes | ✓ `20260615145915:4` | [19](19-VERIFIED-CODEBASE-BINDINGS-AND-PHASE-MAP.md) §Data Layer |
| `estimate_template_row_items` | `20260522091621_component_library_templates.sql:35-75` | template rows (has `source_library_item_id`/`source_snapshot`/`link_state`) | ✓ `20260615145915:5` | [19](19-VERIFIED-CODEBASE-BINDINGS-AND-PHASE-MAP.md) §Data Layer |
| `cost_library_item_versions` | `20260523120957_component_library_item_versioning.sql:26-38` | versioning (use this; do NOT invent a parallel `component_versions` table) | ✓ :1161 | — |
| `cost_library_item_price_options` | `20260523120957_component_library_item_versioning.sql:40-60` | price options | ✓ :1162; hardened `20260603234326_harden_component_price_audit_grants.sql:3` | — |
| `cost_library_item_price_history` | `20260523120957_component_library_item_versioning.sql:62-91` | price history (audit trail) | ✓ :1163; hardened `20260603234326:4` | [19](19-VERIFIED-CODEBASE-BINDINGS-AND-PHASE-MAP.md) §Data Layer |
| `cost_library_item_state_history` | `20260523120957_component_library_item_versioning.sql` (lifecycle transitions) | lifecycle audit trail | ✓ :1164 | — |
| `component_brands` | `20260524053500_component_brand_library.sql:4-15` | brand library | ✓ | — |
| `component_suppliers` | `20260522064018_component_library_taxonomy_source.sql:18-29` | supplier library | ✓ | — |
| `project_publications` | `20260527120000_project_client_publication.sql:15-` | public/shared snapshots | ✓ :88 | [19](19-VERIFIED-CODEBASE-BINDINGS-AND-PHASE-MAP.md) §Public / Share Snapshot Surface |
| `workspaces` | `20260518090000_archestimator_core_schema.sql` | tenancy root | ✓ :196 | [19](19-VERIFIED-CODEBASE-BINDINGS-AND-PHASE-MAP.md) §Enums |
| `workspace_members` | `20260518090000_archestimator_core_schema.sql` | membership + role | ✓ :197 | [19](19-VERIFIED-CODEBASE-BINDINGS-AND-PHASE-MAP.md) §Enums |

`estimate_row_items` (the in-estimate row table, has
`source_library_item_id`/`source_snapshot`/`link_state`) is defined at
`20260518090000_archestimator_core_schema.sql:96-118`. Template-trust counts
are a **computed JOIN** over `estimate_row_items`/`estimate_template_row_items`
linkage columns, not stored fields (per
[19](19-VERIFIED-CODEBASE-BINDINGS-AND-PHASE-MAP.md) §Data Layer).

---

## 3. RLS policy contract (verified)

### 3.1 Verified RLS helper functions (authz primitives)

These are the four functions policies and actions depend on. Each was
re-defined (initplan hoist) so `auth.uid()` reads as a one-time initplan
(per the Supabase RLS perf anti-pattern fix). **All four include the
`is_platform_admin()` OR** in their canonical (post-hoist) definition.

| Function | Definition (canonical, latest `CREATE OR REPLACE`) | Returns true when |
|---|---|---|
| `is_platform_admin()` | `20260620103306_rls_initplan_hoist.sql:37-51` | caller's `profiles.role in ('ceo','admin')` OR a specific allow-listed email (Philip — bootstrap escape hatch) |
| `is_workspace_admin(target_workspace_id uuid)` | `20260620103306_rls_initplan_hoist.sql:56-70` | platform admin OR a `workspace_members` row with `role in ('owner','admin')` |
| `is_workspace_editor(target_workspace_id uuid)` | `20260613192344_teamspace_rls_authuid_perf.sql:16-31` | platform admin OR a `workspace_members` row with `role in ('owner','admin','member')` — only `viewer` is read-only |
| `is_workspace_member(target_workspace_id uuid)` | `20260613201302_rls_initplan_is_workspace_member.sql:19` | any membership row for the caller |
| `can_edit_estimate(target_estimate_id uuid)` | (project sheet collaboration) | platform admin OR has editor-or-higher access to the estimate's project |
| `can_access_estimate(target_estimate_id uuid)` | (project sheet collaboration) | any access (incl. viewer) to the estimate's project |
| `can_manage_project_publication(target_project_id uuid)` | `20260527120000_project_client_publication.sql:78-86` | publication-management right; gates `project_publications` writes/reads by authenticated managers |

> **Cross-doc note for [19](19-VERIFIED-CODEBASE-BINDINGS-AND-PHASE-MAP.md):**
> doc 19 §RLS/Authz Primitives lists only `is_workspace_editor`,
> `can_edit_estimate`, `is_workspace_admin` and omits
> `is_workspace_member`/`is_platform_admin`/`can_access_estimate`/
> `can_manage_project_publication`. This doc is canonical for the SQL-level
> function definitions; doc 19 should adopt (logged in
> [LOOP_LEDGER](LOOP_LEDGER.md) §3).

### 3.2 Per-table RLS policy contract

Every row below is verified by reading the cited migration:line range. The
"actor" column names the minimum role the policy admits; `TO PUBLIC` means the
Postgres role `public` (i.e., the policy is evaluated for any caller, but the
`USING` clause still gates by the authz function).

#### `cost_library_items` — 4 policies (`20260614144136_command_split_core_public_policies.sql:4-40`)

| Policy name | Cmd | TO | USING / WITH CHECK | Actor (effective) |
|---|---|---|---|---|
| `cost library items can be read by members and managers` | SELECT | PUBLIC | `is_platform_admin() OR is_workspace_editor(workspace_id) OR is_workspace_member(workspace_id)` | any workspace member (incl. viewer) |
| `cost library items can be inserted by managers` | INSERT | PUBLIC | `WITH CHECK: is_platform_admin() OR is_workspace_editor(workspace_id)` | editor (owner/admin/member) |
| `cost library items can be updated by managers` | UPDATE | PUBLIC | `USING` + `WITH CHECK: is_platform_admin() OR is_workspace_editor(workspace_id)` | editor |
| `cost library items can be deleted by managers` | DELETE | PUBLIC | `USING: is_platform_admin() OR is_workspace_editor(workspace_id)` | editor |

> Owner: DB lead · Phase: 0B · Flag: n/a (existing policy) · Rollback: re-apply
> `20260614144136:1-40` drop+create block · Evidence: EV-0A-RLS-COMPONENTS ·
> Telemetry: `authz_denied` on violation (per [32](32-SECURITY-THREAT-MODEL-EXPANSION.md) §5) ·
> Copy: `permission.denied_announcement` · A11y: n/a · Perf: index scan via
> `cost_library_items_workspace_id_idx` · Browser-proof: n/a · i18n: n/a ·
> Binding: `supabase/migrations/20260614144136_command_split_core_public_policies.sql:4-40`

#### `library_folders` — 4 policies (current, post `20260603235355_harden_library_folder_editor_access.sql:190-205`)

> **Critical correction vs prior drafts:** earlier drafts of this doc (and the
> older `20260523030333_library_folder_organization.sql:264-266` single
> `FOR ALL` "members can manage library folders" policy) let ANY workspace
> MEMBER write folders. The 20260603235355 hardening migration DROPped that
> permissive policy and replaced it with the editor-gated split below. The
> current policy set is:

| Policy name | Cmd | TO | USING / WITH CHECK | Actor (effective) |
|---|---|---|---|---|
| `members can view library folders` | SELECT | authenticated | `is_workspace_member(workspace_id)` | any member (incl. viewer) |
| `workspace editors can insert library folders` | INSERT | authenticated | `WITH CHECK: is_workspace_editor(workspace_id)` | editor only |
| `workspace editors can update library folders` | UPDATE | authenticated | `USING` + `WITH CHECK: is_workspace_editor(workspace_id)` | editor only |
| `workspace editors can delete library folders` | DELETE | authenticated | `USING: is_workspace_editor(workspace_id)` | editor only |

Grants: `revoke all from public/anon/authenticated`; `grant select, insert,
update, delete to authenticated` (`20260603235355:207-210`). RPC
`reorder_library_folders(target_workspace_id uuid, folder_updates jsonb)`
(`20260523030333:83-260`, re-defined `20260603235355:3-180`) is re-granted
execute to `authenticated` only and the function body itself re-checks
`is_workspace_editor(target_workspace_id) is true` (`:18-20`) — defense in
depth over RLS. `delete_library_folder(target_workspace_id uuid,
target_folder_id uuid)` (`20260614125239_20260605113000_transactional_library_folder_delete.sql:3`)
is transactional and editor-gated.

> Owner: DB lead · Phase: 0B · Flag: `library_folder_dialogs` · Rollback:
> re-apply hardening migration; UI rollback = redeploy flag=false · Evidence:
> EV-0A-RLS-FOLDERS · Telemetry: `authz_denied` on violation · Copy:
> `permission.denied_announcement` · A11y: n/a · Perf: index scan via
> `library_folders_workspace_parent_sort_idx` · Browser-proof: n/a · i18n:
> n/a · Binding: `supabase/migrations/20260603235355_harden_library_folder_editor_access.sql:182-214`

#### `estimate_templates` / `estimate_template_nodes` / `estimate_template_row_items` — 4 policies each (`20260615145915_harden_estimate_template_editor_rls.sql:40-149`)

| Table | SELECT policy | INSERT policy | UPDATE policy | DELETE policy |
|---|---|---|---|---|
| `estimate_templates` | `members can view estimate templates` (`is_workspace_member(workspace_id)`) | `workspace editors can insert estimate templates` | `workspace editors can update estimate templates` | `workspace editors can delete estimate templates` |
| `estimate_template_nodes` | `members can view estimate template nodes` (parent-template scoped `EXISTS`) | `workspace editors can insert estimate template nodes` | `workspace editors can update estimate template nodes` | `workspace editors can delete estimate template nodes` |
| `estimate_template_row_items` | `members can view estimate template row items` (parent-template scoped `EXISTS`) | `workspace editors can insert estimate template row items` | `workspace editors can update estimate template row items` | `workspace editors can delete estimate template row items` |

All editor policies use `is_workspace_editor(template.workspace_id)` (for the
node/row-item tables, via an `EXISTS` subquery on the parent template). All
`TO authenticated`. Grants `revoke all from public`; `grant select, insert,
update, delete to authenticated` (`20260615145915:151-157`).

> Owner: DB lead · Phase: 0B · Flag: n/a (existing policy) · Rollback: re-apply
> `20260615145915:1-5, 40-149` · Evidence: EV-0A-RLS-TEMPLATES · Telemetry:
> `authz_denied` on violation · Copy: `permission.denied_announcement` · A11y:
> n/a · Perf: index scan via `estimate_templates_workspace_sort_idx` /
> `estimate_template_nodes_template_parent_sort_idx` /
> `estimate_template_row_items_template_node_sort_idx` · Browser-proof: n/a ·
> i18n: n/a · Binding: `supabase/migrations/20260615145915_harden_estimate_template_editor_rls.sql:40-149`

#### `cost_library_item_price_options` / `cost_library_item_price_history` — READ-ONLY at the table layer (audit trail)

> **Critical contract:** price-option and price-history records are an
> **append-only audit trail**. After
> `20260603234326_harden_component_price_audit_grants.sql`, authenticated users
> have **SELECT ONLY** on these tables; INSERT/UPDATE/TRUNCATE/DELETE are
> **revoked** at the grant layer (`:23-26`). Writes go ONLY through the
> security-definer RPC `upsert_cost_library_component_price_option`
> (`:31-33`, re-granted execute to `authenticated` only) — the RPC owns the
> audit-trail insertion and is the tamper-evident boundary.

| Table | SELECT policy | INSERT/UPDATE/DELETE |
|---|---|---|
| `cost_library_item_price_options` | `members can view component price options` (`is_workspace_member(workspace_id)`, `20260603234326:11-13`) | **revoked** at grant layer (`:23-26`); writes via `upsert_cost_library_component_price_option` RPC only |
| `cost_library_item_price_history` | `members can view component price history` (`is_workspace_member(workspace_id)`, `20260603234326:15-17`) | **revoked** at grant layer; writes via `upsert_cost_library_component_price_option` RPC only |
| `cost_library_item_versions` | `members can view/insert component versions` (workspace-scoped, `20260523120957:1174-1179`) | same RPC-owned discipline for price/state mutations |
| `cost_library_item_state_history` | `members can view/insert component state history` (`20260523120957:1193-1198`) | same |

Action-layer guard: `upsertCostLibraryComponentPriceOption` /
`changeCostLibraryComponentLifecycleState` /
`set_cost_library_component_lifecycle_state` (RPC) in
`src/lib/component-library/actions.ts` are defense-in-depth over these policies
(already implemented per [19](19-VERIFIED-CODEBASE-BINDINGS-AND-PHASE-MAP.md) §Server Actions and RPCs).

> Owner: Security lead · Phase: 0B · Flag: n/a (existing policy) · Rollback:
> re-apply `20260603234326` · Evidence: EV-0A-RLS-PRICE-AUDIT · Telemetry:
> `trust_state_tamper` if a client attempts a direct write (per
> [32](32-SECURITY-THREAT-MODEL-EXPANSION.md) §5) · Copy: `permission.denied_announcement` ·
> A11y: n/a · Perf: index scan via `cost_library_item_price_history_workspace_item_idx` ·
> Browser-proof: n/a · i18n: n/a · Binding: `supabase/migrations/20260603234326_harden_component_price_audit_grants.sql:1-36`
> + `20260523120957_component_library_item_versioning.sql:1161-1198`

#### `project_publications` — public/share snapshot table

> **How public/anon reads work (verified):** the share route does **not** rely
> on a `TO PUBLIC` RLS policy. It resolves the token via the **service-role**
> client (`src/lib/publication/public-repository.ts:132-140`, one client per
> request via `React.cache` memoization at :150-152), which **bypasses RLS**,
> then rate-limits (`checkProjectPublicationSnapshotRateLimit` at
> `src/lib/publication/public-repository.ts:513`) and serves the redacted
> snapshot. RLS on `project_publications` only gates **authenticated manager**
> access; anon reads are enforced by the repository + rate-limiter, not by RLS.
> Do **not** add a `TO PUBLIC USING (true)` policy — that would be an
> open-read regression; access control is the repository's job.

RLS enabled at `20260527120000_project_client_publication.sql:88`. Verified
policies:

| Policy name | Cmd | TO | USING / WITH CHECK |
|---|---|---|---|
| `project publication managers can read publication rows` | SELECT | authenticated | `can_manage_project_publication(project_id)` (`20260527120000:92`) |
| `project publication managers can insert publication rows` | INSERT | authenticated | `WITH CHECK: can_manage_project_publication(project_id)` (`20260527120000:99`) |
| `project publication managers can update publication rows` | UPDATE | authenticated | `USING` + `WITH CHECK: can_manage_project_publication(project_id)` (`20260527120000:106`) |
| `project publication service role can insert events` | INSERT | service_role | for event-log rows (`20260527120000:114`) |

> **No DELETE policy on `project_publications` today.** Hard-delete is not
> granted at the RLS layer; publications are revoked/expired via UPDATE, not
> deleted. If hard-delete is later required, add a `FOR DELETE` policy gated on
> `can_manage_project_publication` (or `is_workspace_admin`) as a Phase-later
> item (tracked below).

Redaction (the actual public-read safety): the `snapshot_json` payload is
redacted at build time by `buildSnapshotForProject`
(`src/lib/publication/actions.ts:389`, uses an explicit `estimate_row_items`
column allowlist — `.from("estimate_row_items")` at :415 — and **never queries
`cost_library_items` / `cost_library_item_price_history`**) and again at read
time by `sanitizeProjectPublicationSnapshotForPublicRead`
(`src/lib/publication/snapshot.ts:301`, re-derives each public row from a fixed
allowlist). Audit-trail tables (`*_price_history`, `*_state_history`,
`*_versions`) are never read by the snapshot builder.

> Owner: Security lead · Phase: 0B · Flag: n/a · Rollback: re-apply
> publication migration policies · Evidence: EV-0A-RLS-PUBLICATIONS ·
> Telemetry: `redaction_regression` if private fields enter snapshot (per
> [32](32-SECURITY-THREAT-MODEL-EXPANSION.md) §5) · Copy: `trust.public_snapshot.label` · A11y:
> n/a · Perf: index scan via `project_publications_token_hash_idx` /
> `project_publications_project_status_idx` /
> `project_publications_one_published_per_project_idx` · Browser-proof: n/a ·
> i18n: key-based · Binding: `supabase/migrations/20260527120000_project_client_publication.sql:78-127`;
> service-role read path `src/lib/publication/public-repository.ts:132-152, 513`

#### `workspace_members` — 4 policies (`20260614144136_command_split_core_public_policies.sql:127-163`)

| Policy name | Cmd | TO | USING / WITH CHECK | Actor |
|---|---|---|---|---|
| `workspace memberships can be read by members and managers` | SELECT | PUBLIC | `is_platform_admin() OR is_workspace_admin(workspace_id) OR is_workspace_member(workspace_id)` | any member (incl. viewer) |
| `workspace memberships can be inserted by managers` | INSERT | PUBLIC | `WITH CHECK: is_platform_admin() OR is_workspace_admin(workspace_id)` | admin only |
| `workspace memberships can be updated by managers` | UPDATE | PUBLIC | `USING` + `WITH CHECK: is_platform_admin() OR is_workspace_admin(workspace_id)` | admin only |
| `workspace memberships can be deleted by managers` | DELETE | PUBLIC | `USING: is_platform_admin() OR is_workspace_admin(workspace_id)` | admin only |

Binding: `supabase/migrations/20260614144136_command_split_core_public_policies.sql:127-163`.

#### Mass-deletion governance RPCs (`20260603160000_mass_deletion_governance.sql`)

The bulk-archive flow used by the Library bulk toolbar
([19](19-VERIFIED-CODEBASE-BINDINGS-AND-PHASE-MAP.md) §Server Actions and RPCs:
`previewBulkArchiveLibraryComponents` / `executeBulkArchiveLibraryComponents`)
is gated by a **hash-locked two-phase RPC**: the user calls
`preview_bulk_archive_library_components(target_workspace_id, target_item_ids,
acting_user_id)` (`:323`), receives a preview + hash, then calls
`execute_bulk_archive_library_components(target_workspace_id, target_item_ids,
expected_preview_hash, acting_user_id, correlation_id)` (`:390`) which
**re-runs the preview and rejects if the hash diverges** (`:401`,
`preview := public.preview_bulk_archive_library_components(...)`). This
prevents TOCTOU between preview and execute. Both RPCs revoke execute from
`public`/`anon` (`:464+`).

> Owner: Security lead · Phase: 0B · Flag: n/a (existing RPC) · Rollback:
> re-apply `20260603160000` · Evidence: EV-0A-RLS-BULK-ARCHIVE · Telemetry:
> `authz_denied` on caller-not-editor; `bulk_archive_hash_mismatch` on
> preview/execute divergence (register in [20](20-TELEMETRY-AND-EVENT-INSTRUMENTATION.md) ·
> [32](32-SECURITY-THREAT-MODEL-EXPANSION.md) §5) · Copy: `permission.denied_announcement` ·
> A11y: n/a · Perf: index scan via `cost_library_items_workspace_lifecycle_idx` ·
> Browser-proof: n/a · i18n: n/a · Binding: `supabase/migrations/20260603160000_mass_deletion_governance.sql:323-464`

### 3.3 RLS verification SQL

```sql
-- Verify RLS is enabled on all Library tables
SELECT relname, relrowsecurity
FROM pg_class
WHERE relname IN (
  'cost_library_items',
  'library_folders',
  'estimate_templates',
  'estimate_template_nodes',
  'estimate_template_row_items',
  'cost_library_item_versions',
  'cost_library_item_price_options',
  'cost_library_item_price_history',
  'cost_library_item_state_history',
  'project_publications',
  'workspaces',
  'workspace_members'
)
ORDER BY relname;
-- Expected: relrowsecurity = true for all

-- Verify the current policy set (NOT the old FOR ALL library_folders policy)
SELECT tablename, policyname, cmd, roles::text, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN (
    'cost_library_items',
    'library_folders',
    'estimate_templates',
    'estimate_template_nodes',
    'estimate_template_row_items',
    'cost_library_item_price_options',
    'cost_library_item_price_history',
    'project_publications',
    'workspace_members'
  )
ORDER BY tablename, cmd;
-- Expected: matches §3.2 row-for-row; library_folders has 4 editor-gated policies
-- (NOT the old "members can manage library folders" FOR ALL).

-- Verify the price-audit revoke is in force
SELECT relname, proacl
FROM pg_class
WHERE relname IN ('cost_library_item_price_options', 'cost_library_item_price_history');
-- Expected: authenticated has select only (no arwd — append/update/delete).
```

---

## 4. Migration safety — no-migration gate (0A–5)

### 4.1 The gate

Per [25](25-AUDIT-SCORES-AND-IMPROVEMENT-PLAN.md) §3 and
[00-PLAN.md](00-PLAN.md) non-goals, the 0A–5 scope requires **ZERO schema
migrations in `supabase/migrations/`**. Hard gate:

- No `CREATE TABLE` · No `CREATE TYPE` · No `ALTER TABLE … ADD/DROP COLUMN` ·
  No `ALTER TYPE ADD VALUE` · No `CREATE POLICY` · No `DROP POLICY` · No
  grant/revoke changes.

The exception list is empty (§2.1). The Phase-0A perf seed extends
`scripts/seed-performance-test-data.ts` — that is seed DATA, not a migration;
it does not enter `supabase/migrations/` and does not violate this gate.

### 4.2 Phase-later migration discipline (only when a Phase-later item lands)

If a Phase-later item (§6) requires a migration:

1. Write the migration with `up` and a real `down` (rollback) SQL.
2. `supabase db reset` locally with the migration applied.
3. Apply rollback locally; verify state.
4. Apply to staging; verify.
5. Apply to production during a maintenance window.
6. Run §3.3 verification queries.
7. Monitor for errors for 1 hour post-migration.

**Naming:** `supabase/migrations/<timestamp>_<description>.sql`
(e.g. `20260701000000_add_cost_library_items_last_reviewed.sql`).

> **Heads-up — `supabase db query --file` writes no schema-migrations row:**
> per project memory, applying SQL via `supabase db query --file` produces
> silent drift (no `schema_migrations` entry). Reconcile with
> `supabase migration repair --status applied <version>`, not via MCP
> `apply_migration`. Any Phase-later migration MUST go through the normal
> `supabase migration new` + commit-to-`supabase/migrations/` flow, never
> `db query --file`.

### 4.3 Rollback plan template

Every Phase-later migration MUST have a `down`:

```sql
-- up (illustrative Phase-later example; real versioning table already exists
--      as cost_library_item_versions — extend, do NOT parallel it)
ALTER TABLE public.cost_library_items ADD COLUMN last_reviewed timestamptz;

-- down
ALTER TABLE public.cost_library_items DROP COLUMN last_reviewed;
```

---

## 5. Query optimization contract

### 5.1 Verified real indexes (every name confirmed against the migration)

> All names below are **verified against the real migrations** (enumerated via
> `rg -ni 'create.*(index)' supabase/migrations/`). Earlier drafts invented
> `idx_components_*` / `idx_folders_*` / `idx_templates_*` / `idx_snapshots_*`
> names and a fabricated `last_verified_at` column — **none of those exist**;
> this table corrects them.

| Table | Index (real name) | Columns | Defined at |
|---|---|---|---|
| `cost_library_items` | `cost_library_items_workspace_id_idx` | `(workspace_id)` | `20260518090000_archestimator_core_schema.sql:124` |
| `cost_library_items` | `cost_library_items_library_folder_id_idx` | `(library_folder_id)` | `20260523030333_library_folder_organization.sql:26` |
| `cost_library_items` | `cost_library_items_workspace_lifecycle_idx` | `(workspace_id, lifecycle_state)` | `20260523120957_component_library_item_versioning.sql:93` |
| `cost_library_items` | `cost_library_items_category_node_id_idx` | `(category_node_id)` | `20260522064018_component_library_taxonomy_source.sql:41` |
| `cost_library_items` | `cost_library_items_supplier_id_idx` | `(supplier_id)` | `20260522064018_component_library_taxonomy_source.sql:42` |
| `cost_library_items` | `cost_library_items_brand_id_idx` | `(brand_id)` | `20260524053500_component_brand_library.sql:21` |
| `cost_library_item_versions` | `cost_library_item_versions_workspace_item_idx` | `(workspace_id, cost_library_item_id)` | `20260523120957:95` |
| `cost_library_item_price_options` | `cost_library_item_price_options_workspace_item_idx` | `(workspace_id, cost_library_item_id)` | `20260523120957:97` |
| `cost_library_item_price_options` | `cost_library_item_price_options_variant_sort_idx` | `(…, variant, sort)` | `20260524120322_component_library_variants.sql:71` |
| `cost_library_item_price_history` | `cost_library_item_price_history_workspace_item_idx` | `(workspace_id, cost_library_item_id)` | `20260523120957:102` |
| `cost_library_item_state_history` | `cost_library_item_state_history_workspace_item_idx` | `(workspace_id, cost_library_item_id)` | `20260523120957:104` |
| `library_folders` | `library_folders_workspace_parent_sort_idx` | `(workspace_id, parent_id, sort_order)` | `20260523030333:22` |
| `library_folders` | `library_folders_workspace_source_category_key` | UNIQUE `(workspace_id, source_category_node_id) WHERE source_category_node_id IS NOT NULL` | `20260523030333:23-25` |
| `estimate_templates` | `estimate_templates_workspace_sort_idx` | `(workspace_id, sort_order, name)` | `20260522091621_component_library_templates.sql:62` |
| `estimate_template_nodes` | `estimate_template_nodes_template_parent_sort_idx` | `(template_id, parent_id, sort_order)` | `20260522091621:63` |
| `estimate_template_row_items` | `estimate_template_row_items_template_node_sort_idx` | `(template_id, template_node_id, sort_order)` | `20260522091621:64` |
| `component_brands` | `component_brands_workspace_sort_idx` | `(workspace_id, sort_order, name)` | `20260524053500:20` |
| `component_suppliers` | `component_suppliers_workspace_sort_idx` | `(workspace_id, sort_order, name)` | `20260522064018:40` |
| `component_category_nodes` | `component_category_nodes_parent_sort_idx` | `(parent_id, sort_order)` | `20260522064018:39` |
| `project_publications` | `project_publications_project_status_idx` | `(project_id, status, published_at)` | `20260527120000:40-41` |
| `project_publications` | `project_publications_token_hash_idx` | `(token_hash)` | `20260527120000:43-44` |
| `project_publications` | `project_publications_one_published_per_project_idx` | UNIQUE partial (one published per project) | `20260621120000_shared_link_d1_d11_hardening.sql:240` |
| `workspace_members` | `workspace_members_user_id_idx` | `(user_id)` | `20260518090000:121` |

#### Phase-0A-candidate indexes (DO NOT assert as existing)

| Candidate | Purpose | Why a candidate, not a fact | Gate |
|---|---|---|---|
| `cost_library_items(pricing_date)` index | Trust-state freshness computation | No such index today; the seed (`scripts/seed-performance-test-data.ts`) does **not** cover `cost_library_items` ([19](19-VERIFIED-CODEBASE-BINDINGS-AND-PHASE-MAP.md) §Performance Reality). | Phase 0A: extend the seed, MEASURE, decide. Track under `EV-0A-IDX-pricing_date`. Do NOT list as "required for beta". |
| `cost_library_items USING gin (name gin_trgm_ops)` | fuzzy/server-side name search | No `pg_trgm`/GIN index today; components-tab search is 100% client-side synchronous ([19](19-VERIFIED-CODEBASE-BINDINGS-AND-PHASE-MAP.md) §Performance Reality). | Add ONLY if Phase 0A measurement shows client search is the bottleneck. Track under `EV-0A-IDX-name-trigram`. |

> **No `pricing_date` index and no name-trigram index exist today.** Both are
> candidates, not facts. Do not list either as "required for beta" — the
> current client-side search and `pricing_date`-derived freshness need neither.

### 5.2 EXPLAIN ANALYZE requirement

Every Library query MUST be verified with `EXPLAIN ANALYZE` against a seeded
workspace (post Phase-0A seed extension):

```sql
EXPLAIN ANALYZE
SELECT id, name, category, unit, unit_cost, pricing_date, lifecycle_state
FROM public.cost_library_items
WHERE workspace_id = '<uuid>'
ORDER BY name;
```

**PROVISIONAL targets** (NOT verified SLAs — there is no Phase-0A perf seed
for `cost_library_items` yet; final budgets land in
[30](30-PERF-BUDGET-AND-REGRESSION-GATES.md) after the baseline, per conflict
C-015 in [26](26-CROSS-DOC-CONFLICTS-AND-RESOLUTIONS.md)):

- Index Scan (not Seq Scan) for workspace-filtered queries — expected to hit
  `cost_library_items_workspace_id_idx`.
- Execution time < 20ms for a 500-component workspace (PROVISIONAL).
- Execution time < 100ms for the worst-case query (PROVISIONAL).

### 5.3 Connection pooling and query patterns

- Use the Supabase connection pooler (pgBouncer) for serverless.
- Pool mode: transaction (prepared statements disabled in this mode).
- Avoid `SELECT *` — specify columns (the browse fetch
  `loadCurrentWorkspaceComponentRowsLibrary` is currently eager and loads the
  FULL nested detail graph; per [19](19-VERIFIED-CODEBASE-BINDINGS-AND-PHASE-MAP.md) §Performance Reality
  this is the REAL perf risk — Phase 1/2 must shrink the browse payload / make
  detail lazy and inspector-scoped).
- Avoid N+1 — use joins or batch fetch.
- Always paginate or limit unbounded queries.
- Explicit `workspace_id` filter is faster than relying on RLS rewriting.

---

## 6. Phase-later backfill plans

Only for items explicitly migration-gated in
[19](19-VERIFIED-CODEBASE-BINDINGS-AND-PHASE-MAP.md) §Data Layer.

### 6.1 If `last_reviewed` / `reviewed_at` is added

```sql
-- up
ALTER TABLE public.cost_library_items ADD COLUMN last_reviewed timestamptz;
ALTER TABLE public.estimate_templates ADD COLUMN last_reviewed timestamptz;

-- backfill: default to updated_at (no last_reviewed existed; this is honest)
UPDATE public.cost_library_items SET last_reviewed = updated_at;
UPDATE public.estimate_templates SET last_reviewed = updated_at;

-- down
ALTER TABLE public.cost_library_items DROP COLUMN last_reviewed;
ALTER TABLE public.estimate_templates DROP COLUMN last_reviewed;
```

### 6.2 If controlled-vocabulary `confidence` / `category` is added

```sql
-- up (illustrative; reconcile actual values against the four free-text
--      distributions present in seed data first)
ALTER TABLE public.cost_library_items
  ADD CONSTRAINT cost_library_items_confidence_check
  CHECK (confidence IS NULL OR confidence IN ('low','medium','high'));
-- category is a plain-text taxonomy axis; do NOT constrain it without an
-- explicit product decision (it is intentionally free-text per the keystone).

-- backfill: map existing free text to the nearest value
UPDATE public.cost_library_items
  SET confidence = CASE
    WHEN lower(trim(confidence)) IN ('high','h','verified') THEN 'high'
    WHEN lower(trim(confidence)) IN ('medium','m','moderate') THEN 'medium'
    WHEN lower(trim(confidence)) IN ('low','l','guess','estimate') THEN 'low'
    ELSE NULL
  END;

-- down
ALTER TABLE public.cost_library_items
  DROP CONSTRAINT cost_library_items_confidence_check;
```

### 6.3 `very_stale` freshness tier — NO migration

`very_stale` is **NOT** an enum value (`component_lifecycle_state` is
`draft`/`in_production`/`available`/`discontinued`/`archived`). It is derived
from `pricing_date` in the app layer. Implementation extends the THREE 90-day
constants + helpers in lockstep (per C-021,
[19](19-VERIFIED-CODEBASE-BINDINGS-AND-PHASE-MAP.md) §Confidence and Freshness Models,
Phase 2):

- `COMPONENT_FACET_STALE_DAYS = 90` (`src/components/workshop/library/component-facet-filter.tsx:12`)
- `LIBRARY_OVERVIEW_STALE_PRICING_DAYS = 90` (`src/lib/repositories/component-library-repository.ts:827`)
- the `"prices older than 90 days"` UI string (`src/components/workshop/library/overview/LibraryOverview.tsx:114`)
- `getComponentPricingFreshness` (`component-facet-filter.tsx:61`)
- `getStalenessTone` / `getStalenessLabel` (`component-library/helpers.ts:667` / `:675`)

No backfill; no migration.

### 6.4 If component versioning is expanded

> A versioning table **already exists**: `cost_library_item_versions`
> (`20260523120957:26-38`, indexed at :95). Reconcile any Phase-later expansion
> against that table rather than inventing a parallel `component_versions`
> table that references a non-existent `components` table (`cost_library_items`
> is the real parent).

```sql
-- Extend the EXISTING cost_library_item_versions; do NOT create a new table.
-- (Illustrative; actual columns are defined in 20260523120957 — extend those.)

-- Backfill example (version 1 for any item missing a version row):
INSERT INTO public.cost_library_item_versions (workspace_id, cost_library_item_id, /* …existing columns… */)
SELECT workspace_id, id /* , …defaults… */
FROM public.cost_library_items item
WHERE NOT EXISTS (
  SELECT 1 FROM public.cost_library_item_versions v
  WHERE v.cost_library_item_id = item.id
);
```

### 6.5 If a `project_publications` hard-delete is required

Add a `FOR DELETE` policy gated on `can_manage_project_publication` (or
`is_workspace_admin`). Today there is NO DELETE policy; publications are
revoked/expired via UPDATE (binding: `20260527120000:88-127`). This is tracked
only — do not implement until a real requirement appears.

---

## 7. Per-table DB acceptance criteria

> Policy counts and index names verified against §3 and §5. Query targets are
> PROVISIONAL pending the Phase 0A perf seed
> ([16](16-PERFORMANCE-SCALE-NETWORK-CONCURRENCY.md) §3 step 1; final in
> [30](30-PERF-BUDGET-AND-REGRESSION-GATES.md)).

| Table | RLS | Indexes (verified, non-exhaustive) | Query perf (PROVISIONAL) | Backup |
|---|---|---|---|---|
| `cost_library_items` | ✓ 4 policies (member read; editor write) | `…_workspace_id_idx`, `…_library_folder_id_idx`, `…_workspace_lifecycle_idx`, `…_category_node_id_idx`, `…_supplier_id_idx`, `…_brand_id_idx`; **no** `pricing_date` / trigram | < 20ms (500 items, post-seed) | Daily physical backup |
| `library_folders` | ✓ 4 policies (member read; editor write) | `…_workspace_parent_sort_idx`, `…_workspace_source_category_key` (unique) | < 10ms | Daily physical backup |
| `estimate_templates` | ✓ 4 policies | `…_workspace_sort_idx` | < 15ms | Daily physical backup |
| `estimate_template_nodes` | ✓ 4 policies (parent-scoped) | `…_template_parent_sort_idx` | < 10ms | Daily physical backup |
| `estimate_template_row_items` | ✓ 4 policies (parent-scoped) | `…_template_node_sort_idx` + linkage indexes | < 10ms | Daily physical backup |
| `cost_library_item_versions` | ✓ (workspace-scoped) | `…_workspace_item_idx` | < 10ms | Daily physical backup |
| `cost_library_item_price_options` | ✓ SELECT-only at grant layer (writes via RPC) | `…_workspace_item_idx`, `…_variant_sort_idx` | < 10ms | Daily physical backup |
| `cost_library_item_price_history` | ✓ SELECT-only at grant layer (writes via RPC) | `…_workspace_item_idx` | < 10ms | Daily physical backup |
| `cost_library_item_state_history` | ✓ (workspace-scoped) | `…_workspace_item_idx` | < 10ms | Daily physical backup |
| `workspaces` | ✓ | PK | < 5ms | Daily physical backup |
| `workspace_members` | ✓ 4 policies (member read; admin write) | `…_user_id_idx` | < 5ms | Daily physical backup |
| `project_publications` | ✓ 3 manager policies (select/insert/update) + service-role events; NO delete | `…_token_hash_idx`, `…_project_status_idx`, `…_one_published_per_project_idx` (unique) | < 10ms (token-hash lookup) | Daily physical backup |

### Acceptance template (for every gate row in this doc)

```
DB: <table>.<operation> | <RLS policy name> | <index name> | <PROVISIONAL query target> | daily backup
```

Examples:
```
DB: cost_library_items.select | "cost library items can be read by members and managers" | cost_library_items_workspace_id_idx | < 20ms | daily backup
DB: cost_library_items.insert | "cost library items can be inserted by managers" | n/a (write) | n/a | daily backup
DB: cost_library_item_price_history.insert | n/a (table is SELECT-only; writes via upsert_cost_library_component_price_option RPC) | n/a (RPC write) | n/a | daily backup
```

---

## 8. Verification

```bash
# RLS enabled on all Library tables (real table names)
supabase db execute --sql "SELECT relname, relrowsecurity FROM pg_class WHERE relname IN ('cost_library_items','library_folders','estimate_templates','estimate_template_nodes','estimate_template_row_items','cost_library_item_versions','cost_library_item_price_options','cost_library_item_price_history','cost_library_item_state_history','project_publications','workspaces','workspace_members') ORDER BY relname"
# Expected: relrowsecurity = true for all 12 rows.

# Current library_folders policy set is the EDITOR-GATED 4-policy split
# (NOT the old single FOR ALL "members can manage library folders")
supabase db execute --sql "SELECT policyname FROM pg_policies WHERE tablename = 'library_folders' ORDER BY policyname"
# Expected 4 rows: members can view library folders; workspace editors can {insert, update, delete} library folders.

# Price-audit tables are SELECT-only at the grant layer (no arwd)
supabase db execute --sql "SELECT relname, proacl FROM pg_class WHERE relname IN ('cost_library_item_price_options','cost_library_item_price_history')"
# Expected: authenticated has select only.

# No migrations in 0A-5 scope
ls supabase/migrations/ | sort | tail -5
# Expected: no migrations dated after the 0A-5 start date (the gate is a code-review check, not a files-present check — every new file in supabase/migrations/ during 0A-5 is a gate violation).

# All "exists" indexes in §5.1 present (real names)
supabase db execute --sql "SELECT tablename, indexname FROM pg_indexes WHERE schemaname = 'public' AND tablename IN ('cost_library_items','library_folders','estimate_templates','estimate_template_nodes','estimate_template_row_items','cost_library_item_versions','cost_library_item_price_options','cost_library_item_price_history','cost_library_item_state_history','project_publications') ORDER BY tablename, indexname"
# Expected: the index names enumerated in §5.1. The pricing_date and name-trigram indexes are NOT expected today (Phase-0A candidates under EV-0A-IDX-*).

# Query performance within budget (PROVISIONAL — seed cost_library_items first per doc 16 §3 step 1)
supabase db execute --sql "EXPLAIN ANALYZE SELECT id, name, category, unit, unit_cost, pricing_date, lifecycle_state FROM public.cost_library_items WHERE workspace_id = '<test-uuid>' ORDER BY name"
# Expected: Index Scan using cost_library_items_workspace_id_idx; provisional target < 20ms.

# No last_reviewed / reviewed_at anywhere (the migration-gated cue does not exist today)
rg -n "last_reviewed|reviewed_at" supabase/migrations
# Expected: 0 hits.

# DB: field propagation across actionable docs (Phase-later residual per doc 34 §6)
rg "DB:" .ai/03_plans/2026-06-20-Library-Page-Overall-Improvement/ -g "*.md" --count
# Expected baseline: this doc + the docs that cite this contract; propagation to every gate row is a Phase-later residual.
```

---

## 9. Gap closure

### Current state

- Doc 13 owns data contracts + cache policy ✓
- Doc 14 owns the authz narrative ✓
- Doc 19 owns the keystone binding registry ✓
- Doc 32 owns the threat model ✓
- This doc owns the **SQL-level facts** (schema, policies, indexes) ✓ — fills
  the gap that doc 13/14 delegate here.

### Required updates to other docs (tracked rows, owned by their owners)

- [13](13-DATA-CONTRACTS-ROUTE-CACHE.md): add cross-ref to this doc for RLS + migration context (data-contract owner).
- [14](14-SECURITY-AUTHZ-AND-DATA-EXPOSURE.md): add cross-ref to this doc for full per-table RLS policy names (authz owner).
- [19](19-VERIFIED-CODEBASE-BINDINGS-AND-PHASE-MAP.md): reconcile the authz-primitive list to add `is_workspace_member` / `is_platform_admin` / `can_access_estimate` / `can_manage_project_publication` (keystone owner).
- [17](17-BLAST-RADIUS-SEQUENCING-ROLLBACK.md): add the "no migration in 0A-5" gate as an explicit phase-rollback row (blast-radius owner).
- Every doc with gate rows: add a `DB:` field where the row's query/policy/index is load-bearing (Phase-later residual per [34](34-ROW-LEVEL-COMPLETENESS-MATRIX.md) §6).

---

## 10. Sign-off

> **DRAFT — not yet signed off.** As of 2026-06-21 the schema/RLS/index facts
> in §2–§6 are verified against the real migrations and the keystone; the
> EXPLAIN ANALYZE budgets (§5.2/§7) remain PROVISIONAL pending the Phase-0A
> perf seed; per-row `DB:` propagation (doc 34 §6) is a Phase-later residual.
> Treat this contract as implementation-ready for the SQL facts it asserts and
> as provisional for perf targets. Sign-off recorded when the Phase 0A
> baseline lands; until then this section is a DRAFT placeholder.

| Reviewer | Verdict | Date | Notes |
|---|---|---|---|
| DB lead | pending | — | — |
| Security lead | pending | — | — |
| Backend lead | pending | — | — |
| Planning lead | pending | — | — |
| Reviewer gate (Oracle) | pending | — | — |

The DB/RLS contract is complete when:
1. Every table in §2.3 has RLS enabled (§3 verification confirms).
2. No migrations in 0A–5 scope (§4 gate; verified by `ls supabase/migrations/`).
3. Every "exists" index in §5.1 is present (§8 verification confirms); the
   Phase-0A-candidate indexes (`pricing_date`, name-trigram) are decided and
   tracked under `EV-0A-IDX-*`.
4. Every query passes EXPLAIN ANALYZE within the **final** budget in
   [30](30-PERF-BUDGET-AND-REGRESSION-GATES.md) (post Phase-0A seed).
5. Every Phase-later backfill plan in §6 is defined.
6. All five reviewers sign off above.
