# 02 Codebase Research

## Research method

This planning pass used the available GitHub connector to inspect repository metadata and source files, plus local shell commands for date/environment checks. The connector exposed read/fetch/search tools but no repository write API; direct `git clone` was attempted and failed because the container could not resolve `github.com`.

## Repository identity and status evidence

| Evidence | Result |
|---|---|
| Repository search | Found exact private repo `pjel888/archestimator`, default branch `main`, clone URL `https://github.com/pjel888/archestimator.git`. |
| Repository permissions | GitHub metadata reported admin/maintain/pull/push permissions for the authenticated connector user. |
| Recent commit search | Latest visible commit: `d5f24b17e838a00b38964feebb61960051492e6a`, message `docs: update final report with commit SHA`. |
| Package manager/runtime | `package.json` uses Bun scripts and Next.js. |
| Local date command | `date +%F` returned `2026-06-03`. |
| Local clone attempt | `git clone --depth 1 https://github.com/pjel888/archestimator.git` failed with `Could not resolve host: github.com`. |

Local git worktree commands required by the prompt (`git status --short`, `git branch --show-current`, `git worktree list`, `git remote -v`, `git fetch --prune origin`, `git log --oneline -5`) could not be run against the real repository because no local checkout was available and network DNS blocked cloning. This is an environment limitation, not a repository blocker.

## Framework, package manager, and scripts

Verified in `package.json`:

- App name: `archestimator`.
- Framework scripts: `dev`, `build`, `start` use Next commands.
- Verification scripts:
  - `lint`: `eslint`
  - `lint:design-system`: `node scripts/enforce-app-design-system.mjs`
  - `type-check`: `tsc --noEmit`
  - `test`: `bun test tests/unit`
  - `test:dom`: `vitest run --maxWorkers=1`
  - `test:e2e`: `playwright test`
  - `validate`: `bun run type-check && bun run lint && bun run lint:design-system && bun run test && bun run test:dom`
- Key dependencies: Next `16.2.6`, React `19.2.6`, Supabase SSR/client packages, TanStack Query, Zustand, Phosphor icons, Tailwind CSS v4, Vitest, Playwright.

Verified in `tsconfig.json`:

- Strict TypeScript enabled.
- JSX mode: `react-jsx`.
- Path alias: `@/*` maps to `./src/*`.
- Tests and e2e are excluded from `tsc --noEmit`; DOM tests are handled by Vitest.

Verified in `vitest.config.ts`:

- Environment: `jsdom`.
- Setup file: `tests/vitest/setup.ts`.
- Test include: `tests/vitest/**/*.test.{ts,tsx}`.
- Alias: `@` to `./src`, `server-only` to test stub.

Verified in `playwright.config.ts`:

- Test directory: `./e2e`.
- Browser project: Chromium only.
- Dev server command: `bun run dev -- --port ${PLAYWRIGHT_PORT ?? "3020"}`.

## `.ai` folder conventions inspected

Files inspected:

- `.ai/README.md`
- `.ai/01_roadmap/README.md`
- `.ai/04_tasks/README.md`
- `.ai/05_logs/README.md`
- `.ai/10_state/current-state.md`
- Recent `.ai/03_plans/...` commit diffs for plan-pack conventions.

Relevant conventions:

- `.ai/` is the shared project brain for all agents.
- New agents read `.ai/README.md`, `.ai/00_system/...`, `.ai/10_state/current-state.md`, `.ai/10_state/decisions.md`, and `DESIGN.md` first.
- `.ai/03_plans/` is the correct location for proposed plans before implementation.
- `.ai/04_tasks/README.md` says to create a new task board only after a current narrow screen/workflow brief is approved.
- `.ai/05_logs/README.md` says logs should summarize what happened, evidence, unresolved risks, and next action.
- `.ai/10_state/current-state.md` is the canonical state file.
- `.ai/15_Bugs` was not found as an existing folder when the plan was originally drafted via GitHub-read-only inspection. Local verification during 2026-06-03 refinement confirmed `.ai/15_Bugs/` exists with 6 bug files, including `2026-06-03-shared-project-favorite-action-rejects-visible-shared-projects.md`.

## Product/design system evidence

Verified in `DESIGN.md`:

- Product/workshop UI uses SF Pro app scale.
- Product app title/body/button/text sizes are 8px–12px.
- Rounded values use `rounded-xs`/3px style.
- Colors are neutral: `ink`, `secondary`, `tertiary`, `hairline`, `surface`, `surfaceMuted`, `focus`, etc.

