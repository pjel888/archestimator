# Implementation Sequence

**Scope:** Future implementation only. This docs pass did not run these steps.

## Phase 0 - Baseline And Safety

**Likely files:** `.ai/03_plans/...`, `package.json` read-only, `src/components/ui`, `src/components/workshop`, `src/components/share`, `tests/vitest`, `scripts/enforce-app-design-system.mjs`

1. Verify repo state: `git status --short --branch`, `git branch --show-current`, `git worktree list`, `git log --oneline -5`.
2. Re-run GitNexus/code-review graph impact checks for intended source touchpoints.
3. Confirm `package.json` has no Storybook scripts/deps before installation.
4. Confirm `DESIGN.md` constraints and design-system lint behavior.

**Validation:** `git diff --check`; no source/package changes yet.
**Rollback point:** No-op if only evidence docs changed.

## Phase 1 - Storybook Package And Configuration

**Likely files:** `package.json`, `bun.lock`, `.storybook/main.ts`, `.storybook/preview.tsx`, `.storybook/preview-head.html`, `src/stories/fixtures/*`, `.gitignore` if needed.

1. Confirm Philip approved Storybook package installation.
2. Re-check official Storybook Next.js docs.
3. Choose `@storybook/nextjs-vite` unless current repo compatibility requires `@storybook/nextjs`.
4. Run the approved Storybook install command using Bun-compatible workflow.
5. Configure stories glob, app directory parameter, global CSS import, static assets, and decorators/mocks.

**Validation:** `bun run storybook`, `bun run build-storybook`, `git diff --check`.
**Rollback point:** Revert Storybook package/config commit.

## Phase 2 - Foundations

**Likely files:** `src/components/ui/*`, `src/stories/fixtures/*`, `*.stories.tsx`.

1. Add token gallery docs/stories.
2. Add icon gallery and `AppIcon` wrapper plan implementation if approved.
3. Add typography primitives/stories only if they reduce repeated usage.
4. Add P0 primitive stories for current Button, SearchInput, Badge, Chip, Modal, ContextMenu, Toast, Skeleton, EmptyState, toolbar controls.

**Validation:** `bun run lint:design-system`, `bun run test:dom`, Storybook start/build.
**Rollback point:** Revert foundation story/component commit.

## Phase 3 - Forms, Menus, Overlays, Navigation, Data Display, Layout

**Likely files:** `src/components/ui/forms`, `src/components/ui/overlays`, `src/components/ui/navigation`, `src/components/ui/data-display`, `src/components/ui/layout`.

1. Build only missing P1 primitives that have repeated use cases.
2. Add stories for state coverage: default, hover/focus where representable, active/selected, disabled, loading, error, empty, success, destructive, compact/dense, responsive.
3. Add keyboard/a11y notes and play-function candidates.

**Validation:** targeted component tests where behavior-heavy; `bun run validate`; Storybook start/build.
**Rollback point:** Revert category commit.

## Phase 4 - Domain Components

**Likely files:** `src/components/workshop/ui`, `src/components/share/ui`, `src/features/notifications/components`, story fixtures.

1. Add static fixture builders for projects, estimates, component library rows, share snapshots, comments, notifications, and release announcements.
2. Add domain stories without live Supabase/provider imports.
3. Preserve existing tree sub-plan boundaries. Use stories to inspect tree shells before any production migration.

**Validation:** Storybook renders offline; no provider imports in story dependency graph; relevant DOM tests if components are extracted.
**Rollback point:** Revert domain story/component commit.

## Phase 5 - Motion And Microinteractions

**Likely files:** `src/components/ui/motion`, stories, token docs.

1. Implement CSS/reduced-motion-safe wrappers first.
2. Add Aceternity-inspired components only after dependency/performance approval.
3. Mark landing-only effects separately.

**Validation:** reduced-motion viewport/manual check; Storybook start/build; design lint.
**Rollback point:** Revert motion commit.

## Phase 6 - Governance And Future Migration Readiness

**Likely files:** `.ai`, component library README, optional source README.

1. Update component inventory and acceptance checklist.
2. Draft or update future agent usage rules.
3. Record Storybook review instructions.
4. Stop and ask Philip to inspect Storybook.

**Validation:** docs diff check; Storybook build evidence; no production app migration diff.
**Rollback point:** Revert governance/docs commit.

## What Not To Touch

- No Supabase migrations or generated types.
- No provider settings.
- No production route migration.
- No live data calls in stories.
- No package changes before approval.
- No `main` merge unless a future prompt explicitly authorizes it.

## When To Update `.ai`

Update `.ai` during implementation when:

- a package decision is made;
- Storybook config is selected;
- inventory priority changes;
- a component API is accepted/rejected;
- a bug/blocker is discovered;
- Philip approves or rejects Storybook;
- migration is reopened as a new plan.
