# 06 Testing and Verification Plan

## Existing commands

From `package.json`:

```bash
bun run type-check
bun run lint
bun run lint:design-system
bun run test
bun run test:dom
bun run test:e2e
bun run validate
```

`bun run validate` is the strongest existing combined local command:

```bash
bun run type-check && bun run lint && bun run lint:design-system && bun run test && bun run test:dom
```

## New tests required

Create:

```text
tests/vitest/projects-page-access-tabs.test.tsx
```

Use the existing Vitest/Testing Library pattern observed in `tests/vitest/project-publication-page.test.tsx`:

```ts
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
```

## Test fixtures

Define helpers inside the test file.

Minimal project row fixture:

```ts
function createProject(overrides: Partial<Tables<"projects">> = {}): Tables<"projects"> {
  return {
    id: overrides.id ?? "00000000-0000-4000-8000-000000000001",
    workspace_id: overrides.workspace_id ?? "00000000-0000-4000-8000-100000000001",
    name: overrides.name ?? "Owned Residence",
    client_name: overrides.client_name ?? "Client A",
    project_code: overrides.project_code ?? "OWN-001",
    location: overrides.location ?? "Manila",
    currency_code: overrides.currency_code ?? "PHP",
    metadata: overrides.metadata ?? {},
    created_at: overrides.created_at ?? "2026-06-01T00:00:00.000Z",
    updated_at: overrides.updated_at ?? "2026-06-02T00:00:00.000Z",
    created_by: overrides.created_by ?? "00000000-0000-4000-8000-200000000001",
  };
}
```

Project item helper:

```ts
function createProjectItem(
  accessKind: ProjectAccessKind,
  overrides: Partial<ProjectListItem> & { project?: Partial<Tables<"projects">> } = {},
): ProjectListItem {
  return {
    project: createProject(overrides.project),
    accessKind,
    currentUserRole: overrides.currentUserRole ?? (accessKind === "owned" ? "owner" : "viewer"),
    ownerWorkspaceName: overrides.ownerWorkspaceName ?? (accessKind === "owned" ? null : "Lewis Studio"),
    pendingInvite: overrides.pendingInvite ?? null,
    pendingInviteCount: overrides.pendingInviteCount ?? 0,
    publicationSummary: overrides.publicationSummary ?? null,
    sharedEstimateCount: overrides.sharedEstimateCount ?? (accessKind === "sheet-member" ? 1 : 0),
  };
}
```

Mock navigation/action modules:

```ts
const mocks = vi.hoisted(() => ({
  refresh: vi.fn(),
  push: vi.fn(),
  replace: vi.fn(),
  setProjectFavorite: vi.fn(),
}));

vi.mock("@/hooks/use-navigation-router", () => ({
  useNavigationRouter: () => ({ refresh: mocks.refresh, push: mocks.push, replace: mocks.replace }),
}));

vi.mock("@/lib/workshop/actions", () => ({
  setProjectFavorite: mocks.setProjectFavorite,
}));
```

If `next/dynamic` causes rendering issues in Vitest, use the narrowest mock possible and document it in the test.

## Required unit/DOM test cases

### Test 1 — two requested tabs only

Input: one owned item and one shared item.

Pass conditions:

- `screen.getByRole("tab", { name: /Your Projects/i })` exists.
- `screen.getByRole("tab", { name: /Projects shared to you/i })` exists.
- `screen.queryByRole("tab", { name: /^All/i })` is null.
- `screen.queryByRole("tab", { name: /^Owned/i })` is null.
- `screen.queryByRole("tab", { name: /^Shared$/i })` is null.

### Test 2 — owned tab shows only owned projects

Input: owned, project-member, sheet-member, pending-invite.

Pass conditions:

- Initial active tab is `Your Projects` when owned count > 0.
- Owned project name is visible.
- Shared project names are not visible in the tabpanel.
- Active tab has `aria-selected="true"`.

### Test 3 — shared tab shows all non-owned access kinds

Input: owned, project-member, sheet-member, pending-invite.

Action: click `Projects shared to you`.

Pass conditions:

- Project-member project visible.
- Sheet-member project visible.
- Pending invite project visible.
- Owned project hidden.
- Access badges/copy such as `Shared project`, `Sheet-only`, or `Pending invite` remain visible where applicable.

### Test 4 — shared-only user defaults to shared tab

Input: project-member and/or pending-invite only, no owned items.

Pass conditions:

- `Projects shared to you` is selected on first render.
- Shared item is visible without requiring a click.
- `Your Projects` tab remains visible.

### Test 5 — empty shared tab copy

Input: one owned item, no shared items.

