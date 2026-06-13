# 10 — Data Model & Migration Design (Export Format Fields)

> **Status: DESIGNED — application deferred (DB channel unavailable per project constraints).**
> The DB channel is currently unavailable to agents (Docker absent; hosted Supabase SQL denied by the classifier — see memory "No DB channel for agents"). **Every migration in this document is designed, not applied.** No SQL here has been executed; nothing in `supabase/migrations/` was created or changed by this doc.
>
> **What this is:** the migration design that [08_implementation-plan.md §Decision gate](08_implementation-plan.md) promised ("D1/D3/D5/D6 touch the DB/data model … design the migrations here, defer application") but never delivered. It resolves, per field, *where the value lives* and *whether it ships now via existing JSONB `metadata` or later via a typed column*. House style mirrored from the latest migration [`20260612094734_estimate_tabs_foundation.sql`](../../../supabase/migrations/20260612094734_estimate_tabs_foundation.sql) and the workspace-scoped precedent [`20260527072220_auth_account_data.sql`](../../../supabase/migrations/20260527072220_auth_account_data.sql).
>
> **Companion docs:** decisions D1–D6 in [08 §Decision gate](08_implementation-plan.md); findings F-01/F-07/F-08/F-10/F-27 in [07](07_findings-register.md); format target in [02](02_boq-format-benchmark.md).

---

## 0. The key insight (read this first)

The plan files repeatedly tag D1/D3/D5/D6 as "DB-blocked." **That is too pessimistic for the read side.** Three of the four `metadata` JSONB columns the export model needs **already exist on shipped tables**, so the *reading* of GFA, per-row scope, and an interim labor rate can ship in **P2 today with no migration at all** — only the eventual *typed-column promotion* is DB-channel-gated.

The one field that genuinely cannot piggyback is **D4 (contractor identity)**: `public.workspaces` has **no `metadata` column** (verified — see §1.5), so D4 needs a real migration (new table or new columns). **08 omits D4 from its DB-blocked list** (08:26 names only "D1/D3/D5/D6"; P2-T4/D4 sits in Phase 2 with no DB caveat). **This doc corrects that: D4 must be added to the plan's DB-blocked list.**

Verified column inventory (opened `src/lib/supabase/types.ts`, did not assume):

| Table | `metadata` column? | Line(s) verified | Export-relevant existing columns |
|---|---|---|---|
| `projects` | **yes** `metadata: Json` | 2899 | `client_name` (2893), `project_code` (2901), `location` (2898), `currency_code` (2896), `workspace_id` (2903) |
| `estimates` | **yes** `metadata: Json` | 2020 | `currency_code` (2018), `project_budget` (2023), `notes` (2022) |
| `estimate_row_items` | **yes** `metadata: Json` | 1533 | `unit_cost` (1545), `misc_cost` (1535), `contingency_percentage` (1534) — **no labor column** |
| `workspaces` | **NO** | Row cols 2971–2978 (only `created_at`, `created_by`, `id`, `name`, `slug`, `updated_at`); table entry 2970–2996 | — (so contractor profile cannot piggyback on workspace metadata) |

The route **already reads** `estimate.metadata` today (`route.ts:100`, `readVersionLabel`), proving the JSONB read path is live and safe to extend. `projects.client_name` already exists (2893) but is **not** selected by the route (`ProposalExportProject` pick = `id,name,project_code,location,currency_code`) — so Owner/Client population (part of D4/F-07) is **DB-free** and only needs the route's select list widened. The current model hardcodes `laborUnitCost = 0` (`build-proposal-export-model.ts:89`) and `scopeStatus = "included"` (`build-…:96`).

---

## 1. Per-field storage decision table

For each field: chosen home, the **JSONB-metadata-now** read path, and the **typed-column-later** promotion (channel-gated). "Shippable now" = no migration required to deliver the export-format value in P2/P3.

### 1.1 D1 — `labor_unit_cost` (F-01, P3-T1)

