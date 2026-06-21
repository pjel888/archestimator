# 33 — DB, RLS, and Migration Contract

> **Status:** Living document. Initialized 2026-06-21 by the Ultrawork audit
> loop; **reconciled to the real migrations and the keystone on 2026-06-21**
> (table names, indexes, RLS policies, snapshot line numbers, and the
> public-read mechanism all now verified against `supabase/migrations/` and
> doc 19). Defines the database, RLS, and migration contract for the Library
> page. Deepens [13-DATA-CONTRACTS-ROUTE-CACHE.md](13-DATA-CONTRACTS-ROUTE-CACHE.md)
> and [14-SECURITY-AUTHZ-AND-DATA-EXPOSURE.md](14-SECURITY-AUTHZ-AND-DATA-EXPOSURE.md)
> with schema, RLS policies, migration safety, and backfill plans.
>
> **Material liquid-glass layer:** the visual/material treatment of every
> Library surface lives in [35-LIQUID-GLASS-LIBRARY-UX-SPEC.md](35-LIQUID-GLASS-LIBRARY-UX-SPEC.md);
> this doc is the data/RLS/migration layer only.
>
> **Scope:** Schema, RLS policies, migration order, backfill, rollback,
> connection pooling, query optimization, and per-table contracts.
>
> **Companion docs:** [13-DATA-CONTRACTS-ROUTE-CACHE.md](13-DATA-CONTRACTS-ROUTE-CACHE.md),
> [14-SECURITY-AUTHZ-AND-DATA-EXPOSURE.md](14-SECURITY-AUTHZ-AND-DATA-EXPOSURE.md),
> [19-VERIFIED-CODEBASE-BINDINGS-AND-PHASE-MAP.md](19-VERIFIED-CODEBASE-BINDINGS-AND-PHASE-MAP.md),
> [27-OWNERS-AND-ACCOUNTABILITY-MATRIX.md](27-OWNERS-AND-ACCOUNTABILITY-MATRIX.md).

---

## 1. Purpose

The Library page relies on Supabase/Postgres for persistence. This doc:

1. **Defines the schema** for Library tables (`cost_library_items`, `library_folders`, `estimate_templates`).
2. **Defines RLS policies** for each table.
3. **Defines migration safety** — order, rollback, verification.
4. **Defines the no-migration gate** for the 0A–5 scope (per [25](25-AUDIT-SCORES-AND-IMPROVEMENT-PLAN.md) §3).
5. **Defines query optimization** — indexes, EXPLAIN ANALYZE, connection pooling.
6. **Defines backfill plans** for any future schema changes.
7. **Resolves C-011** from [26-CROSS-DOC-CONFLICTS-AND-RESOLUTIONS.md](26-CROSS-DOC-CONFLICTS-AND-RESOLUTIONS.md) — Quick Add requires no schema change.

---

## 2. Schema

### Beta scope (0A–5): NO schema changes

Per [25-AUDIT-SCORES-AND-IMPROVEMENT-PLAN.md](25-AUDIT-SCORES-AND-IMPROVEMENT-PLAN.md) §3 and [26](26-CROSS-DOC-CONFLICTS-AND-RESOLUTIONS.md) C-011:

- **Quick Add** reuses existing columns with application-layer validation. No schema change.
- **Trust states** (`very stale` tier) are derived from existing `pricing_date` via application-layer threshold logic. No schema change.
- **Dense mode** is a UI-only concern. No schema change.
- **Templates** use existing template tables. No schema change.
- **`last_reviewed` / `reviewed_at` column** does NOT exist — migration-gated, out of scope for 0A–5.
- **Controlled vocabulary for `confidence` / `category`** does NOT exist — migration-gated, out of scope for 0A–5.

Owner: DB lead | Phase: 0A | Flag: n/a (schema gate) | Rollback: git revert; no migration to roll back | Evidence: EV-0A-NO-MIGRATION | Telemetry: n/a | Copy: n/a | A11y: n/a | Perf: n/a | Browser-proof: n/a | i18n: n/a | Binding: [19-VERIFIED-CODEBASE-BINDINGS-AND-PHASE-MAP.md](19-VERIFIED-CODEBASE-BINDINGS-AND-PHASE-MAP.md) §Data Layer

### Current tables (canonical reference)

> **Note:** The exact table names and columns are defined in
> [19-VERIFIED-CODEBASE-BINDINGS-AND-PHASE-MAP.md](19-VERIFIED-CODEBASE-BINDINGS-AND-PHASE-MAP.md).
> This doc references those bindings and adds the RLS + migration context.
> The pack uses the **real** table names from the verified migrations, not generic aliases.

