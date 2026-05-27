# Teamspace Collaboration Header Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the Teamspaces header cluster, project/sheet collaboration summaries, RBAC schema foundation, and realtime-ready collaboration hooks without disturbing the estimate workspace geometry.

**Architecture:** Keep layout changes in `ProjectWorkspaceHeaderRow` and a new focused `ProjectTeamspaceHeader` client component. Keep data loading in `workspace-repository.ts`, backed by a migration that introduces durable project and estimate-sheet access tables plus RLS helper functions.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Supabase Auth/RLS/Realtime, Bun, Vitest, React Testing Library, Tailwind v4.

---

### Task 1: Header UI And Modal

**Files:**
- Create: `src/components/workshop/ProjectTeamspaceHeader.tsx`
- Modify: `src/components/workshop/ProjectWorkspaceHeaderRow.tsx`
- Modify: `src/app/workshop/projects/[projectId]/layout.tsx`
- Test: `tests/vitest/teamspace-collaboration-header.test.tsx`
- Test: `tests/vitest/project-dashboard-ui.test.ts`

- [ ] **Step 1: Write the failing UI tests**

```tsx
render(<ProjectTeamspaceHeader summary={summary} />);
expect(screen.getByLabelText("Project teamspaces")).toHaveTextContent("Teamspaces");
await user.click(screen.getByRole("button", { name: "Open teamspace settings" }));
expect(screen.getByRole("dialog", { name: "Teamspace settings" })).toBeInTheDocument();
expect(screen.getByText("Project access")).toBeInTheDocument();
expect(screen.getByText("Estimate sheet access")).toBeInTheDocument();
```

- [ ] **Step 2: Run the tests and verify red**

Run: `bunx vitest run tests/vitest/teamspace-collaboration-header.test.tsx --maxWorkers=1`

Expected: FAIL because `ProjectTeamspaceHeader` does not exist.

- [ ] **Step 3: Implement the minimal component**

Create a compact client component with a `Teamspaces` label, avatar stack, settings icon, and modal. Use the existing `Modal`, `Button`, and compact product UI classes.

- [ ] **Step 4: Wire it into the header seam**

Add a `rightContent` slot to `ProjectWorkspaceHeaderSurface`, render it as an absolute right-side sibling of `EstimateCenterColumnBoundary`, and pass the project collaboration summary from the route layout.

- [ ] **Step 5: Verify green**

Run: `bunx vitest run tests/vitest/teamspace-collaboration-header.test.tsx tests/vitest/project-dashboard-ui.test.ts --maxWorkers=1`

Expected: PASS.

### Task 2: Collaboration Repository Summary

**Files:**
- Modify: `src/lib/repositories/workspace-repository.ts`
- Create: `src/lib/collaboration/types.ts`
- Test: `tests/vitest/project-collaboration-summary.test.ts`

- [ ] **Step 1: Write the failing repository tests**

```ts
expect(summary.projectChannel).toBe("project:project-1");
expect(summary.estimateChannelPrefix).toBe("estimate:");
expect(summary.collaborators[0].role).toBe("owner");
expect(summary.estimateSheets[0].accessMode).toBe("inherits-project");
```

- [ ] **Step 2: Run the tests and verify red**

Run: `bunx vitest run tests/vitest/project-collaboration-summary.test.ts --maxWorkers=1`

Expected: FAIL because `getProjectCollaborationSummary` does not exist.

- [ ] **Step 3: Implement shared types**

Define `CollaborationRole`, `ProjectCollaboratorSummary`, `EstimateSheetAccessSummary`, and `ProjectCollaborationSummary`.

- [ ] **Step 4: Implement repository read**

Read workspace members, optional project members, estimates, optional sheet settings, optional sheet members, and visible profiles. Gracefully fall back when new collaboration tables are not migrated yet.

- [ ] **Step 5: Verify green**

Run: `bunx vitest run tests/vitest/project-collaboration-summary.test.ts --maxWorkers=1`

Expected: PASS.

### Task 3: Supabase RBAC And Sheet Access Migration