| Aspect | Decision |
|---|---|
| **Chosen home** | Typed column `public.estimate_row_items.labor_unit_cost numeric not null default 0` |
| **Now (no DB)** | Read from `estimate_row_items.metadata->>'laborUnitCost'` (the column exists, line 1533). The model can stop hardcoding `0` (`build-…:89`) and instead read an interim metadata key, falling back to `0`. **Read-side shippable now.** |
| **Later (gated)** | Promote to a typed column so labor is queryable/aggregatable and write-validated (see DDL §2.1). Existing `unit_cost` (1545) is the material rate; labor is the missing sibling. |
| **Why typed eventually** | Labor participates in `COST TOTAL = MATERIAL + LABOR` and feeds Summary aggregates; a typed `numeric` gives correct SUM/rounding and avoids per-row JSON casting. Material/labor split is **CRITICAL F-01**. |
| **Call** | **Typed column, channel-gated** — but interim **metadata read is shippable now** to unblock P3-T1's honesty fix (real value when present, else `0` + visible disclaimer). |

### 1.2 D3 — `gross_floor_area` (F-10, P2-T6)

| Aspect | Decision |
|---|---|
| **Chosen home** | `numeric null` — primary on `public.estimates.metadata` (per-estimate GFA), optional mirror on `public.projects.metadata` (project-level default). Typed-column promotion optional/deferred. |
| **Now (no DB)** | Read from `estimates.metadata->>'grossFloorArea'` (col exists, line 2020), falling back to `projects.metadata->>'grossFloorArea'` (col exists, line 2899). The route already reads `estimate.metadata` (`route.ts:100`). Cost/SQM = `Grand Total / GFA`, `"N/A"` when absent (current behavior at `create-…:308-309`). **Read-side fully shippable now.** |
| **Later (gated)** | *Optional* typed `gross_floor_area numeric` for query/report use. GFA is a single headline value, not aggregated across rows, so the typed promotion is low-value and can stay deferred indefinitely. |
| **Call** | **Ship via metadata now; typed column optional + channel-gated (low priority).** P2-T6 needs **no migration.** |

### 1.3 D5 — `scope_status` (F-08, P3-T2)

| Aspect | Decision |
|---|---|
| **Chosen home** | Per-row on `public.estimate_row_items`. Now: `metadata->>'scopeStatus'`; later: typed `scope_status` (enum or constrained text), default `'included'`. |
| **Now (no DB)** | Read from `estimate_row_items.metadata->>'scopeStatus'` (col exists, line 1533), defaulting to `'included'` (current hardcode at `build-…:96`). Drives the existing SCOPE column (col I) + LINE TOTAL zeroing formula already in the workbook. **Read-side shippable now** — only the per-row *editor* to write scope is additional product work. |
| **Later (gated)** | Promote to a constrained column so scope is validated against the recognized vocabulary (INCLUDED/EXCLUDED/BY OTHERS/OFCI/OSM/…) and queryable for the EXCLUSIONS block (F-29). |
| **Call** | **Ship reads via metadata now; typed column channel-gated.** Note the H/LINE-TOTAL formula already treats EXCLUDED/BY OTHERS/OSM/etc. as zero, so the read path is wired — it just always receives `"included"` today. |

### 1.4 D6 — division taxonomy mapping (F-27, P3-T3)

| Aspect | Decision |
|---|---|
| **Chosen home** | **No new storage.** A code-side ordered canonical list + a mapping function over existing free-text `discipline` (1528) / `category_node_id` (1524) on `estimate_row_items`. |
| **Now (no DB)** | Pure application logic: map free-text `discipline`/category onto the ordered list (Preliminaries → Site/Earth → Civil → Architectural → Finishes → Glass → Doors → Joinery → MEP → FFE → Misc, per 08:24) and sort sections. Optional per-row `metadata->>'divisionKey'` override. **Fully shippable now.** |
| **Later (gated)** | *Only if* the taxonomy must be workspace-authorable would a `division_taxonomy` table be warranted — explicitly **out of scope** for this plan. |
| **Call** | **No migration. Code-only.** Listed here to make explicit that D6 is **not** DB-blocked despite 08:26 tagging it. (Its only data input is existing columns.) |

### 1.5 D4 — contractor / bidder profile (F-07, F-31, P2-T4)