| Table | Purpose | Key columns | RLS enabled | Binding |
|---|---|---|---|---|
| `public.cost_library_items` | Cost components | id, workspace_id, name, category, unit, unit_cost, misc_cost, supplier, supplier_id, brand, brand_id, lifecycle_state, lifecycle_state_changed_at, pricing_date, pricing_source, confidence, thumbnail_path, updated_at, library_folder_id | ✓ (`20260614144136_command_split_core_public_policies.sql`) | [19](19-VERIFIED-CODEBASE-BINDINGS-AND-PHASE-MAP.md) §Data Layer |
| `public.library_folders` | Folder organization | id, workspace_id, parent_id, name, sort_order, source_category_node_id, folder_kind, created_by, created_at, updated_at | ✓ (`20260523030333_library_folder_organization.sql`) | [19](19-VERIFIED-CODEBASE-BINDINGS-AND-PHASE-MAP.md) §Data Layer |
| `public.estimate_templates` | Reusable templates | id, workspace_id, name, description, category, sort_order, metadata, created_by, created_at, updated_at | ✓ (`20260615145915_harden_estimate_template_editor_rls.sql`) | [19](19-VERIFIED-CODEBASE-BINDINGS-AND-PHASE-MAP.md) §Data Layer |
| `public.estimate_template_nodes` | Template tree nodes | id, template_id, parent_id, kind, name, sort_order, metadata, created_at, updated_at | ✓ (`20260615145915_harden_estimate_template_editor_rls.sql`) | [19](19-VERIFIED-CODEBASE-BINDINGS-AND-PHASE-MAP.md) §Data Layer |
| `public.estimate_template_row_items` | Template rows | id, template_id, template_node_id, sort_order, source_library_item_id, source_snapshot, category_node_id, supplier_id, material, description, supplier, unit, quantity, unit_cost, misc_cost, discipline, designation, link_state, metadata, created_at, updated_at | ✓ (`20260615145915_harden_estimate_template_editor_rls.sql`) | [19](19-VERIFIED-CODEBASE-BINDINGS-AND-PHASE-MAP.md) §Data Layer |
| `public.cost_library_item_price_history` | Price history | id, cost_library_item_id, workspace_id, price, effective_date, created_by, created_at | ✓ (workspace-scoped, RLS) | [19](19-VERIFIED-CODEBASE-BINDINGS-AND-PHASE-MAP.md) §Data Layer |
| `public.project_publications` | Public/shared snapshots | id, project_id, workspace_id, snapshot_json, snapshot_version, password_required, password_hash, credential_version, created_by, created_at, updated_at, expires_at | ✓ (`20260527120000_project_client_publication.sql`) | [19](19-VERIFIED-CODEBASE-BINDINGS-AND-PHASE-MAP.md) §Public / Share Snapshot Surface |
| `public.workspaces` | Workspace | id, name, owner_id, created_at | ✓ | [19](19-VERIFIED-CODEBASE-BINDINGS-AND-PHASE-MAP.md) §Enums |
| `public.workspace_members` | Membership | workspace_id, user_id, role, joined_at | ✓ | [19](19-VERIFIED-CODEBASE-BINDINGS-AND-PHASE-MAP.md) §Enums |

### Future schema changes (Phase-later, NOT 0A–5)

| Change | Phase | Migration | Backfill | Rollback |
|---|---|---|---|---|
| `very_stale` freshness tier (NOT an enum value) | Phase 2 | **None** — derived from `pricing_date` in the app layer (extends the three 90-day constants + `getComponentPricingFreshness` to a 180-day tier). `component_lifecycle_state` enum is `draft`/`in_production`/`available`/`discontinued`/`archived` — `very_stale` is NOT one of its values. | None | n/a (no migration) |
| `last_reviewed` / `reviewed_at` column | Phase-later | ALTER TABLE `cost_library_items` / `estimate_templates` | None (defaults to `updated_at` or null) | DROP column |
| Controlled-vocabulary `confidence` / `category` | Phase-later | ALTER TYPE / CHECK constraint | None (existing free text migrates to nearest enum) | DROP constraint / type |
| Component versioning expansion | Phase-later | ALTER/extend the EXISTING `cost_library_item_versions` table (do NOT create a parallel table; `20260523120957_component_library_item_versioning.sql`) | Backfill from current | DROP added columns |
| Audit log table | Phase-later | New table | None | DROP table |
| Soft-delete tombstones | Phase-later | ALTER TABLE add column | Backfill existing | DROP column |

Owner: DB lead | Phase: Phase-later | Flag: n/a | Rollback: per-row `down` migration | Evidence: EV-MIGRATION-<name> | Telemetry: n/a | Copy: n/a | A11y: n/a | Perf: n/a | Browser-proof: n/a | i18n: n/a | Binding: [19](19-VERIFIED-CODEBASE-BINDINGS-AND-PHASE-MAP.md) §Data Layer

---

## 3. RLS policies

### Policy principles

1. **Enable RLS on every table** — no exceptions.
2. **Deny by default** — no policy = no access.
3. **Workspace isolation** — users can only access data in their workspace.
4. **Role-based access** — `viewer` read-only; `member`/`admin`/`owner` edit; `admin`/`owner` manage members/publications.
5. **Service role bypasses RLS** — but MUST NEVER be used for user requests.
6. **Public snapshots have their own policy** — redacted, no live data; read via `sanitizeProjectPublicationSnapshotForPublicRead` (`src/lib/publication/snapshot.ts:301`) at build + read time.

### Verified RLS helper functions

