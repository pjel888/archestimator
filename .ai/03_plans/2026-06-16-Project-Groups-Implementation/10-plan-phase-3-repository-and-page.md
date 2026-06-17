# Project Groups — Phase 3 / Part 7c: Repository read + Page wiring

Part 3 of the Project Groups implementation plan pack (Phase 3 = Part 7c in the contracts spine, `07-implementation-plan-overview-and-contracts.md` §6).

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the per-user project-group membership and group definitions flow from Postgres to the projects page **strictly additively** — extend the existing `listCurrentWorkspaceProjects` `Promise.all` with two per-user fetches, stamp a new `groupId` field onto every project list item, export a new camelCase `ProjectGroupSummary` type, and thread a `projectGroups` prop through `page.tsx` to `ProjectsPageClient` — without reordering or renaming a single existing return key, type field, or prop (the read return and `ProjectListItem`/`WorkshopProjectListItem` types have many importers; see §0.3).

**Architecture:** Next.js App Router, SSR-prop-driven projects list (NO TanStack Query). The repository read (`src/lib/repositories/workspace-repository.ts → listCurrentWorkspaceProjects`) is a single `Promise.all` batch followed by per-item assembly in a `createProjectListItem` closure. We add the group fetches **inside that same batch** (no N+1, no new serial round-trip) and a `Map<projectId, groupId>` lookup consumed inside `createProjectListItem`. The route loader (`src/app/workshop/projects/page.tsx`) forwards the new `projectGroups` array as one prop, mirroring `favoriteProjectIds` exactly.

**Tech Stack:** TypeScript, React 19, Next.js App Router, Supabase JS v2, Postgres 15 RLS, Vitest, `bunx vitest run <path>`, `bun run type-check`.

---

## 0. Preflight — READ THIS BEFORE WRITING ANY CODE

### 0.1 Where this part sits in the dependency order

Strict order is **7a → 7b → 7c → 7d** (contracts §6). This is **7c**.

- **Depends on Phase 1 (Part 7a — DB + Types):** the migration must be applied AND `src/lib/supabase/types.ts` regenerated so that `Tables<"project_groups">` and `Tables<"project_group_memberships">` exist. **Do NOT start this part until `bun run type-check` confirms those generated types are present.** Verify with the gate in §0.2.
- **Independent of Phase 2 (Part 7b — server actions):** 7b and 7c are parallelizable after 7a's types land. This part does NOT import from `group-actions.ts`.
- **Blocks Phase 4 (Part 7d — Client UI):** 7d imports `ProjectGroupSummary` and reads `item.groupId`; those names are defined HERE and MUST match the contracts spine §3 verbatim.

### 0.2 Gate — confirm Phase 1 landed (run before Task 1)

- [ ] Run the type presence check:

```bash
bun run type-check 2>/dev/null; grep -c "project_groups: {" src/lib/supabase/types.ts; grep -c "project_group_memberships: {" src/lib/supabase/types.ts
```

  Expected: each `grep -c` prints `1` (or greater). If either prints `0`, **STOP** — Phase 1 (Part 7a) has not landed; this part cannot proceed (the `.from("project_groups")` call would fail type-check). Do not stub the table; wait for 7a.

### 0.3 Why "strictly additive" is non-negotiable here

The repository return object and the two list-item types have many consumers; an additive append is invisible to all of them, a reorder/rename is a breaking ripple:

- **`listCurrentWorkspaceProjects()` return** is destructured by `src/app/workshop/projects/page.tsx` (`{ projects, favoriteProjectIds }`), `src/lib/reusable-sources/actions.ts` (3 call sites, all `{ projects }`), and `src/lib/component-library/actions.ts` (`{ projects }`). They destructure named keys, so **adding** a `projectGroups` key is invisible to every one of them. **Never reorder/rename `projects` or `favoriteProjectIds`.**
- **`WorkshopProjectListItem`** (internal to the repository) is the assembled per-project shape; **`ProjectListItem`** (exported from `projects-page-client.tsx`) is its client mirror. The contracts spine (§3.2) makes Part 7c the **sole owner** of the one additive edit to these types (the sidebar-favorites lane C1 also extends them — coordinate via §0.4). Append `groupId`; never reorder existing keys.

### 0.4 Rebase-before-edit checklist (MANDATORY — run before EVERY task that edits a shared file)

`workspace-repository.ts`, `projects-page-client.tsx`, and `page.tsx` have concurrent in-flight edits (C1 sidebar-favorites, C2 delete-modal-UX, C3 card-links). Do this before each shared-file edit:

- [ ] `git fetch && git status` — confirm C1/C2/C3 have merged for the files this part touches. If `projects-page-client.tsx` or `workspace-repository.ts` still show uncommitted churn from another lane, **stop and rebase first** (this part lands AFTER C1/C2/C3 per contracts §6).
- [ ] `git diff src/lib/repositories/workspace-repository.ts src/components/workshop/projects-page-client.tsx src/app/workshop/projects/page.tsx` — read what changed.
- [ ] **Re-read the LIVE file** before editing. Do NOT trust the line numbers or exact surrounding code in this plan — cite **behavior** ("the `Promise.all` array inside `listCurrentWorkspaceProjects`", "the return object's final key after `projects`", "the `createProjectListItem` closure") and locate it freshly. The anchors named in this plan are behavioral, not positional.
- [ ] Confirm the live `createProjectListItem` closure still spreads `...resolveProjectAccess(project)` and reads from the `favoriteEstimateSheetsByProjectId` map — if its shape changed, adapt the stamp site but keep it additive.
- [ ] After the edit, run the green-bar command in §0.5.
- [ ] Commit immediately on green (conventional message). Small commits; never batch the type edit with the read edit with the page edit — three commits minimum.

### 0.5 Green-bar command (run after each task)

```bash
bunx vitest run tests/vitest/projects-page-card-layout.test.tsx tests/vitest/projects-page-shared-access.test.tsx tests/vitest/main-sidebar-favorites.test.tsx tests/vitest/workshop-favorites-schema.test.ts tests/vitest/workshop-project-groups-repository.test.ts && bun run type-check
```

(The last test file is created in Task 1; before then, drop it from the command.)

### 0.6 Files this part owns / touches

| Action | Path | Note |
|---|---|---|
| **Create** | `tests/vitest/workshop-project-groups-repository.test.ts` | new source-text + shape test (Task 1, 4) |
| **Modify** | `src/lib/repositories/workspace-repository.ts` | additive read + `ProjectGroupSummary` export + `WorkshopProjectListItem.groupId` (Tasks 1–3) |
| **Modify** | `src/components/workshop/projects-page-client.tsx` | additive `ProjectListItem.groupId` ONLY (Task 3) — do NOT add UI here (that is Part 7d) |
| **Modify** | `src/app/workshop/projects/page.tsx` | thread `projectGroups` prop (Task 5) |

> This part does NOT create `ProjectGroupSection`, `group-accent.ts`, `project-grid-layout.ts`, the `organizeBy` control, or any assignment UI — those are **Part 7d**. The `ProjectListItem.groupId` field is added here so 7d can consume it, but 7c adds NO rendering logic to `projects-page-client.tsx`.

---

## Task 1 — Repository test scaffold + `ProjectGroupSummary` export (RED → GREEN)

