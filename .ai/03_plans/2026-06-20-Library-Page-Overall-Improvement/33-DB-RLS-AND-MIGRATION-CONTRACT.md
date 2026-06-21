# 33 — DB, RLS, and Migration Contract

> **Status:** Living document. Initialized 2026-06-21 by the Ultrawork audit
> loop. Defines the database, RLS, and migration contract for the Library
> page. Deepens [13-DATA-CONTRACTS-ROUTE-CACHE.md](13-DATA-CONTRACTS-ROUTE-CACHE.md)
> and [14-SECURITY-AUTHZ-AND-DATA-EXPOSURE.md](14-SECURITY-AUTHZ-AND-DATA-EXPOSURE.md)
> with schema, RLS policies, migration safety, and backfill plans.
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

1. **Defines the schema** for Library tables (components, folders, templates).
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
| `very_stale` enum value | Phase-later | ALTER TYPE `component_lifecycle_state` | None (derived from `pricing_date`) | DROP enum value |
| `last_reviewed` / `reviewed_at` column | Phase-later | ALTER TABLE `cost_library_items` / `estimate_templates` | None (defaults to `updated_at` or null) | DROP column |
| Controlled-vocabulary `confidence` / `category` | Phase-later | ALTER TYPE / CHECK constraint | None (existing free text migrates to nearest enum) | DROP constraint / type |
| Component versioning | Phase-later | New table | Backfill from current | DROP table |
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
6. **Public snapshots have their own policy** — redacted, no live data; read via `sanitizeProjectPublicationSnapshotForPublicRead` (`src/lib/publication/snapshot.ts:112`) at build + read time.

### Verified RLS helper functions

| Function | Purpose | Migration | Binding |
|---|---|---|---|
| `is_workspace_member(target_workspace_id uuid)` | Any membership | `20260613201302_rls_initplan_is_workspace_member.sql` | [19](19-VERIFIED-CODEBASE-BINDINGS-AND-PHASE-MAP.md) §RLS / Authz Primitives |
| `is_workspace_editor(target_workspace_id uuid)` | `owner`/`admin`/`member` | `20260613192344_teamspace_rls_authuid_perf.sql` | [19](19-VERIFIED-CODEBASE-BINDINGS-AND-PHASE-MAP.md) §RLS / Authz Primitives |
| `can_edit_estimate(target_estimate_id uuid)` | Estimate edit right | `20260613192344_teamspace_rls_authuid_perf.sql` | [19](19-VERIFIED-CODEBASE-BINDINGS-AND-PHASE-MAP.md) §Server Actions and RPCs |
| `is_platform_admin()` | Platform admin override | core schema | [19](19-VERIFIED-CODEBASE-BINDINGS-AND-PHASE-MAP.md) §RLS / Authz Primitives |

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

Public snapshots are read via `src/app/share/[token]` and `src/app/api/share/[token]/route.ts`. The row is readable by the unauthenticated public via the share token, but the `snapshot_json` payload is redacted at build time by `buildSnapshotForProject` (`src/lib/publication/actions.ts:376`) and again at read time by `sanitizeProjectPublicationSnapshotForPublicRead` (`src/lib/publication/snapshot.ts:112`).

```sql
ALTER TABLE public.project_publications ENABLE ROW LEVEL SECURITY;

-- Select: public by share token (token resolution happens in the repository)
CREATE POLICY "project publications can be read by public token"
  ON public.project_publications
  FOR SELECT TO PUBLIC USING (true);

-- Insert/Update/Delete: workspace admins and owners
CREATE POLICY "project publications can be managed by workspace admins"
  ON public.project_publications
  FOR ALL TO authenticated
  USING (is_platform_admin() OR is_workspace_admin(workspace_id))
  WITH CHECK (is_platform_admin() OR is_workspace_admin(workspace_id));
```

Owner: Security lead | Phase: 0B | Flag: n/a | Rollback: re-apply publication migration policies | Evidence: EV-0A-RLS-PUBLICATIONS | Telemetry: `redaction_regression` if private fields enter snapshot | Copy: `trust.public_snapshot.label` | A11y: n/a | Perf: index scan via `project_publications_project_id_idx` / token lookup | Browser-proof: n/a | i18n: key-based | Binding: `src/app/api/share/[token]/route.ts:78`

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
-- up
ALTER TABLE components ADD COLUMN version integer DEFAULT 1;