| Function | Purpose | Migration | Binding |
|---|---|---|---|
| `is_workspace_member(target_workspace_id uuid)` | Any membership | `20260613201302_rls_initplan_is_workspace_member.sql` | [19](19-VERIFIED-CODEBASE-BINDINGS-AND-PHASE-MAP.md) §RLS / Authz Primitives |
| `is_workspace_editor(target_workspace_id uuid)` | `owner`/`admin`/`member` | `20260613192344_teamspace_rls_authuid_perf.sql` | [19](19-VERIFIED-CODEBASE-BINDINGS-AND-PHASE-MAP.md) §RLS / Authz Primitives |
| `is_workspace_admin(target_workspace_id uuid)` | `owner`/`admin` only | `20260620103306_rls_initplan_hoist.sql:56` | [19](19-VERIFIED-CODEBASE-BINDINGS-AND-PHASE-MAP.md) §RLS / Authz Primitives |
| `can_edit_estimate(target_estimate_id uuid)` | Estimate edit right | `20260613192344_teamspace_rls_authuid_perf.sql` | [19](19-VERIFIED-CODEBASE-BINDINGS-AND-PHASE-MAP.md) §Server Actions and RPCs |
| `can_manage_project_publication(target_project_id uuid)` | Publication manage right (used by `project_publications` RLS) | `20260527120000_project_client_publication.sql` | `supabase/migrations/20260527120000_project_client_publication.sql:78-86` |
| `is_platform_admin()` | Platform admin override | core schema | [19](19-VERIFIED-CODEBASE-BINDINGS-AND-PHASE-MAP.md) §RLS / Authz Primitives |

> **Cross-doc note:** `is_workspace_admin` and `can_manage_project_publication` are
> real and used by `project_publications` policies, but doc 19's RLS/Authz table
> does not yet list them. This doc cites them at their verified migration lines;
> doc 19 should reconcile (owned by the keystone lead).

### Policy templates with 12-dimension metadata

#### `public.cost_library_items`

Verified policies from `20260614144136_command_split_core_public_policies.sql`:

```sql
ALTER TABLE public.cost_library_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cost library items can be read by members and managers"
  ON public.cost_library_items
  FOR SELECT TO PUBLIC
  USING (is_platform_admin() OR is_workspace_editor(workspace_id) OR is_workspace_member(workspace_id));

CREATE POLICY "cost library items can be inserted by managers"
  ON public.cost_library_items
  FOR INSERT TO PUBLIC
  WITH CHECK (is_platform_admin() OR is_workspace_editor(workspace_id));

CREATE POLICY "cost library items can be updated by managers"
  ON public.cost_library_items
  FOR UPDATE TO PUBLIC
  USING (is_platform_admin() OR is_workspace_editor(workspace_id))
  WITH CHECK (is_platform_admin() OR is_workspace_editor(workspace_id));

CREATE POLICY "cost library items can be deleted by managers"
  ON public.cost_library_items
  FOR DELETE TO PUBLIC
  USING (is_platform_admin() OR is_workspace_editor(workspace_id));
```

Owner: DB lead | Phase: 0B | Flag: n/a (existing policy) | Rollback: re-apply `20260614144136` drop/create block | Evidence: EV-0A-RLS-COMPONENTS | Telemetry: `authz_denied` on violation | Copy: `permission.denied_announcement` | A11y: n/a | Perf: index scan via `cost_library_items_workspace_id_idx` | Browser-proof: n/a | i18n: n/a | Binding: `supabase/migrations/20260614144136_command_split_core_public_policies.sql:1-40`

#### `public.library_folders`

Verified policy from `20260523030333_library_folder_organization.sql`:

```sql
ALTER TABLE public.library_folders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members can manage library folders" ON public.library_folders
  FOR ALL TO authenticated
  USING (public.is_workspace_member(workspace_id))
  WITH CHECK (public.is_workspace_member(workspace_id));
```

Owner: DB lead | Phase: 0B | Flag: `library_folder_dialogs` | Rollback: re-apply migration; policy unchanged by UI work | Evidence: EV-0A-RLS-FOLDERS | Telemetry: `authz_denied` on violation | Copy: `permission.denied_announcement` | A11y: n/a | Perf: index scan via `library_folders_workspace_parent_sort_idx` | Browser-proof: n/a | i18n: n/a | Binding: `supabase/migrations/20260523030333_library_folder_organization.sql:262-266`

#### `public.estimate_templates`, `public.estimate_template_nodes`, `public.estimate_template_row_items`

Verified policies from `20260615145915_harden_estimate_template_editor_rls.sql`:

