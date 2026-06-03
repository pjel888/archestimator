# 18 Implementation Agent Handoff Checklist

**Plan:** Projects Page Access Tabs
**Plan slug:** `projects-page-access-tabs`
**Plan folder:** `.ai/03_plans/2026-06-03-projects-page-access-tabs-plan/`
**Date:** 2026-06-03
**Status:** `IMPLEMENTED_LOCAL_VERIFIED_ARCHIVED`
**Base branch:** `main`
**Remote:** `origin` → `https://github.com/pjel888/archestimator.git`

---

## 1. Pre-Edit Repository Safety Checks

```bash
git status --short --branch
git branch --show-current
git worktree list
git remote -v
git fetch --prune origin
git log --oneline -5
```

**Gate:** Stop if dirty files overlap any file in scope. Do NOT use `git reset --hard`, `git clean -fd`, or force push.

## 2. Plan-Reality Reconnaissance

```bash
rg "PROJECT_ACCESS_FILTER_OPTIONS|ProjectAccessFilter|hasSharedProjects" src/components/workshop/projects-page-client.tsx
rg "selectedForDeletion|selectionDisabledReason|onToggleSelected" src/components/workshop/LiveProjectCard.tsx
rg "toolbarPanel" src/components/workshop/WorkshopCollectionLayout.tsx
rg "selectableDisplayProjectIds|openProjectDeletePreview|BulkActionToolbar" src/components/workshop/projects-page-client.tsx
```

- [ ] Current filter model matches plan assumptions
- [ ] `LiveProjectCard` props match plan assumptions
- [ ] `toolbarPanel` prop still available
- [ ] Bulk delete machinery intact

## 3. Graph / Impact Tools (per AGENTS.md)

If GitNexus or code-review-graph tools available:
- [ ] Impact analysis for `ProjectsPageClient`
- [ ] Impact analysis for `LiveProjectCard` (if editing)
- [ ] `detect_changes` before commit

If unavailable: document in implementation log.

## 4. Source Files

| File | Lines | Edit? |
|------|-------|-------|
| `src/components/workshop/projects-page-client.tsx` | 497 | **YES** — primary target |
| `src/components/workshop/LiveProjectCard.tsx` | 396 | **YES** — favorite guard only |
| `src/components/workshop/WorkshopCollectionLayout.tsx` | 90 | INSPECT only |
| `src/lib/workshop/actions.ts` | — | **DO NOT modify** |
| `src/lib/repositories/workspace-repository.ts` | — | **DO NOT modify** |
| `src/app/workshop/projects/page.tsx` | — | **DO NOT modify** |

## 5. Implementation Milestones

### M1: Replace filter model with tab model
- [ ] Remove `PROJECT_ACCESS_FILTER_OPTIONS`, `ProjectAccessFilter`, `accessFilter`
- [ ] Add `PROJECT_ACCESS_TABS` const, `ProjectAccessTab` type
- [ ] Derive `ownedProjectItems`, `sharedProjectItems` via `useMemo`
- [ ] Initialize `activeTab`: default `"shared-to-you"` when owned=0 and shared>0
- [ ] Derive memoized values BEFORE `useState(initialTab)`

**Verify:** `bun run type-check`

### M2: Move tabs into toolbarPanel
- [ ] Create local `ProjectAccessTabs` component
- [ ] Pass via `WorkshopCollectionLayout.toolbarPanel`
- [ ] Remove old inline `{hasSharedProjects ? (<div role="tablist">...)}` block
- [ ] Full tab a11y: `role="tablist"`, stable IDs, `aria-controls`, `aria-selected`, Arrow/Home/End keys
- [ ] Design system: `rounded-xs`, `border-hairline`, `text-[10px]`

**Verify:** `bun run lint:design-system`

### M3: Tab-aware content and empty states
- [ ] `activeBaseProjects` from active tab
- [ ] Search within active tab only
- [ ] Tab-specific empty copy (owned/shared/search-miss)
- [ ] `<section>` with `role="tabpanel"`, `aria-labelledby`
- [ ] Sample cards: first-run owned-only case only

**Verify:** `bun run type-check && bun run lint`

### M4: Reconcile bulk-delete with tab filtering
- [ ] Verify `selectableDisplayProjectIds` derives from tab-filtered display list
- [ ] Verify `selectedVisibleProjectIds` scoped to active-tab visible
- [ ] Verify `openProjectDeletePreview` uses `projectItems` (not `displayProjects`)
- [ ] "Select all visible" = active-tab only; "Clear" = global

