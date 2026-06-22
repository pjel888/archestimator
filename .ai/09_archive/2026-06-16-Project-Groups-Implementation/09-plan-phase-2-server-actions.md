# Project Groups — Plan Phase 2: Server Actions

Part 2 of the Project Groups implementation plan pack (build Phase **7b** in the spine's phase map).

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship one new server-action module, `src/lib/workshop/group-actions.ts` (`"use server"`), exposing the seven mutations the Project Groups UI calls — `createProjectGroup`, `renameProjectGroup`, `recolorProjectGroup`, `deleteProjectGroup`, `reorderProjectGroups`, `moveProjectToGroup`, `bulkAssignProjectsToGroup` — each cloning the proven `setProjectFavorite` skeleton (`assertUuid` → `ensureDefaultWorkspace` → ownership verify against `projects` → upsert/update/delete → `revalidatePath`), plus the app-layer caps (50 groups / 40-char names), the constraint-disambiguated duplicate-**name** translation (a name-index `23505` → `ProjectGroupNameError`, distinct from the membership `unique(user_id, project_id)`), the accent-token allowlist guard, the `reorderProjectGroups` fan-out cap at `MAX_PROJECT_GROUPS`, the `bulkAssignProjectsToGroup` typed partial-failure result `{ movedProjectIds, skippedProjectIds }` (LD-11), and the **D9 assignment permission gate that matches the repository's `owned` derivation** (in-workspace AND (workspace-role member OR `created_by === user`), `created_by` nullable — LD-2) and is deliberately **separate** from `canSelectProjectForDeletion` (LD-5).

**Architecture:** Next.js App Router server actions (`"use server"`) over Supabase/Postgres with per-user RLS. No new HTTP routes, no RPC. Every action is a thin, well-validated wrapper that trusts RLS for the final security boundary but pre-verifies ownership/workspace membership for honest errors (exactly like `setProjectFavorite`). Caps and name rules live in this app layer (Q2 soft-cap; the DB has no check/length constraint — §2.5 of the spine). Optimistic apply/rollback is the **client's** job (Phase 7d / §5.5); the server applies all mutations then `revalidatePath`s once.

**Tech Stack:** TypeScript, Next.js App Router server actions, Supabase JS v2, Postgres 15 RLS, Vitest (`bunx vitest run <path>`), type-check via `bun run type-check`. New test file: `tests/vitest/project-group-actions.test.ts`.

---

## 0. Read-first & binding contract

This plan **binds to §4 of the contracts spine**: [`07-implementation-plan-overview-and-contracts.md`](./07-implementation-plan-overview-and-contracts.md). The canonical decision record is [`00-synthesis-and-decisions.md`](./00-synthesis-and-decisions.md). Where this plan and the spine disagree, **the spine wins** — re-read §4 before editing. Cite **behavior**, never line numbers; re-read every live file at implementation time (concurrency vigilance — §1 below).

**Reference implementations to re-read before writing any code (do not trust the snippets pasted here — re-open the live files):**

| File | What to clone / confirm |
|---|---|
| `src/lib/workshop/actions.ts` (`setProjectFavorite`) | The full skeleton: `"use server"`, local `assertUuid`, `ensureDefaultWorkspace()` → `{ workspace, profile }`, the `projects` verify (`.select("id, workspace_id").eq("id", …).eq("workspace_id", workspace.id).maybeSingle()`), `upsert(..., { onConflict: "user_id,project_id" })`, `delete().eq("user_id", profile.id)`, and the dual `revalidatePath("/workshop")` + `revalidatePath("/workshop/projects")`. **`profile.id` is the `user_id`; `workspace.id` is the `workspace_id`.** |
| `src/lib/repositories/workspace-repository.ts` (`ensureDefaultWorkspace`) | It is `cache()`-wrapped and returns `WorkspaceBootstrap = { workspace: Tables<"workspaces">; profile: Tables<"profiles"> }`. Import it from `@/lib/repositories/workspace-repository`. |
| `src/lib/repositories/workspace-repository.ts` (the `owned` derivation) | The D9 assign gate MUST match the repo's `owned` predicate verbatim — re-read the live `createWorkshopProjectAccessResolver` closure: a project is `"owned"` when `project.workspace_id === workspace.id && (Boolean(workspaceRole) || project.created_by === profileId)`, where `workspaceRole` comes from a `workspace_members` row for `(workspace.id, profile.id)`. **`created_by` is nullable** (`ON DELETE SET NULL`), so a workspace-owner whose `created_by` was nulled is STILL owned via `workspaceRole`. The gate must NOT be a bare `.eq("created_by", profile.id)` — that misses owned-via-workspace-role rows and silently breaks on `created_by IS NULL`. See §3 (LD-2 ownership gate). |
| `src/lib/ids.ts` (`isUuid`) | `isUuid(value: string): boolean`. The local `assertUuid` wraps it. |
| `src/lib/mass-deletion/bulk-action.ts` (`normalizeBulkActionIds`) | Signature `normalizeBulkActionIds(ids: readonly string[], { label: string; max: number }): { ids: string[]; issues: BulkActionIssue[] }`. Reuse it for `bulkAssignProjectsToGroup` id hygiene (dedup, uuid-validate, max:50). |
| `tests/vitest/reusable-sources-actions.test.ts` | The **behavioral** action-test pattern this plan mirrors: `vi.hoisted` mock holders, `vi.mock("@/lib/supabase/server")`, `vi.mock("@/lib/repositories/workspace-repository")`, a chainable Supabase builder stub, and `await import("@/lib/...")` inside each test. |
| `tests/vitest/bulk-action-validation.test.ts` | The `normalizeBulkActionIds` contract (empty/invalid/oversized issue codes) the bulk action depends on. |
| `tests/vitest/library-action-errors.test.ts` | The "never leak raw DB error" discipline (generic user-safe message); our typed errors follow the same spirit. |

**Phase position (spine §6):** strict order `7a → 7b → 7c → 7d`. This is **7b**. It **depends on Phase 1 (7a)** for the regenerated `types.ts` so `supabase.from("project_groups")` / `.from("project_group_memberships")` type-check. It **does not touch any UI suite** and creates exactly one new test file. 7b and 7c are parallelizable after 7a's types land.

---

## 1. Concurrency vigilance (run BEFORE Task 0)

Multiple agents edit this repo concurrently. This phase is low-collision because it ships a **new file** (`src/lib/workshop/group-actions.ts`) and a **new test** (`tests/vitest/project-group-actions.test.ts`), but it still depends on 7a's types and reuses two shared helpers.

- [ ] `git fetch && git status` — confirm **C1 (sidebar-favorites), C2 (delete-modal-UX), C3 (card-links)** have merged, and that **Phase 7a (the `project_groups` migration + regenerated `types.ts`)** has landed. If `types.ts` does not yet contain `project_groups` / `project_group_memberships`, STOP — 7b cannot type-check; finish 7a first.
- [ ] Re-read the live `src/lib/workshop/actions.ts` (the `setProjectFavorite` skeleton may have been reformatted by C2's delete-string edits). Cite its **current** behavior, not the snippet in §0.
- [ ] Confirm the live shape of `normalizeBulkActionIds` (`@/lib/mass-deletion/bulk-action`) and `ensureDefaultWorkspace` (`@/lib/repositories/workspace-repository`) — re-grep, do not trust line numbers.
- [ ] Re-verify the generated row types: `grep -n "project_groups\|project_group_memberships" src/lib/supabase/types.ts` returns the `Row`/`Insert`/`Update` blocks. If absent, 7a is incomplete.
- [ ] This phase appends **no** edits to `actions.ts` and touches **no** `projects-page-*` test — keep it that way.

---

## 2.0 Prerequisite — the shared caps constants module (create FIRST)

Before `group-actions.ts`, create the cap constants in a plain module (no `"use server"`) so BOTH the server action and the Phase-4 `ManageGroupsPopover` import the SAME values. This kills the drift the scope/security review flagged (the popover previously re-declared `MAX_PROJECT_GROUPS`/`MAX_PROJECT_GROUP_NAME_LENGTH` locally; if the server cap changed, the UI guard would mis-fire).

- [ ] Create `src/lib/workshop/group-constants.ts`:

```ts
// Project Groups caps (Q2 soft-cap). SINGLE source of truth, imported by both the
// server action module (group-actions.ts) and the client popover (ManageGroupsPopover.tsx).
// Plain module — NO "use server" — so a client component may import it.
export const MAX_PROJECT_GROUPS = 50;
export const MAX_PROJECT_GROUP_NAME_LENGTH = 40;
export const MAX_BULK_ASSIGN_PROJECTS = 50;
```

> Phase 4's popover imports `MAX_PROJECT_GROUPS` + `MAX_PROJECT_GROUP_NAME_LENGTH` from here and sets the name input's `maxLength={MAX_PROJECT_GROUP_NAME_LENGTH}` (40, not 120) so the UI cannot submit input the server rejects.

## 2. Module shape (the file you are building)

`src/lib/workshop/group-actions.ts` — final exported surface (Tasks 1–9 build it incrementally via TDD):

```ts
"use server";

import { revalidatePath } from "next/cache";

import { isUuid } from "@/lib/ids";
import { normalizeBulkActionIds } from "@/lib/mass-deletion/bulk-action";
import { ensureDefaultWorkspace } from "@/lib/repositories/workspace-repository";
import { createSupabaseServerClient } from "@/lib/supabase/server";
// Single source of truth for the caps — a plain (NON-"use server") constants module
// the client popover (Phase 4) can ALSO import, so the at-limit/length guards never
// drift between server and UI (scope/security review). See §2.0.
import {
  MAX_BULK_ASSIGN_PROJECTS,
  MAX_PROJECT_GROUP_NAME_LENGTH,
  MAX_PROJECT_GROUPS,
} from "@/lib/workshop/group-constants";

// --- typed errors the client rollback layer (§5.5) distinguishes -------------
export class ProjectGroupCapError extends Error {}   // 50-group cap hit
export class ProjectGroupNameError extends Error {}  // empty / >40-char / duplicate name

// --- accent allowlist (mirrors group-accent.ts GroupAccentId; validated here
//     so the action never persists a junk accent_id even though 7d owns the
//     palette file). Duplicated as a literal set on purpose: this module must
//     not import a client/UI module, and the 8 tokens are a stable contract.
const ALLOWED_ACCENT_IDS = new Set<string>([
  "slate", "stone", "sage", "teal", "indigo", "plum", "rose", "clay",
]);

export type GroupAccentIdInput = string | null;

// Public action surface (full signatures in §4 of the spine):
//   createProjectGroup(input): Promise<{ id: string }>
//   renameProjectGroup(input): Promise<void>
//   recolorProjectGroup(input): Promise<void>
//   deleteProjectGroup(input): Promise<void>
//   reorderProjectGroups(input): Promise<void>   // input capped at MAX_PROJECT_GROUPS
//   moveProjectToGroup(input): Promise<void>
//   bulkAssignProjectsToGroup(input): Promise<{ movedProjectIds: string[]; skippedProjectIds: string[] }>  // LD-11

// Result the client (§5.5) branches on to keep optimistic state for moved ids and
// roll back skipped ids (forged/foreign/non-owned ids that failed the LD-2 gate).
export type BulkAssignProjectsToGroupResult = {
  movedProjectIds: string[];
  skippedProjectIds: string[];
};
```

> **Why a duplicated accent set instead of importing `group-accent.ts`?** `group-accent.ts` is a Phase-7d client-side UI module (it carries hex swatches and is consumed by React components). A `"use server"` action module must not depend on a UI module, and importing it would also invert the build order (7b precedes 7d). The 8 accent tokens are a frozen contract in the spine (§3.4); duplicating the **id set** (not the hex) here is the DRY-correct boundary. A test (Task 3) asserts the two lists stay in sync via a source-level check, so drift is caught.

**Postgres error-code translation.** Two distinct unique indexes raise Postgres error `23505`, and they map to **different** user errors, so the translation MUST disambiguate by **constraint name**, not by code alone:

| Constraint / index name | Raised when | Surfaces as |
|---|---|---|
| `project_groups_user_workspace_lower_name_idx` (case-insensitive name index, spine §2.5) | a duplicate group **name** for `(user_id, workspace_id)` | `ProjectGroupNameError` ("A group with this name already exists.") |
| `project_group_memberships` single-membership `unique(user_id, project_id)` (spine §2.2) | a membership-row conflict | NOT a name error — the upsert's `onConflict: "user_id,project_id"` already resolves it; if it ever surfaces raw, rethrow as-is |

Supabase surfaces both as `error.code === "23505"`. The shared helper checks the code AND the offending constraint so a membership conflict is never mistranslated into a "name already exists" message:

```ts
function isUniqueViolation(error: unknown): boolean {
  return Boolean(error) && typeof error === "object" && (error as { code?: string }).code === "23505";
}

// LD-8: a 23505 is a DUPLICATE-NAME error only when it comes from the name index.
// The membership `unique(user_id, project_id)` also raises 23505, but that path is
// resolved by `onConflict` and must NOT be reported as a name collision.
function isDuplicateNameViolation(error: unknown): boolean {
  if (!isUniqueViolation(error)) return false;
  const detail = `${(error as { constraint?: string; message?: string; details?: string }).constraint ?? ""} ${
    (error as { message?: string }).message ?? ""
  } ${(error as { details?: string }).details ?? ""}`.toLowerCase();
  // Match the name index by name; the membership constraint references user_id+project_id.
  return detail.includes("lower_name") || detail.includes("name");
}
```

---

## 1.5 The LD-2 ownership gate (REQUIRED — read before Tasks 6/7)

The D9 assign gate is an **ownership** check that MUST match the repository's `owned` derivation **exactly** — not a bare `.eq("created_by", profile.id)`. The live `src/lib/repositories/workspace-repository.ts` (`createWorkshopProjectAccessResolver`) classifies a project as `"owned"` when:

```ts
project.workspace_id === workspace.id && (Boolean(workspaceRole) || project.created_by === profileId)
```

Two consequences the bare-`created_by` gate gets wrong:

1. **Owned-via-workspace-role.** A user who is a `workspace_members` member of the project's workspace owns every project in it for "Your Projects" purposes, **regardless of `created_by`**. Gating on `created_by` alone would refuse to group such a project — even though the repo lists it as owned and the client offers the affordance.
2. **`created_by IS NULL`.** `created_by` is nullable (`ON DELETE SET NULL` when the creator's profile is deleted). A SQL `.eq("created_by", profile.id)` matches **zero** NULL rows, so a workspace-owned project whose `created_by` was nulled becomes ungroupable. The repo derivation still classifies it owned via `workspaceRole`.

Because ownership depends on a `workspace_members` lookup (not expressible as a single column `.eq`), the action resolves the workspace role **once** and reuses a shared `verifyOwnedProjectIds` helper for both `moveProjectToGroup` and `bulkAssignProjectsToGroup`:

```ts
// Mirrors the repository `owned` derivation (workspace-repository.ts
// createWorkshopProjectAccessResolver): in-workspace AND (member of the workspace
// OR created_by === user). created_by is NULLABLE, so workspace-role ownership is
// the path that keeps a created_by-IS-NULL project assignable. Do NOT collapse this
// to a bare `.eq("created_by", profile.id)` (LD-2) — that misses both cases.
async function resolveWorkspaceRole(
  supabase: SupabaseServerClient,
  workspaceId: string,
  userId: string,
): Promise<boolean> {
  const { data, error } = await supabase
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", workspaceId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return Boolean(data?.role); // membership of the workspace ⇒ owns its projects
}

// Returns the subset of `projectIds` the user OWNS in this workspace, with the
// verified `workspace_id` per row (for FK-safe membership stamping). Reads
// `created_by` and applies the repo predicate in app code so NULL created_by +
// workspace-role ownership are both honored. Reused by move + bulkAssign.
async function verifyOwnedProjectIds(
  supabase: SupabaseServerClient,
  projectIds: readonly string[],
  workspaceId: string,
  userId: string,
): Promise<Array<{ id: string; workspace_id: string }>> {
  if (projectIds.length === 0) return [];
  const hasWorkspaceRole = await resolveWorkspaceRole(supabase, workspaceId, userId);

  const { data, error } = await supabase
    .from("projects")
    .select("id, workspace_id, created_by")
    .in("id", projectIds)
    .eq("workspace_id", workspaceId);
  if (error) throw error;

  return (data ?? [])
    .filter((row) => hasWorkspaceRole || row.created_by === userId)
    .map((row) => ({ id: row.id, workspace_id: row.workspace_id }));
}
```

> **Why a `workspace_members` read instead of `.eq("created_by", …)`?** RLS on `projects` permits READING shared/collaborator rows, so `workspace_id` eq alone is not ownership. But `created_by` eq alone is *too strict* and NULL-fragile. The repo resolves ownership with both `workspaceRole` and `created_by`; copying that predicate keeps the action's gate identical to the "Your Projects = owned" list the client renders (`canAssignProjectToGroup: accessKind === "owned"`). The one extra `workspace_members` read per call mirrors what the repository already does on every page load. (`SupabaseServerClient = Awaited<ReturnType<typeof createSupabaseServerClient>>`.)

---

## Task 0 — Create the test file scaffold + shared Supabase mock

**Files**
- Test (Create): `tests/vitest/project-group-actions.test.ts`

This mirrors `tests/vitest/reusable-sources-actions.test.ts`: a `vi.hoisted` holder for `ensureDefaultWorkspace` and the Supabase client, `vi.mock` for both modules, a **chainable query-builder stub** that records the table + the terminal operation (`upsert`/`update`/`delete`/`insert`/`select`) and resolves to a configured `{ data, error }`, and `await import("@/lib/workshop/group-actions")` inside each test (so the per-test mock state is read).

A Supabase action chain in this module looks like one of:
- verify: `from("projects").select("id, workspace_id").eq("id", …).eq("workspace_id", …).maybeSingle()`
- insert: `from("project_groups").insert({...}).select("id").single()`
- update: `from("project_groups").update({...}).eq("id", …).eq("user_id", …).eq("workspace_id", …)`
- delete: `from("project_groups").delete().eq("id", …).eq("user_id", …)`
- upsert: `from("project_group_memberships").upsert({...}, { onConflict: "user_id,project_id" })`
- count: `from("project_groups").select("id", { count: "exact", head: true }).eq("user_id", …).eq("workspace_id", …)`

The stub must therefore: be chainable for `select/insert/update/delete/upsert/eq/in/order/maybeSingle/single`, be awaitable (`.then`), expose `single`/`maybeSingle` as async, and let each test queue per-table results.

**Step 0.1 — Write the scaffold (no assertions yet; just a smoke test that the module imports).**

```ts
// tests/vitest/project-group-actions.test.ts
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const workspaceMocks = vi.hoisted(() => ({
  ensureDefaultWorkspace: vi.fn(),
}));

const supabaseMocks = vi.hoisted(() => ({
  createSupabaseServerClient: vi.fn(),
}));

const nextCacheMocks = vi.hoisted(() => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/repositories/workspace-repository", () => ({
  ensureDefaultWorkspace: workspaceMocks.ensureDefaultWorkspace,
}));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: supabaseMocks.createSupabaseServerClient,
}));

vi.mock("next/cache", () => ({
  revalidatePath: nextCacheMocks.revalidatePath,
}));

const WORKSPACE_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const USER_ID = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const GROUP_ID = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const GROUP_ID_2 = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
const PROJECT_ID = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";
const PROJECT_ID_2 = "ffffffff-ffff-4fff-8fff-ffffffffffff";

type StubResult = { data: unknown; error: unknown; count?: number | null };

/**
 * One programmable result per `from(table)` access, consumed in queue order so a
 * single action that hits the same table twice (e.g. verify then mutate) can be
 * scripted. A recorded log captures the terminal operation + payload for asserts.
 */
function makeSupabaseStub() {
  const queue: Record<string, StubResult[]> = {};
  const calls: Array<{ table: string; op: string; payload?: unknown; options?: unknown }> = [];

  function nextResult(table: string): StubResult {
    const pending = queue[table];
    if (pending && pending.length > 0) return pending.shift() as StubResult;
    return { data: null, error: null, count: 0 };
  }

  function builderFor(table: string) {
    let result: StubResult = { data: null, error: null, count: 0 };
    let resolved = false;
    const ensure = () => {
      if (!resolved) {
        result = nextResult(table);
        resolved = true;
      }
      return result;
    };
    const builder: Record<string, unknown> = {};
    const chain = () => builder;
    for (const method of ["select", "eq", "in", "order", "limit"]) {
      builder[method] = (..._args: unknown[]) => builder;
    }
    builder.insert = (payload: unknown) => {
      calls.push({ table, op: "insert", payload });
      return builder;
    };
    builder.update = (payload: unknown) => {
      calls.push({ table, op: "update", payload });
      return builder;
    };
    builder.delete = () => {
      calls.push({ table, op: "delete" });
      return builder;
    };
    builder.upsert = (payload: unknown, options?: unknown) => {
      calls.push({ table, op: "upsert", payload, options });
      return builder;
    };
    builder.single = async () => ensure();
    builder.maybeSingle = async () => ensure();
    builder.then = (resolve: (value: StubResult) => unknown) => resolve(ensure());
    void chain;
    return builder;
  }

  return {
    client: { from: (table: string) => builderFor(table) },
    queueResult(table: string, result: StubResult) {
      (queue[table] ??= []).push(result);
    },
    calls,
  };
}

beforeEach(() => {
  workspaceMocks.ensureDefaultWorkspace.mockResolvedValue({
    workspace: { id: WORKSPACE_ID },
    profile: { id: USER_ID },
  });
  supabaseMocks.createSupabaseServerClient.mockReset();
  nextCacheMocks.revalidatePath.mockReset();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("project group actions module", () => {
  it("exposes the seven group server actions", async () => {
    const mod = await import("@/lib/workshop/group-actions");
    expect(typeof mod.createProjectGroup).toBe("function");
    expect(typeof mod.renameProjectGroup).toBe("function");
    expect(typeof mod.recolorProjectGroup).toBe("function");
    expect(typeof mod.deleteProjectGroup).toBe("function");
    expect(typeof mod.reorderProjectGroups).toBe("function");
    expect(typeof mod.moveProjectToGroup).toBe("function");
    expect(typeof mod.bulkAssignProjectsToGroup).toBe("function");
  });
});
```

- [ ] Run: `bunx vitest run tests/vitest/project-group-actions.test.ts`
  - **Expected FAIL:** `Failed to resolve import "@/lib/workshop/group-actions"` (the module does not exist yet).

**Step 0.2 — Create the module skeleton (just enough to import).**

```ts
// src/lib/workshop/group-actions.ts
"use server";

import { revalidatePath } from "next/cache";

import { isUuid } from "@/lib/ids";
import { normalizeBulkActionIds } from "@/lib/mass-deletion/bulk-action";
import { ensureDefaultWorkspace } from "@/lib/repositories/workspace-repository";
import { createSupabaseServerClient } from "@/lib/supabase/server";
// Caps come from the shared (non-"use server") module so the Phase-4 popover
// imports the SAME values (§2.0) — never re-declare them locally (Task 8 guard).
import {
  MAX_BULK_ASSIGN_PROJECTS,
  MAX_PROJECT_GROUP_NAME_LENGTH,
  MAX_PROJECT_GROUPS,
} from "@/lib/workshop/group-constants";

type SupabaseServerClient = Awaited<ReturnType<typeof createSupabaseServerClient>>;

export class ProjectGroupCapError extends Error {}
export class ProjectGroupNameError extends Error {}

export type BulkAssignProjectsToGroupResult = {
  movedProjectIds: string[];
  skippedProjectIds: string[];
};

const ALLOWED_ACCENT_IDS = new Set<string>([
  "slate", "stone", "sage", "teal", "indigo", "plum", "rose", "clay",
]);

function assertUuid(value: string, label: string) {
  if (!isUuid(value)) throw new Error(`${label} is invalid.`);
}

function isUniqueViolation(error: unknown): boolean {
  return Boolean(error) && typeof error === "object" && (error as { code?: string }).code === "23505";
}

// LD-8: only a name-index 23505 is a duplicate-name error; the membership
// unique(user_id, project_id) constraint also raises 23505 and must not be
// mistranslated into "name already exists". Disambiguate by constraint name.
function isDuplicateNameViolation(error: unknown): boolean {
  if (!isUniqueViolation(error)) return false;
  const detail = `${(error as { constraint?: string }).constraint ?? ""} ${
    (error as { message?: string }).message ?? ""
  } ${(error as { details?: string }).details ?? ""}`.toLowerCase();
  return detail.includes("lower_name") || detail.includes("name");
}

function normalizeGroupName(rawName: string): string {
  const name = rawName.trim();
  if (name.length === 0) throw new ProjectGroupNameError("Group name is required.");
  if (name.length > MAX_PROJECT_GROUP_NAME_LENGTH) {
    throw new ProjectGroupNameError(`Group names are limited to ${MAX_PROJECT_GROUP_NAME_LENGTH} characters.`);
  }
  return name;
}

function normalizeAccentId(accentId: string | null | undefined): string | null {
  if (accentId === null || accentId === undefined) return null;
  if (!ALLOWED_ACCENT_IDS.has(accentId)) {
    throw new Error("Group accent is invalid.");
  }
  return accentId;
}

function revalidateWorkshop() {
  revalidatePath("/workshop");
  revalidatePath("/workshop/projects");
}

// LD-2 ownership gate — mirrors the repository `owned` derivation
// (workspace-repository.ts createWorkshopProjectAccessResolver): in-workspace AND
// (member of the workspace OR created_by === user). created_by is NULLABLE, so the
// workspace-role path is what keeps a created_by-IS-NULL project assignable. Do NOT
// collapse to a bare `.eq("created_by", profile.id)` — that misses both cases.
async function resolveWorkspaceRole(
  supabase: SupabaseServerClient,
  workspaceId: string,
  userId: string,
): Promise<boolean> {
  const { data, error } = await supabase
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", workspaceId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return Boolean(data?.role);
}

// Returns the subset of `projectIds` the user OWNS in this workspace, each with its
// verified workspace_id (FK-safe membership stamping). Reused by move + bulkAssign.
async function verifyOwnedProjectIds(
  supabase: SupabaseServerClient,
  projectIds: readonly string[],
  workspaceId: string,
  userId: string,
): Promise<Array<{ id: string; workspace_id: string }>> {
  if (projectIds.length === 0) return [];
  const hasWorkspaceRole = await resolveWorkspaceRole(supabase, workspaceId, userId);

  const { data, error } = await supabase
    .from("projects")
    .select("id, workspace_id, created_by")
    .in("id", projectIds)
    .eq("workspace_id", workspaceId);
  if (error) throw error;

  return (data ?? [])
    .filter((row) => hasWorkspaceRole || row.created_by === userId)
    .map((row) => ({ id: row.id, workspace_id: row.workspace_id }));
}

// Stub bodies replaced task-by-task below. Each throws until implemented so the
// failing tests are honest (not silent no-ops).
export async function createProjectGroup(_input: {
  name: string;
  accentId?: string | null;
}): Promise<{ id: string }> {
  throw new Error("not implemented");
}

export async function renameProjectGroup(_input: { groupId: string; name: string }): Promise<void> {
  throw new Error("not implemented");
}

export async function recolorProjectGroup(_input: {
  groupId: string;
  accentId: string | null;
}): Promise<void> {
  throw new Error("not implemented");
}

export async function deleteProjectGroup(_input: { groupId: string }): Promise<void> {
  throw new Error("not implemented");
}

export async function reorderProjectGroups(_input: { orderedGroupIds: string[] }): Promise<void> {
  throw new Error("not implemented");
}

export async function moveProjectToGroup(_input: {
  projectId: string;
  groupId: string | null;
}): Promise<void> {
  throw new Error("not implemented");
}

export async function bulkAssignProjectsToGroup(_input: {
  projectIds: string[];
  groupId: string | null;
}): Promise<BulkAssignProjectsToGroupResult> {
  throw new Error("not implemented");
}
```

- [ ] Run: `bunx vitest run tests/vitest/project-group-actions.test.ts`
  - **Expected PASS:** the "exposes the seven group server actions" test is green.
- [ ] Run: `bun run type-check`
  - **Expected PASS** (the unused-import warnings are acceptable; if the linter is strict, the imports are used in later tasks — keep them).

> If `type-check` complains that `supabase.from("project_groups")` types are missing, **STOP — 7a's `types.ts` regen has not landed.** This phase cannot proceed without it.

**Step 0.3 — Commit.**

```bash
git add src/lib/workshop/group-actions.ts tests/vitest/project-group-actions.test.ts
git commit -m "feat(groups): scaffold project group server-action module

Part 7b: new src/lib/workshop/group-actions.ts with typed errors,
app-layer caps, accent allowlist, and stubbed action surface.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 1 — `createProjectGroup` (trim, 40-char + 50-group caps, position=max+1, dup→NameError)

**Files**
- Modify: `src/lib/workshop/group-actions.ts`
- Test: `tests/vitest/project-group-actions.test.ts`

Behavior (spine §4.1): trim name; reject empty/`>40` (`ProjectGroupNameError`); count `(user_id, workspace_id)` rows, reject `>= 50` (`ProjectGroupCapError`); `position = max(existing) + 1`; insert; return `{ id }`; a duplicate-name `23505` from the unique index surfaces as `ProjectGroupNameError`; revalidate.

**Step 1.1 — Write the failing tests.** Append to the `describe` block:

```ts
describe("createProjectGroup", () => {
  it("rejects an empty name without touching the database", async () => {
    const stub = makeSupabaseStub();
    supabaseMocks.createSupabaseServerClient.mockResolvedValue(stub.client);
    const { createProjectGroup, ProjectGroupNameError } = await import("@/lib/workshop/group-actions");

    await expect(createProjectGroup({ name: "   " })).rejects.toBeInstanceOf(ProjectGroupNameError);
    expect(stub.calls).toEqual([]);
    expect(nextCacheMocks.revalidatePath).not.toHaveBeenCalled();
  });

  it("rejects a name longer than 40 characters", async () => {
    const stub = makeSupabaseStub();
    supabaseMocks.createSupabaseServerClient.mockResolvedValue(stub.client);
    const { createProjectGroup, ProjectGroupNameError } = await import("@/lib/workshop/group-actions");

    await expect(createProjectGroup({ name: "x".repeat(41) })).rejects.toBeInstanceOf(ProjectGroupNameError);
    expect(stub.calls).toEqual([]);
  });

  it("rejects creation when the user is already at the 50-group cap", async () => {
    const stub = makeSupabaseStub();
    // First read = count of existing groups for (user, workspace) returns 50.
    stub.queueResult("project_groups", { data: [], error: null, count: 50 });
    supabaseMocks.createSupabaseServerClient.mockResolvedValue(stub.client);
    const { createProjectGroup, ProjectGroupCapError } = await import("@/lib/workshop/group-actions");

    await expect(createProjectGroup({ name: "Pipeline" })).rejects.toBeInstanceOf(ProjectGroupCapError);
    // No insert happened.
    expect(stub.calls.some((c) => c.op === "insert")).toBe(false);
  });

  it("trims the name, appends at position max+1, validates accent, and returns the new id", async () => {
    const stub = makeSupabaseStub();
    // 1) cap count read (3 existing groups)
    stub.queueResult("project_groups", { data: [], error: null, count: 3 });
    // 2) max(position) read returns the highest existing position (4)
    stub.queueResult("project_groups", { data: [{ position: 4 }], error: null });
    // 3) insert ... select("id").single()
    stub.queueResult("project_groups", { data: { id: GROUP_ID }, error: null });
    supabaseMocks.createSupabaseServerClient.mockResolvedValue(stub.client);
    const { createProjectGroup } = await import("@/lib/workshop/group-actions");

    const result = await createProjectGroup({ name: "  Pipeline  ", accentId: "teal" });

    expect(result).toEqual({ id: GROUP_ID });
    const insert = stub.calls.find((c) => c.op === "insert");
    expect(insert?.payload).toEqual({
      workspace_id: WORKSPACE_ID,
      user_id: USER_ID,
      name: "Pipeline",
      accent_id: "teal",
      position: 5,
    });
    expect(nextCacheMocks.revalidatePath).toHaveBeenCalledWith("/workshop");
    expect(nextCacheMocks.revalidatePath).toHaveBeenCalledWith("/workshop/projects");
  });

  it("defaults position to 0 when the user has no groups yet", async () => {
    const stub = makeSupabaseStub();
    stub.queueResult("project_groups", { data: [], error: null, count: 0 }); // cap
    stub.queueResult("project_groups", { data: [], error: null });           // max position: none
    stub.queueResult("project_groups", { data: { id: GROUP_ID }, error: null }); // insert
    supabaseMocks.createSupabaseServerClient.mockResolvedValue(stub.client);
    const { createProjectGroup } = await import("@/lib/workshop/group-actions");

    await createProjectGroup({ name: "First", accentId: null });

    const insert = stub.calls.find((c) => c.op === "insert");
    expect((insert?.payload as { position: number }).position).toBe(0);
    expect((insert?.payload as { accent_id: string | null }).accent_id).toBeNull();
  });

  it("rejects an unknown accent token", async () => {
    const stub = makeSupabaseStub();
    supabaseMocks.createSupabaseServerClient.mockResolvedValue(stub.client);
    const { createProjectGroup } = await import("@/lib/workshop/group-actions");

    await expect(createProjectGroup({ name: "Pipeline", accentId: "neon" })).rejects.toThrow(/accent/i);
    expect(stub.calls.some((c) => c.op === "insert")).toBe(false);
  });

  it("translates a duplicate-name unique violation (23505) into a name error", async () => {
    const stub = makeSupabaseStub();
    stub.queueResult("project_groups", { data: [], error: null, count: 1 }); // cap
    stub.queueResult("project_groups", { data: [{ position: 0 }], error: null }); // max position
    // The duplicate-name index raises 23505 with the name-index constraint, which
    // isDuplicateNameViolation() matches by name (LD-8).
    stub.queueResult("project_groups", {
      data: null,
      error: { code: "23505", constraint: "project_groups_user_workspace_lower_name_idx", message: "duplicate key" },
    }); // insert
    supabaseMocks.createSupabaseServerClient.mockResolvedValue(stub.client);
    const { createProjectGroup, ProjectGroupNameError } = await import("@/lib/workshop/group-actions");

    await expect(createProjectGroup({ name: "Pipeline" })).rejects.toBeInstanceOf(ProjectGroupNameError);
  });
});
```

- [ ] Run: `bunx vitest run tests/vitest/project-group-actions.test.ts`
  - **Expected FAIL:** every `createProjectGroup` test fails (`throw new Error("not implemented")`).

**Step 1.2 — Implement `createProjectGroup`.** Replace its stub:

```ts
export async function createProjectGroup(input: {
  name: string;
  accentId?: string | null;
}): Promise<{ id: string }> {
  const name = normalizeGroupName(input.name);
  const accentId = normalizeAccentId(input.accentId);

  const { workspace, profile } = await ensureDefaultWorkspace();
  const supabase = await createSupabaseServerClient();

  // Cap: 50 groups per user per workspace (Q2 soft-cap; app-layer only).
  const { count, error: countError } = await supabase
    .from("project_groups")
    .select("id", { count: "exact", head: true })
    .eq("user_id", profile.id)
    .eq("workspace_id", workspace.id);

  if (countError) throw countError;
  if ((count ?? 0) >= MAX_PROJECT_GROUPS) {
    throw new ProjectGroupCapError(
      `You can have at most ${MAX_PROJECT_GROUPS} groups. Delete one to add another.`,
    );
  }

  // position = max(existing) + 1 (append to end). Highest first, take one row.
  const { data: lastRow, error: positionError } = await supabase
    .from("project_groups")
    .select("position")
    .eq("user_id", profile.id)
    .eq("workspace_id", workspace.id)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (positionError) throw positionError;
  const nextPosition = lastRow ? (lastRow.position ?? 0) + 1 : 0;

  const { data: inserted, error: insertError } = await supabase
    .from("project_groups")
    .insert({
      workspace_id: workspace.id,
      user_id: profile.id,
      name,
      accent_id: accentId,
      position: nextPosition,
    })
    .select("id")
    .single();

  if (insertError) {
    // A name-index 23505 ⇒ duplicate name; any other 23505 (or error) rethrows raw.
    if (isDuplicateNameViolation(insertError)) {
      throw new ProjectGroupNameError("A group with this name already exists.");
    }
    throw insertError;
  }
  if (!inserted) throw new Error("Group could not be created.");

  revalidateWorkshop();
  return { id: inserted.id };
}
```

> **Mock-shape note for the implementer.** The test stub returns the queued `{ data }` for *every* terminal call on a table in queue order. The `maybeSingle()` for the position read receives `{ data: [{ position: 4 }] }` in one test and `{ data: { position: 4 } }` semantics in another — keep the production code reading `lastRow.position` from a single object (`.maybeSingle()` yields an object, not an array). In the tests above, the position queue entries are written as the value `.maybeSingle()` resolves `data` to. Adjust the test `data` to a single object `{ position: 4 }` (NOT an array) to match `.maybeSingle()`; fix the two position-read fixtures accordingly before running. (This is the one spot where the generic stub and the real `.maybeSingle()` shape must agree.)

- [ ] **Fix the two `max(position)` fixtures** so `.maybeSingle()` data is a single object or `null`: change `{ data: [{ position: 4 }], error: null }` → `{ data: { position: 4 }, error: null }`, and `{ data: [{ position: 0 }], error: null }` → `{ data: { position: 0 }, error: null }`, and the empty case `{ data: [], error: null }` → `{ data: null, error: null }`.
- [ ] Run: `bunx vitest run tests/vitest/project-group-actions.test.ts`
  - **Expected PASS:** all `createProjectGroup` tests green.
- [ ] Run: `bun run type-check` → **PASS**.

**Step 1.3 — Commit.**

```bash
git add src/lib/workshop/group-actions.ts tests/vitest/project-group-actions.test.ts
git commit -m "feat(groups): createProjectGroup with caps, position, accent + dup-name guard

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 2 — `renameProjectGroup` (assertUuid, ownership-scoped update, dup→NameError)

**Files**
- Modify: `src/lib/workshop/group-actions.ts`
- Test: `tests/vitest/project-group-actions.test.ts`

Behavior (spine §4.2): `assertUuid(groupId)`; trim + length-validate name; `update name, updated_at` scoped to `(id, user_id, workspace_id)` so RLS + the predicate both gate it; duplicate → `ProjectGroupNameError`; revalidate.

**Step 2.1 — Failing tests.**

```ts
describe("renameProjectGroup", () => {
  it("rejects a non-uuid group id", async () => {
    const stub = makeSupabaseStub();
    supabaseMocks.createSupabaseServerClient.mockResolvedValue(stub.client);
    const { renameProjectGroup } = await import("@/lib/workshop/group-actions");

    await expect(renameProjectGroup({ groupId: "nope", name: "X" })).rejects.toThrow(/invalid/i);
    expect(stub.calls).toEqual([]);
  });

  it("rejects an empty trimmed name", async () => {
    const stub = makeSupabaseStub();
    supabaseMocks.createSupabaseServerClient.mockResolvedValue(stub.client);
    const { renameProjectGroup, ProjectGroupNameError } = await import("@/lib/workshop/group-actions");

    await expect(renameProjectGroup({ groupId: GROUP_ID, name: "  " })).rejects.toBeInstanceOf(
      ProjectGroupNameError,
    );
    expect(stub.calls.some((c) => c.op === "update")).toBe(false);
  });

  it("updates the trimmed name scoped to the owning user + workspace", async () => {
    const stub = makeSupabaseStub();
    stub.queueResult("project_groups", { data: null, error: null }); // update resolves ok
    supabaseMocks.createSupabaseServerClient.mockResolvedValue(stub.client);
    const { renameProjectGroup } = await import("@/lib/workshop/group-actions");

    await renameProjectGroup({ groupId: GROUP_ID, name: "  Renamed  " });

    const update = stub.calls.find((c) => c.op === "update");
    expect(update?.table).toBe("project_groups");
    expect((update?.payload as { name: string }).name).toBe("Renamed");
    expect((update?.payload as { updated_at?: string }).updated_at).toEqual(expect.any(String));
    expect(nextCacheMocks.revalidatePath).toHaveBeenCalledWith("/workshop");
  });

  it("translates a duplicate name (23505 from the name index) into a name error", async () => {
    const stub = makeSupabaseStub();
    stub.queueResult("project_groups", {
      data: null,
      error: { code: "23505", constraint: "project_groups_user_workspace_lower_name_idx", message: "dup name" },
    });
    supabaseMocks.createSupabaseServerClient.mockResolvedValue(stub.client);
    const { renameProjectGroup, ProjectGroupNameError } = await import("@/lib/workshop/group-actions");

    await expect(renameProjectGroup({ groupId: GROUP_ID, name: "Taken" })).rejects.toBeInstanceOf(
      ProjectGroupNameError,
    );
  });
});
```

- [ ] Run: `bunx vitest run tests/vitest/project-group-actions.test.ts` → **Expected FAIL** for the new block.

**Step 2.2 — Implement.**

```ts
export async function renameProjectGroup(input: { groupId: string; name: string }): Promise<void> {
  assertUuid(input.groupId, "Group");
  const name = normalizeGroupName(input.name);

  const { workspace, profile } = await ensureDefaultWorkspace();
  const supabase = await createSupabaseServerClient();

  const { error } = await supabase
    .from("project_groups")
    .update({ name, updated_at: new Date().toISOString() })
    .eq("id", input.groupId)
    .eq("user_id", profile.id)
    .eq("workspace_id", workspace.id);

  if (error) {
    if (isDuplicateNameViolation(error)) {
      throw new ProjectGroupNameError("A group with this name already exists.");
    }
    throw error;
  }

  revalidateWorkshop();
}
```

> **Ownership note.** The `.eq("user_id", …).eq("workspace_id", …)` triple-scoping means RLS already blocks foreign rows; the extra predicates make a no-op update silent (0 rows) rather than an error — acceptable and matches `setProjectFavorite`'s delete behavior (it also does not assert a row existed). The page revalidate makes the SSR truth authoritative regardless.

- [ ] Run tests → **Expected PASS**. Run `bun run type-check` → **PASS**.

**Step 2.3 — Commit.**

```bash
git add src/lib/workshop/group-actions.ts tests/vitest/project-group-actions.test.ts
git commit -m "feat(groups): renameProjectGroup with ownership scoping + dup-name guard

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 3 — `recolorProjectGroup` (accent allowlist, null=default) + accent-sync source guard

**Files**
- Modify: `src/lib/workshop/group-actions.ts`
- Test: `tests/vitest/project-group-actions.test.ts`

Behavior (spine §4.3): `assertUuid(groupId)`; validate accent against the allowlist (or `null` to clear to default); `update accent_id, updated_at` ownership-scoped; revalidate.

**Step 3.1 — Failing tests** (including the source-level guard that the action's accent set matches `group-accent.ts`'s `GroupAccentId` tokens, so the two never drift):

```ts
describe("recolorProjectGroup", () => {
  it("rejects a non-uuid group id", async () => {
    const stub = makeSupabaseStub();
    supabaseMocks.createSupabaseServerClient.mockResolvedValue(stub.client);
    const { recolorProjectGroup } = await import("@/lib/workshop/group-actions");

    await expect(recolorProjectGroup({ groupId: "x", accentId: "teal" })).rejects.toThrow(/invalid/i);
    expect(stub.calls).toEqual([]);
  });

  it("rejects an unknown accent token before any write", async () => {
    const stub = makeSupabaseStub();
    supabaseMocks.createSupabaseServerClient.mockResolvedValue(stub.client);
    const { recolorProjectGroup } = await import("@/lib/workshop/group-actions");

    await expect(recolorProjectGroup({ groupId: GROUP_ID, accentId: "chartreuse" })).rejects.toThrow(
      /accent/i,
    );
    expect(stub.calls.some((c) => c.op === "update")).toBe(false);
  });

  it("persists a valid accent token", async () => {
    const stub = makeSupabaseStub();
    stub.queueResult("project_groups", { data: null, error: null });
    supabaseMocks.createSupabaseServerClient.mockResolvedValue(stub.client);
    const { recolorProjectGroup } = await import("@/lib/workshop/group-actions");

    await recolorProjectGroup({ groupId: GROUP_ID, accentId: "plum" });

    const update = stub.calls.find((c) => c.op === "update");
    expect((update?.payload as { accent_id: string | null }).accent_id).toBe("plum");
    expect(nextCacheMocks.revalidatePath).toHaveBeenCalledWith("/workshop/projects");
  });

  it("clears the accent to the default swatch when accentId is null", async () => {
    const stub = makeSupabaseStub();
    stub.queueResult("project_groups", { data: null, error: null });
    supabaseMocks.createSupabaseServerClient.mockResolvedValue(stub.client);
    const { recolorProjectGroup } = await import("@/lib/workshop/group-actions");

    await recolorProjectGroup({ groupId: GROUP_ID, accentId: null });

    const update = stub.calls.find((c) => c.op === "update");
    expect((update?.payload as { accent_id: string | null }).accent_id).toBeNull();
  });
});
```

> **Accent-sync source guard.** Add this once (it does NOT depend on 7d having landed `group-accent.ts` yet — guard it with `existsSync`; the test is informational until the file exists, and hard once it does):

```ts
import { existsSync, readFileSync } from "node:fs";

describe("accent token contract", () => {
  it("keeps the action accent allowlist in sync with group-accent.ts when it exists", () => {
    const actionsSrc = readFileSync("src/lib/workshop/group-actions.ts", "utf8");
    const actionTokens = new Set(
      [...actionsSrc.matchAll(/"(slate|stone|sage|teal|indigo|plum|rose|clay)"/g)].map((m) => m[1]),
    );
    expect(actionTokens.size).toBe(8);

    const accentPath = "src/lib/workshop/group-accent.ts";
    if (existsSync(accentPath)) {
      const accentSrc = readFileSync(accentPath, "utf8");
      for (const token of actionTokens) {
        expect(accentSrc).toContain(`"${token}"`);
      }
    }
  });
});
```

- [ ] Run tests → **Expected FAIL** for `recolorProjectGroup` (the sync guard passes already since the action set has 8 tokens).

**Step 3.2 — Implement.**

```ts
export async function recolorProjectGroup(input: {
  groupId: string;
  accentId: string | null;
}): Promise<void> {
  assertUuid(input.groupId, "Group");
  const accentId = normalizeAccentId(input.accentId);

  const { workspace, profile } = await ensureDefaultWorkspace();
  const supabase = await createSupabaseServerClient();

  const { error } = await supabase
    .from("project_groups")
    .update({ accent_id: accentId, updated_at: new Date().toISOString() })
    .eq("id", input.groupId)
    .eq("user_id", profile.id)
    .eq("workspace_id", workspace.id);

  if (error) throw error;
  revalidateWorkshop();
}
```

- [ ] Run tests → **PASS**. Run `bun run type-check` → **PASS**.

**Step 3.3 — Commit.**

```bash
git add src/lib/workshop/group-actions.ts tests/vitest/project-group-actions.test.ts
git commit -m "feat(groups): recolorProjectGroup with accent allowlist + null-clears-default

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 4 — `deleteProjectGroup` (D10: delete group row; membership cascades; never deletes projects)

**Files**
- Modify: `src/lib/workshop/group-actions.ts`
- Test: `tests/vitest/project-group-actions.test.ts`

Behavior (spine §4.4 / D10): `assertUuid(groupId)`; ownership-scoped `delete` of the group row. The DB `ON DELETE CASCADE` on `project_group_memberships.group_id` un-assigns its projects (they fall to virtual Ungrouped). The action **never** touches the `projects` table.

**Step 4.1 — Failing tests.**

```ts
describe("deleteProjectGroup", () => {
  it("rejects a non-uuid group id", async () => {
    const stub = makeSupabaseStub();
    supabaseMocks.createSupabaseServerClient.mockResolvedValue(stub.client);
    const { deleteProjectGroup } = await import("@/lib/workshop/group-actions");

    await expect(deleteProjectGroup({ groupId: "bad" })).rejects.toThrow(/invalid/i);
    expect(stub.calls).toEqual([]);
  });

  it("deletes only the group row scoped to the owning user; never touches projects", async () => {
    const stub = makeSupabaseStub();
    stub.queueResult("project_groups", { data: null, error: null });
    supabaseMocks.createSupabaseServerClient.mockResolvedValue(stub.client);
    const { deleteProjectGroup } = await import("@/lib/workshop/group-actions");

    await deleteProjectGroup({ groupId: GROUP_ID });

    const deletes = stub.calls.filter((c) => c.op === "delete");
    expect(deletes).toHaveLength(1);
    expect(deletes[0]?.table).toBe("project_groups");
    // It must NEVER delete from projects or from memberships directly (cascade does that).
    expect(stub.calls.some((c) => c.table === "projects")).toBe(false);
    expect(stub.calls.some((c) => c.table === "project_group_memberships")).toBe(false);
    expect(nextCacheMocks.revalidatePath).toHaveBeenCalledWith("/workshop");
  });

  it("propagates a delete error", async () => {
    const stub = makeSupabaseStub();
    stub.queueResult("project_groups", { data: null, error: { message: "boom" } });
    supabaseMocks.createSupabaseServerClient.mockResolvedValue(stub.client);
    const { deleteProjectGroup } = await import("@/lib/workshop/group-actions");

    await expect(deleteProjectGroup({ groupId: GROUP_ID })).rejects.toMatchObject({ message: "boom" });
    expect(nextCacheMocks.revalidatePath).not.toHaveBeenCalled();
  });
});
```

- [ ] Run tests → **Expected FAIL**.

**Step 4.2 — Implement.**

```ts
export async function deleteProjectGroup(input: { groupId: string }): Promise<void> {
  assertUuid(input.groupId, "Group");

  const { workspace, profile } = await ensureDefaultWorkspace();
  const supabase = await createSupabaseServerClient();

  // Delete only the group definition. Membership rows cascade (ON DELETE CASCADE
  // on project_group_memberships.group_id) -> projects fall to virtual Ungrouped.
  // This NEVER deletes any project (D10).
  const { error } = await supabase
    .from("project_groups")
    .delete()
    .eq("id", input.groupId)
    .eq("user_id", profile.id)
    .eq("workspace_id", workspace.id);

  if (error) throw error;
  revalidateWorkshop();
}
```

- [ ] Run tests → **PASS**. `bun run type-check` → **PASS**.

**Step 4.3 — Commit.**

```bash
git add src/lib/workshop/group-actions.ts tests/vitest/project-group-actions.test.ts
git commit -m "feat(groups): deleteProjectGroup (cascade-unassign, never deletes projects)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 5 — `reorderProjectGroups` (position = array index, owned ids only)

**Files**
- Modify: `src/lib/workshop/group-actions.ts`
- Test: `tests/vitest/project-group-actions.test.ts`

Behavior (spine §4.5): validate each id is a uuid; for each owned id, `update position` to its index in `orderedGroupIds`; ids the user does not own are silently skipped by RLS + the ownership-scoped predicate; revalidate once.

> **Implementation choice.** Issue one ownership-scoped `update` per id (clearest, fully RLS-gated, N≤50 so cost is trivial). Each update is `.eq("id", id).eq("user_id", …).eq("workspace_id", …)` — a non-owned id matches 0 rows and is a harmless no-op (no error). Run them with `Promise.all` for one round-trip batch, then revalidate once. The batch is capped at `MAX_PROJECT_GROUPS` (see Step 5.2) to bound the fan-out.

> **Partial-list semantics (documented, intentional).** `reorderProjectGroups` only writes `position` for the ids it RECEIVES; ids omitted from `orderedGroupIds` keep their old `position`. v1 has no reorder UI (the popover edits name/color/delete only — Phase 4 Note 3), so this action has only the contract test as a consumer; the future DnD reorder UI MUST pass the full ordered group list. Until then, treat a partial list as "reposition only these, leave the rest" — acceptable because no v1 surface calls it with a partial list.

**Step 5.1 — Failing tests.**

```ts
describe("reorderProjectGroups", () => {
  it("rejects when any id is not a uuid (before any write)", async () => {
    const stub = makeSupabaseStub();
    supabaseMocks.createSupabaseServerClient.mockResolvedValue(stub.client);
    const { reorderProjectGroups } = await import("@/lib/workshop/group-actions");

    await expect(
      reorderProjectGroups({ orderedGroupIds: [GROUP_ID, "not-a-uuid"] }),
    ).rejects.toThrow(/invalid/i);
    expect(stub.calls).toEqual([]);
  });

  it("is a no-op (no write, no revalidate) for an empty array", async () => {
    const stub = makeSupabaseStub();
    supabaseMocks.createSupabaseServerClient.mockResolvedValue(stub.client);
    const { reorderProjectGroups } = await import("@/lib/workshop/group-actions");

    await reorderProjectGroups({ orderedGroupIds: [] });
    expect(stub.calls).toEqual([]);
    expect(nextCacheMocks.revalidatePath).not.toHaveBeenCalled();
  });

  it("writes position = array index for each id, scoped to the owner", async () => {
    const stub = makeSupabaseStub();
    stub.queueResult("project_groups", { data: null, error: null });
    stub.queueResult("project_groups", { data: null, error: null });
    supabaseMocks.createSupabaseServerClient.mockResolvedValue(stub.client);
    const { reorderProjectGroups } = await import("@/lib/workshop/group-actions");

    await reorderProjectGroups({ orderedGroupIds: [GROUP_ID_2, GROUP_ID] });

    const updates = stub.calls.filter((c) => c.op === "update");
    expect(updates).toHaveLength(2);
    expect(updates.map((u) => (u.payload as { position: number }).position).sort()).toEqual([0, 1]);
    expect(nextCacheMocks.revalidatePath).toHaveBeenCalledWith("/workshop/projects");
  });
});
```

- [ ] Run tests → **Expected FAIL**.

**Step 5.2 — Implement.**

```ts
export async function reorderProjectGroups(input: { orderedGroupIds: string[] }): Promise<void> {
  // Bound the batch (mirror the bulk-assign cap) so a caller cannot force an
  // unbounded fan-out of UPDATEs. A user can have at most MAX_PROJECT_GROUPS groups.
  if (input.orderedGroupIds.length > MAX_PROJECT_GROUPS) {
    throw new Error(`Cannot reorder more than ${MAX_PROJECT_GROUPS} groups at once.`);
  }
  for (const id of input.orderedGroupIds) {
    assertUuid(id, "Group");
  }
  if (input.orderedGroupIds.length === 0) return;

  const { workspace, profile } = await ensureDefaultWorkspace();
  const supabase = await createSupabaseServerClient();

  const now = new Date().toISOString();
  await Promise.all(
    input.orderedGroupIds.map((groupId, index) =>
      supabase
        .from("project_groups")
        .update({ position: index, updated_at: now })
        .eq("id", groupId)
        .eq("user_id", profile.id)
        .eq("workspace_id", workspace.id)
        .then(({ error }) => {
          if (error) throw error;
        }),
    ),
  );

  revalidateWorkshop();
}
```

- [ ] Run tests → **PASS**. `bun run type-check` → **PASS**.

**Step 5.3 — Commit.**

```bash
git add src/lib/workshop/group-actions.ts tests/vitest/project-group-actions.test.ts
git commit -m "feat(groups): reorderProjectGroups writes position = array index per owned id

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 6 — `moveProjectToGroup` (D9 assign gate; null=remove via delete; else upsert)

**Files**
- Modify: `src/lib/workshop/group-actions.ts`
- Test: `tests/vitest/project-group-actions.test.ts`

Behavior (spine §4.6 / D8 / D9): `assertUuid(projectId)`; **verify the project is owned + in-workspace via the LD-2 ownership gate** (`verifyOwnedProjectIds`, §1.5) — this is the D9 assign gate (any owned in-workspace project, independent of delete eligibility; do NOT reuse `canSelectProjectForDeletion`). If `groupId === null`: `delete` the membership for `(user_id, project_id)`. Else: `assertUuid(groupId)`, **verify the group is owned**, then `upsert { group_id, workspace_id, user_id, project_id }` with `onConflict: "user_id,project_id"` (one-to-many: replaces any prior group). Revalidate. **Ship ONLY `moveProjectToGroup`** — no `setProjectGroupMembership` alias (that would be a contract collision).

> **The D9 gate is the LD-2 OWNERSHIP gate, NOT a delete-eligibility check and NOT a bare `created_by` eq.** A project blocked from deletion by an active shared link is still groupable, but it must be OWNED by this user (v1 scope, D9/D11). Ownership matches the repository `owned` derivation exactly (§1.5): in-workspace AND (workspace-role member OR `created_by === profile.id`), with `created_by` **nullable**. Use the shared `verifyOwnedProjectIds(supabase, [projectId], workspace.id, profile.id)` helper rather than a single `.eq("created_by", profile.id)` — the bare eq would (a) refuse an owned-via-workspace-role project and (b) silently drop a project whose `created_by` is NULL (`ON DELETE SET NULL`). RLS on `projects` still permits READING shared/collaborator rows, so the app-layer predicate is what establishes ownership, matching the client gate `canAssignProjectToGroup: accessKind === "owned"`. The membership row's `workspace_id` is stamped from the verified `project.workspace_id` so the composite FK is satisfiable in any workspace.

**Step 6.1 — Failing tests.**

```ts
describe("moveProjectToGroup", () => {
  it("rejects a non-uuid project id", async () => {
    const stub = makeSupabaseStub();
    supabaseMocks.createSupabaseServerClient.mockResolvedValue(stub.client);
    const { moveProjectToGroup } = await import("@/lib/workshop/group-actions");

    await expect(moveProjectToGroup({ projectId: "x", groupId: GROUP_ID })).rejects.toThrow(/invalid/i);
    expect(stub.calls).toEqual([]);
  });

  it("throws when the project is not in this workspace (D9 gate fails)", async () => {
    const stub = makeSupabaseStub();
    stub.queueResult("workspace_members", { data: null, error: null }); // no workspace role
    stub.queueResult("projects", { data: [], error: null }); // verify finds nothing in-workspace
    supabaseMocks.createSupabaseServerClient.mockResolvedValue(stub.client);
    const { moveProjectToGroup } = await import("@/lib/workshop/group-actions");

    await expect(moveProjectToGroup({ projectId: PROJECT_ID, groupId: GROUP_ID })).rejects.toThrow(
      /not.*found|workspace/i,
    );
    expect(stub.calls.some((c) => c.op === "upsert")).toBe(false);
  });

  it("rejects a project the user can READ but does not OWN (no role + created_by mismatch)", async () => {
    // No workspace role AND created_by !== user, so the LD-2 filter drops it. A
    // shared/collaborator project is readable via RLS but owned by someone else.
    const stub = makeSupabaseStub();
    stub.queueResult("workspace_members", { data: null, error: null }); // not a workspace member
    stub.queueResult("projects", { data: [{ id: PROJECT_ID, workspace_id: WORKSPACE_ID, created_by: "someone-else" }], error: null });
    supabaseMocks.createSupabaseServerClient.mockResolvedValue(stub.client);
    const { moveProjectToGroup } = await import("@/lib/workshop/group-actions");

    await expect(moveProjectToGroup({ projectId: PROJECT_ID, groupId: GROUP_ID })).rejects.toThrow(
      /not.*found|workspace/i,
    );
    expect(stub.calls.some((c) => c.op === "upsert")).toBe(false);
  });

  it("ALLOWS an owned-via-workspace-role project even when created_by !== user (LD-2)", async () => {
    // The user is a workspace member, so they own every project in the workspace for
    // assignment purposes — regardless of created_by. The bare `.eq("created_by", …)`
    // gate would wrongly refuse this; the LD-2 gate accepts it.
    const stub = makeSupabaseStub();
    stub.queueResult("workspace_members", { data: { role: "editor" }, error: null }); // has a workspace role
    stub.queueResult("projects", { data: [{ id: PROJECT_ID, workspace_id: WORKSPACE_ID, created_by: "someone-else" }], error: null });
    stub.queueResult("project_groups", { data: { id: GROUP_ID }, error: null }); // group ownership verify
    stub.queueResult("project_group_memberships", { data: null, error: null });
    supabaseMocks.createSupabaseServerClient.mockResolvedValue(stub.client);
    const { moveProjectToGroup } = await import("@/lib/workshop/group-actions");

    await moveProjectToGroup({ projectId: PROJECT_ID, groupId: GROUP_ID });

    expect(stub.calls.some((c) => c.op === "upsert")).toBe(true);
  });

  it("ALLOWS an owned project whose created_by IS NULL when the user has a workspace role (LD-2)", async () => {
    // created_by was nulled (ON DELETE SET NULL). A `.eq("created_by", …)` matches 0
    // rows; the LD-2 gate keeps it assignable via the workspace-role path.
    const stub = makeSupabaseStub();
    stub.queueResult("workspace_members", { data: { role: "owner" }, error: null });
    stub.queueResult("projects", { data: [{ id: PROJECT_ID, workspace_id: WORKSPACE_ID, created_by: null }], error: null });
    stub.queueResult("project_groups", { data: { id: GROUP_ID }, error: null });
    stub.queueResult("project_group_memberships", { data: null, error: null });
    supabaseMocks.createSupabaseServerClient.mockResolvedValue(stub.client);
    const { moveProjectToGroup } = await import("@/lib/workshop/group-actions");

    await moveProjectToGroup({ projectId: PROJECT_ID, groupId: GROUP_ID });

    expect(stub.calls.some((c) => c.op === "upsert")).toBe(true);
  });

  it("removes the membership (delete) when groupId is null", async () => {
    const stub = makeSupabaseStub();
    stub.queueResult("workspace_members", { data: { role: "owner" }, error: null });
    stub.queueResult("projects", { data: [{ id: PROJECT_ID, workspace_id: WORKSPACE_ID, created_by: USER_ID }], error: null });
    stub.queueResult("project_group_memberships", { data: null, error: null });
    supabaseMocks.createSupabaseServerClient.mockResolvedValue(stub.client);
    const { moveProjectToGroup } = await import("@/lib/workshop/group-actions");

    await moveProjectToGroup({ projectId: PROJECT_ID, groupId: null });

    const del = stub.calls.find((c) => c.op === "delete");
    expect(del?.table).toBe("project_group_memberships");
    expect(stub.calls.some((c) => c.op === "upsert")).toBe(false);
    expect(nextCacheMocks.revalidatePath).toHaveBeenCalledWith("/workshop/projects");
  });

  it("upserts the membership (onConflict user_id,project_id) when groupId is a real group", async () => {
    const stub = makeSupabaseStub();
    stub.queueResult("workspace_members", { data: { role: "owner" }, error: null });
    stub.queueResult("projects", { data: [{ id: PROJECT_ID, workspace_id: WORKSPACE_ID, created_by: USER_ID }], error: null });
    stub.queueResult("project_groups", { data: { id: GROUP_ID }, error: null }); // group ownership verify
    stub.queueResult("project_group_memberships", { data: null, error: null });
    supabaseMocks.createSupabaseServerClient.mockResolvedValue(stub.client);
    const { moveProjectToGroup } = await import("@/lib/workshop/group-actions");

    await moveProjectToGroup({ projectId: PROJECT_ID, groupId: GROUP_ID });

    const upsert = stub.calls.find((c) => c.op === "upsert");
    expect(upsert?.table).toBe("project_group_memberships");
    expect(upsert?.payload).toEqual({
      group_id: GROUP_ID,
      workspace_id: WORKSPACE_ID,
      user_id: USER_ID,
      project_id: PROJECT_ID,
    });
    expect(upsert?.options).toEqual({ onConflict: "user_id,project_id" });
  });

  it("throws when the target group is not owned", async () => {
    const stub = makeSupabaseStub();
    stub.queueResult("workspace_members", { data: { role: "owner" }, error: null });
    stub.queueResult("projects", { data: [{ id: PROJECT_ID, workspace_id: WORKSPACE_ID, created_by: USER_ID }], error: null });
    stub.queueResult("project_groups", { data: null, error: null }); // group verify finds nothing
    supabaseMocks.createSupabaseServerClient.mockResolvedValue(stub.client);
    const { moveProjectToGroup } = await import("@/lib/workshop/group-actions");

    await expect(moveProjectToGroup({ projectId: PROJECT_ID, groupId: GROUP_ID })).rejects.toThrow(
      /group.*not.*found|not.*found/i,
    );
    expect(stub.calls.some((c) => c.op === "upsert")).toBe(false);
  });

  it("does NOT export a setProjectGroupMembership alias (single action contract)", async () => {
    const mod = await import("@/lib/workshop/group-actions");
    expect("setProjectGroupMembership" in mod).toBe(false);
  });
});
```

- [ ] Run tests → **Expected FAIL**.

**Step 6.2 — Implement.**

```ts
export async function moveProjectToGroup(input: {
  projectId: string;
  groupId: string | null;
}): Promise<void> {
  assertUuid(input.projectId, "Project");

  const { workspace, profile } = await ensureDefaultWorkspace();
  const supabase = await createSupabaseServerClient();

  // D9 assign gate = the LD-2 ownership gate (§1.5): in-workspace AND (workspace-role
  // member OR created_by === user), with created_by NULLABLE. Independent of delete
  // eligibility, so a project delete-blocked by an active shared link is still
  // groupable. Use the shared helper, NOT a bare `.eq("created_by", profile.id)` —
  // that would refuse an owned-via-workspace-role project and drop a created_by-IS-NULL
  // one. The membership's workspace_id is stamped from the verified project row so the
  // composite FK (project_id, workspace_id) → projects(id, workspace_id) is satisfiable.
  const [project] = await verifyOwnedProjectIds(supabase, [input.projectId], workspace.id, profile.id);
  if (!project) throw new Error("Project was not found in this workspace.");

  // Remove == delete the membership row (project falls to virtual Ungrouped).
  if (input.groupId === null) {
    const { error } = await supabase
      .from("project_group_memberships")
      .delete()
      .eq("user_id", profile.id)
      .eq("project_id", project.id);

    if (error) throw error;
    revalidateWorkshop();
    return;
  }

  // Move == upsert. Verify the target group is owned + in-workspace first.
  assertUuid(input.groupId, "Group");
  const { data: group, error: groupError } = await supabase
    .from("project_groups")
    .select("id")
    .eq("id", input.groupId)
    .eq("user_id", profile.id)
    .eq("workspace_id", workspace.id)
    .maybeSingle();

  if (groupError) throw groupError;
  if (!group) throw new Error("Group was not found in this workspace.");

  const { error } = await supabase
    .from("project_group_memberships")
    .upsert(
      {
        group_id: group.id,
        // Stamp workspace_id from the VERIFIED project row, not ensureDefaultWorkspace,
        // so the composite FK (project_id, workspace_id) → projects(id, workspace_id)
        // is always satisfiable even if the project lives in a non-default workspace.
        workspace_id: project.workspace_id,
        user_id: profile.id,
        project_id: project.id,
      },
      { onConflict: "user_id,project_id" },
    );

  if (error) throw error;
  revalidateWorkshop();
}
```

- [ ] Run tests → **PASS**. `bun run type-check` → **PASS**.

**Step 6.3 — Commit.**

```bash
git add src/lib/workshop/group-actions.ts tests/vitest/project-group-actions.test.ts
git commit -m "feat(groups): moveProjectToGroup (D9 gate, null=remove, else verify+upsert)

One-to-many membership via onConflict user_id,project_id. Single action; no
setProjectGroupMembership alias.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 7 — `bulkAssignProjectsToGroup` (normalize max:50, LD-2 verify, LD-11 result, one revalidate)

**Files**
- Modify: `src/lib/workshop/group-actions.ts`
- Test: `tests/vitest/project-group-actions.test.ts`

Behavior (spine §4.7): `normalizeBulkActionIds(projectIds, { label: "projects", max: 50 })` for id hygiene (dedup, uuid-validate, cap); if it returns a blocking issue (empty/invalid/oversized), throw; verify the requested projects are **owned** + in-workspace via the LD-2 gate (`verifyOwnedProjectIds`, §1.5 — a batched `in()` read filtered by the repo `owned` predicate, NOT a bare `created_by` eq); if `groupId === null` delete memberships for the verified project ids, else verify the group is owned then upsert one membership per verified project (`onConflict: "user_id,project_id"`); **single** `revalidatePath` pair; **return `{ movedProjectIds, skippedProjectIds }` (LD-11)** so the client (§5.5) keeps optimistic state for moved ids and rolls back skipped ones. Atomic optimistic apply/rollback is the client's job (§5.5); the server applies all then revalidates once.

> **LD-2 verify pattern.** `verifyOwnedProjectIds(supabase, ids, workspace.id, profile.id)` returns the subset the user OWNS — in-workspace AND (workspace-role member OR `created_by === profile.id`), with `created_by` nullable. Only verified ids are mutated (defends against a forged id slipped into the array; RLS also blocks it, but filtering keeps the membership rows clean and the result honest). The ids that did NOT verify become `skippedProjectIds`.

> **LD-11 partial-failure result.** `movedProjectIds` = the verified ids the server actually wrote; `skippedProjectIds` = the requested-but-not-verified ids (forged/foreign/non-owned, or removed cross-tab). The client toasts a partial-failure message and rolls back the skipped ids' optimistic overrides.

> **LD-8 zero-verify semantics differ by path.** When **nothing** verifies: the **assign path (`groupId` non-null)** throws `"None of the selected projects were found in this workspace."` (the user asked to move projects into a group and none were eligible — an honest error to surface). The **remove path (`groupId === null`)** is a **no-op, not a throw** — removing membership from zero eligible projects is a benign idempotent outcome (the projects are already ungrouped or not the user's), so it returns `{ movedProjectIds: [], skippedProjectIds: <all requested> }` without revalidating. This mirrors `setProjectFavorite`'s tolerant delete.

> **Group verify.** When `groupId` is non-null, verify the group is owned exactly as in Task 6 before any membership write.

**Step 7.1 — Failing tests.**

```ts
describe("bulkAssignProjectsToGroup", () => {
  it("throws on an empty selection", async () => {
    const stub = makeSupabaseStub();
    supabaseMocks.createSupabaseServerClient.mockResolvedValue(stub.client);
    const { bulkAssignProjectsToGroup } = await import("@/lib/workshop/group-actions");

    await expect(bulkAssignProjectsToGroup({ projectIds: [], groupId: GROUP_ID })).rejects.toThrow(
      /select at least one|no projects/i,
    );
    expect(stub.calls).toEqual([]);
  });

  it("throws when the batch contains an invalid id", async () => {
    const stub = makeSupabaseStub();
    supabaseMocks.createSupabaseServerClient.mockResolvedValue(stub.client);
    const { bulkAssignProjectsToGroup } = await import("@/lib/workshop/group-actions");

    await expect(
      bulkAssignProjectsToGroup({ projectIds: [PROJECT_ID, "nope"], groupId: GROUP_ID }),
    ).rejects.toThrow(/invalid/i);
    expect(stub.calls).toEqual([]);
  });

  it("upserts one membership per verified owned project, returns the moved ids, and revalidates once", async () => {
    const stub = makeSupabaseStub();
    stub.queueResult("workspace_members", { data: { role: "owner" }, error: null }); // LD-2 role read
    // ownership verify returns both projects (with workspace_id for FK-safe stamping)
    stub.queueResult("projects", {
      data: [
        { id: PROJECT_ID, workspace_id: WORKSPACE_ID, created_by: USER_ID },
        { id: PROJECT_ID_2, workspace_id: WORKSPACE_ID, created_by: USER_ID },
      ],
      error: null,
    });
    // group ownership verify
    stub.queueResult("project_groups", { data: { id: GROUP_ID }, error: null });
    // membership upsert resolves ok
    stub.queueResult("project_group_memberships", { data: null, error: null });
    supabaseMocks.createSupabaseServerClient.mockResolvedValue(stub.client);
    const { bulkAssignProjectsToGroup } = await import("@/lib/workshop/group-actions");

    const result = await bulkAssignProjectsToGroup({
      projectIds: [PROJECT_ID, PROJECT_ID_2],
      groupId: GROUP_ID,
    });

    const upsert = stub.calls.find((c) => c.op === "upsert");
    expect(upsert?.table).toBe("project_group_memberships");
    expect(Array.isArray(upsert?.payload)).toBe(true);
    expect((upsert?.payload as Array<{ project_id: string }>).map((r) => r.project_id).sort()).toEqual(
      [PROJECT_ID, PROJECT_ID_2].sort(),
    );
    expect(upsert?.options).toEqual({ onConflict: "user_id,project_id" });
    // LD-11 result shape
    expect(result.movedProjectIds.sort()).toEqual([PROJECT_ID, PROJECT_ID_2].sort());
    expect(result.skippedProjectIds).toEqual([]);
    // exactly one revalidate pair
    expect(nextCacheMocks.revalidatePath).toHaveBeenCalledTimes(2);
  });

  it("returns the non-owned requested ids as skippedProjectIds (LD-11 partial failure)", async () => {
    const stub = makeSupabaseStub();
    stub.queueResult("workspace_members", { data: null, error: null }); // no workspace role
    // Only PROJECT_ID is owned (created_by === user); PROJECT_ID_2 is owned by someone else.
    stub.queueResult("projects", {
      data: [
        { id: PROJECT_ID, workspace_id: WORKSPACE_ID, created_by: USER_ID },
        { id: PROJECT_ID_2, workspace_id: WORKSPACE_ID, created_by: "someone-else" },
      ],
      error: null,
    });
    stub.queueResult("project_groups", { data: { id: GROUP_ID }, error: null });
    stub.queueResult("project_group_memberships", { data: null, error: null });
    supabaseMocks.createSupabaseServerClient.mockResolvedValue(stub.client);
    const { bulkAssignProjectsToGroup } = await import("@/lib/workshop/group-actions");

    const result = await bulkAssignProjectsToGroup({
      projectIds: [PROJECT_ID, PROJECT_ID_2],
      groupId: GROUP_ID,
    });

    expect(result.movedProjectIds).toEqual([PROJECT_ID]);
    expect(result.skippedProjectIds).toEqual([PROJECT_ID_2]);
  });

  it("deletes memberships for the verified projects when groupId is null", async () => {
    const stub = makeSupabaseStub();
    stub.queueResult("workspace_members", { data: { role: "owner" }, error: null });
    stub.queueResult("projects", { data: [{ id: PROJECT_ID, workspace_id: WORKSPACE_ID, created_by: USER_ID }], error: null });
    stub.queueResult("project_group_memberships", { data: null, error: null });
    supabaseMocks.createSupabaseServerClient.mockResolvedValue(stub.client);
    const { bulkAssignProjectsToGroup } = await import("@/lib/workshop/group-actions");

    const result = await bulkAssignProjectsToGroup({ projectIds: [PROJECT_ID], groupId: null });

    const del = stub.calls.find((c) => c.op === "delete");
    expect(del?.table).toBe("project_group_memberships");
    expect(stub.calls.some((c) => c.op === "upsert")).toBe(false);
    expect(result.movedProjectIds).toEqual([PROJECT_ID]);
  });

  it("is a no-op (NOT a throw) on the remove path when nothing verifies (LD-8)", async () => {
    const stub = makeSupabaseStub();
    stub.queueResult("workspace_members", { data: null, error: null }); // no role
    stub.queueResult("projects", { data: [], error: null }); // nothing owned
    supabaseMocks.createSupabaseServerClient.mockResolvedValue(stub.client);
    const { bulkAssignProjectsToGroup } = await import("@/lib/workshop/group-actions");

    const result = await bulkAssignProjectsToGroup({ projectIds: [PROJECT_ID], groupId: null });

    expect(result).toEqual({ movedProjectIds: [], skippedProjectIds: [PROJECT_ID] });
    expect(stub.calls.some((c) => c.op === "delete")).toBe(false);
    expect(nextCacheMocks.revalidatePath).not.toHaveBeenCalled();
  });

  it("throws on the ASSIGN path when none of the requested projects are owned/in-workspace", async () => {
    const stub = makeSupabaseStub();
    stub.queueResult("workspace_members", { data: null, error: null });
    stub.queueResult("projects", { data: [], error: null }); // nothing verified
    supabaseMocks.createSupabaseServerClient.mockResolvedValue(stub.client);
    const { bulkAssignProjectsToGroup } = await import("@/lib/workshop/group-actions");

    await expect(
      bulkAssignProjectsToGroup({ projectIds: [PROJECT_ID], groupId: GROUP_ID }),
    ).rejects.toThrow(/not.*found|workspace/i);
    expect(stub.calls.some((c) => c.op === "upsert")).toBe(false);
  });

  it("allows an owned-via-workspace-role project even when created_by !== user (LD-2/LD-5)", async () => {
    // D9/LD-5: a delete-blocked but OWNED project is still bulk-groupable. Ownership
    // here comes from the workspace role, not created_by — the bare created_by gate
    // would wrongly skip it.
    const stub = makeSupabaseStub();
    stub.queueResult("workspace_members", { data: { role: "editor" }, error: null }); // workspace role ⇒ owned
    stub.queueResult("projects", { data: [{ id: PROJECT_ID, workspace_id: WORKSPACE_ID, created_by: "someone-else" }], error: null });
    stub.queueResult("project_groups", { data: { id: GROUP_ID }, error: null });
    stub.queueResult("project_group_memberships", { data: null, error: null });
    supabaseMocks.createSupabaseServerClient.mockResolvedValue(stub.client);
    const { bulkAssignProjectsToGroup } = await import("@/lib/workshop/group-actions");

    const result = await bulkAssignProjectsToGroup({ projectIds: [PROJECT_ID], groupId: GROUP_ID });

    expect(result.movedProjectIds).toEqual([PROJECT_ID]);
    expect(result.skippedProjectIds).toEqual([]);
    expect(stub.calls.some((c) => c.op === "upsert")).toBe(true);
  });
});
```

- [ ] Run tests → **Expected FAIL**.

**Step 7.2 — Implement.**

```ts
export async function bulkAssignProjectsToGroup(input: {
  projectIds: string[];
  groupId: string | null;
}): Promise<BulkAssignProjectsToGroupResult> {
  const { ids, issues } = normalizeBulkActionIds(input.projectIds, {
    label: "projects",
    max: MAX_BULK_ASSIGN_PROJECTS,
  });
  const blocking = issues.find(
    (issue) =>
      issue.code === "empty_selection" ||
      issue.code === "invalid_id" ||
      issue.code === "batch_limit_exceeded",
  );
  if (blocking) throw new Error(blocking.message);

  const { workspace, profile } = await ensureDefaultWorkspace();
  const supabase = await createSupabaseServerClient();

  // Batched LD-2 OWNERSHIP verify (§1.5): only ids the user OWNS — in-workspace AND
  // (workspace-role member OR created_by === user), created_by nullable. NOT a bare
  // `.eq("created_by", …)` (would refuse owned-via-role + null-created_by rows). Each
  // verified row carries its workspace_id so membership rows are composite-FK-safe.
  const verified = await verifyOwnedProjectIds(supabase, ids, workspace.id, profile.id);
  const verifiedIds = verified.map((row) => row.id);
  // LD-11: anything requested-but-not-verified is "skipped" (forged/foreign/non-owned).
  const verifiedSet = new Set(verifiedIds);
  const skippedProjectIds = ids.filter((id) => !verifiedSet.has(id));

  if (input.groupId === null) {
    // LD-8 remove path: zero-verify is a NO-OP (not a throw) — removing membership
    // from no eligible projects is a benign idempotent outcome.
    if (verifiedIds.length === 0) {
      return { movedProjectIds: [], skippedProjectIds };
    }
    const { error } = await supabase
      .from("project_group_memberships")
      .delete()
      .eq("user_id", profile.id)
      .in("project_id", verifiedIds);

    if (error) throw error;
    revalidateWorkshop();
    return { movedProjectIds: verifiedIds, skippedProjectIds };
  }

  // Assign path: zero-verify IS an error (the user asked to group projects and none
  // were eligible) — honest failure to surface.
  if (verifiedIds.length === 0) {
    throw new Error("None of the selected projects were found in this workspace.");
  }

  assertUuid(input.groupId, "Group");
  const { data: group, error: groupError } = await supabase
    .from("project_groups")
    .select("id")
    .eq("id", input.groupId)
    .eq("user_id", profile.id)
    .eq("workspace_id", workspace.id)
    .maybeSingle();

  if (groupError) throw groupError;
  if (!group) throw new Error("Group was not found in this workspace.");

  const rows = verified.map((project) => ({
    group_id: group.id,
    // workspace_id from the verified project row (composite-FK-safe), not ensureDefaultWorkspace.
    workspace_id: project.workspace_id,
    user_id: profile.id,
    project_id: project.id,
  }));

  const { error } = await supabase
    .from("project_group_memberships")
    .upsert(rows, { onConflict: "user_id,project_id" });

  if (error) throw error;
  revalidateWorkshop();
  return { movedProjectIds: verifiedIds, skippedProjectIds };
}
```

- [ ] Run tests → **PASS**. `bun run type-check` → **PASS**.

**Step 7.3 — Commit.**

```bash
git add src/lib/workshop/group-actions.ts tests/vitest/project-group-actions.test.ts
git commit -m "feat(groups): bulkAssignProjectsToGroup (normalize+verify, batched upsert/delete, single revalidate)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 8 — Source-contract guards (skeleton parity, single-action contract, error-shape stability)

**Files**
- Modify: `tests/vitest/project-group-actions.test.ts`

These mirror the static-source style used by `project-collaboration-actions.test.ts` and `library-action-errors.test.ts`: cheap, fast guards that freeze the contract so a future refactor cannot silently drift the skeleton, leak a raw DB error, or re-introduce the banned alias.

**Step 8.1 — Add the source guards.**

```ts
import { readFileSync as readSource } from "node:fs";

describe("project group actions — source contract", () => {
  const src = readSource("src/lib/workshop/group-actions.ts", "utf8");

  it("is a server-action module cloning the favorites skeleton", () => {
    expect(src).toContain('"use server"');
    expect(src).toContain("ensureDefaultWorkspace");
    expect(src).toContain("createSupabaseServerClient");
    expect(src).toContain('revalidatePath("/workshop")');
    expect(src).toContain('revalidatePath("/workshop/projects")');
  });

  it("ships exactly one assignment action (no setProjectGroupMembership)", () => {
    expect(src).toContain("export async function moveProjectToGroup");
    expect(src).not.toContain("setProjectGroupMembership");
  });

  it("enforces app-layer caps from the shared constants module and never adds a DB length/check constraint here", () => {
    // Caps are imported from the shared (non-"use server") module so the UI can't drift.
    expect(src).toContain('from "@/lib/workshop/group-constants"');
    expect(src).toContain("MAX_PROJECT_GROUPS");
    expect(src).toContain("MAX_PROJECT_GROUP_NAME_LENGTH");
    expect(src).toContain("ProjectGroupCapError");
    expect(src).toContain("ProjectGroupNameError");
    // The cap VALUES live in the constants module, asserted once there.
    const constants = readSource("src/lib/workshop/group-constants.ts", "utf8");
    expect(constants).toContain("MAX_PROJECT_GROUPS = 50");
    expect(constants).toContain("MAX_PROJECT_GROUP_NAME_LENGTH = 40");
  });

  it("translates the duplicate-name unique violation by code + constraint, distinct from the membership unique (LD-8)", () => {
    expect(src).toContain('"23505"');
    // Disambiguates the name index from the membership unique(user_id, project_id).
    expect(src).toContain("isDuplicateNameViolation");
    // It must not blanket-translate ALL 23505s into a name error.
    expect(src).not.toMatch(/isUniqueViolation\([^)]*\)\)\s*\{\s*throw new ProjectGroupNameError/);
  });

  it("uses onConflict user_id,project_id for one-to-many membership", () => {
    expect(src).toContain('onConflict: "user_id,project_id"');
  });

  it("upserts memberships through project_group_memberships and never sets a projects.group_id column", () => {
    expect(src).toContain("project_group_memberships");
    expect(src).not.toMatch(/from\("projects"\)[\s\S]{0,80}update\(/);
  });

  it("gates assignment on the LD-2 OWNERSHIP derivation, not mere readability and not a bare created_by eq (D9/D11/LD-2)", () => {
    // The gate is the repo `owned` predicate (in-workspace AND (workspace-role OR
    // created_by === user)), applied in app code via the shared helper — NOT a single
    // SQL `.eq("created_by", profile.id)`, which would miss owned-via-workspace-role
    // rows and silently drop created_by-IS-NULL rows (created_by is nullable).
    expect(src).toContain("verifyOwnedProjectIds");
    expect(src).toContain("workspace_members"); // the workspace-role read the predicate needs
    expect(src).toContain("created_by === userId"); // the app-layer predicate, not a SQL eq
    expect(src).not.toContain('.eq("created_by"'); // the bare-eq gate is forbidden (LD-2)
  });

  it("bulkAssignProjectsToGroup returns the typed partial-failure result (LD-11)", () => {
    expect(src).toContain("movedProjectIds");
    expect(src).toContain("skippedProjectIds");
  });

  it("caps the reorder fan-out at MAX_PROJECT_GROUPS (LD-8)", () => {
    expect(src).toMatch(/orderedGroupIds\.length\s*>\s*MAX_PROJECT_GROUPS/);
  });
});
```

- [ ] Run: `bunx vitest run tests/vitest/project-group-actions.test.ts`
  - **Expected PASS** (the implementation from Tasks 0–7 already satisfies all guards; if any fail, the failure points at a real skeleton/contract drift — fix the production code, not the test).

**Step 8.2 — Commit.**

```bash
git add tests/vitest/project-group-actions.test.ts
git commit -m "test(groups): freeze server-action skeleton + single-action + cap contracts

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 9 — Full-suite green + type-check + targeted validation gate

**Files**
- (none — verification only)

This phase is shared-logic/data-integrity-adjacent (RLS-trusting server actions), so it warrants a focused validation pass — but it touches no UI suite, so the broad RTL gate is unnecessary here (that belongs to Phase 7d).

**Step 9.1 — Run the new action suite + type-check.**

- [ ] `bunx vitest run tests/vitest/project-group-actions.test.ts`
  - **Expected:** all tests pass (Tasks 0–8).
- [ ] `bun run type-check`
  - **Expected:** no errors. (If `project_groups`/`project_group_memberships` are flagged as unknown tables, 7a's `types.ts` regen is missing — STOP and finish 7a.)

**Step 9.2 — Confirm zero collateral damage to neighboring action suites** (this module is new, but it imports two shared helpers; a fast sanity run proves nothing else regressed):

- [ ] `bunx vitest run tests/vitest/bulk-action-validation.test.ts tests/vitest/workshop-favorites-schema.test.ts`
  - **Expected:** unchanged — both pass. (We reused `normalizeBulkActionIds` read-only and did not touch favorites.)

**Step 9.3 — Manual contract re-read against the spine (no code).**

- [ ] Re-open spine §4 and confirm each signature in `group-actions.ts` matches **exactly** (names, param shapes, return types): `createProjectGroup → Promise<{ id: string }>`, `bulkAssignProjectsToGroup → Promise<{ movedProjectIds: string[]; skippedProjectIds: string[] }>` (LD-11), the rest → `Promise<void>`; `moveProjectToGroup` is the single assignment action; `bulkAssignProjectsToGroup` uses `projectIds`/`groupId`.
- [ ] Confirm the dual `revalidatePath` pair fires on every success path and **not** on validation-rejected paths (asserted by the tests, but eyeball it).

**Step 9.4 — Final commit (if any tidy-ups were made).**

```bash
git add -A
git commit -m "chore(groups): phase 7b server-actions verified green

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Appendix A — Error shapes the client rollback (§5.5) depends on

Phase 7d's optimistic layer distinguishes failures by **error class**, so these are part of the contract:

| Thrown | When | Client surface |
|---|---|---|
| `ProjectGroupNameError` | empty/`>40`-char name, or duplicate (`23505`) | inline name-field error in the Manage-groups popover ("name required / too long / already exists") |
| `ProjectGroupCapError` | 50-group cap on create | the soft-cap at-limit message in the Manage-groups popover |
| `Error("…accent…")` | unknown accent token | should never reach a user (UI only offers the 8 swatches); surfaces as a generic toast if it does |
| `Error("Project was not found in this workspace.")` / `"Group was not found in this workspace."` / `"None of the selected projects were found in this workspace."` (assign path only) | D9/LD-2 ownership verify failure (forged/foreign/non-owned id, or cross-tab deletion) | failure toast + restore previous override (§5.5 rollback) |
| `{ movedProjectIds, skippedProjectIds }` (LD-11 — a RESULT, not a throw) from `bulkAssignProjectsToGroup` with `skippedProjectIds.length > 0` | a subset of the selection was not owned/in-workspace (partial failure) | keep optimistic state for `movedProjectIds`, roll back `skippedProjectIds`, toast "N of M moved" |
| raw Supabase `error` (rethrown) | unexpected DB error | failure toast + rollback |

> **LD-11 partial failure is a RESULT, not a throw.** `bulkAssignProjectsToGroup` resolves to `{ movedProjectIds, skippedProjectIds }` so the client can keep optimistic overrides for moved ids and roll back only the skipped ones. The **remove path** (`groupId: null`) with zero eligible projects is a benign no-op (`{ movedProjectIds: [], skippedProjectIds: <requested> }`); the **assign path** with zero eligible projects throws the "None of the selected projects…" error above (the user asked to move into a group and none qualified). `moveProjectToGroup` (single project) still throws on verify failure.

> The optimistic mutation flow (set override → call action → on resolve `router.refresh()` then **clear** the override key → on reject restore previous + toast) is owned by Phase 7d (§5.5 / D14). This phase only guarantees the **thrown error classes/messages and the LD-11 result shape** above so 7d can branch on them.

## Appendix B — Why no `setProjectGroupMembership` and no `projects.group_id`

- **Single assignment action.** The spine (§4.6) and `openContractRisks` are explicit: ship **only** `moveProjectToGroup` (`null` = remove). A separate `setProjectGroupMembership` would be a duplicate surface and a contract collision. Task 6's test and Task 8's source guard both enforce its absence.
- **No `projects.group_id`.** Membership lives in `project_group_memberships` (D3). The Task 8 guard asserts this module never issues `from("projects").update(...)`, so a future refactor cannot regress to a column write.

## Appendix C — Mock-shape pitfalls (read before debugging a red test)

- `.maybeSingle()` / `.single()` resolve `data` to **one object or `null`**, never an array. For the `max(position)` read, queue `{ data: { position: N } }` or `{ data: null }` — not `[{ position: N }]`. (Flagged inline in Task 1.)
- The LD-2 ownership gate (`verifyOwnedProjectIds`, §1.5) does **two** reads per call, on two different tables: first `workspace_members` via `.maybeSingle()` (queue `{ data: { role: "owner" } }` for a member, `{ data: null }` for a non-member), then `projects` via `.in("id", ids)` (queue an **array** of `{ id, workspace_id, created_by }`). Because the stub queues per-table, push the `workspace_members` result and the `projects` result independently; their relative order does not matter, but a `moveProjectToGroup`/`bulkAssignProjectsToGroup` test that omits the `workspace_members` entry will read the default `{ data: null }` (treated as "no role") — fine for created_by-owned cases, but you MUST queue a role to exercise the owned-via-workspace-role path.
- The batched ownership reads (`.in("id", ids)` without `.single()`) resolve `data` to an **array**. Queue `{ data: [{ id, workspace_id, created_by }, …] }`.
- The count read (`{ count: "exact", head: true }`) returns `{ count, data, error }`; queue `{ data: [], error: null, count: N }`.
- The stub consumes one queued result per `from(table)` terminal access **in order** — script multi-step actions (verify → mutate) by pushing results in call order. If a test goes red with "not implemented" gone but a wrong branch taken, you likely queued results in the wrong order or for the wrong table.