```sql
ALTER TABLE public.estimate_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.estimate_template_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.estimate_template_row_items ENABLE ROW LEVEL SECURITY;

-- estimate_templates
CREATE POLICY "members can view estimate templates" ON public.estimate_templates
  FOR SELECT TO authenticated USING (public.is_workspace_member(workspace_id));

CREATE POLICY "workspace editors can insert estimate templates" ON public.estimate_templates
  FOR INSERT TO authenticated WITH CHECK (public.is_workspace_editor(workspace_id));

CREATE POLICY "workspace editors can update estimate templates" ON public.estimate_templates
  FOR UPDATE TO authenticated
  USING (public.is_workspace_editor(workspace_id))
  WITH CHECK (public.is_workspace_editor(workspace_id));

CREATE POLICY "workspace editors can delete estimate templates" ON public.estimate_templates
  FOR DELETE TO authenticated USING (public.is_workspace_editor(workspace_id));

-- estimate_template_nodes (workspace-scoped via parent template)
CREATE POLICY "members can view estimate template nodes" ON public.estimate_template_nodes
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.estimate_templates template
      WHERE template.id = estimate_template_nodes.template_id
        AND public.is_workspace_member(template.workspace_id)
    )
  );

CREATE POLICY "workspace editors can insert estimate template nodes" ON public.estimate_template_nodes
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.estimate_templates template
      WHERE template.id = estimate_template_nodes.template_id
        AND public.is_workspace_editor(template.workspace_id)
    )
  );

CREATE POLICY "workspace editors can update estimate template nodes" ON public.estimate_template_nodes
  FOR UPDATE TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.estimate_templates template
      WHERE template.id = estimate_template_nodes.template_id
        AND public.is_workspace_editor(template.workspace_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.estimate_templates template
      WHERE template.id = estimate_template_nodes.template_id
        AND public.is_workspace_editor(template.workspace_id)
    )
  );

CREATE POLICY "workspace editors can delete estimate template nodes" ON public.estimate_template_nodes
  FOR DELETE TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.estimate_templates template
      WHERE template.id = estimate_template_nodes.template_id
        AND public.is_workspace_editor(template.workspace_id)
    )
  );

-- estimate_template_row_items (workspace-scoped via parent template)
CREATE POLICY "members can view estimate template row items" ON public.estimate_template_row_items
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.estimate_templates template
      WHERE template.id = estimate_template_row_items.template_id
        AND public.is_workspace_member(template.workspace_id)
    )
  );

CREATE POLICY "workspace editors can insert estimate template row items" ON public.estimate_template_row_items
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.estimate_templates template
      WHERE template.id = estimate_template_row_items.template_id
        AND public.is_workspace_editor(template.workspace_id)
    )
  );

CREATE POLICY "workspace editors can update estimate template row items" ON public.estimate_template_row_items
  FOR UPDATE TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.estimate_templates template
      WHERE template.id = estimate_template_row_items.template_id
        AND public.is_workspace_editor(template.workspace_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.estimate_templates template
      WHERE template.id = estimate_template_row_items.template_id
        AND public.is_workspace_editor(template.workspace_id)
    )
  );

CREATE POLICY "workspace editors can delete estimate template row items" ON public.estimate_template_row_items
  FOR DELETE TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.estimate_templates template
      WHERE template.id = estimate_template_row_items.template_id
        AND public.is_workspace_editor(template.workspace_id)
    )
  );
```

Owner: DB lead | Phase: 0B | Flag: n/a (existing policy) | Rollback: re-apply `20260615145915` drop/create block | Evidence: EV-0A-RLS-TEMPLATES | Telemetry: `authz_denied` on violation | Copy: `permission.denied_announcement` | A11y: n/a | Perf: index scan via `estimate_templates_workspace_sort_idx` | Browser-proof: n/a | i18n: n/a | Binding: `supabase/migrations/20260615145915_harden_estimate_template_editor_rls.sql:40-149`

#### `public.cost_library_item_price_history`

Workspace-scoped, RLS-enforced via the same membership/editor predicates as `cost_library_items`. Reads/writes are guarded by `is_workspace_member` / `is_workspace_editor` on the parent `cost_library_items.workspace_id` (or a direct `workspace_id` column if present). The action-layer guard `upsertCostLibraryComponentPriceOption` (`src/lib/component-library/actions.ts`) is defense-in-depth over this policy.

Owner: DB lead | Phase: 0B | Flag: n/a | Rollback: re-apply core schema policy | Evidence: EV-0A-RLS-PRICE-HISTORY | Telemetry: `authz_denied` on violation | Copy: `permission.denied_announcement` | A11y: n/a | Perf: index scan on `cost_library_item_id` + workspace | Browser-proof: n/a | i18n: n/a | Binding: [19](19-VERIFIED-CODEBASE-BINDINGS-AND-PHASE-MAP.md) §Data Layer

#### `public.project_publications`

Public snapshots are read via `src/app/share/[token]` and `src/app/api/share/[token]/route.ts`. The `snapshot_json` payload is redacted at build time by `buildSnapshotForProject` (`src/lib/publication/actions.ts:389`) and again at read time by `sanitizeProjectPublicationSnapshotForPublicRead` (`src/lib/publication/snapshot.ts:301`).

> **How public/anon reads work (verified):** the share route does **not** rely on
> a `TO PUBLIC` RLS policy. It resolves the token via the **service-role** client
> (`src/lib/publication/public-repository.ts:132-140`, one client per request),
> which **bypasses RLS**, then rate-limits (`checkProjectPublicationSnapshotRateLimit`)
> and serves the redacted snapshot. RLS on `project_publications` only gates
> **authenticated manager** access; anon reads are enforced by the repository +
> rate-limiter, not by RLS. Do **not** add a `TO PUBLIC USING (true)` policy —
> that would be an open-read regression; access control is the repository's job.