Implementation implication: tabs must use the existing compact app UI scale (`text-[8px]` to `text-[10px]`, `rounded-xs`, `border-hairline`, neutral surfaces). Do not introduce larger marketing typography inside `/workshop`.

## Routing/page structure relevant to this task

### `src/app/workshop/projects/page.tsx`

Current behavior:

```tsx
const { projects, favoriteProjectIds } = await listCurrentWorkspaceProjects();

return (
  <WorkshopPageShell title="Projects" ...>
    <ProjectsPageClient projects={projects} favoriteProjectIds={favoriteProjectIds} />
  </WorkshopPageShell>
);
```

Implication: server data already arrives as props. The tabs should remain client-side categorization; no new route or server action is required.

### `src/app/workshop/page.tsx`

Relevant because homebase also surfaces invite state and project counts:

- Imports `PENDING_INVITE_COOKIE` and `getWorkshopHomebaseData()`.
- Redirects to `/workshop/pending-invite` when a pending invite cookie exists and no invite banner is shown.
- Passes `sidebarStatus={{ projectsBadgeCount: homebase.receivedPendingInviteCount }}` into `WorkshopPageShell`.

Implementation implication: the Projects page should not duplicate pending-invite routing logic; it should display pending invites already returned by `listCurrentWorkspaceProjects()`.

### `src/app/workshop/projects/[projectId]/page.tsx`

Current project detail route:

- Calls `getCurrentWorkspaceProject(projectId)`.
- Redirects removed UUID projects back to `/workshop?removedProject=...`.
- Renders `ProjectDashboardClient`.

Implementation implication: tab changes must not alter project card links or detail routing.

## Projects page client evidence

### `src/components/workshop/projects-page-client.tsx`

Important current structures:

- `ProjectListItem` wraps `project`, `accessKind`, `currentUserRole`, owner/pending/publication metadata, and `sharedEstimateCount`.
- `normalizeProjectListItem()` maps bare `Tables<"projects">` to `accessKind: "owned"`, `currentUserRole: "owner"`.
- Current access filter is `PROJECT_ACCESS_FILTER_OPTIONS = ["all", "owned", "shared"]`.
- `ProjectAccessFilter` state starts as `"all"`.
- `getProjectAccessSearchText()` includes shared/pending/owner/role/invite text in search.
- `hasSharedProjects = projectItems.some((item) => item.accessKind !== "owned")`.
- Current filter logic:
  - `owned`: `item.accessKind === "owned"`
  - `shared`: `item.accessKind !== "owned"`
  - `all`: no access filter
- Current tablist is rendered only when `hasSharedProjects` is true.
- Current visible labels are `All`, `Owned`, `Shared`, not the requested labels.
- Current tablist is inside `WorkshopCollectionLayout` children, meaning it scrolls with the collection body.
- Current cards pass `onToggleFavorite={toggleProjectFavorite}` to all displayed live project cards.

Implementation implication: most of the data splitting already exists, but the product IA, labels, default behavior, placement, empty states, and shared favorite safety need correction.

## Collection layout evidence

### `src/components/workshop/WorkshopCollectionLayout.tsx`

Relevant API:

- Props include `toolbarPanel?: ReactNode`.
- Rendering order is search row, `HeaderIconToolbar`, then `{toolbarPanel}`, then scrollable content body.

Implementation implication: primary tabs should use `toolbarPanel` to appear above the scroll body. This avoids the current inline filter floating with cards.

## Project card/access evidence

### `src/components/workshop/LiveProjectCard.tsx`

Relevant types and behavior:

- `ProjectAccessKind = "owned" | "pending-invite" | "project-member" | "sheet-member"`.
- `getAccessBadgeLabel()` maps shared states to `Pending invite`, `Shared project`, and `Sheet-only`.
- `getAccessibleAccessLabel()` builds accessible labels including owned/shared/sheet/pending role text.
- Pending invite cards render Accept/Expired controls using `acceptPendingInvitationById`.
- Favorite star controls are currently hidden only for pending invites; shared project/member and sheet-member cards still render the star button when shown through `ProjectsPageClient`.

Implementation implication: shared cards already communicate role/access kind, but favorite control must not remain broken when the shared tab becomes more prominent.

## Data layer evidence

### `src/lib/repositories/workspace-repository.ts`

Relevant types:

- `WorkshopProjectAccessKind = "owned" | "pending-invite" | "project-member" | "sheet-member"`.
- `WorkshopProjectListItem` includes `project`, `accessKind`, `currentUserRole`, `ownerWorkspaceName`, `pendingInvite`, `pendingInviteCount`, `publicationSummary`, `sharedEstimateCount`.

