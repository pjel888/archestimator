# 04 Implementation Sequence

## Before editing

Run these in the real repository root:

```bash
git status --short
git branch --show-current
git worktree list
git remote -v
git fetch --prune origin
git log --oneline -5
```

Stop if unrelated dirty files overlap any file in this plan. Do not use `git reset --hard`, `git clean -fd`, force push, or stage unrelated changes.

Also run available graph/impact tools required by `AGENTS.md` before modifying symbols:

- Impact for `ProjectsPageClient`.
- Impact for `LiveProjectCard` if touched.
- Detect changes before commit.

If graph tools are unavailable, document that in the implementation log and compensate with `rg`/manual trace.

## Step 1 — Baseline reconnaissance

**Purpose:** Verify the plan is not stale.

Commands:

```bash
rg "PROJECT_ACCESS_FILTER_OPTIONS|ProjectAccessFilter|hasSharedProjects|ProjectsPageClient" src/components/workshop src/app tests e2e
rg "LiveProjectCard" src tests e2e
rg "setProjectFavorite" src tests e2e
```

Files to inspect:

- `src/app/workshop/projects/page.tsx`
- `src/components/workshop/projects-page-client.tsx`
- `src/components/workshop/LiveProjectCard.tsx`
- `src/components/workshop/WorkshopCollectionLayout.tsx`
- `src/lib/repositories/workspace-repository.ts`
- `src/lib/workshop/actions.ts`
- `tests/vitest/` for nearby component test conventions

Validation after step:

- Confirm `ProjectsPageClient` still owns the current access filter.
- Confirm `listCurrentWorkspaceProjects()` still returns mixed access records.
- Confirm no existing test already covers the exact requested tabs.

Rollback point: no code changed.

## Step 2 — Add the tab model in `projects-page-client.tsx`

**Purpose:** Replace the optional three-filter model with the requested two-tab model.

Expected changes:

1. Remove:

```ts
const PROJECT_ACCESS_FILTER_OPTIONS = ["all", "owned", "shared"] as const;
type ProjectAccessFilter = (typeof PROJECT_ACCESS_FILTER_OPTIONS)[number];
const [accessFilter, setAccessFilter] = useState<ProjectAccessFilter>("all");
```

2. Add:

```ts
const PROJECT_ACCESS_TABS = [
  { id: "your-projects", label: "Your Projects" },
  { id: "shared-to-you", label: "Projects shared to you" },
] as const;

type ProjectAccessTab = (typeof PROJECT_ACCESS_TABS)[number]["id"];
```

3. Partition data:

```ts
const ownedProjectItems = useMemo(
  () => projectItems.filter((item) => item.accessKind === "owned"),
  [projectItems],
);
const sharedProjectItems = useMemo(
  () => projectItems.filter((item) => item.accessKind !== "owned"),
  [projectItems],
);
```

4. Initialize active tab:

```ts
const initialTab: ProjectAccessTab = ownedProjectItems.length === 0 && sharedProjectItems.length > 0
  ? "shared-to-you"
  : "your-projects";
const [activeTab, setActiveTab] = useState<ProjectAccessTab>(initialTab);
```

Implementation detail: because hooks run in order, derive `projectItems`, `ownedProjectItems`, and `sharedProjectItems` before calling `useState(initialTab)`. Do not conditionally call hooks.

Validation after step:

```bash
bun run type-check
```

Rollback point: revert `projects-page-client.tsx` to the previous filter model.

## Step 3 — Move tabs into `WorkshopCollectionLayout.toolbarPanel`

**Purpose:** Make tabs primary page IA, not a scrolling inline filter.

Expected changes:

1. Add a local component in `projects-page-client.tsx`, e.g. `ProjectAccessTabs`.
2. Pass it through `toolbarPanel`:

```tsx
<WorkshopCollectionLayout
  ...
  toolbarPanel={
    <ProjectAccessTabs
      activeTab={activeTab}
      ownedCount={ownedProjectItems.length}
      sharedCount={sharedProjectItems.length}
      onTabChange={setActiveTab}
    />
  }
>
```

3. Remove the old inline block:

```tsx
{hasSharedProjects ? (
  <div role="tablist" aria-label="Project access filter">...</div>
) : null}
```

Tab rendering requirements:

- Use `role="tablist"` and `aria-label="Project access tabs"`.
- Each tab must have stable ID:
  - `projects-tab-your-projects`
  - `projects-tab-shared-to-you`
- Each tab must set `aria-controls`:
  - `projects-panel-your-projects`
  - `projects-panel-shared-to-you`
- Each tab must set `aria-selected`.
- Add keyboard handling for `ArrowLeft`, `ArrowRight`, `Home`, `End`.
- Use existing design system classes: compact height, `rounded-xs`, `border-hairline`, `bg-white`, `bg-surfaceMuted`, `text-[10px]`, neutral colors.

Validation after step:

- Manual DOM check with React Testing Library once tests exist.
- Temporary manual browser check is acceptable before tests.

Rollback point: remove `toolbarPanel` and restore old block.

## Step 4 — Render active tab content and empty states

**Purpose:** Ensure content matches the selected tab and supports clear first-run/shared-empty states.

Expected changes:

1. Compute active list:

```ts
const activeBaseProjects = activeTab === "your-projects" ? ownedProjectItems : sharedProjectItems;
```

2. Filter active list by search:

```ts
const displayProjects = useMemo(() => {
  if (!searchQuery.trim()) return activeBaseProjects;
  const q = searchQuery.toLowerCase();
  return activeBaseProjects.filter(...existing search logic...);
}, [activeBaseProjects, searchQuery]);
```

3. Replace `hasLiveProjects` logic with tab-aware conditions:

- `hasAnyLiveProjects = projectItems.length > 0`
- `hasActiveProjects = activeBaseProjects.length > 0`
- `hasDisplayProjects = displayProjects.length > 0`

4. Render active panel:

```tsx
<section
  id={activePanelId}
  role="tabpanel"
  aria-labelledby={activeTabId}
  aria-label={activeTab === "your-projects" ? "Your projects" : "Projects shared to you"}
>
```

5. Empty state copy:

- Owned no live projects/no search: reuse/create-first-project copy and Create Project action.
- Owned no search but user has only shared projects: `No projects created yet`; description: `Create your first project here, or switch to shared projects to open work others invited you into.`
- Owned search miss: `No projects match your search`; description mentions owned project name/client/code/location.
- Shared no search: `No projects shared to you yet`; description: `When someone invites you as a viewer, editor, admin, or sheet collaborator, the project will appear here.`
- Shared search miss: `No shared projects match your search`; description mentions project name, owner, role, invite code, or shared sheet.

6. Sample cards:

- Preserve sample reference cards only for the original first-run case: no live project items at all, active tab is `your-projects`, and either no search or sample search matches.
- Do not show sample cards in `Projects shared to you`.

Validation after step:

```bash
bun run type-check
bun run lint
```

Rollback point: restore old `hasLiveProjects` rendering block.

## Step 5 — Fix/suppress shared favorite behavior

**Purpose:** Prevent the new shared tab from exposing a known broken favorite action.

Recommended low-risk implementation:

1. In `LiveProjectCard.tsx`, render the star button only if a favorite handler is available and the card is not a pending invite:

```ts
const canToggleFavorite = Boolean(onToggleFavorite) && !isPendingInvite;
```

2. In `ProjectsPageClient`, pass favorite handler only for owned cards:

```tsx
const canFavoriteProject = item.accessKind === "owned";

<LiveProjectCard
  ...
  isFavorite={canFavoriteProject && favoriteIds.has(item.project.id)}
  favoriteBusy={canFavoriteProject && pendingFavoriteId === item.project.id}
  onToggleFavorite={canFavoriteProject ? toggleProjectFavorite : undefined}
/>
```

3. Do not alter `setProjectFavorite()` or `project_favorites` in this task.

Alternative if product requires shared favorites now:

- Redesign `project_favorites` semantics and RLS/queries to support accessible external shared projects.
- Add migration/tests.
- This is explicitly out of scope unless Philip approves it.

Validation after step:

- DOM test verifies shared cards do not expose `Add <shared project> to favorite projects`.
- Existing owned project favorite behavior still works.

