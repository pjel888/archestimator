# Project Groups — Implementation Plan Overview & Contracts Spine

Part 7 of the Project Groups implementation plan pack — the **contracts spine** that the four build-phase plans (Parts 7a–7d) bind to.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a per-user "Project Groups" organization layer to `/workshop/projects` — named, ordered, color-accented buckets rendered through the existing horizontal-flag treatment — as a third "Organize by" mode (None / Date / Group), without breaking the date-flag DOM contract or rippling the shared `WorkshopProjectListItem` type.

**Architecture:** Next.js (App Router, SSR-prop-driven) + Bun + Supabase/Postgres with RLS. Two new per-user tables cloned from `project_favorites`. Server actions mirror `setProjectFavorite` (`assertUuid` → `ensureDefaultWorkspace` → workspace+user-scoped verify → upsert/delete → `revalidatePath`). Repository read is strictly additive in the existing `listCurrentWorkspaceProjects` `Promise.all`. Client uses local `useState` + the `useSyncExternalStore` localStorage machinery (NO TanStack Query for the projects list). One reusable `ProjectGroupSection` renders both date and user grouping.

**Tech Stack:** TypeScript, React 19, Next.js App Router, Supabase JS v2, Postgres 15 RLS, Zustand (NOT used here), TanStack Query (NOT used for this list), Vitest + React Testing Library, `bunx vitest run <path>`, `bun run type-check`.

---

## 0. How to read this pack

This is **Part 7**, the spine. It is **authoritative for every shared name, type, signature, DOM anchor, and storage key.** The four build-phase parts MUST copy these contracts verbatim and MUST NOT redefine or drift any shared shape:

| Part | Title | Owns | Binds to (this doc) |
|---|---|---|---|
| **7a** | DB + Types Foundation | The migration, `types.ts` regen, `gen:types` script | §2 (DB), §3 (TS — `ProjectGroupSummary` lives in repository) |
| **7b** | Server Actions | `src/lib/workshop/group-actions.ts` | §4 (server-action signatures) |
| **7c** | Repository + Page wiring | `listCurrentWorkspaceProjects` additive read, `ProjectGroupSummary` export, `WorkshopProjectListItem` + client `ProjectListItem` `groupId`, `page.tsx` prop | §3 (TS), §4 (read shape) |
| **7d** | Client UI + Tests | `ProjectGroupSection`, `project-grid-layout.ts`, `group-accent.ts`, `organizeBy` control + persistence, kebab/bulk assignment, Manage-groups popover, new test files | §5 (client), §3 (consumed types) |

**This pack supersedes the lane docs (01–06) wherever they conflict; the canonical decision record is `00-synthesis-and-decisions.md`.** Re-verify every code shape against the **live repo** before editing — do not trust line numbers in any lane doc or in this spine; cite **behavior**, not line numbers.

---

## 1. Locked owner decisions & canonical architecture

### 1.1 Locked owner decisions (2026-06-16, binding)