-- down
ALTER TABLE components DROP COLUMN version;
```

---

## 5. Query optimization

### Required indexes

> The exact index names are in [19-VERIFIED-CODEBASE-BINDINGS-AND-PHASE-MAP.md](19-VERIFIED-CODEBASE-BINDINGS-AND-PHASE-MAP.md).

| Table | Index | Purpose |
|---|---|---|
| components | `idx_components_workspace_id` | Filter by workspace (every query) |
| components | `idx_components_folder_id` | Filter by folder |
| components | `idx_components_last_verified_at` | Trust state computation |
| components | `idx_components_name_trigram` | Search by name (trigram for fuzzy) |
| folders | `idx_folders_workspace_id` | Filter by workspace |
| folders | `idx_folders_parent_folder_id` | Tree traversal |
| templates | `idx_templates_workspace_id` | Filter by workspace |
| snapshots | `idx_snapshots_workspace_id` | Filter by workspace |
| snapshots | `idx_snapshots_expires_at` | Expire old snapshots |
| workspace_members | `idx_workspace_members_user_id` | Lookup user's workspaces |
| workspace_members | `idx_workspace_members_workspace_id` | Lookup workspace's members |

### EXPLAIN ANALYZE requirement

Every Library query MUST be verified with `EXPLAIN ANALYZE`:

```sql
EXPLAIN ANALYZE
SELECT * FROM components
WHERE workspace_id = '<uuid>'
ORDER BY name;
```

**Pass conditions:**
- Index scan (not seq scan) for workspace-filtered queries
- Execution time < 20ms for 500-component workspace
- Execution time < 100ms for worst-case query

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

### If `very_stale` enum is added

```sql
-- No backfill needed — `very_stale` is derived from `last_verified_at` threshold
-- Application layer computes: if last_verified_at < NOW() - INTERVAL '180 days' THEN 'very_stale'
```

### If component versioning is added

```sql
-- Create versioning table
CREATE TABLE component_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  component_id uuid REFERENCES components(id),
  version integer NOT NULL,
  snapshot jsonb NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Backfill: create version 1 for all existing components
INSERT INTO component_versions (component_id, version, snapshot)
SELECT id, 1, to_jsonb(components) FROM components;
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

| Table | RLS | Indexes | Query performance | Backup |
|---|---|---|---|---|
| components | ✓ (4 policies) | ✓ (4 indexes) | < 20ms (500 components) | Daily physical backup |
| folders | ✓ (4 policies) | ✓ (2 indexes) | < 10ms | Daily physical backup |
| templates | ✓ (4 policies) | ✓ (1 index) | < 15ms | Daily physical backup |
| workspaces | ✓ | ✓ (PK) | < 5ms | Daily physical backup |
| workspace_members | ✓ | ✓ (2 indexes) | < 5ms | Daily physical backup |
| snapshots | ✓ (4 policies) | ✓ (2 indexes) | < 10ms | Daily physical backup |

### Acceptance template (for every actionable row)

```
DB: <table>.<operation> | <RLS policy> | <index> | <query target> | <backup>
```

Examples:
```
DB: components.select | components_select | idx_components_workspace_id | < 20ms | daily backup
DB: components.insert | components_insert | n/a (write) | n/a | daily backup
DB: n/a (no DB access in this row)
```

---

## 8. Verification

```bash
# RLS enabled on all Library tables
supabase db execute --sql "SELECT relname, relrowsecurity FROM pg_class WHERE relname IN ('components', 'folders', 'templates', 'snapshots') ORDER BY relname"
# Expected: relrowsecurity = true for all

# No migrations in 0A-5 scope
ls supabase/migrations/ | sort | tail -5
# Expected: no migrations dated after the 0A-5 start date

# All required indexes exist
supabase db execute --sql "SELECT indexname FROM pg_indexes WHERE tablename IN ('components', 'folders', 'templates', 'snapshots')"
# Expected: all indexes from §5 present

# Query performance within budget
supabase db execute --sql "EXPLAIN ANALYZE SELECT * FROM components WHERE workspace_id = '<test-uuid>'"
# Expected: Index Scan, execution time < 20ms

# Every actionable row has a DB: field
rg "DB:" .ai/03_plans/2026-06-20-Library-Page-Overall-Improvement/ -g "*.md" --count
# Expected: 26+ files with DB: rows (after Wave 2)
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
3. Every required index exists (§5).
4. Every query passes EXPLAIN ANALYZE within budget (§5).
5. Every backfill plan is defined (§6).
6. All five reviewers sign off above.