Relevant `listCurrentWorkspaceProjects()` behavior:

1. Ensures default workspace/profile.
2. Queries current workspace projects ordered by `updated_at`.
3. Queries `project_favorites` for current workspace and user.
4. Queries `project_members` for the current user.
5. Queries `estimate_sheet_members` for the current user.
6. Queries current `workspace_members` role.
7. Computes `sharedProjectIds` from project members and sheet members, excluding IDs already owned by current workspace.
8. Fetches shared projects by those IDs.
9. Resolves access kind through `createWorkshopProjectAccessResolver()`.
10. Reads project publication summaries.
11. Reads pending collaboration invitations through `list_pending_collaboration_invitations` RPC.
12. Appends pending invite items where the project is not already accepted/visible.
13. Returns `projects` and `favoriteProjectIds`.

Implementation implication: no new data fetch is required for tabs. The client should derive tab arrays from the returned `projects` prop.

### `createWorkshopProjectAccessResolver()` behavior

- Uses project-members and sheet-members maps.
- Treats projects in the current workspace as `owned` when the user has a workspace role or created the project.
- Otherwise resolves `project-member`, then `sheet-member`, then fallback `owned`.
- Computes current role and `sharedEstimateCount`.

Implementation implication: tab grouping must trust the resolved `accessKind`; do not re-derive from workspace IDs client-side.

## Collaboration type evidence

### `src/lib/collaboration/types.ts`

- `CollaborationRole = "owner" | "admin" | "editor" | "viewer"`.
- Project collaborator summaries distinguish `source: "project" | "workspace" | "sheet"`.
- Estimate sheet access modes already exist.

Implementation implication: no new role enums are needed for the tab feature.

## Favorite action bug evidence

### `src/lib/workshop/actions.ts`

`setProjectFavorite()`:

- Validates project UUID.
- Resolves current `workspace` and `profile`.
- For favorite insert, queries `projects` with both `.eq("id", projectId)` and `.eq("workspace_id", workspace.id)`.
- Throws `Project was not found in this workspace.` when the project is not in the current workspace.
- Inserts into `project_favorites` with `workspace_id: workspace.id`.

### `src/lib/supabase/types.ts`

`project_favorites` relationship:

- `project_favorites_project_workspace_fkey` references `projects(id, workspace_id)`.

Implementation implication: a shared project from another workspace cannot be safely favorited using the current action. Because `ProjectsPageClient` passes `toggleProjectFavorite` to all cards, shared cards can expose a broken star action. This is documented as a bug in `.ai/15_Bugs/2026-06-03-shared-project-favorite-action-rejects-visible-shared-projects.md`.

## Existing testing patterns

Verified in `tests/vitest/project-publication-page.test.tsx`:

- Uses `@testing-library/react` `render`, `screen`, `within`.
- Uses `userEvent` for interactions.
- Uses `vitest` `beforeEach`, `describe`, `expect`, `it`, `vi`.
- Mocks Next and repository modules where needed.
- Some tests inspect source files with `readFileSync` for contract-level assertions.

Implementation implication: add a focused DOM test under `tests/vitest/projects-page-access-tabs.test.tsx` using the same Testing Library/Vitest style. Mock navigation and server actions rather than hitting Supabase.

## Existing related feature / partial implementation

The current Projects page already has a partial access filter. It is not aligned with the new requirement because:

- It has three choices (`All`, `Owned`, `Shared`) instead of the requested two.
- It is hidden unless shared items exist.
- It defaults to `All`, which weakens the ownership/shared mental model.
- It lacks tab panels and robust keyboard behavior.
- It sits inside the scroll body rather than the toolbar panel.
- It exposes the shared favorite bug.

This is a useful base, not a blocker.

## Gaps and unknowns

| Gap | Impact | Resolution |
|---|---|---|
| Full local repo tree was not available. | Could not verify every possible ProjectsPageClient test or all e2e spec names. | Future implementation agent must run `rg "ProjectsPageClient|PROJECT_ACCESS_FILTER_OPTIONS|LiveProjectCard" tests src e2e` in the real repo before editing. |
| GitNexus/code-review-graph tools were unavailable here. | Could not perform graph impact analysis required by `AGENTS.md`. | Implementation agent must run available graph impact/detect-changes tools before commit. |
| No local tests could run against the real checkout. | Could not prove current baseline. | Implementation agent must run validation commands before and after changes if possible. |
| Shared-project favorite product decision not explicitly requested. | The new shared tab makes the bug more visible. | Low-risk decision: hide/suppress favorite controls for non-owned cards and track proper shared favorites as separate future work if desired. |