**Verify:** `bun run type-check`

### M5: Suppress shared favorite
- [ ] Pass `onToggleFavorite` only when `accessKind === "owned"`
- [ ] Pass `isFavorite` / `favoriteBusy` only when owned
- [ ] `LiveProjectCard` star renders only when `onToggleFavorite` provided

**Verify:** DOM test confirms shared cards lack star

### M6: Tests
Create `tests/vitest/projects-page-access-tabs.test.tsx` with 9+ test cases (see `06_TESTING_AND_VERIFICATION_PLAN.md`)

**Verify:** `bun run test:dom -- tests/vitest/projects-page-access-tabs.test.tsx --maxWorkers=1`

### M7: Full verification
```bash
bun run type-check && bun run lint && bun run lint:design-system
bun run test:dom --maxWorkers=1
bun run validate
bun run build
```

### M8: Git operations
```bash
git add src/components/workshop/projects-page-client.tsx src/components/workshop/LiveProjectCard.tsx tests/vitest/projects-page-access-tabs.test.tsx .ai
git commit -m "feat(projects): add owned and shared projects tabs"
git push origin HEAD
```

## 6. Verification Commands

| Purpose | Command |
|---|---|
| Type check | `bun run type-check` |
| Lint | `bun run lint` |
| Design lint | `bun run lint:design-system` |
| Targeted tests | `bun run test:dom -- tests/vitest/projects-page-access-tabs.test.tsx --maxWorkers=1` |
| All DOM tests | `bun run test:dom --maxWorkers=1` |
| Full validate | `bun run validate` |
| Build | `bun run build` |

## 7. Bug Closure

File: `.ai/15_Bugs/2026-06-03-shared-project-favorite-action-rejects-visible-shared-projects.md`
- [ ] Update status to `RESOLVED_IN_FEATURE` if favorite suppressed (M5), or `OPEN_NON_BLOCKING` if deferred

## 8. .ai Updates After Implementation
- [ ] Implementation log in `.ai/05_logs/`
- [ ] State note in `.ai/10_state/`
- [ ] After merge: archive plan to `.ai/09_archive/`

## 9. What NOT to Touch
- Supabase migrations, `package.json`, lockfile, build config, route files
- `src/lib/repositories/workspace-repository.ts`
- `src/lib/workshop/actions.ts`
- Collaboration, shared-link, project detail routing
- Secrets/environment variables

## 10. Final Implementation Report

Must include: files changed, behavior change summary, how owned/shared/pending categorized, how shared favorite handled, tests added, verification results, manual smoke checks, .ai updates, bug plans updated, git branch/commit/push status, remaining risks.

## 11. Merge Policy
- Do NOT auto-merge to main unless Philip explicitly authorizes
- Default: feature branch + PR
- `git pull --rebase origin main` before push if behind

---

*This checklist was created during the 2026-06-03 plan refinement. Follow `04_IMPLEMENTATION_SEQUENCE.md` for detailed step-by-step instructions. See `14_CODE_DRIFT_AND_RECONCILIATION_PLAN.md` for drift findings reconciled during refinement.*


## Completion checklist status

Completed in the 2026-06-03 implementation pass:

- Pre-edit repo safety checks completed; worktree started clean.
- GitNexus index refreshed and impact analysis run before editing `ProjectsPageClient` and `LiveProjectCard` (LOW risk).
- code-review-graph review context run after implementation (low risk; sparse graph reported 0 impacted nodes).
- Milestones M1-M6 implemented in `projects-page-client.tsx`, `LiveProjectCard.tsx`, and focused Vitest DOM tests.
- Validation gates passed: type-check, lint, design-system lint, targeted DOM, full unit, full DOM, validate, and build.
- Bug plan `.ai/15_Bugs/2026-06-03-shared-project-favorite-action-rejects-visible-shared-projects.md` updated to `RESOLVED_IN_FEATURE`.
- Plan archived to `.ai/09_archive/store/2026-06-03-projects-page-access-tabs-complete/` after local verification.

The original merge policy warned against auto-merge by default, but the execution prompt for this autonomous task explicitly requested commit/push, main merge verification, push, archive, and cleanup when gates pass.