Verified policies from `20260527120000_project_client_publication.sql:88-127`
(RLS enabled at :88; `can_manage_project_publication(project_id)` defined at
:78-86; grants tightened at :120-127 — table is revoked from `public`/`anon`/
`authenticated` and only `select, insert, update` granted to `authenticated`):

```sql
ALTER TABLE public.project_publications ENABLE ROW LEVEL SECURITY;

-- Select: authenticated publication managers only (NOT public; anon reads
-- bypass RLS via the service-role client in public-repository.ts).
CREATE POLICY "project publication managers can read publication rows"
  ON public.project_publications
  FOR SELECT TO authenticated
  USING (public.can_manage_project_publication(project_id));

CREATE POLICY "project publication managers can insert publication rows"
  ON public.project_publications
  FOR INSERT TO authenticated
  WITH CHECK (public.can_manage_project_publication(project_id));

CREATE POLICY "project publication managers can update publication rows"
  ON public.project_publications
  FOR UPDATE TO authenticated
  USING (public.can_manage_project_publication(project_id))
  WITH CHECK (public.can_manage_project_publication(project_id));

-- NOTE: there is NO DELETE policy on project_publications today; hard-delete is
-- not granted at the RLS layer. Publications are revoked/expired via UPDATE, not
-- deleted. If hard-delete is later required, add a FOR DELETE policy gated on
-- can_manage_project_publication (or is_workspace_admin) as a Phase-later item.
```

**Index for public token lookup:** `project_publications_token_hash_idx`
(`20260527120000_project_client_publication.sql:43-44`, on `token_hash`) — the
repository resolves a share token to a row by `token_hash`, not by `id`.

Owner: Security lead | Phase: 0B | Flag: n/a | Rollback: re-apply publication migration policies | Evidence: EV-0A-RLS-PUBLICATIONS | Telemetry: `redaction_regression` if private fields enter snapshot | Copy: `trust.public_snapshot.label` | A11y: n/a | Perf: index scan via `project_publications_token_hash_idx` (token lookup) / `project_publications_project_status_idx` | Browser-proof: n/a | i18n: key-based | Binding: `supabase/migrations/20260527120000_project_client_publication.sql:88-127`; service-role read path `src/lib/publication/public-repository.ts:132-140`

### RLS verification

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
  'cost_library_item_price_history',
  'project_publications',
  'workspaces',
  'workspace_members'
);
-- Expected: relrowsecurity = true for all

-- Verify policies exist
SELECT tablename, policyname, cmd, qual
FROM pg_policies
WHERE tablename IN (
  'cost_library_items',
  'library_folders',
  'estimate_templates',
  'estimate_template_nodes',
  'estimate_template_row_items',
  'cost_library_item_price_history',
  'project_publications'
);
-- Expected: select, insert, update, delete policies for each table
```

---

## 4. Migration safety

### No-migration gate (0A–5 scope)

Per [25](25-AUDIT-SCORES-AND-IMPROVEMENT-PLAN.md) §3, the 0A–5 scope requires
**ZERO schema migrations**. This is a hard gate:

- No `ALTER TABLE`
- No `CREATE TABLE`
- No `CREATE TYPE`
- No `ALTER TYPE`
- No `DROP`

All beta-scope changes (Quick Add, trust states, dense mode, templates) use
existing columns with application-layer logic.

### Migration gate (Phase-later only)

If a Phase-later migration is needed:

1. **Write the migration** with `up` and `down` (rollback) SQL.
2. **Test locally** — `supabase db reset` with the migration applied.
3. **Test rollback locally** — apply, then rollback, verify state.
4. **Test on staging** — apply to staging, verify.
5. **Apply to production** — during a maintenance window.
6. **Verify** — run verification queries (§3).
7. **Monitor** — watch for errors for 1 hour post-migration.

### Migration file naming

```
supabase/migrations/<timestamp>_<description>.sql
```

Example:
```
supabase/migrations/20260701000000_add_component_versioning.sql
```

### Rollback plan (per migration)

Every migration MUST have a rollback:

```sql
-- up (illustrative Phase-later example; real versioning table already partially
--     exists as cost_library_item_versions — see §6)
ALTER TABLE public.cost_library_items ADD COLUMN version integer DEFAULT 1;