**Files:**
- Create: `supabase/migrations/20260526142913_project_sheet_collaboration_access.sql`
- Modify: `src/lib/supabase/types.ts`
- Test: `tests/vitest/project-collaboration-schema.test.ts`

- [ ] **Step 1: Generate migration file**

Run: `supabase migration new project_sheet_collaboration_access`

Expected: new empty migration under `supabase/migrations`.

- [ ] **Step 2: Write the failing schema test**

```ts
expect(migration).toContain("create type public.collaboration_role");
expect(migration).toContain("create table if not exists public.project_members");
expect(migration).toContain("create table if not exists public.estimate_sheet_members");
expect(migration).toContain("create or replace function public.can_edit_estimate");
expect(migration).toContain("realtime.messages");
```

- [ ] **Step 3: Run the test and verify red**

Run: `bunx vitest run tests/vitest/project-collaboration-schema.test.ts --maxWorkers=1`

Expected: FAIL because the migration content is not implemented.

- [ ] **Step 4: Implement migration**

Add `profiles.avatar_url`, `collaboration_role`, `project_members`, `estimate_sheet_access_settings`, `estimate_sheet_members`, role helper functions, split RLS policies for project/estimate data, and private Realtime authorization policies.

- [ ] **Step 5: Update generated types**

Add the new enum and table type entries to `src/lib/supabase/types.ts` so TypeScript repository code can query the tables.

- [ ] **Step 6: Verify green**

Run: `bunx vitest run tests/vitest/project-collaboration-schema.test.ts --maxWorkers=1`

Expected: PASS.

### Task 4: Realtime-Ready Client Hooks

**Files:**
- Create: `src/hooks/use-project-presence.ts`
- Create: `src/hooks/use-estimate-cursor-broadcast.ts`
- Test: `tests/vitest/project-collaboration-realtime.test.ts`

- [ ] **Step 1: Write the failing realtime tests**

```ts
expect(PROJECT_COLLABORATION_CHANNEL_PREFIX).toBe("project:");
expect(ESTIMATE_COLLABORATION_CHANNEL_PREFIX).toBe("estimate:");
expect(CURSOR_BROADCAST_EVENT).toBe("cursor");
expect(PRESENCE_STATE_PURPOSE).toBe("online-state");
```

- [ ] **Step 2: Run the test and verify red**

Run: `bunx vitest run tests/vitest/project-collaboration-realtime.test.ts --maxWorkers=1`

Expected: FAIL because the hooks/constants do not exist.

- [ ] **Step 3: Implement constants and hooks**

Use Presence for online state and Broadcast for throttled cursor events. Subscribe only when a valid project or estimate id exists. Remove channels during cleanup.

- [ ] **Step 4: Verify green**

Run: `bunx vitest run tests/vitest/project-collaboration-realtime.test.ts --maxWorkers=1`

Expected: PASS.

### Task 5: Integration Verification

**Files:**
- Modify: `.ai/10_state/current-state.md`
- Modify: `.ai/10_state/decisions.md`

- [ ] **Step 1: Run targeted tests**

Run: `bunx vitest run tests/vitest/teamspace-collaboration-header.test.tsx tests/vitest/project-collaboration-summary.test.ts tests/vitest/project-collaboration-schema.test.ts tests/vitest/project-collaboration-realtime.test.ts tests/vitest/project-dashboard-ui.test.ts --maxWorkers=1`

Expected: PASS.

- [ ] **Step 2: Run static checks**

Run: `bun run type-check`

Expected: PASS.

Run: `bun run lint`

Expected: PASS.

Run: `bun run lint:design-system`

Expected: PASS.

- [ ] **Step 3: Run graph change detection**

Run code-review-graph `detect_changes` and review impacted flows.

- [x] **Step 4: Update project state docs**

Record that Teamspaces header UI, project/sheet collaboration schema, invite delivery, role mutation UI, private-channel presence, and visible cursor Broadcast are present. Linked Supabase migration `20260526142913` was applied and repaired into remote migration history on 2026-05-27.