This part has no runtime unit harness for `listCurrentWorkspaceProjects` (it is mocked everywhere it's consumed; see `tests/vitest/reusable-sources-actions.test.ts` which `vi.fn()`s it). The established pattern for proving the repository's **data-access shape** is the **source-text assertion test** — see `tests/vitest/workshop-favorites-schema.test.ts`, which reads the repository file as a string and asserts it contains the favorites `.from(...)` calls and the `favoriteProjectIds:` return key. We mirror that exactly: it is fast, deterministic, has no Supabase dependency, and pins the additive contract (the no-N+1 single-batch requirement, the additive return key, the new type export) against regression.

**Files:**
- Create: `tests/vitest/workshop-project-groups-repository.test.ts`
- Modify: `src/lib/repositories/workspace-repository.ts` (add the `ProjectGroupSummary` export)

### Step 1.1 — Write the failing test (source-text contract)

- [ ] Create `tests/vitest/workshop-project-groups-repository.test.ts`:

```ts
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";

const repository = readFileSync(
  join(process.cwd(), "src/lib/repositories/workspace-repository.ts"),
  "utf8",
);
const page = readFileSync(
  join(process.cwd(), "src/app/workshop/projects/page.tsx"),
  "utf8",
);
const client = readFileSync(
  join(process.cwd(), "src/components/workshop/projects-page-client.tsx"),
  "utf8",
);

describe("project groups repository wiring (Part 7c, additive)", () => {
  test("exports the camelCase ProjectGroupSummary contract", () => {
    expect(repository).toContain("export type ProjectGroupSummary");
    expect(repository).toContain("accentId: string | null");
    expect(repository).toContain("position: number");
  });

  test("fetches groups and memberships inside the single listCurrentWorkspaceProjects batch (no N+1)", () => {
    const fnStart = repository.indexOf("export async function listCurrentWorkspaceProjects");
    expect(fnStart).toBeGreaterThan(-1);
    const fnEnd = repository.indexOf("\nfunction mergeHomebaseRecords", fnStart);
    const body = repository.slice(fnStart, fnEnd === -1 ? undefined : fnEnd);

    // Both reads exist in this function...
    expect(body).toContain('.from("project_groups")');
    expect(body).toContain('.from("project_group_memberships")');

    // ...and they live in the SAME Promise.all wave as the favorites read, not a
    // new serial await. Anchor: the group reads must appear before the favorites
    // result is destructured (which happens right after the single Promise.all).
    const promiseAllIndex = body.indexOf("await Promise.all([");
    const groupsReadIndex = body.indexOf('.from("project_groups")');
    const membershipsReadIndex = body.indexOf('.from("project_group_memberships")');
    const destructureIndex = body.indexOf("if (projectsResult.error) throw projectsResult.error;");
    expect(promiseAllIndex).toBeGreaterThan(-1);
    expect(groupsReadIndex).toBeGreaterThan(promiseAllIndex);
    expect(membershipsReadIndex).toBeGreaterThan(promiseAllIndex);
    expect(groupsReadIndex).toBeLessThan(destructureIndex);
    expect(membershipsReadIndex).toBeLessThan(destructureIndex);

    // Per-user + per-workspace scoping (mirrors favorites RLS predicate usage).
    expect(body).toContain('.eq("user_id", profile.id)');
  });

  test("returns projectGroups additively alongside the existing keys", () => {
    expect(repository).toContain("projectGroups:");
    // Existing keys MUST remain — additive, never a rename.
    expect(repository).toContain("favoriteProjectIds:");
    expect(repository).toContain("projects: [");
  });

  test("stamps groupId on every project list item", () => {
    expect(repository).toContain("groupId:");
    // The internal list-item type carries the field.
    expect(repository).toContain("groupId: string | null");
  });

  test("resolves groupId to null for shared / non-owned list items (per-user membership scoping)", () => {
    // Memberships are read per-user (.eq("user_id", profile.id)), so the lookup
    // map only ever holds THIS user's group rows. Every stamp site MUST resolve a
    // miss to null — never undefined, never another user's group. Pin both the
    // per-user scoping on the read and the null-default at the stamp site.
    expect(repository).toContain('.from("project_group_memberships")');
    expect(repository).toContain("groupIdByProjectId.get(project.id) ?? null");
    // The synthetic pending-invite item (never in a user group) defaults to null too.
    expect(repository).toContain("groupId: null");
  });

  test("client ProjectListItem and page wiring expose groups additively", () => {
    expect(client).toContain("groupId?: string | null");
    expect(page).toContain("projectGroups");
    expect(page).toContain("favoriteProjectIds"); // existing prop preserved
  });
});
```

- [ ] Run it — expect FAIL (the export, reads, return key, and field do not exist yet):

```bash
bunx vitest run tests/vitest/workshop-project-groups-repository.test.ts
```

  Expected: multiple failing assertions (e.g. `expect(repository).toContain("export type ProjectGroupSummary")` fails). This is RED.

### Step 1.2 — Add the `ProjectGroupSummary` export (minimal, GREEN for the first test only)

The contracts spine §3.1 is the single source of truth — copy it verbatim. Place it next to the other exported repository summary types (behavioral anchor: near `WorkshopProjectSummary` / `ProjectFavoriteEstimateSheetSummary`, in the type-declaration block before the data-access functions).

- [ ] Re-read the live file per §0.4, then add this exported type (camelCase, client-facing, single source of truth — the client imports it, never redefines it):

```ts
export type ProjectGroupSummary = {
  id: string;
  name: string;
  accentId: string | null;
  position: number;
};
```

- [ ] Run the test again — the `ProjectGroupSummary` test now passes; the read/return/field tests still FAIL (RED for the rest, which Tasks 2–3 fix).

```bash
bunx vitest run tests/vitest/workshop-project-groups-repository.test.ts -t "ProjectGroupSummary"
```

  Expected: PASS for the `ProjectGroupSummary` test.

### Step 1.3 — Commit

- [ ] Commit:

```bash
git add tests/vitest/workshop-project-groups-repository.test.ts src/lib/repositories/workspace-repository.ts
git commit -m "test(workshop): pin project-groups repository additive contract + export ProjectGroupSummary

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 2 — Extend the `Promise.all` batch with per-user group + membership reads (GREEN the no-N+1 test)

Add the two reads to the existing single `Promise.all` array inside `listCurrentWorkspaceProjects` so they run in the same wave as the projects/favorites/members reads — **no new serial round-trip, no per-project query**. Build a `Map<projectId, groupId>` and an ordered `ProjectGroupSummary[]` from the results.

**Files:**
- Modify: `src/lib/repositories/workspace-repository.ts`

### Step 2.1 — Re-read live, then add the two reads to the batch

- [ ] Run §0.4 checklist. Locate the `Promise.all([ ... ])` inside `listCurrentWorkspaceProjects` (behavioral anchor: the array whose first element selects `from("projects")` ordered by `updated_at`, and whose second selects `from("project_favorites")`). Append two new entries to that array, **after** the existing `workspace_members` read (append at the end to avoid disturbing the positional destructuring of the existing results):

  The existing destructuring is:

```ts
const [projectsResult, favoritesResult, estimateFavoritesResult, projectMembersResult, sheetMembersResult, workspaceMembershipResult] = await Promise.all([
```

  Replace that destructuring line to add two trailing names (additive — existing names keep their positions):

```ts
const [
  projectsResult,
  favoritesResult,
  estimateFavoritesResult,
  projectMembersResult,
  sheetMembersResult,
  workspaceMembershipResult,
  projectGroupsResult,
  projectGroupMembershipsResult,
] = await Promise.all([
```

- [ ] Append the two new reads as the LAST two entries of the `Promise.all([...])` array (immediately after the `workspace_members` `.maybeSingle()` read, before the closing `])`):

```ts
    supabase
      .from("project_groups")
      .select("id, name, accent_id, position")
      .eq("workspace_id", workspace.id)
      .eq("user_id", profile.id)
      .order("position", { ascending: true })
      .order("created_at", { ascending: true }),
    supabase
      .from("project_group_memberships")
      .select("project_id, group_id")
      .eq("workspace_id", workspace.id)
      .eq("user_id", profile.id),
```

> Per-user + per-workspace scoping mirrors the favorites reads exactly (and is enforced again by RLS). Ordering by `position` then `created_at` matches the contracts spine §3.1/§5.3 (named-group order follows `position`, `created_at` tiebreak). Selecting only the four needed columns keeps the payload minimal; `accent_id` maps to camelCase `accentId` below.

### Step 2.2 — Add error guards (mirror the favorites guard exactly)

- [ ] Immediately after the existing block of `if (...Result.error) throw ...` guards (behavioral anchor: the run of guards ending with `if (workspaceMembershipResult.error) throw workspaceMembershipResult.error;`), add:

```ts
  if (projectGroupsResult.error) throw projectGroupsResult.error;
  if (projectGroupMembershipsResult.error) throw projectGroupMembershipsResult.error;
```

> Groups/memberships are NOT optional collaboration tables — they are a first-class per-user layer cloned from favorites, which also throw unconditionally on error. Do not wrap them in `isMissingOptionalCollaborationTable` (that guard is for the legacy-optional collaboration tables only).

### Step 2.3 — Build the `groupId` lookup map and the ordered summary list

- [ ] After the favorites-derived maps are built (behavioral anchor: after `favoriteEstimateSheetsByProjectId` is finalized and before `resolveProjectAccess` is created, OR anywhere after the guards and before `createProjectListItem` is defined — it only needs `projectGroupsResult.data` / `projectGroupMembershipsResult.data`), add:

```ts
  const projectGroups: ProjectGroupSummary[] = (projectGroupsResult.data ?? []).map((group) => ({
    id: group.id,
    name: group.name,
    accentId: group.accent_id,
    position: group.position,
  }));
  const groupIdByProjectId = new Map<string, string>(
    (projectGroupMembershipsResult.data ?? []).map((membership) => [
      membership.project_id,
      membership.group_id,
    ]),
  );
```

> `projectGroups` is the ordered (`position`, then `created_at`) camelCase list the client renders empty-named groups from. `groupIdByProjectId` is the per-project membership lookup (one-to-many: at most one group per project, enforced by the DB `unique(user_id, project_id)`, so a plain `Map` is correct — no array values).

### Step 2.4 — Run the no-N+1 test (still partially RED until Task 3)

- [ ] Run:

```bash
bunx vitest run tests/vitest/workshop-project-groups-repository.test.ts -t "no N+1"
bun run type-check
```

  Expected: the "no N+1" test PASSES (both reads in the single `Promise.all`, before the destructure). `type-check` passes (the new columns exist in regenerated `types.ts` from Phase 1; `projectGroups` is referenced and well-typed). The "stamps groupId" and "returns projectGroups additively" tests still FAIL — Task 3 finishes them.

### Step 2.5 — Commit

- [ ] Commit:

```bash
git add src/lib/repositories/workspace-repository.ts
git commit -m "feat(workshop): batch per-user project_groups + memberships read into listCurrentWorkspaceProjects

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 3 — Stamp `groupId` on list items + return `projectGroups` (one owned diff for the shared types)

This is the **single owned edit** to the shared list-item types (contracts §3.2): add `groupId` to the internal `WorkshopProjectListItem` and the exported client `ProjectListItem`, stamp it in `createProjectListItem`, and add the `projectGroups` return key. Do all of it in this one task so the shared-type change lands in exactly one diff (coordinate with C1 sidebar-favorites per §0.4 — if C1 already added a field to these types, append `groupId` after it; never reorder).

**Files:**
- Modify: `src/lib/repositories/workspace-repository.ts`
- Modify: `src/components/workshop/projects-page-client.tsx`

### Step 3.1 — Add `groupId` to the internal `WorkshopProjectListItem` type

- [ ] Re-read live per §0.4. Locate the `type WorkshopProjectListItem = { ... }` declaration (behavioral anchor: the internal type whose fields include `project`, `accessKind`, `favoriteEstimateSheets`). Append `groupId` as the LAST field — do NOT reorder existing keys:

```ts
  // Part 7c (Project Groups): which user-group this project belongs to (null = Ungrouped).
  groupId: string | null;
```

> Non-optional on the internal type: the repository stamps it on EVERY item (real value or `null`). This is the contracts-spine §3.2 shape (`groupId: string | null`).

### Step 3.2 — Stamp `groupId` in `createProjectListItem`

- [ ] Locate the `createProjectListItem` closure inside `listCurrentWorkspaceProjects` (behavioral anchor: `function createProjectListItem(project: Tables<"projects">): WorkshopProjectListItem { return { project, ...resolveProjectAccess(project), ... } }`). Add the stamp inside the returned object literal, additive — alongside `favoriteEstimateSheets`:

```ts
      groupId: groupIdByProjectId.get(project.id) ?? null,
```

  The closure becomes (illustrative — match the live keys exactly, just adding `groupId`):

```ts
  function createProjectListItem(project: Tables<"projects">): WorkshopProjectListItem {
    return {
      project,
      ...resolveProjectAccess(project),
      pendingInviteCount: 0,
      publicationSummary: null,
      favoriteEstimateSheets: favoriteEstimateSheetsByProjectId.get(project.id) ?? [],
      groupId: groupIdByProjectId.get(project.id) ?? null,
    };
  }
```

> Pending-invite synthetic items are built by `createPendingInviteProjectListItem` (a separate function), NOT `createProjectListItem`. That builder also constructs a `WorkshopProjectListItem`, so it ALSO needs the field for type-check to pass — see Step 3.3.

> **Shared / non-owned invariant (assert this).** The membership read is scoped `.eq("user_id", profile.id)`, so `groupIdByProjectId` holds **only the current user's** group rows. A project the current user can see but does NOT own (a shared/collaborator project, or a project whose `created_by` is another user) has no membership row in this user's slice, so `groupIdByProjectId.get(project.id)` misses and `?? null` resolves it to `null` (Ungrouped) — it can NEVER inherit another user's group, and is never `undefined`. This is the per-user data-isolation guarantee that pairs with RLS (groups/memberships are a per-user layer cloned from favorites). The Task 1 test pins it (`"resolves groupId to null for shared / non-owned list items"`): the per-user `.eq("user_id", profile.id)` scoping plus the `groupIdByProjectId.get(project.id) ?? null` null-default. Do not widen the membership read to other users to "show" a shared project's group — that would leak another user's organization.

### Step 3.3 — Default `groupId` on the synthetic pending-invite item

- [ ] Locate `createPendingInviteProjectListItem` (behavioral anchor: the function returning a `WorkshopProjectListItem` with `accessKind: "pending-invite"` and `favoriteEstimateSheets: []`). Add `groupId: null` to its returned object (pending invites are never in a user group):

```ts
    favoriteEstimateSheets: [],
    groupId: null,
```

### Step 3.4 — Add `projectGroups` to the return object (additive)

- [ ] Locate the final `return { workspace, projects: [...], favoriteProjectIds: ... }` of `listCurrentWorkspaceProjects` (behavioral anchor: the return whose last key is `favoriteProjectIds`). Add `projectGroups` as a new key AFTER `favoriteProjectIds` — additive, never reorder:

```ts
    favoriteProjectIds: (favoritesResult.data ?? []).map((favorite) => favorite.project_id),
    projectGroups,
```

> `projectGroups` was already built in Step 2.3 as the ordered `ProjectGroupSummary[]`. Adding it as a trailing key is invisible to every existing consumer (they destructure named keys — see §0.3).

### Step 3.5 — Add `groupId` to the exported client `ProjectListItem` (optional)

- [ ] Re-read `src/components/workshop/projects-page-client.tsx` live per §0.4. Locate `export type ProjectListItem = { ... }` (behavioral anchor: the exported type whose fields include `project`, `accessKind`, optional `favoriteEstimateSheets`). Append `groupId` as an OPTIONAL field (mirroring the other optionals there) — do NOT reorder:

```ts
  groupId?: string | null;
```

> **Optional** on the client type (unlike the internal type) so it stays backward-compatible with `normalizeProjectListItem`, which synthesizes a `ProjectListItem` from a bare `Tables<"projects">` and does not set `groupId`. The override math in Part 7d reads `item.groupId ?? null`, so an absent field is well-defined as "Ungrouped". **This is the contracts-spine §3.2 + open-risk-4 requirement: every constructor must default it to null-equivalent.** `normalizeProjectListItem` leaving it `undefined` is acceptable because `?? null` collapses `undefined → null`.

> Do NOT add any rendering, override map, or `organizeBy` logic to `projects-page-client.tsx` in this part. Part 7c only adds the type field so Part 7d can consume it. The page-client diff here is exactly one line.

### Step 3.6 — Run the full repository test + type-check (GREEN)

- [ ] Run:

```bash
bunx vitest run tests/vitest/workshop-project-groups-repository.test.ts && bun run type-check
```

  Expected: ALL tests in the new file PASS (export, no-N+1, additive return, groupId stamp, shared/non-owned-null invariant, client/page wiring — though the page test still fails until Task 5; see note). `type-check` passes.

> The `"client ProjectListItem and page wiring"` test asserts both `client` contains `groupId?: string | null` (now true) AND `page` contains `projectGroups` (still false until Task 5). If you are running task-by-task, this one sub-assertion stays RED until Task 5 — that is expected and acceptable mid-sequence. If you prefer a clean green bar per task, split this test's page assertion into Task 5 (move the `page.toContain("projectGroups")` line there). Either is fine; do not weaken the final contract.

### Step 3.7 — Commit

- [ ] Commit:

```bash
git add src/lib/repositories/workspace-repository.ts src/components/workshop/projects-page-client.tsx
git commit -m "feat(workshop): add additive groupId to project list items + return projectGroups

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 4 — Prove existing consumers are unaffected (regression guard, GREEN)

The additive change must not alter behavior for the projects-page suites, the sidebar-favorites suite, or the favorites-schema source test. We assert this with the existing suites plus one explicit "existing keys preserved" assertion already in Task 1's file.

**Files:**
- (no new files — this task is a verification gate; optionally strengthen the Task 1 test)

### Step 4.1 — Run the full green-bar suite

- [ ] Run §0.5's command (now including the new test file):

```bash
bunx vitest run tests/vitest/projects-page-card-layout.test.tsx tests/vitest/projects-page-shared-access.test.tsx tests/vitest/main-sidebar-favorites.test.tsx tests/vitest/workshop-favorites-schema.test.ts tests/vitest/workshop-project-groups-repository.test.ts && bun run type-check
```

  Expected: ALL PASS. The projects-page card-layout and shared-access suites are byte-identical in behavior (this part adds no DOM, no client logic). `main-sidebar-favorites` is untouched (this part does not edit `listMainSidebarFavoriteProjects`). `workshop-favorites-schema` still passes (no favorites code changed; the additive group reads do not remove the favorites reads/return key it asserts).

### Step 4.2 — Run the downstream-consumer suites (the read-shape importers)

- [ ] The repository read is mocked by `reusable-sources` and `component-library` action tests; confirm the additive return key did not break their mocks (they only stub `{ projects }`):

```bash
bunx vitest run tests/vitest/reusable-sources-actions.test.ts tests/vitest/component-library-actions-revalidation.test.ts tests/vitest/project-source-insert-action.test.ts
```

  Expected: ALL PASS. These mock `listCurrentWorkspaceProjects` and only read `projects` from the result; the new `projectGroups` key is ignored. (If any of these fail, it is unrelated to this part — confirm against `git stash` of this part's diff.)

### Step 4.3 — Note the type-regen dependency (documentation, no code)

- [ ] Confirm in the PR description / commit body that this part is **gated on Part 7a's `types.ts` regeneration** (§0.2). If a reviewer pulls this part WITHOUT 7a's regenerated `types.ts`, `bun run type-check` fails at `.from("project_groups")` (unknown table). State this dependency explicitly in the PR so the merge order is preserved (7a before 7c).

### Step 4.4 — Commit (if any test strengthening was added; otherwise skip)

- [ ] If you added assertions, commit:

```bash
git add tests/vitest/workshop-project-groups-repository.test.ts
git commit -m "test(workshop): assert additive group read leaves existing consumers green

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 5 — Thread `projectGroups` through the route loader to the client (one-line prop)

Mirror `favoriteProjectIds` exactly: destructure `projectGroups` from the read and forward it as a prop. The `ProjectsPageClient` prop type gains an optional `projectGroups` field (declared HERE so 7d can consume it without redefining the shape).

**Files:**
- Modify: `src/app/workshop/projects/page.tsx`
- Modify: `src/components/workshop/projects-page-client.tsx` (add the optional prop to `ProjectsPageClientProps` ONLY — no consumption logic)

### Step 5.1 — Add the optional prop to `ProjectsPageClientProps`

- [ ] Re-read `projects-page-client.tsx` live per §0.4. Locate `type ProjectsPageClientProps = { projects: ...; favoriteProjectIds?: string[]; }` (behavioral anchor: the props type with `favoriteProjectIds?: string[]`). Add the optional `projectGroups` prop, importing the type from the repository (single source of truth — do NOT redefine the shape):

  At the top of the file, add to the existing repository import (behavioral anchor: the `import ... from "@/lib/repositories/workspace-repository"` line, or add a new type import if none exists in this file):

```ts
import type { ProjectGroupSummary } from "@/lib/repositories/workspace-repository";
```

  Then add the prop:

```ts
  projectGroups?: ProjectGroupSummary[];
```

- [ ] Add the destructured default in the `ProjectsPageClient` function signature, mirroring `favoriteProjectIds = EMPTY_FAVORITE_PROJECT_IDS`. Add a module-level empty constant next to `EMPTY_FAVORITE_PROJECT_IDS`:

```ts
const EMPTY_PROJECT_GROUPS: ProjectGroupSummary[] = [];
```

  And in the signature destructure (behavioral anchor: `function ProjectsPageClient({ projects, favoriteProjectIds = EMPTY_FAVORITE_PROJECT_IDS }: ProjectsPageClientProps)`):

```ts
  projectGroups = EMPTY_PROJECT_GROUPS,
```

> The prop is consumed by Part 7d (group-mode rendering). Part 7c only WIRES it through with a safe default so the page compiles and 7d can build on top without re-plumbing. Do NOT add any logic that reads `projectGroups` in this part beyond the default assignment.

### Step 5.2 — Forward the prop from `page.tsx`

- [ ] Re-read `src/app/workshop/projects/page.tsx` live per §0.4. Update the destructure and the JSX prop (behavioral anchor: `const { projects, favoriteProjectIds } = await listCurrentWorkspaceProjects();` and the `<ProjectsPageClient projects={projects} favoriteProjectIds={favoriteProjectIds} />`):

```tsx
  const { projects, favoriteProjectIds, projectGroups } = await listCurrentWorkspaceProjects();

  return (
    <WorkshopPageShell
      title="Projects"
      eyebrow="Workspace"
      showEyebrow={false}
      breadcrumbs={["Projects"]}
      contentClassName=""
    >
      <ProjectsPageClient
        projects={projects}
        favoriteProjectIds={favoriteProjectIds}
        projectGroups={projectGroups}
      />
    </WorkshopPageShell>
  );
```

> One added line to the destructure, one added prop in JSX — exactly mirroring `favoriteProjectIds`. No other change to `page.tsx`.

### Step 5.3 — Run the full suite + type-check (GREEN)

- [ ] Run §0.5's full command:

```bash
bunx vitest run tests/vitest/projects-page-card-layout.test.tsx tests/vitest/projects-page-shared-access.test.tsx tests/vitest/main-sidebar-favorites.test.tsx tests/vitest/workshop-favorites-schema.test.ts tests/vitest/workshop-project-groups-repository.test.ts && bun run type-check
```

  Expected: ALL PASS — including the full `"client ProjectListItem and page wiring"` test (page now contains `projectGroups`). `type-check` clean.

### Step 5.4 — Commit

- [ ] Commit:

```bash
git add src/app/workshop/projects/page.tsx src/components/workshop/projects-page-client.tsx
git commit -m "feat(workshop): thread projectGroups prop from projects route to client

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Done-criteria for Part 7c

- [ ] `bun run type-check` passes with `project_groups` / `project_group_memberships` reads.
- [ ] `bunx vitest run tests/vitest/workshop-project-groups-repository.test.ts` is fully green.
- [ ] `projects-page-card-layout`, `projects-page-shared-access`, `main-sidebar-favorites`, `workshop-favorites-schema` suites all green (regression-clean).
- [ ] `reusable-sources-actions`, `component-library-actions-revalidation`, `project-source-insert-action` suites green (downstream consumers unaffected).
- [ ] `git log --oneline` shows the small additive commits (test scaffold → batch read → groupId+return → page wiring), never a reorder/rename of `projects`/`favoriteProjectIds`/existing `WorkshopProjectListItem`/`ProjectListItem` keys.
- [ ] `ProjectGroupSummary` is exported from `workspace-repository.ts` exactly per contracts §3.1 (camelCase: `id`, `name`, `accentId`, `position`) — Part 7d imports it, never redefines it.
- [ ] `groupId` is non-optional on `WorkshopProjectListItem` (always stamped) and optional on client `ProjectListItem` (defaults to null-equivalent for synthesized items).
- [ ] `groupId` resolves to `null` for shared / non-owned list items (per-user `.eq("user_id", profile.id)` membership scoping + `?? null` default), verified by the `"resolves groupId to null for shared / non-owned list items"` test — no cross-user group leak.
- [ ] NO UI, NO `organizeBy`, NO override map, NO accent code in this part — those are Part 7d.

## Rollback / revert (Part 7c)

Part 7c is **purely additive** (two batched reads, one new exported type, one new field on the list-item types, one threaded prop), so its revert is the cleanest of the four phases: there is **no DB or data change to undo** — reverting the 7c commits restores the prior repository return shape and the page wiring with no migration impact. The canonical, per-phase revert procedure lives in **`15-deploy-rollback-recovery-and-dod.md`** (Phase 3 additive revert); follow it rather than reverting ad hoc, because the revert touches the `workspace-repository.ts` hub.

> **Blast-radius note for the revert.** `workspace-repository.ts` has **29 importers** (`03-blast-radius-impact-analysis.md` §"workspace-repository.ts is a hub"). Reverting must stay as strictly additive-in-reverse as the forward change was: drop ONLY the two appended `Promise.all` entries, their two error guards, the `projectGroups`/`groupIdByProjectId` derivations, the `groupId` stamp, the `projectGroups` return key, and the `ProjectGroupSummary` export/`groupId` type fields — never disturb the existing `projects`/`favoriteProjectIds` keys or the positional destructuring order. Re-run §0.5's green-bar plus the §4.2 downstream-consumer suites after the revert to confirm the 29 importers stay green. `15` §"Phase 3 additive revert" specifies this step list and the DoD gate that closes the revert.

## Hand-off to Part 7d (Client UI)

7d consumes exactly these 7c outputs (do not let 7d redefine them):
- `import type { ProjectGroupSummary } from "@/lib/repositories/workspace-repository"` — the ordered (`position`) group list, source of group labels/accents/empty-named-group rendering.
- `item.groupId ?? null` on each `ProjectListItem` — the per-project membership for `groupProjectsByUserGroup` bucketing (dangling/unknown `groupId` → Ungrouped, contracts §5.3 / D12).
- `projectGroups` prop already on `ProjectsPageClient` (default `EMPTY_PROJECT_GROUPS`) — ready for 7d to read; 7c added the prop but consumes nothing.