-- down
ALTER TABLE public.cost_library_items DROP COLUMN version;
```

---

## 5. Query optimization

### Required indexes

> All names below are **verified against the real migrations** (enumerated via
> `rg -ni 'create.*(index)' supabase/migrations/ | rg 'cost_library|library_folder|estimate_template|project_publication'`).
> Earlier drafts invented `idx_components_*` / `idx_folders_*` / `idx_templates_*`
> / `idx_snapshots_*` names and a fabricated `last_verified_at` column — **none
> of those exist**; this table corrects them. A row marked **"To create in
> Phase 0A"** means the index does not exist today and must be added (with
> migration review) before the cited query can hit an index; track each under
> Evidence `EV-0A-IDX-<name>`.

| Table | Index (real name) | Purpose | Status |
|---|---|---|---|
| `cost_library_items` | `cost_library_items_workspace_id_idx` | Filter by workspace (every query) | exists — `20260518090000_archestimator_core_schema.sql:124` |
| `cost_library_items` | `cost_library_items_library_folder_id_idx` | Filter by folder (`library_folder_id`) | exists — `20260523030333_library_folder_organization.sql:26` |
| `cost_library_items` | `cost_library_items_workspace_lifecycle_idx` | Workspace + lifecycle filter | exists — `20260523120957_component_library_item_versioning.sql:93` |
| `cost_library_items` | `cost_library_items_category_node_id_idx` | Filter by category node | exists — `20260522064018_component_library_taxonomy_source.sql:41` |
| `cost_library_items` | `cost_library_items_supplier_id_idx` | Filter by supplier | exists — `20260522064018_component_library_taxonomy_source.sql:42` |
| `cost_library_items` | `cost_library_items_brand_id_idx` | Filter by brand | exists — `20260524053500_component_brand_library.sql:21` |
| `cost_library_items` | (none on `pricing_date`) | Trust-state computation (freshness) | **To create in Phase 0A — Evidence EV-0A-IDX-pricing_date**. Trust derives from `pricing_date` (no `last_verified_at`/`last_reviewed` column exists — see [19](19-VERIFIED-CODEBASE-BINDINGS-AND-PHASE-MAP.md) §Data Layer). Confirm whether an index is even needed after the Phase 0A perf seed before adding it. |
| `cost_library_items` | (no trigram / GIN index on `name`) | Fuzzy name search | **To create in Phase 0A — Evidence EV-0A-IDX-name-trigram**. No `pg_trgm`/GIN index exists today; client-side synchronous search (`ComponentLibraryManager.tsx:876-882`) is the current mechanism. Only add server FTS/trigram **if** Phase 0A measurement shows client search is the bottleneck (see [19](19-VERIFIED-CODEBASE-BINDINGS-AND-PHASE-MAP.md) §Performance Reality). |
| `library_folders` | `library_folders_workspace_parent_sort_idx` | Workspace + tree traversal (parent + sort) | exists — `20260523030333_library_folder_organization.sql:22` |
| `library_folders` | `library_folders_workspace_source_category_key` (unique) | One source-category node per workspace | exists — `20260523030333_library_folder_organization.sql:23` |
| `estimate_templates` | `estimate_templates_workspace_sort_idx` | Workspace + sort + name | exists — `20260522091621_component_library_templates.sql:62` |
| `estimate_template_nodes` | `estimate_template_nodes_template_parent_sort_idx` | Template + parent + sort | exists — `20260522091621_component_library_templates.sql:63` |
| `estimate_template_row_items` | `estimate_template_row_items_template_node_sort_idx` | Template + node + sort | exists — `20260522091621_component_library_templates.sql:64` |
| `project_publications` | `project_publications_project_status_idx` | Project + status + published_at | exists — `20260527120000_project_client_publication.sql:40-41` |
| `project_publications` | `project_publications_token_hash_idx` | Share-token → row resolution (the public read path) | exists — `20260527120000_project_client_publication.sql:43-44` |
| `project_publications` | `project_publications_one_published_per_project_idx` (unique) | One published publication per project | exists — `20260621120000_shared_link_d1_d11_hardening.sql:240` |
| `workspace_members` | `workspace_members_user_id_idx` | Lookup a user's workspaces | exists — `20260518090000_archestimator_core_schema.sql:121` |

> **No `pricing_date` index and no name-trigram index exist today.** Both are
> candidates, not facts — they are gated behind the Phase 0A perf seed (doc 16
> §3 step 1, which currently does **not** cover `cost_library_items`) and must be
> measured before being asserted. Do not list either as "required for beta".

### EXPLAIN ANALYZE requirement

Every Library query MUST be verified with `EXPLAIN ANALYZE`:

```sql
EXPLAIN ANALYZE
SELECT id, name, category, unit, unit_cost, pricing_date, lifecycle_state
FROM public.cost_library_items
WHERE workspace_id = '<uuid>'
ORDER BY name;
```

**PROVISIONAL targets** (not verified SLAs — there is no Phase 0A perf seed for
`cost_library_items` yet; final budgets land in
[30](30-PERFORMANCE-BUDGETS-AND-PROVISIONAL-TARGETS.md) after the baseline):

- Index scan (not seq scan) for workspace-filtered queries — expected to hit
  `cost_library_items_workspace_id_idx`.
- Execution time < 20ms for a 500-component workspace.
- Execution time < 100ms for the worst-case query.

### Connection pooling

- Use Supabase connection pooler (pgBouncer) for serverless
- Max connections: 10 per serverless instance
- Pool mode: transaction
- Prepared statements: disabled (pgBouncer transaction mode)

### Query patterns to avoid

- `SELECT *` — specify columns
- N+1 queries — use joins or batch fetch
- Unbounded queries — always paginate or limit
- Cross-workspace queries — RLS will filter, but explicit workspace_id is faster

---

## 6. Backfill plans (Phase-later)

### If `very_stale` freshness tier is added

```sql
-- No backfill needed — `very_stale` is DERIVED from `pricing_date` (the real
-- freshness column). No `last_verified_at` / `last_reviewed` column exists
-- anywhere (confirmed in doc 19 §Data Layer; `rg -n 'last_reviewed|last_verified_at'
-- supabase/migrations` returns 0 hits).
-- Application layer computes (extends the three 90-day constants in lockstep,
-- per doc 19 §Confidence and Freshness Models):
--   if pricing_date IS NULL                       -> 'missing'
--   if pricing_date >= NOW() - INTERVAL '90 days' -> 'fresh'
--   if pricing_date >= NOW() - INTERVAL '180 days' -> 'stale'
--   else                                           -> 'very_stale'
-- Touch points: COMPONENT_FACET_STALE_DAYS (component-facet-filter.tsx:12),
-- LIBRARY_OVERVIEW_STALE_PRICING_DAYS (component-library-repository.ts:827),
-- the LibraryOverview.tsx:114 UI string, getComponentPricingFreshness
-- (component-facet-filter.tsx:61), getStalenessTone/getStalenessLabel
-- (component-library/helpers.ts:667/675).
```

### If component versioning is expanded

> A versioning table **already exists**: `cost_library_item_versions` (with
> `cost_library_item_versions_workspace_item_idx` at
> `20260523120957_component_library_item_versioning.sql:95`). Reconcile any
> Phase-later expansion against that table rather than inventing a parallel
> `component_versions` table that references a non-existent `components` table.

```sql
-- Expand the EXISTING cost_library_item_versions, do NOT create a new table.
-- cost_library_items is the real parent table (not "components").
-- (Illustrative; actual columns are defined in 20260523120957 — extend those.)