| Aspect | Decision |
|---|---|
| **Chosen home** | **New table `public.workspace_profiles`** (1-to-1 with `workspaces`), OR new columns on `workspaces`. **Recommend the table** to mirror the `workspace_account_settings` precedent and avoid widening the core `workspaces` row. |
| **Now (no DB)** | **Partial only.** Owner/Client is DB-free (read `projects.client_name`, line 2893 — just widen the route's select). But the *contractor identity* (bidder name, address, contact, logo, signatories) has **nowhere to live**: `workspaces` has **no `metadata` column** (verified Row cols 2971–2978). The current beta placeholder `"Archestimator beta workbook"` can be replaced with the workspace `name` as an honest interim, but real contractor fields need the migration. |
| **Later (gated)** | Create `workspace_profiles` (DDL §2.4) with company/contact/signatory fields; the title block reads it, falling back to workspace `name`. |
| **Call** | **Genuinely migration-blocked — add D4 to the plan's DB-blocked list.** Interim: Owner/Client from `projects.client_name` (DB-free) + bidder = workspace `name` (DB-free, replaces the placeholder). Full contractor branding is channel-gated. |

### 1.6 Summary

| Field | Decision (now) | Decision (later, gated) | Migration needed at all? |
|---|---|---|---|
| D1 labor_unit_cost | read `estimate_row_items.metadata.laborUnitCost` | typed `numeric default 0` column | yes (typed only) |
| D3 gross_floor_area | read `estimates/projects.metadata.grossFloorArea` | typed `numeric null` (optional, low pri) | optional |
| D5 scope_status | read `estimate_row_items.metadata.scopeStatus` | typed enum/text default `'included'` | yes (typed only) |
| D6 division taxonomy | code-only mapping over existing columns | (table only if workspace-authorable — OOS) | **no** |
| D4 contractor profile | Owner/Client + workspace name only | **new `workspace_profiles` table** | **yes (required)** |

---

## 2. DDL stubs (typed-column path) — non-breaking by construction

> All DDL below is **designed, not applied.** Defaults are chosen so each migration is **non-breaking**: existing rows acquire a value identical to current runtime behavior, and existing inserts (which omit these columns) stay valid. House style: `begin;`/`commit;` wrapper, lowercase DDL, idempotent guards, `set_updated_at` trigger reuse, RLS already present on the base tables (§4). No `force row level security` — consistent with the repo (0 migrations use it; RLS-force is a release-gate ops item per F-17 / P1-T8, not introduced here).

### 2.1 D1 — `labor_unit_cost` on `estimate_row_items`

```sql
begin;

-- D1 (F-01): labor unit rate as a typed sibling to the existing material rate (unit_cost).
-- Default 0 == current runtime behavior (build-proposal-export-model.ts:89 hardcodes laborUnitCost = 0),
-- so no row changes meaning and no data backfill is needed.
alter table public.estimate_row_items
  add column if not exists labor_unit_cost numeric not null default 0;

-- Optional: if interim values were written to metadata, fold them in (one-time, idempotent).
-- update public.estimate_row_items
--   set labor_unit_cost = (metadata->>'laborUnitCost')::numeric
--   where metadata ? 'laborUnitCost'
--     and labor_unit_cost = 0;

commit;
```

- **Type/nullability/default:** `numeric not null default 0` — matches `unit_cost`/`misc_cost` (both `number`/`numeric` in types.ts 1545/1535) and the hardcoded `0`.
- **RLS:** inherited; `estimate_row_items` already has `enable row level security` (core schema 202) + member policy (core schema, `is_workspace_member` via parent estimate). No new policy. See §4.

### 2.2 D5 — `scope_status` on `estimate_row_items`

Two house-consistent options; **Option A (constrained text)** is recommended for additive flexibility (the recognized vocabulary is open-ended — see [02 §2](02_boq-format-benchmark.md)). Option B (enum) mirrors the `collaboration_role`/event-type enum style.

```sql
begin;

-- D5 (F-08): per-row scope. Default 'included' == current hardcode (build-…:96).
-- Option A — constrained text (recommended; vocabulary may grow without an ALTER TYPE).
alter table public.estimate_row_items
  add column if not exists scope_status text not null default 'included'
  check (scope_status in (
    'included','excluded','by_others','by_owner','by_client','by_gencon',
    'ofci','osci','osm','owner_supplied','omitted','not_applicable','not_in_plan','pending'
  ));

commit;
```

```sql
-- Option B — enum (mirrors collaboration_role pattern at 20260526142913:4-10).
do $$
begin
  create type public.estimate_scope_status as enum (
    'included','excluded','by_others','by_owner','by_client','by_gencon',
    'ofci','osci','osm','owner_supplied','omitted','not_applicable','not_in_plan','pending'
  );
exception
  when duplicate_object then null;
end;
$$;

alter table public.estimate_row_items
  add column if not exists scope_status public.estimate_scope_status not null default 'included';
```

- **Default `'included'`** == current model behavior, so every existing row reads exactly as today; the H/LINE-TOTAL zeroing formula (which already recognizes EXCLUDED/BY OTHERS/OSM/OFCI/OSCI/OWNER SUPPLIED/OMITTED/NOT APPLICABLE) starts firing only when real values are written.
- **RLS:** inherited (same as §2.1). No new policy.

### 2.3 D3 — `gross_floor_area` (optional typed promotion)

```sql
begin;

-- D3 (F-10): optional typed GFA. Nullable; null == "N/A" (current Cost/SQM behavior at create-…:308-309).
-- Per-estimate is primary; project-level is a default fallback.
alter table public.estimates
  add column if not exists gross_floor_area numeric;          -- nullable, no default

alter table public.projects
  add column if not exists gross_floor_area numeric;          -- nullable, no default

commit;
```

- **`numeric null`, no default** — absence is the current "N/A" state; non-breaking. **This typed path is optional** (the metadata read path in §1.2 fully satisfies P2-T6).
- **RLS:** inherited; `estimates` (core schema 199) and `projects` (198) already RLS-enabled with member policies. No new policy.

### 2.4 D4 — contractor profile (required migration)

Recommended: a 1-to-1 `workspace_profiles` table, modeled on `workspace_account_settings` (`20260527072220_auth_account_data.sql`).

```sql
begin;

-- D4 (F-07/F-31): contractor/bidder identity for the export title block.
-- Required because public.workspaces has NO metadata column (verified types.ts Row cols 2971-2978).
create table if not exists public.workspace_profiles (
  workspace_id   uuid primary key references public.workspaces(id) on delete cascade,
  company_name   text check (company_name is null or length(trim(company_name)) > 0),
  address        text,
  contact_email  text check (contact_email is null or length(trim(contact_email)) > 0),
  contact_phone  text,
  logo_bucket    text,
  logo_path      text,
  signatories    jsonb not null default '[]'::jsonb
                   check (jsonb_typeof(signatories) = 'array'),
  metadata       jsonb not null default '{}'::jsonb
                   check (jsonb_typeof(metadata) = 'object'),
  updated_by     uuid references auth.users(id) on delete set null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create trigger workspace_profiles_set_updated_at
  before update on public.workspace_profiles
  for each row execute function public.set_updated_at();

alter table public.workspace_profiles enable row level security;

-- Read: any workspace member. NOTE: workspace_account_settings_select_member (20260527072220:141-144)
-- uses the BROADER predicate can_access_workspace_account_scope (workspace members OR project_members
-- OR estimate_sheet_members, defined at 20260527072220:92-113). We deliberately use the narrower
-- is_workspace_member here so contractor identity is not exposed to external sheet/project collaborators.
create policy "workspace members can read profile" on public.workspace_profiles
  for select to authenticated
  using (public.is_workspace_member(workspace_id));

-- Write: workspace admins only (mirrors workspace_account_settings_insert/update_admin, :146-155).
create policy "workspace admins can insert profile" on public.workspace_profiles
  for insert to authenticated
  with check (public.is_workspace_admin(workspace_id));
create policy "workspace admins can update profile" on public.workspace_profiles
  for update to authenticated
  using (public.is_workspace_admin(workspace_id))
  with check (public.is_workspace_admin(workspace_id));

-- Platform-admin escape hatch (mirrors estimate_tabs platform-admin policy, 20260612094734:45-46).
create policy "platform admins can manage all profiles" on public.workspace_profiles
  for all using (public.is_platform_admin()) with check (public.is_platform_admin());

-- Grant pattern mirrors estimate_tabs (:48-49) and workspace_account_settings (:158).
revoke all on public.workspace_profiles from public, anon, authenticated;
grant select, insert, update on public.workspace_profiles to authenticated;

commit;
```

- **Alternative (columns-on-`workspaces`):** `alter table public.workspaces add column if not exists company_name text … ;` plus an existing `workspaces` select/admin policy already in core schema (204–209). Rejected as the primary because it widens the hot core row and the existing `workspaces` UPDATE policy is admin-only — workable but less isolated than a dedicated table. Either path is **a real migration** (the load-bearing point for the plan).
- **All columns nullable / array+object defaulted** → inserting an empty profile is valid and the title block falls back to workspace `name`; non-breaking.

---

## 3. Backfill strategy

**No data backfill is required for D1, D3, D5, or D4.** Each typed column's DEFAULT (or nullability) is chosen to reproduce current runtime behavior exactly:

| Field | Default / nullability | Pre-migration runtime value | Backfill? |
|---|---|---|---|
| D1 `labor_unit_cost` | `numeric not null default 0` | `0` (build-…:89) | **No** — every existing row's implicit value already == default `0`. |
| D5 `scope_status` | `not null default 'included'` | `"included"` (build-…:96) | **No** — default matches the universal current value. |
| D3 `gross_floor_area` | `numeric null` | absent → "N/A" (create-…:308-309) | **No** — `null` == "N/A". |
| D4 `workspace_profiles` | new empty table | placeholder bidder / blank owner | **No** — empty table → fall back to workspace `name`; rows created on demand when a workspace fills in its profile. |

The only **optional** one-time `update` is the commented metadata→column fold in §2.1 (and analogously for D5), to migrate any interim metadata values written during the JSONB-now phase into the typed column at promotion time. That is a convenience, not a correctness requirement (the read path can keep checking metadata as a fallback after promotion).

---

## 4. RLS implications

**Existing tables (D1/D3/D5): no new policy needed. New columns inherit table-level RLS automatically** — Postgres RLS policies are row-scoped predicates, not column-scoped, so adding a column to a table that already has `enable row level security` + a `USING`/`WITH CHECK` policy requires **zero policy work**. Verified the base tables are already covered:

| Table | RLS enabled | Existing policy basis |
|---|---|---|
| `estimate_row_items` (D1, D5) | core schema 202 | member-of-parent-estimate (core schema policy 256–273; EXISTS over estimates JOIN projects → `is_workspace_member(p.workspace_id)`) |
| `estimates` (D3) | core schema 199 | `is_workspace_member(project.workspace_id)` (core schema 219–232) |
| `projects` (D3) | core schema 198 | `is_workspace_member(workspace_id)` (core schema 216–217) |

The collaboration layer's security-definer predicates `public.can_access_project` / `public.can_access_estimate` (defined in `20260526142913_project_sheet_collaboration_access.sql`, refined in `20260601151500_restrict_sheet_collaborator_estimate_inheritance.sql`) and used by `estimate_tabs` (`20260612094734:42,44`) likewise govern *rows*; new columns are visible to anyone who can already see the row. **No predicate change.**

**New table (D4 `workspace_profiles`): one policy set, specified in §2.4**, mirroring the `workspace_account_settings` admin/grant pattern (the SELECT predicate is intentionally narrower — see below):
- **SELECT** → `is_workspace_member(workspace_id)` (read for any member). NOTE: `workspace_account_settings_select_member` (`20260527072220:141-144`) instead uses the **broader** `can_access_workspace_account_scope` (workspace members OR project/sheet collaborators, defined `20260527072220:92-113`); we deliberately use the narrower member-only predicate so contractor identity is not exposed to external collaborators.
- **INSERT/UPDATE** → `is_workspace_admin(workspace_id)` (admins/owners only; matches `workspace_account_settings_insert/update_admin` at `20260527072220:146-155`; `is_workspace_admin` checks `role in ('owner','admin')`, core schema 180–194).
- **platform-admin** all-access escape hatch (parity with `estimate_tabs`).
- Grants: `revoke all … ; grant select, insert, update … to authenticated` (no `delete` grant — same as `workspace_account_settings`; profile rows are edited, not deleted, while the workspace lives; `on delete cascade` handles workspace teardown).

No `delete` policy is granted by design (mirrors `workspace_account_settings`). `force row level security` is intentionally **not** added — it is absent from all current migrations and belongs to the F-17 / P1-T8 release-gate ops verification, not to this schema design.

---

## 5. Task unblock map

How each field gates the plan's P2/P3 tasks, split into **shippable-now-via-metadata** vs **typed-column-channel-gated** vs **truly migration-blocked**.

| Field | Plan task(s) | Finding | Shippable NOW (no DB) | Channel-gated (deferred) |
|---|---|---|---|---|
| **D3 GFA** | **P2-T6** (Cost/SQM) | F-10 | **Yes — entire task.** Read `estimates`/`projects` `.metadata.grossFloorArea`; compute `Grand Total / GFA`, "N/A" otherwise. | Optional typed `gross_floor_area` column (low value; can stay deferred forever). |
| **D6 taxonomy** | **P3-T3** (division order) | F-27 | **Yes — entire task.** Code-only mapping over existing `discipline`/`category_node_id`. | None (a `division_taxonomy` table only if workspace-authorable — out of scope). |
| **D5 scope** | **P3-T2** (scope + EXCLUSIONS) | F-08, F-29 | **Read side yes** — read `estimate_row_items.metadata.scopeStatus` (default `'included'`); the SCOPE column + LINE-TOTAL zeroing already exist. | Typed `scope_status` column for validation/queryability; the per-row scope **editor** (write path) is additional product work. |
| **D1 labor** | **P3-T1** (material/labor split) | F-01 | **Read side yes (interim)** — read `estimate_row_items.metadata.laborUnitCost`, fall back to `0` + visible disclaimer. | Typed `labor_unit_cost` column for correct aggregation; the per-row labor **input** is additional product work. |
| **D4 contractor** | **P2-T4** (title block) | F-07, F-31 | **Partial** — Owner/Client from `projects.client_name` (just widen the route select); bidder = workspace `name` (replaces the beta placeholder). | **Real migration required** — `workspace_profiles` table for company/contact/logo/signatories. **Add D4 to the DB-blocked list (08 currently omits it).** |

**Net effect on the plan:**
- **P2-T6 (GFA) and P3-T3 (taxonomy) are NOT DB-blocked** — remove the implicit blocker; they can land with code only. Update 08's framing (08:21/08:24 imply D3/D6 are gated; D3's read path and D6 entirely are not).
- **P2-T4 (D4) gains a hard DB dependency 08 doesn't acknowledge** — its full form is channel-gated; only the Owner/Client + workspace-name interim ships now. **This is the one correction the plan needs.**
- **P3-T1 (labor) and P3-T2 (scope) can ship honest read paths now**; their typed columns are the deferred part.

---

## 6. Application checklist (for when the DB channel opens)

When the DB channel becomes available (Docker present, or owner-authorized hosted apply), execute in this order; each is independently non-breaking:

1. **D5 / D1 on `estimate_row_items`** (§2.2, §2.1) — additive columns, default-matched. Run `gitnexus_impact` on `EstimateRowItem` read paths first.
2. **D3 typed columns** (§2.3) — only if/when typed querying is needed; metadata path suffices until then.
3. **D4 `workspace_profiles`** (§2.4) — new table + RLS; then regenerate types (`mcp__…__generate_typescript_types` or `supabase gen types`) and widen the export route select to populate the title block.
4. Run **`detect_changes` / `gitnexus_detect_changes`** to confirm scope, then verify F-17 / P1-T8 RLS-force release gate.
5. Optional metadata→column folds (§2.1/§2.3 commented `update`s) at promotion time.

> Until step 1 runs, the export's P2/P3 read-side improvements proceed against the **existing** `metadata` JSONB columns (`estimates`/`projects`/`estimate_row_items`), which are live in production and already read by the route (`route.ts:100`).