Action: click `Projects shared to you`.

Pass conditions:

- Empty state title: `No projects shared to you yet` or equivalent exact implementation copy.
- Description mentions invited/shared/editor/viewer access.
- No `Create project` action appears inside the shared empty state.

### Test 6 — search filters active tab only

Input: owned project `Owned Residence`, shared project `Shared Clinic`.

Actions:

1. With `Your Projects` active, search `Clinic`.
2. Assert owned tab empty copy appears and shared project is not shown.
3. Switch to `Projects shared to you`.
4. Assert `Shared Clinic` appears with the same search query.

Pass conditions:

- Search query is preserved across tab switch.
- Results are scoped to active tab.

### Test 7 — favorite safety

Input: owned project and project-member shared project.

Pass conditions:

- Owned card exposes `Add <project> to favorite projects` or `Remove <project> from favorite projects` as before.
- Shared card does not expose `Add <shared project> to favorite projects` unless the implementation intentionally supports shared favorites and has updated server tests.

### Test 8 — keyboard tab behavior

Input: owned and shared item.

Actions:

- Focus `Your Projects` tab.
- Press `ArrowRight`; shared tab becomes selected/focused.
- Press `ArrowLeft`; owned tab becomes selected/focused.
- Press `End`; shared tab becomes selected/focused.
- Press `Home`; owned tab becomes selected/focused.

Pass conditions:

- `aria-selected` updates.
- Visible tabpanel content updates.

## Integration tests needed

No server integration test is required if `listCurrentWorkspaceProjects()` remains unchanged. If implementation changes repository/server action behavior, add focused tests around the changed repository/action or document why current test infrastructure cannot exercise Supabase without external setup.

## E2E/manual verification

Recommended manual smoke in a seeded/dev-auth environment:

1. Owned-only account:
   - Open `/workshop/projects`.
   - Confirm `Your Projects` active and owned cards visible.
   - Switch shared tab and verify empty copy.
2. Mixed account:
   - Confirm owned cards do not appear in shared tab.
   - Confirm shared/project-member/sheet-member cards do not appear in owned tab.
3. Shared-only invited account:
   - Confirm shared tab is active by default.
   - Confirm opening a shared card goes to project detail route.
4. Pending invite account:
   - Confirm pending invite appears in shared tab.
   - Confirm Accept button remains visible and form posts.
5. Search:
   - Search for a shared project while owned tab active; confirm empty state.
   - Switch shared tab; confirm project appears.
6. View mode:
   - Toggle list/small/medium/large and switch tabs; layout remains consistent.
7. Keyboard:
   - Use Tab and arrow keys to switch tabs.

Optional E2E command:

```bash
PLAYWRIGHT_PORT=3020 bun run test:e2e -- --project=chromium
```

Use existing dev-auth/storage-state conventions if the repo has them; do not invent credentials.

## Typecheck/lint/build commands

Minimum implementation proof:

```bash
bun run type-check
bun run lint
bun run lint:design-system
bun run test:dom -- tests/vitest/projects-page-access-tabs.test.tsx --maxWorkers=1
```

Strong local proof:

```bash
bun run validate
```

Build proof if implementation touches layout broadly or if reviewer requests it:

```bash
bun run build
```

## Regression checks

Run targeted `rg` checks:

```bash
rg "PROJECT_ACCESS_FILTER_OPTIONS|ProjectAccessFilter|hasSharedProjects" src tests
rg "All|Owned|Shared" src/components/workshop/projects-page-client.tsx tests/vitest/projects-page-access-tabs.test.tsx
rg "Add .* to favorite projects" tests/vitest/projects-page-access-tabs.test.tsx src/components/workshop/LiveProjectCard.tsx
```

Pass/fail:

- Old constants/types should be gone or intentionally replaced.
- `All` should not remain as an access tab label on the Projects page.
- `Owned`/`Shared` may appear in comments/tests only if verifying removal, not as current visible labels.

## What counts as pass/fail

Pass:

- All acceptance criteria in `01_REQUIREMENTS_AND_ACCEPTANCE_CRITERIA.md` pass.
- Focused DOM tests pass.
- Full `bun run validate` passes or any unrelated pre-existing failure is documented with evidence and a bug plan.
- No production source outside planned files changes unless justified.

Fail:

- Three access tabs remain.
- Shared/pending cards appear under `Your Projects`.
- Owned cards appear under `Projects shared to you`.
- Pending invite Accept action disappears.
- Shared project cards expose a favorite action that rejects with `Project was not found in this workspace.`
- Keyboard tab navigation fails.
- `bun run type-check`, lint, design lint, or focused tests fail due to implementation changes.