-- Backfill example (version 1 for any item missing a version row):
INSERT INTO public.cost_library_item_versions (workspace_id, cost_library_item_id, /* ...existing columns... */)
SELECT workspace_id, id /* , ...defaults... */
FROM public.cost_library_items item
WHERE NOT EXISTS (
  SELECT 1 FROM public.cost_library_item_versions v
  WHERE v.cost_library_item_id = item.id
);
```

### If audit log is added

```sql
-- No backfill needed — audit log starts from migration forward
CREATE TABLE audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  action text NOT NULL,
  resource_type text NOT NULL,
  resource_id uuid,
  workspace_id uuid,
  metadata jsonb,
  created_at timestamptz DEFAULT now()
);
```

---

## 7. Per-table DB acceptance criteria

> Policy/index counts are verified against §3 and §5. Query targets are
> PROVISIONAL pending the Phase 0A perf seed (doc 16 §3 step 1; final in
> [30](30-PERFORMANCE-BUDGETS-AND-PROVISIONAL-TARGETS.md)).

| Table | RLS | Indexes (verified) | Query performance (provisional) | Backup |
|---|---|---|---|---|
| `cost_library_items` | ✓ (4 policies: select/insert/update/delete) | ✓ (`cost_library_items_workspace_id_idx`, `_library_folder_id_idx`, `_workspace_lifecycle_idx`, `_category_node_id_idx`, `_supplier_id_idx`, `_brand_id_idx`); **no** `pricing_date` / trigram index | < 20ms (500 items, post-seed) | Daily physical backup |
| `library_folders` | ✓ (1 `FOR ALL` policy) | ✓ (`library_folders_workspace_parent_sort_idx`, `_workspace_source_category_key`) | < 10ms | Daily physical backup |
| `estimate_templates` | ✓ (4 policies) | ✓ (`estimate_templates_workspace_sort_idx`) | < 15ms | Daily physical backup |
| `estimate_template_nodes` | ✓ (4 policies, parent-scoped) | ✓ (`estimate_template_nodes_template_parent_sort_idx`) | < 10ms | Daily physical backup |
| `estimate_template_row_items` | ✓ (4 policies, parent-scoped) | ✓ (`estimate_template_row_items_template_node_sort_idx` + linkage indexes) | < 10ms | Daily physical backup |
| `cost_library_item_price_history` | ✓ (workspace-scoped) | ✓ (`cost_library_item_price_history_workspace_item_idx`) | < 10ms | Daily physical backup |
| `workspaces` | ✓ | ✓ (PK) | < 5ms | Daily physical backup |
| `workspace_members` | ✓ | ✓ (`workspace_members_user_id_idx`) | < 5ms | Daily physical backup |
| `project_publications` | ✓ (3 policies: select/insert/update; no delete) | ✓ (`project_publications_token_hash_idx`, `_project_status_idx`, `_one_published_per_project_idx`) | < 10ms (token-hash lookup) | Daily physical backup |

### Acceptance template (for every actionable row)

```
DB: <table>.<operation> | <RLS policy> | <index> | <query target> | <backup>
```

Examples:
```
DB: cost_library_items.select | "cost library items can be read by members and managers" | cost_library_items_workspace_id_idx | < 20ms | daily backup
DB: cost_library_items.insert | "cost library items can be inserted by managers" | n/a (write) | n/a | daily backup
DB: n/a (no DB access in this row)
```

---

## 8. Verification

```bash
# RLS enabled on all Library tables (real table names)
supabase db execute --sql "SELECT relname, relrowsecurity FROM pg_class WHERE relname IN ('cost_library_items', 'library_folders', 'estimate_templates', 'estimate_template_nodes', 'estimate_template_row_items', 'cost_library_item_price_history', 'project_publications') ORDER BY relname"
# Expected: relrowsecurity = true for all