- **Q1 — Default organize mode.** `'date'` when the **current/initial sort field is a grouping sort** — a date field (`updated_at` or `created_at`) **or** `client_name` — else `'none'`. (There is no sort *persistence* in this codebase: `sortField` initializes to `updated_at` in memory, so the default computes `'date'` on first load, exactly preserving today's date-flag behavior; the wording "persisted sort" elsewhere means this in-memory initial field, not a stored preference.) "By date" mode is implemented as "group by the active sort dimension" (see Phase 4 Note 4), so `client_name` MUST map to `'date'`/group too — otherwise a fresh Client sort would drop the client flags the live `projects-page-sort-controls` suite asserts. Group is opt-in.
- **Q2 — Caps.** 50 groups per user / 40-char group names. **SOFT-capped** with a clear at-limit message (enforced in the app/server action layer, NOT a DB check — see §2.5).
- **Q3 — Color accents.** SHIP IN v1. v1 includes `group-accent.ts` (fixed 8-swatch desaturated, explicitly NON-brand-orange palette), accent **selection** UI in the Manage-groups popover, and accent **rendering** in `ProjectGroupSection` (3px left rule + 6px dot, inline-`style` only, `accent_id` token not raw hex, never on text; labels stay `text-secondary` #5D5D5D for AA).
- **Q4 — MVP assignment surfaces.** Card kebab "Move to group" + bulk "Move to group" dock ONLY. NO `ProjectDetailsModal` group field in v1 (fast-follow).

### 1.2 Canonical architecture (one paragraph)

Project Groups is a **per-user, workspace-scoped** organization layer cloned end-to-end from the just-shipped Favorites feature. **Two new tables** (`project_groups` definitions + `project_group_memberships` per-user join, one-to-many: a project is in **at most one** group, enforced by `unique(user_id, project_id)`) replace any `projects.group_id` column so `Tables<"projects">` stays untouched. The page gains an explicit **`organizeBy` dimension** (None / Date / Group) as a peer toolbar `DropdownSelect`, **decoupling grouping from the sort field** (date grouping stops being an implicit side-effect of `isDateSortField`); Sort stays visible in Group mode to order cards *within* a group. The `organizeBy` preference (and any collapsed-group set) persists in `localStorage` via the **exact `useSyncExternalStore` + custom-event + `storage`-event machinery** behind a new key, while group **definitions/membership persist server-side**; the projects list itself stays **SSR-prop-driven (no TanStack Query)**. **One reusable `ProjectGroupSection`** renders both date and user grouping; date mode stays **byte-identical** via legacy-data-attr props. Assignment is via **card kebab + bulk dock** (drag deferred), with optimistic override-maps that — unlike favorites — **clear once SSR is authoritative for that id**, driven by a `useTransition`+`useEffect` pattern because `router.refresh()` is non-awaitable (the override encodes *which* group, not a boolean; see §5.5). v1 is **Your Projects only**; a virtual always-trailing **"Ungrouped"** bucket holds everything ungrouped (and defensively catches any dangling `groupId`).

---

## 2. DB contract (Part 7a owns the migration)

Clone `supabase/migrations/20260526013617_workshop_favorites.sql`. Reuse the existing `projects_id_workspace_id_unique` composite-unique constraint (already added by the favorites migration; the new migration MUST NOT re-add it — it already exists, so the composite FK target is available). Pick a timestamp **strictly greater than `20260616120000`** and any concurrent `20260616*` file present at implementation time (re-`ls supabase/migrations | tail` before naming; suggested `20260617090000_project_groups.sql` if no later file exists).

### 2.1 Table: `public.project_groups` (definitions)

| Column | Type | Constraints |
|---|---|---|
| `id` | `uuid` | `primary key default gen_random_uuid()` |
| `workspace_id` | `uuid` | `not null references public.workspaces(id) on delete cascade` |
| `user_id` | `uuid` | `not null references auth.users(id) on delete cascade` |
| `name` | `text` | `not null` |
| `accent_id` | `text` | `null` (null ⇒ default neutral swatch; stores a **token**, never raw hex) |
| `position` | `integer` | `not null default 0` |
| `created_at` | `timestamptz` | `not null default now()` |
| `updated_at` | `timestamptz` | `not null default now()` |

Constraints / indexes:

```sql
-- Case-insensitive unique group name per user per workspace (prevents ambiguous duplicate flags).
constraint project_groups_unique_user_workspace_name unique (user_id, workspace_id, lower(name))
```

> NOTE: a column-list `unique(...)` cannot contain `lower(name)`; ship the case-insensitive uniqueness as a **unique index** (functional index), not a table constraint:
> ```sql
> create unique index if not exists project_groups_user_workspace_lower_name_idx
>   on public.project_groups (user_id, workspace_id, lower(name));
> ```

```sql
create index if not exists project_groups_workspace_user_position_idx
  on public.project_groups (workspace_id, user_id, position, created_at);
```

### 2.2 Table: `public.project_group_memberships` (per-user join — one-to-many)

| Column | Type | Constraints |
|---|---|---|
| `id` | `uuid` | `primary key default gen_random_uuid()` |
| `group_id` | `uuid` | `not null references public.project_groups(id) on delete cascade` |
| `workspace_id` | `uuid` | `not null references public.workspaces(id) on delete cascade` |
| `user_id` | `uuid` | `not null references auth.users(id) on delete cascade` |
| `project_id` | `uuid` | `not null` |
| `created_at` | `timestamptz` | `not null default now()` |

Composite FK + uniqueness (one-to-many = at most one group per project per user):

```sql
constraint project_group_memberships_project_workspace_fkey
  foreign key (project_id, workspace_id)
  references public.projects(id, workspace_id)
  on delete cascade,
constraint project_group_memberships_unique_user_project unique (user_id, project_id)
```

Indexes:

```sql
create index if not exists project_group_memberships_workspace_user_idx
  on public.project_group_memberships (workspace_id, user_id);
create index if not exists project_group_memberships_group_id_idx
  on public.project_group_memberships (group_id);
create index if not exists project_group_memberships_project_id_idx
  on public.project_group_memberships (project_id);
```

> `ON DELETE CASCADE` on `group_id` is what implements **D10**: deleting a group cascades its membership rows away; projects fall to virtual "Ungrouped". `ON DELETE CASCADE` on the composite project FK keeps bulk project delete cascade-safe with **zero RPC edits** (mirrors favorites). The `workspace_id → public.workspaces(id) on delete cascade` FK (on **both** tables, §2.1/§2.2) cleans up group definitions and memberships if a workspace is deleted (closes the orphan-on-workspace-delete finding).

### 2.3 RLS (per-user initplan, cloned from favorites + a membership IDOR backstop)

```sql
alter table public.project_groups enable row level security;
alter table public.project_group_memberships enable row level security;

drop policy if exists "users can manage own project groups" on public.project_groups;
drop policy if exists "platform admins can manage all project groups" on public.project_groups;
drop policy if exists "users can manage own project group memberships" on public.project_group_memberships;
drop policy if exists "platform admins can manage all project group memberships" on public.project_group_memberships;

create policy "users can manage own project groups" on public.project_groups
  for all to authenticated
  using (user_id = (select auth.uid()) and public.is_workspace_member(workspace_id))
  with check (user_id = (select auth.uid()) and public.is_workspace_member(workspace_id));

create policy "platform admins can manage all project groups" on public.project_groups
  for all to authenticated
  using (public.is_platform_admin())
  with check (public.is_platform_admin());

create policy "users can manage own project group memberships" on public.project_group_memberships
  for all to authenticated
  using (user_id = (select auth.uid()) and public.is_workspace_member(workspace_id))
  with check (
    user_id = (select auth.uid())
    and public.is_workspace_member(workspace_id)
    -- IDOR backstop: the referenced group must belong to THIS user. The FK alone
    -- only proves the group exists; without this a direct API caller could insert
    -- a membership pointing at another user's group_id.
    and exists (
      select 1 from public.project_groups g
      where g.id = group_id and g.user_id = (select auth.uid())
    )
  );

create policy "platform admins can manage all project group memberships" on public.project_group_memberships
  for all to authenticated
  using (public.is_platform_admin())
  with check (public.is_platform_admin());
```

> Re-verify the live `project_favorites` policy packaging at implementation time (an active `command_split_*`/`consolidate_*` convention may have shifted the FOR-ALL split). Predicates are stable; only packaging may change. Match whatever shape `project_favorites` currently ships.

> **Canonical IDOR guard (binding):** the membership `with check` `exists(...)` subquery above **is in the migration** and is the authoritative cross-user-group IDOR guard. Defense is two-layer — this RLS `exists()` backstop **plus** the action-layer ownership gate (§4.6/§4.7) — not "RLS doesn't enforce." Any doc claiming the IDOR is merely noted/accepted at the action layer is superseded by this.

### 2.4 Grants — **includes `UPDATE`** (the favorites divergence)

Favorites grant only `select, insert, delete`. Groups need `UPDATE` for **rename / recolor / reorder**:

```sql
revoke all on public.project_groups from public;
revoke all on public.project_groups from anon;
revoke all on public.project_groups from authenticated;
revoke all on public.project_group_memberships from public;
revoke all on public.project_group_memberships from anon;
revoke all on public.project_group_memberships from authenticated;

grant select, insert, update, delete on public.project_groups to authenticated;
grant select, insert, delete on public.project_group_memberships to authenticated;
```

> Memberships do NOT need `UPDATE` — a "move to a different group" is an `upsert` on `(user_id, project_id)` (insert-or-replace `group_id`), and "remove" is a `delete`. Only the group definitions table is rename/recolor/reorder-mutable.

### 2.5 Caps (Q2) — enforced in the **app/server action layer**, NOT the DB

- **50 groups/user/workspace:** `createProjectGroup` counts existing rows for `(user_id, workspace_id)`; if `>= 50`, it throws a typed cap error (see §4). NO DB check constraint.
- **40-char names:** `createProjectGroup` / `renameProjectGroup` trim then reject names `> 40` chars (and empty after trim). NO DB length constraint.
- Soft-capped = a clear at-limit message surfaced in the Manage-groups popover; the page does not crash and existing groups remain editable.

### 2.6 Post-apply checklist (Part 7a)

- [ ] Apply migration to Supabase project `ebxxqidacheyapmmzavr`.
- [ ] Run `get_advisors` (lint) — expect advisor baseline unchanged (no new ERROR; WARN count stable). No new `SECURITY DEFINER` function is introduced.
- [ ] Regenerate `src/lib/supabase/types.ts` AFTER all pending `20260616*` migrations are applied (single regen).
- [ ] Add a `gen:types` npm script (see §4.6) and commit `types.ts` alongside the migration.
- [ ] Confirm `Tables<"project_groups">` and `Tables<"project_group_memberships">` appear in generated `types.ts`.

---

## 3. TypeScript contract

### 3.1 `ProjectGroupSummary` — exported from `workspace-repository.ts` (Part 7c owns this)

This is the **single source of truth** for the group shape. The client imports it; it is NOT redefined client-side (the drift anti-pattern called out in `00`-§3).

```ts
// src/lib/repositories/workspace-repository.ts
export type ProjectGroupSummary = {
  id: string;
  name: string;
  accentId: string | null;
  position: number;
};
```

> Field names are **camelCase** (client-facing), mapped from snake_case rows in the repository read. `accentId` maps from `accent_id`. `position` carries the manual order. Do NOT add `workspaceId`/`userId`/timestamps to the summary — they are not needed client-side and adding them widens the contract.

### 3.2 Additive `groupId` field on the shared list-item types (Part 7c owns, ONE diff)

Both the repository's internal `WorkshopProjectListItem` and the client's exported `ProjectListItem` gain a single **additive, optional** field. This is the only edit to the shared type, and Part 7c is its sole owner (per `00`-§3 + §6 — the sidebar-favorites lane also extends this type; Groups lands its additive field in one tight diff).

```ts
// src/lib/repositories/workspace-repository.ts — WorkshopProjectListItem (internal type)
//   add this field; do NOT reorder or rename any existing key:
  groupId: string | null;

// src/components/workshop/projects-page-client.tsx — exported ProjectListItem
//   add this field (optional, mirroring the other optionals there):
  groupId?: string | null;
```

> Repository sets `groupId: <id> | null` on every item (stamped in `createProjectListItem`). The client type keeps it optional to stay backward-compatible with `normalizeProjectListItem`'s synthesized items (which default it to `null`).

### 3.3 `organizeBy` union (Part 7d owns the declaration; lives in `projects-page-client.tsx`)

```ts
type ProjectOrganizeBy = "none" | "date" | "group";
```

### 3.4 Accent token type (Part 7d owns; lives in `group-accent.ts`)

```ts
// src/lib/workshop/group-accent.ts
export type GroupAccentId =
  | "slate" | "stone" | "sage" | "teal"
  | "indigo" | "plum" | "rose" | "clay";

export type GroupAccentSwatch = {
  // The 8 selectable accents, PLUS the non-selectable "neutral" default (DEFAULT_GROUP_ACCENT).
  // Only the 8 GroupAccentId tokens are ever persisted to accent_id; "neutral" is render-only.
  id: GroupAccentId | "neutral";
  label: string;
  ruleColor: string; // hex, inline-style only
  dotColor: string;  // hex, inline-style only
};
```

> `accent_id` in the DB stores a `GroupAccentId` string (or `null`) — **never** `"neutral"`. The 8 ids are stable tokens; the hex behind them can be re-tuned for AA/brand without a data migration. The `"neutral"` id belongs only to `DEFAULT_GROUP_ACCENT` (the null/unknown fallback), distinct from the `slate` swatch. See §5.4 for the full palette + resolver.

---

## 4. Server-action contract (Part 7b owns `src/lib/workshop/group-actions.ts`)

All actions live in a **new file** `src/lib/workshop/group-actions.ts` (NOT appended to the churning `actions.ts`) with `"use server";` at the top. Each clones the `setProjectFavorite` skeleton: `assertUuid` (reuse the local helper pattern — define `assertUuid` in this file, identical to `actions.ts`) → `ensureDefaultWorkspace()` returning `{ workspace, profile }` → workspace+user-scoped verify against `projects` → upsert/update/delete → `revalidatePath("/workshop")` + `revalidatePath("/workshop/projects")`.

Shared types in this file:

```ts
export class ProjectGroupCapError extends Error {} // thrown when the 50-group cap is hit
export class ProjectGroupNameError extends Error {} // thrown on empty/>40-char/duplicate name

const MAX_PROJECT_GROUPS = 50;
const MAX_PROJECT_GROUP_NAME_LENGTH = 40;
```

### 4.1 `createProjectGroup`

```ts
export async function createProjectGroup(input: {
  name: string;
  accentId?: GroupAccentId | null;
}): Promise<{ id: string }>;
```

- Trim `name`; reject empty or `> 40` chars (`ProjectGroupNameError`).
- Count `(user_id, workspace_id)` group rows; reject if `>= 50` (`ProjectGroupCapError`).
- `position` = `max(existing position) + 1` (append to end).
- Insert, return new `{ id }`. Duplicate name (case-insensitive unique index violation) surfaces as `ProjectGroupNameError`.
- `revalidatePath("/workshop"); revalidatePath("/workshop/projects")`.

### 4.2 `renameProjectGroup`

```ts
export async function renameProjectGroup(input: {
  groupId: string;
  name: string;
}): Promise<void>;
```

- `assertUuid(groupId)`; trim + length-validate `name`; verify the group belongs to `(user_id, workspace_id)`; `update name, updated_at`. Duplicate → `ProjectGroupNameError`.

### 4.3 `recolorProjectGroup`

```ts
export async function recolorProjectGroup(input: {
  groupId: string;
  accentId: GroupAccentId | null;
}): Promise<void>;
```

- `assertUuid(groupId)`; verify ownership; `update accent_id, updated_at`. `null` clears to the default neutral swatch.

### 4.4 `deleteProjectGroup`

```ts
export async function deleteProjectGroup(input: {
  groupId: string;
}): Promise<void>;
```

- `assertUuid(groupId)`; verify ownership; `delete` the group row. Membership rows cascade (D10) — projects fall to virtual Ungrouped. NEVER deletes projects.

### 4.5 `reorderProjectGroups`

```ts
export async function reorderProjectGroups(input: {
  orderedGroupIds: string[];
}): Promise<void>;
```

- Validate each id is a uuid; verify all belong to `(user_id, workspace_id)`; `update position` to the array index for each (one update per id, or a single batched upsert keyed by `id`). Ignored ids (not owned) are skipped.

### 4.6 `moveProjectToGroup` (single assignment — incl. remove)

```ts
export async function moveProjectToGroup(input: {
  projectId: string;
  groupId: string | null; // null === move to Ungrouped (delete membership)
}): Promise<void>;
```

- `assertUuid(projectId)`; verify the project is owned + in-workspace (the **D9 assign gate**: any owned in-workspace project, independent of delete eligibility — do NOT reuse `canSelectProjectForDeletion`).
- **Ownership predicate (binding — matches the repository `owned` derivation, NOT bare `created_by`):** the project counts as owned-by-this-user under the *same* definition `workspace-repository.ts` uses to populate "Your Projects": `workspace_id === workspace.id && (Boolean(workspaceRole) || created_by === profile.id)`. `created_by` is **nullable** (`ON DELETE SET NULL`), so the gate MUST treat `created_by IS NULL` correctly — a workspace-role-owned project with `created_by` null is still assignable; it MUST NOT gate on `.eq("created_by", profile.id)` alone (that wrongly rejects role-owned and null-`created_by` projects). The Phase-2 owner reads the live `workspace-repository.ts` (~the `owned` derivation) to copy the exact predicate, and adds negative tests for (a) an owned-via-workspace-role project and (b) an owned project with `created_by IS NULL` — both must be assignable.
- If `groupId === null`: `delete` the membership row for `(user_id, project_id)`.
- Else: `assertUuid(groupId)`, verify the group is owned (belongs to `(user_id, workspace_id)`), then `upsert` `{ group_id, workspace_id, user_id, project_id }` `onConflict: "user_id,project_id"` (one-to-many: replaces any prior group).
- `revalidatePath("/workshop"); revalidatePath("/workshop/projects")`.

> `setProjectGroupMembership` is an alias intent fully covered by `moveProjectToGroup`; ship ONE action named `moveProjectToGroup`. Do not ship both.

### 4.7 `bulkAssignProjectsToGroup`

```ts
export async function bulkAssignProjectsToGroup(input: {
  projectIds: string[];
  groupId: string | null; // null === move all to Ungrouped
}): Promise<{ movedProjectIds: string[]; skippedProjectIds: string[] }>;
```

- Validate ids (reuse the bulk-id normalize pattern, `max: 50`); verify each is owned + in-workspace under the **LD-2 ownership predicate** (the *same* repository `owned` derivation used in §4.6: `workspace_id === workspace.id && (Boolean(workspaceRole) || created_by === profile.id)`, handling nullable `created_by` — never bare `.eq("created_by", profile.id)`). If `groupId === null` delete memberships for the verified projects, else upsert one membership per verified project (`onConflict: "user_id,project_id"`). The server applies all verified ids then revalidates once.
- **Typed result (binding):** return `{ movedProjectIds, skippedProjectIds }` — `movedProjectIds` are the ids that verified and were applied; `skippedProjectIds` are ids that failed the ownership/workspace verify (do NOT silently drop them). This lets the client keep optimistic state for moved ids, roll back skipped ids, and toast a partial-failure message (§5.5). Atomic optimistic apply/rollback per id is the client's job (§5.5).
- **D9 selection source (binding):** the bulk "Move to group" affordance reads an **assignment-specific** selection (Phase 4's `canAssignProjectToGroup`-gated set), NOT the delete-gated `selectedVisibleProjectIds` — so an owned project blocked from delete by an active shared link is still bulk-groupable (see §5.5 and Phase 4; LD-5).
- `revalidatePath("/workshop"); revalidatePath("/workshop/projects")`.

### 4.8 `gen:types` npm script (Part 7a adds to `package.json`)

```json
"gen:types": "supabase gen types typescript --project-id ebxxqidacheyapmmzavr --schema public > src/lib/supabase/types.ts"
```

---

## 5. Client contract (Part 7d owns the UI files)

### 5.1 `organizeBy` values + default rule (Q1) + storage

```ts
type ProjectOrganizeBy = "none" | "date" | "group";

// New storage key — clone the EXACT useSyncExternalStore + custom-event + storage-event
// machinery already behind PROJECT_VIEW_MODE_STORAGE_KEY (read/write/subscribe/serverSnapshot).
const PROJECT_ORGANIZE_BY_STORAGE_KEY = "archestimator_projects_organize_by_v1";
const PROJECT_ORGANIZE_BY_CHANGE_EVENT = "archestimator:projects-organize-by-change";
```

**Q1 default rule.** When NO valid stored value exists, the server snapshot / initial read returns `'date'` if the current/initial sort field is a **grouping** sort — a date field (`updated_at` or `created_at`) **or** `client_name` — else `'none'`. (There is no sort persistence in this repo; `sortField` initializes to `updated_at`, so the default computes `'date'` on first load — zero first-load change.) `client_name` maps to `'date'` because "By date" mode is "group by the active sort dimension" (Phase 4 Note 4); if it mapped to `'none'`, a fresh Client sort would render no flags and the live sort-controls suite's client-flag assertion would fail. Once the user picks an `organizeBy` explicitly, the stored value wins.

> **Decoupling (D4):** date grouping MUST stop being an implicit side-effect of `isDateSortField`. Today `shouldGroupProjects = (isDateSortField(sortField) || sortField === "client_name")`. After this change, grouping is driven by `organizeBy`:
> - `organizeBy === "none"` → flat list (current `client_name`/non-date behavior path).
> - `organizeBy === "date"` → render through `ProjectGroupSection` with the date buckets (preserving `getProjectDateGroup`/`groupProjects`/`compareProjectsByDateOnly` and the legacy DOM, §5.6).
> - `organizeBy === "group"` → render through `ProjectGroupSection` with user-group buckets (§5.3) + always-trailing Ungrouped.
> Sort stays visible and active in all three modes (orders cards within a group in Group/Date mode).

### 5.2 `ProjectGroupSection` prop interface (Part 7d owns; new file `src/components/workshop/ProjectGroupSection.tsx`)

ONE component renders both date and user grouping. `legacyHeaderDataAttr` keeps date mode byte-identical.

```ts
export type ProjectGroupSectionGroup = {
  key: string;            // stable section key (date: `${field}:${label}`; group: groupId; ungrouped: "__ungrouped__")
  label: string;
  accentId?: string | null; // user-group only; date/ungrouped pass undefined
  isVirtual?: boolean;    // true for the Ungrouped bucket (no rename/recolor/reorder/delete)
};

export type ProjectGroupSectionProps = {
  mode: "date" | "client" | "group";
  group: ProjectGroupSectionGroup;
  items: ProjectListItem[];
  viewMode: ProjectCardViewMode;
  renderCard: (item: ProjectListItem) => React.ReactNode;
  layoutClassName: string;        // = getProjectGridClassName(viewMode) from project-grid-layout.ts
  flagLayoutClassName: string;    // = getProjectDateFlagLayoutClassName(viewMode)
  collapsed?: boolean;
  onToggleCollapse?: (key: string) => void;
  /**
   * Verbatim legacy attribute carried on the label container so the date suites stay green.
   * Date mode passes "data-project-date-group-label"; client mode passes undefined; group mode undefined.
   */
  legacyHeaderDataAttr?: "data-project-date-group-label";
  /**
   * Verbatim legacy attribute carried on the OUTER section. Date mode passes
   * { "data-project-date-group": group.key }; client mode { "data-project-client-group": group.key }.
   */
  legacySectionDataAttr?: Record<string, string>;
  /** Group-mode-only: the per-group header menu (rename / recolor / delete / move-out). Renders nothing in date/client mode. */
  headerMenuSlot?: React.ReactNode;
};
```

> The component MUST emit, on the outer `<section>`: `aria-label={group.label}`, `className="space-y-2"`, `data-project-group={group.key}`, `data-project-group-kind={mode === "client" ? "client" : mode}` AND spread `legacySectionDataAttr`. On the label `<h3>`: `data-project-group-label` AND, when present, the `legacyHeaderDataAttr` (`data-project-date-group-label=""`). These reproduce the live block exactly (§5.6).

### 5.3 `groupProjectsByUserGroup` — the group-mode bucketing util (Part 7d; in `projects-page-client.tsx` or a colocated helper)

```ts
// Returns the SAME section shape groupProjects already returns, plus accentId + isVirtual carried on the group.
// Iterates the SERVER group list (so empty named groups render when not searching), buckets each item by
// its groupId, routes unknown/dangling groupIds to Ungrouped (D12 defensive), pins Ungrouped LAST,
// hides Ungrouped when empty, and during active search hides any group (incl. Ungrouped) with zero matches.
function groupProjectsByUserGroup(
  items: ProjectListItem[],
  groups: ProjectGroupSummary[],
  options: { isSearching: boolean },
): Array<{
  key: string;
  label: string;
  accentId: string | null;
  isVirtual: boolean;
  kind: "group";
  items: ProjectListItem[];
}>;
```

- Ungrouped key is the constant `"__ungrouped__"`, label `"Ungrouped"`, `isVirtual: true`, `accentId: null`.
- Named-group order follows `position` (then `created_at` tiebreak via the server's order); Ungrouped is appended after.

### 5.4 `group-accent.ts` API (Part 7d owns; new file `src/lib/workshop/group-accent.ts`)

Mirror the `bucket-color.ts` containment discipline: a fixed palette applied **inline-`style` only**, never Tailwind utility classes, never on text. Desaturated, explicitly **non-brand-orange** (brand orange is reserved for the "Add projects" CTA — see the `orange-50/orange-700` usage on that button).

```ts
export type GroupAccentId =
  | "slate" | "stone" | "sage" | "teal"
  | "indigo" | "plum" | "rose" | "clay";

export type GroupAccentSwatch = {
  // The 8 selectable accents PLUS the non-selectable "neutral" default. Only the 8
  // GroupAccentId tokens are persisted to accent_id; "neutral" is the render-only fallback.
  id: GroupAccentId | "neutral";
  label: string;
  ruleColor: string; // 3px left rule
  dotColor: string;  // 6px dot
};

/** Fixed 8-swatch desaturated, explicitly non-brand-orange palette. The ONLY source of group color. */
export const GROUP_ACCENT_SWATCHES: readonly GroupAccentSwatch[] = [
  { id: "slate",  label: "Slate",  ruleColor: "#6B7785", dotColor: "#5A6573" },
  { id: "stone",  label: "Stone",  ruleColor: "#8A8279", dotColor: "#756E66" },
  { id: "sage",   label: "Sage",   ruleColor: "#6E8267", dotColor: "#5C6E56" },
  { id: "teal",   label: "Teal",   ruleColor: "#4E8A86", dotColor: "#3F7470" },
  { id: "indigo", label: "Indigo", ruleColor: "#6471A6", dotColor: "#515D90" },
  { id: "plum",   label: "Plum",   ruleColor: "#8A6B8C", dotColor: "#74577A" },
  { id: "rose",   label: "Rose",   ruleColor: "#B07089", dotColor: "#9A5E78" },
  { id: "clay",   label: "Clay",   ruleColor: "#9C7A66", dotColor: "#87664F" },
] as const;

/**
 * Neutral default when accentId is null/unknown. id is "neutral" — distinct from the
 * `slate` swatch (per the FIX@IMPL DRY fix); it is NOT a selectable GroupAccentId and is
 * not a member of GROUP_ACCENT_SWATCHES.
 */
export const DEFAULT_GROUP_ACCENT: GroupAccentSwatch = {
  id: "neutral", label: "Neutral", ruleColor: "#C7CAD1", dotColor: "#9AA0A6",
};

/** Resolve an accent token (or null/unknown) to its colors. Pure; falls back to DEFAULT_GROUP_ACCENT. */
export function resolveAccent(accentId: string | null | undefined): {
  ruleColor: string;
  dotColor: string;
};

/** True when a color belongs to the accent palette (lint/review guard, mirrors isCvdSafeBucketColor). */
export function isGroupAccentColor(color: string): boolean;
```

Palette constraints (binding):
- All 8 hues desaturated (muted), none reading as brand orange (`rgb(170,65,42)` / `#AA412A`) or the chart vermillion/orange. The locked hexes above are explicitly distinct from brand orange.
- Applied ONLY as inline `style={{ borderLeftColor: ruleColor }}` (3px left rule) and `style={{ backgroundColor: dotColor }}` (6px dot) inside `ProjectGroupSection` group-mode headers.
- Never applied to text; group labels stay `text-secondary` (#5D5D5D) for AA regardless of accent.
- No Tailwind color utilities for accents; `group-accent.ts` is the single source.

### 5.5 Optimistic assignment (D14 — clear-once-SSR-authoritative divergence from favorites)

```ts
// Mirrors favoriteOverrides but the value is the groupId (or null), NOT a boolean.
const [groupOverrides, setGroupOverrides] = useState<Record<string, string | null>>({});
// router.refresh() returns void (NOT a thenable) — track RSC-refresh completion via a transition,
// the same machinery favorites actually uses. isPending goes false once the refresh settles.
const [isGroupRefreshPending, startGroupRefresh] = useTransition();
```

- Effective group for a project = `groupOverrides[id]` if the key is present, else `item.groupId ?? null`.
- On `moveProjectToGroup`/`bulkAssignProjectsToGroup`: set override(s) immediately, then **wrap the action call + `router.refresh()` in `startGroupRefresh(...)`** (`startTransition`). **`router.refresh()` is non-awaitable (returns `void`)** — there is NO `.then()` to clear in. Clear the per-project override(s) in a `useEffect` that fires once SSR is authoritative for those ids: when the transition has settled (`isGroupRefreshPending === false`) **and** the incoming SSR `item.groupId` equals the override value for that id (i.e. the SSR prop reflects the move). Whichever exact trigger the Phase-4 owner verifies against live code, the invariant holds: the override is deleted only once SSR is authoritative for that id — never early — so there is no early-clear flicker, and an override (which encodes *which* group) never masks a later legitimate SSR move. On failure: restore the previous override value (or delete the key if there was none) AND fire a failure toast (D-13; `ToastProvider` already in `providers.tsx`). For `bulkAssignProjectsToGroup`, key the clear/rollback off the typed result (§4.7): clear overrides for `movedProjectIds`, roll back `skippedProjectIds`, and toast on any skips.
- Add an interleaving test: a rapid re-assign during a pending refresh must NOT flicker back to stale SSR before the new move lands.
- `selectedProjectIds` is PRESERVED across organize-mode switches (keyed by project id) and CLEARED across access-tab switches (D15).
- **D9 bulk selection (binding):** the bulk "Move to group" affordance reads an assignment-specific selection — `selectableForAssignmentProjectIds = displayLiveProjects.filter(canAssignProjectToGroup).map(p => p.project.id)` and a parallel selected-set — **NOT** the delete-gated `selectedVisibleProjectIds` (which is `canSelectProjectForDeletion`-gated). `canAssignProjectToGroup` uses the LD-2 ownership definition (workspace-role OR `created_by`, handling null). So an owned project blocked from delete by an active shared link stays selectable for and successfully bulk-assignable (add a test for exactly that case).

### 5.6 DOM / test anchors — PRESERVE verbatim (date & client mode)

These are asserted by the live `projects-page-*` suites and MUST survive byte-identical when rendered through `ProjectGroupSection`:

| Anchor | Where | Asserted by |
|---|---|---|
| `aria-label="Live projects"` | outer wall `<section>` | `projects-page-sort-controls.test.tsx` (`getByLabelText("Live projects")`) |
| `data-project-view-mode={viewMode}` | outer wall `<section>` | sort-controls (`toHaveAttribute("data-project-view-mode", ...)`) |
| `data-project-date-group={group.key}` | date section | date-grouping suites |
| `data-project-date-group-label=""` | date label `<h3>` | sort-controls (`querySelectorAll("[data-project-group-label]")` + date-group-label queries) |
| `data-project-group-label` | every group label `<h3>` | sort-controls (label enumeration) |
| `data-project-client-group={group.key}` | client section | client-grouping behavior |
| `data-project-group={group.key}` / `data-project-group-kind` | every group section | grouping behavior |
| combobox `aria-label="View"` (and disabled variant `"View, disabled until this tab has projects"`) | toolbar `DropdownSelect` | sort-controls |
| combobox `aria-label="Sort field"` | toolbar | sort-controls |
| combobox `aria-label="Sort direction"` | toolbar | sort-controls |
| `data-project-toolbar-view-divider=""` | divider span | sort-controls (`nextElementSibling`) |
| tabpanel `aria-label="Projects"` / `"Shared"` | access panels | shared-access suite |

> The header is a flex `<div>` wrapping an `<h3>`; tests query by **attribute**, not tag — keeping `data-project-date-group-label` on the `<h3>` is sufficient. Do NOT rename or drop any of the above.

### 5.7 NEW DOM / test anchors to ADD (group mode + organize control)

| New anchor | Where | Purpose |
|---|---|---|
| combobox `aria-label="Organize by"` (disabled variant on Shared: `aria-label="Organize by, By group unavailable on shared projects"` or equivalent with a tooltip via `DropdownSelect` `disabled` option) | toolbar `DropdownSelect`, peer to View/Sort | the `organizeBy` control (D4, D11) |
| `data-project-group-kind="group"` | user-group sections | distinguishes user groups from date/client |
| `data-project-group="__ungrouped__"` + `aria-label="Ungrouped"` | the virtual trailing section | Ungrouped bucket (D12) |
| `data-project-group-virtual=""` | Ungrouped section | marks the non-editable virtual bucket |
| card kebab item label `"Move to group"` → submenu of group names + "Ungrouped" | `LiveProjectCard` details-action menu (NOT the hover overlay owned by C3) | per-card assignment (D8) |
| bulk dock action `"Move to group"` | a second `BulkActionToolbar`-adjacent affordance OR an extension to the existing dock | bulk assignment (D8, D9 gate) |
| Manage-groups popover trigger (e.g. `aria-label="Manage groups"`) with create/rename/recolor/delete/reorder controls + at-limit message | toolbar or Group-mode header | per-user CRUD (D16) |

New test files (do NOT edit the churning suites): `tests/vitest/projects-page-group-mode.test.tsx` (group rendering, Ungrouped, empty groups, search hiding, dangling-id defense), `tests/vitest/projects-page-organize-control.test.tsx` (organize-by switching, Q1 default, Shared coercion/disable), `tests/vitest/group-accent.test.ts` (`resolveAccent`/palette purity), and optionally `tests/vitest/project-group-actions.test.ts` for the server-action validation (caps/name/ownership).

### 5.8 Shared layout module (Part 7d; new file `src/lib/.../project-grid-layout.ts`)

Move `getProjectGridClassName` and `getProjectDateFlagLayoutClassName` (verbatim, byte-identical class strings — see §5.6 outcomes) into a new shared module so both `projects-page-client.tsx` and `ProjectGroupSection.tsx` import them. Suggested path: `src/components/workshop/project-grid-layout.ts`. Re-export or import in the client; do NOT change the returned class strings (the view-mode suites assert layout behavior indirectly).

---

## 6. Build-phase map

Build Groups ONLY AFTER the three in-flight efforts land (C1 sidebar-favorites, C2 delete-modal-UX, C3 card-links) — they hold uncommitted edits in `projects-page-client.tsx`, `workspace-repository.ts`, `LiveProjectCard.tsx`, `ProjectDetailsModal.tsx`, and several `projects-page-*` tests. Rebase-and-re-read before touching any shared file (see §6.4).

| Phase | Part | Depends on | Produces | Existing tests it must keep green |
|---|---|---|---|---|
| **1** | 7a — DB + Types | C1/C2/C3 landed | migration, regenerated `types.ts`, `gen:types` script, advisor-clean | (DB-only; run `bun run type-check` after regen) |
| **2** | 7b — Server actions | Phase 1 | `src/lib/workshop/group-actions.ts` (§4) | `project-group-actions.test.ts` (new); does not touch UI suites |
| **3** | 7c — Repository + page | Phase 1 (types) | additive `Promise.all` read, `ProjectGroupSummary` export, `groupId` on both list-item types (ONE owned diff), `page.tsx` prop | `projects-page-card-layout.test.tsx`, `projects-page-shared-access.test.tsx`, `main-sidebar-favorites.test.tsx` (additive read must not break existing returns) |
| **4** | 7d — Client UI + tests | Phases 1–3 | `ProjectGroupSection`, `project-grid-layout.ts`, `group-accent.ts`, `organizeBy` control + persistence, kebab/bulk assignment, Manage-groups popover, optimistic override clear via `useTransition`+`useEffect` (§5.5), new test files | ALL `tests/vitest/projects-page-*.test.tsx` (date/client grouping + sort controls + shared access byte-identical), `bulk-destructive-preview-modal.test.tsx` (group delete must NOT touch it) |

**Dependency order is strict: 7a → 7b → 7c → 7d.** 7b and 7c both depend only on 7a's types and can be authored in parallel, but 7d depends on both. Phase 4 is a single focused PR (the generalization + new mode together) so the RTL date anchors are touched exactly once.

### 6.4 Rebase-before-edit checklist (every phase, before touching a shared file)

- [ ] `git fetch && git status` — confirm C1/C2/C3 have merged for the files they own.
- [ ] `git diff <file>` and **re-read the live file** (do not trust line numbers in any lane doc or this spine; cite behavior).
- [ ] Prefer NEW files (`ProjectGroupSection.tsx`, `project-grid-layout.ts`, `group-accent.ts`, `group-actions.ts`, new test files) over editing churning shared files where behavior allows.
- [ ] Repository/type edits land in ONE owned diff (Part 7c) — never reorder/rename existing `WorkshopProjectListItem`/`ProjectListItem` keys; only append `groupId`.
- [ ] After any merge, re-run `bunx vitest run tests/vitest/projects-page-*.test.tsx tests/vitest/bulk-destructive-preview-modal.test.tsx tests/vitest/main-sidebar-favorites.test.tsx` + `bun run type-check`.
- [ ] Commit frequently with conventional messages after each green step.

---

## 7. Open contract risks (flagged for the build-phase authors)

- **Functional-unique-index vs constraint:** the case-insensitive name uniqueness ships as a **unique index** on `(user_id, workspace_id, lower(name))`, not a column-list constraint (Postgres rejects expressions in `unique(...)` table constraints). Part 7b's `createProjectGroup`/`renameProjectGroup` must catch the index-violation error code (`23505`) and translate it to `ProjectGroupNameError`.
- **Caps are app-layer only:** no DB check enforces 50/40 (Q2 soft-cap); a direct DB insert could bypass them. Acceptable for a per-user private layer; document it.
- **`organizeBy` decoupling regression surface:** the date path must stay byte-identical (§5.6) — the single highest-risk refactor. Add Group cases as NEW test files; never edit the churning date suites.
- **`groupId` on the optional client type:** because `ProjectListItem.groupId` is optional, every consumer that constructs a `ProjectListItem` (e.g. `normalizeProjectListItem`) must default it to `null` so the override math (§5.5) is well-defined.
- **Shared-tab coercion (D11):** when switching to the Shared tab, coerce `organizeBy` away from `"group"` (to the Q1 default) and disable the "By group" option with a tooltip; verify the coercion does not clobber a `"date"`/`"none"` preference unnecessarily.
- **Accent palette purity:** add a review/lint guard that `group-accent.ts` is the only source of group color and that no swatch reads as brand orange; `isGroupAccentColor` exists for that check.
- **Migration timestamp race:** re-`ls supabase/migrations | tail` at apply time; pick a timestamp strictly later than the latest `20260616*` file, then regenerate `types.ts` exactly once after ALL pending migrations apply.