Rollback point: revert `LiveProjectCard.tsx` and restore original favorite handler passing. If reverting, document that the shared favorite bug remains.

## Step 6 — Add focused DOM tests

**Purpose:** Prove the UI behavior without Supabase or browser E2E dependency.

Create:

```text
tests/vitest/projects-page-access-tabs.test.tsx
```

Recommended test setup:

- Import `render`, `screen`, `within` from Testing Library.
- Import `userEvent`.
- Mock `@/hooks/use-navigation-router` to return `{ refresh: vi.fn(), push: vi.fn(), replace: vi.fn() }` as needed.
- Mock `@/lib/workshop/actions` `setProjectFavorite` to avoid server action execution.
- If `next/dynamic` causes issues, mock it following existing Vitest patterns or avoid opening dynamic modals.
- Construct minimal `ProjectListItem` fixtures with complete `Tables<"projects">` fields:
  - `id`
  - `workspace_id`
  - `name`
  - `client_name`
  - `project_code`
  - `location`
  - `currency_code`
  - `metadata`
  - `created_at`
  - `updated_at`
  - `created_by`

Test cases:

1. Renders exactly two tabs with requested labels and no `All`/`Owned`/`Shared` filter labels.
2. Defaults to `Your Projects` when owned projects exist.
3. Shows owned cards in `Your Projects` and hides shared cards.
4. Switching to `Projects shared to you` shows project-member, sheet-member, and pending-invite cards and hides owned cards.
5. Defaults to `Projects shared to you` when the user has shared projects but zero owned projects.
6. Search filters only the active tab.
7. Empty shared tab shows invitation-oriented copy and no create action.
8. Shared project cards do not expose favorite star controls unless the broader favorite model is intentionally implemented.
9. Arrow/Home/End keyboard navigation changes active tab/focus.

Validation after step:

```bash
bun run test:dom -- tests/vitest/projects-page-access-tabs.test.tsx --maxWorkers=1
```

Rollback point: remove the new test file and revert source changes.

## Step 7 — Full verification

Run:

```bash
bun run type-check
bun run lint
bun run lint:design-system
bun run test
bun run test:dom -- tests/vitest/projects-page-access-tabs.test.tsx --maxWorkers=1
bun run test:dom --maxWorkers=1
bun run validate
```

Recommended smoke checks:

1. Owned-only account: `/workshop/projects` opens `Your Projects`; shared tab empty copy is clear.
2. Shared-only account: `/workshop/projects` opens `Projects shared to you`; open card works.
3. Mixed account: each tab shows correct counts and cards.
4. Pending invite: invite appears in shared tab and Accept still posts.
5. Search: search miss in one tab does not imply no records in the other tab.
6. View mode: list/small/medium/large still changes grid and persists.

Rollback point: revert the feature branch. No migration rollback required.

## Step 8 — Documentation and git finalization

Update `.ai`:

- Mark `.ai/04_tasks/...` as implemented once code is complete.
- Add `.ai/05_logs/...` implementation log with commands/results.
- Update `.ai/10_state/current-state.md` or a dated state note according to repo convention.
- Update the bug file status:
  - `RESOLVED_IN_FEATURE` if the favorite control is suppressed/fixed.
  - `OPEN_NON_BLOCKING` if intentionally deferred.

Git commands:

```bash
git status --short
git diff --stat
git diff -- .ai src tests
git add src/components/workshop/projects-page-client.tsx src/components/workshop/LiveProjectCard.tsx tests/vitest/projects-page-access-tabs.test.tsx .ai
git commit -m "feat(projects): add owned and shared projects tabs"
git pull --rebase origin main
git push origin HEAD
```

If the implementation is done on a task branch, merge to `main` only after validation and review.

## What not to touch

- Do not edit Supabase migrations for the tab-only version.
- Do not edit `package.json`, `bun.lock`, `next.config.ts`, or build configuration.
- Do not change collaboration invitation acceptance internals.
- Do not change shared-link/publication logic.
- Do not change project detail routing.
- Do not delete sample project references unless a separate product decision approves their removal.
- Do not introduce an `All` tab.