# No migrations in 0A-5 scope
ls supabase/migrations/ | sort | tail -5
# Expected: no migrations dated after the 0A-5 start date

# All existing indexes present (real names from §5)
supabase db execute --sql "SELECT tablename, indexname FROM pg_indexes WHERE tablename IN ('cost_library_items', 'library_folders', 'estimate_templates', 'estimate_template_nodes', 'estimate_template_row_items', 'project_publications') ORDER BY tablename, indexname"
# Expected: the index names enumerated in §5 (status=exists rows).
# The pricing_date and name-trigram indexes are NOT expected today
# (they are Phase-0A candidates tracked under EV-0A-IDX-*).

# Query performance within budget (PROVISIONAL — seed cost_library_items first,
# doc 16 §3 step 1; final budgets in doc 30)
supabase db execute --sql "EXPLAIN ANALYZE SELECT id, name, category, unit, unit_cost, pricing_date, lifecycle_state FROM public.cost_library_items WHERE workspace_id = '<test-uuid>' ORDER BY name"
# Expected: Index Scan using cost_library_items_workspace_id_idx; provisional target < 20ms

# Every actionable row has a DB: field
rg "DB:" .ai/03_plans/2026-06-20-Library-Page-Overall-Improvement/ -g "*.md" --count
# Expected: DB: rows propagate across actionable docs (Phase-later per doc 34 §6;
# doc 34 currently measures DB: at 0 files pack-wide — propagation is a residual).
```

---

## 9. Gap closure

### Current state

- Doc 13 defines data contracts + cache policy ✓
- Doc 14 defines authz + RLS baseline ✓
- Doc 19 has verified codebase bindings ✓
- No dedicated DB/RLS/migration contract (this doc fills that gap)
- No no-migration gate (this doc defines it)
- No backfill plans (this doc defines them)
- No query optimization contract (this doc defines it)

### Required updates to other docs

- [13-DATA-CONTRACTS-ROUTE-CACHE.md](13-DATA-CONTRACTS-ROUTE-CACHE.md): add cross-ref to this doc for RLS + migration context
- [14-SECURITY-AUTHZ-AND-DATA-EXPOSURE.md](14-SECURITY-AUTHZ-AND-DATA-EXPOSURE.md): add cross-ref to this doc for full RLS policies
- [19-VERIFIED-CODEBASE-BINDINGS-AND-PHASE-MAP.md](19-VERIFIED-CODEBASE-BINDINGS-AND-PHASE-MAP.md): add cross-ref to this doc for DB bindings
- [17-BLAST-RADIUS-SEQUENCING-ROLLBACK.md](17-BLAST-RADIUS-SEQUENCING-ROLLBACK.md): add "no migration in 0A-5" gate
- Every doc with actionable rows: add `DB:` field per row

---

## 10. Sign-off

> **DRAFT — not yet signed off.** As of 2026-06-21 all reviewer verdicts are
> `pending`. The policy/index/table bindings in §2–§8 have been reconciled to the
> real migrations and the keystone (doc 19), but the EXPLAIN ANALYZE budgets
> (§5/§7) remain PROVISIONAL pending the Phase 0A perf seed, and per-row `DB:`
> propagation (doc 34) is a Phase-later residual. Treat this contract as
> implementation-ready for the schema/RLS facts it asserts, and as provisional
> for the perf targets. Sign-off is recorded below when the Phase 0A baseline
> lands; until then this section is a DRAFT placeholder.

| Reviewer | Verdict | Date | Notes |
|---|---|---|---|
| DB lead | pending | — | — |
| Security lead | pending | — | — |
| Backend lead | pending | — | — |
| Planning lead | pending | — | — |
| Reviewer gate (Oracle) | pending | — | — |

The DB/RLS contract is complete when:
1. Every table in §2 has RLS enabled (§3).
2. No migrations in 0A-5 scope (§4).
3. Every "exists" index in §5 is present (§8 verification confirms); the
   Phase-0A-candidate indexes (`pricing_date`, name-trigram) are decided and
   tracked under `EV-0A-IDX-*`.
4. Every query passes EXPLAIN ANALYZE within the **final** budget in
   [30](30-PERFORMANCE-BUDGETS-AND-PROVISIONAL-TARGETS.md) (post Phase 0A seed).
5. Every backfill plan is defined (§6).
6. All five reviewers sign off above.
