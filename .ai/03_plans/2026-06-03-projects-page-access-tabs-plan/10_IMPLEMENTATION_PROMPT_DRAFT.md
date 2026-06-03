# 10 Implementation Prompt Draft

Use this prompt for the future frontier implementation agent.

---

You are implementing the Archestimator Projects page access tabs feature.

This is no longer a planning task. Implement the plan in:

```text
.ai/03_plans/2026-06-03-projects-page-access-tabs-plan/
```

## Goal

On `/workshop/projects`, replace the current optional `All / Owned / Shared` access filter with two always-visible tabs:

1. `Your Projects`
2. `Projects shared to you`

`Your Projects` must show only `accessKind === "owned"`.
`Projects shared to you` must show `accessKind !== "owned"`, including `project-member`, `sheet-member`, and `pending-invite`.

## Required source files to inspect first

```text
src/app/workshop/projects/page.tsx
src/components/workshop/projects-page-client.tsx
src/components/workshop/LiveProjectCard.tsx
src/components/workshop/WorkshopCollectionLayout.tsx
src/lib/repositories/workspace-repository.ts
src/lib/workshop/actions.ts
src/lib/collaboration/types.ts
tests/vitest/project-publication-page.test.tsx
```

Also inspect current tests:

```bash
rg "ProjectsPageClient|LiveProjectCard|workshop/projects|PROJECT_ACCESS_FILTER_OPTIONS|ProjectAccessFilter" src tests e2e
```

## Non-negotiable requirements

- Do not add an `All` tab.
- Do not create a new route.
- Do not add dependencies.
- Do not add migrations.
- Do not change collaboration invite creation/acceptance rules.
- Keep `ProjectsPageClient` props backward compatible.
- Use `WorkshopCollectionLayout.toolbarPanel` for the tabs.
- Preserve search, view mode, card rendering, project creation, project details modal, pending invite acceptance, and owned favorite behavior.
- Suppress or fix the shared-project favorite bug documented at `.ai/15_Bugs/2026-06-03-shared-project-favorite-action-rejects-visible-shared-projects.md`.

## Recommended implementation steps

1. Run required git safety checks.
2. Run repo graph/impact tools if available per `AGENTS.md`.
3. Replace `PROJECT_ACCESS_FILTER_OPTIONS` / `ProjectAccessFilter` with a `ProjectAccessTab` model.
4. Partition `projectItems` into `ownedProjectItems` and `sharedProjectItems`.
5. Initialize active tab to shared when owned count is zero and shared count is greater than zero; otherwise owned.
6. Render `ProjectAccessTabs` through `WorkshopCollectionLayout.toolbarPanel`.
7. Implement accessible tabs with IDs, `aria-controls`, `aria-selected`, tabpanels, and Arrow/Home/End keyboard support.
8. Filter search within the active tab only.
9. Add tab-specific empty states.
10. Hide/suppress favorite controls for non-owned project cards unless implementing a fully tested shared-favorite data model.
11. Add `tests/vitest/projects-page-access-tabs.test.tsx`.
12. Run verification commands.
13. Update `.ai` task/log/state/bug files.
14. Commit and push.

## Required verification commands

```bash
bun run type-check
bun run lint
bun run lint:design-system
bun run test:dom -- tests/vitest/projects-page-access-tabs.test.tsx --maxWorkers=1
bun run test:dom --maxWorkers=1
bun run validate
```

Optional but recommended:

```bash
bun run build
PLAYWRIGHT_PORT=3020 bun run test:e2e -- --project=chromium
```

## Required final report fields

Your final implementation report must include:

1. Files changed.
2. What behavior changed on `/workshop/projects`.
3. How owned/shared/pending records are categorized.
4. How the shared-project favorite bug was handled.
5. Tests added/updated.
6. Verification commands run and exact results.
7. Manual smoke checks run, if any.
8. `.ai` updates made.
9. Bug plans created/updated.
10. Git branch, commit hash, push status.
11. Remaining risks or follow-ups.

## Known risks

- Existing current code already has a tablist-like filter, but it is not the requested UX and is incomplete as a tab pattern.
- `setProjectFavorite()` rejects externally owned shared projects; do not expose a broken star button in the shared tab.
- Users with only shared projects need the shared tab active by default.
- Do not let search copy imply the user lost access when they are only searching the wrong tab.

## Bug protocol

If you discover a new bug, failing test, security risk, migration mismatch, or unclear dependency:

1. Create a dated bug plan in `.ai/15_Bugs/`.
2. Classify it using the attached planning protocol.
3. Reference it from the implementation log and affected plan docs.
4. Do not hide the issue to claim completion.

---

Implementation should be a small UI/data split, not a collaboration-system rewrite.
