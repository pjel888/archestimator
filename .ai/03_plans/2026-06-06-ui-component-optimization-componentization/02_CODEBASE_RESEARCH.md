# Codebase Research

**Date accessed:** 2026-06-06
**Mode:** Docs-only repo evidence pass

## Commands Run

| Command | Result |
|---|---|
| `pwd` | `/Users/philiplewis/archestimator` |
| `git rev-parse --show-toplevel` | `/Users/philiplewis/archestimator` |
| `git status --short --branch` | Branch `docs/ui-component-plan-refinement-2026-06-06`; docs-only dirty `.ai` files before continuation edits. |
| `git branch --show-current` | `docs/ui-component-plan-refinement-2026-06-06` |
| `git worktree list` | Main worktree plus `archestimator.omx-worktrees/launch-plan-performance-and-speed`. |
| `git remote -v` | `origin https://github.com/pjel888/archestimator.git` |
| `git fetch --prune origin` | Updated `origin/feat/ux-ui-improvements` from `235785c` to `1174d99`. |
| `git log --oneline -5` | Earlier local commit before this plan-pack expansion: `495dfaa docs(ai): preserve UI plan refinement prompt`. |
| `npx gitnexus analyze --index-only --name archestimator /Users/philiplewis/archestimator` | Indexed successfully at current commit. |
| `npx gitnexus status` | Up to date at commit `495dfaa`. |
| `mcp__code_review_graph.get_minimal_context` | 5042 nodes, 74559 edges, low current diff risk. |
| `mcp__code_review_graph.get_impact_radius` | Representative UI/package touchpoints: high, 500 impacted nodes, 128 files. |
| `mcp__code_review_graph.list_communities` | Main communities include workshop-estimate, estimates-estimate, workshop-project, component-library-component. |

## Continuation Evidence - 2026-06-06 Current Turn

| Check | Current evidence |
|---|---|
| `pwd` | `/Users/philiplewis/archestimator` |
| `git rev-parse --show-toplevel` | `/Users/philiplewis/archestimator` |
| `git status --short --branch` | Branch `docs/ui-component-plan-refinement-2026-06-06`; existing dirty prompt file `.ai/08_prompts/ui-library-componentization-prompt.md` before this continuation's plan-doc edits. |
| `git branch --show-current` | `docs/ui-component-plan-refinement-2026-06-06` |
| `git worktree list` | Main worktree plus `/Users/philiplewis/archestimator.omx-worktrees/launch-plan-performance-and-speed`. |
| `git remote -v` | `origin https://github.com/pjel888/archestimator.git` |
| `git fetch --prune origin` | Completed with no output. |
| `git log --oneline -5` | Latest commit before this continuation: `ad757ca docs(ai): expand ui component library storybook plan`. |
| `code-review-graph list_graph_stats` | 560 files, 5042 nodes, 74559 edges, last updated `2026-06-07T00:04:05`. |
| `code-review-graph detect_changes base=main` | 42 changed files in branch, 0 changed functions/classes, 0 affected flows, risk score `0.00`; branch diff is docs/state/prompt only. |
| `code-review-graph semantic_search_nodes` | Found `Button`, `Modal`, `ContextMenu`, `Toast`, and `WorkshopTree`; no graph node for `SearchInput`, which file inspection confirmed under `src/components/ui/search-input.tsx`. |
| `code-review-graph get_impact_radius` | Shared UI files remain high risk: Button, Modal, ContextMenu, Toast, and WorkshopTree all have broad downstream file/node impact. |
| MCP transport note | A later code-review-graph MCP transport died; final verification must use CLI/file-backed fallback instead of retrying that transport blindly. |
| Context7 docs check | Storybook, shadcn/ui, and Tailwind CSS current-doc summaries checked. |
| Public web docs check | Storybook Next.js Vite, Flowbite Next.js/Tailwind v4, and Aceternity component catalog checked. |

## Files And Folders Inspected

- `AGENTS.md`
- `.ai/README.md`
- `.ai/00_system/DOCS_SOURCE_OF_TRUTH.md`
- `.ai/00_system/ai-folder-canonical-map.md`
- `.ai/00_system/AGENT_OPERATING_PROTOCOL.md`
- `.ai/00_system/AGENT_FRAMEWORK_PROTOCOL.md`
- `.ai/00_system/AGENT_SELF_DIAGNOSTIC_PROTOCOL.md`
- `.ai/00_system/VALIDATION_MATRIX.md`
- `.ai/10_state/current-state.md`
- `.ai/10_state/decisions.md`
- `.ai/10_state/known-issues.md`
- `.ai/01_roadmap/README.md`
- `DESIGN.md`
- `package.json`
- `README.md`
- `components.json`
- `.ai/06_specs/current-project-estimates-component-library-spec.md`
- `.ai/06_specs/feature-inventory.md`
- `.ai/06_specs/design-md-agentic-design-workflow.md`
- `.ai/09_archive/store/2026-05-29-implemented-plan-cleanup/ui-componentization-and-storybook-plan.md`
- Existing target plan folder markdown files.

## Existing Plan Docs Inspected

The old plan folder contained a useful tree-focused package: `01_UI_REUSE_AUDIT.md`, `02_TREE_PERFORMANCE_RESEARCH.md`, `03_TREE_COMPONENTIZATION_AUDIT.md`, `04_IMPLEMENTATION_PLAN.md`, `05_READINESS_VALIDATION.md`, `06_STRATEGY_CRITIQUE_AND_DECISION.md`, `07_REPO_EVIDENCE_REGISTER.md`, `08_TDD_IMPLEMENTATION_TASK_PACK.md`, `09_ULTRAQA_PLAN_QUALITY_REPORT.md`, `10_ULTRAGOAL_TEAM_HANDOFF.md`, and supporting risk, benchmark, rollout, handoff, tree contracts, and visual regression docs.

These are preserved as the Domain Tree Components and Estimate/Share Tree Sub-plan.

## Existing UI Primitives Found

`src/components/ui` currently contains:

- `action-menu.tsx`
- `badge.tsx`
- `button-link.tsx`
- `button.tsx`
- `chip.tsx`
- `context-menu.tsx`
- `control-input.tsx`
- `control-select.tsx`
- `creatable-combobox.tsx`
- `empty-state.tsx`
- `header-icon-toolbar.tsx`
- `index.tsx`
- `modal.tsx`
- `route-loading-overlay.tsx`
- `search-input.tsx`
- `skeleton.tsx`
- `toast.tsx`
- `toolbar-icon-button.tsx`
- `toolbar-icon-select.tsx`
- `toolbar-tooltip.tsx`

`src/components/ui/index.tsx` exports the current shared primitive barrel.

## Existing Workshop, Share, And Domain Components Found

Representative files:

- `src/components/workshop/EstimateSheetContent.tsx`
- `src/components/workshop/EstimateSheetTree.tsx`
- `src/components/workshop/EstimateWorkspaceClient.tsx`
- `src/components/workshop/ProjectEstimatesTable.tsx`
- `src/components/workshop/ProjectCard.tsx`
- `src/components/workshop/WorkshopPageShell.tsx`
- `src/components/workshop/WorkshopCollectionLayout.tsx`
- `src/components/workshop/component-library-manager/ComponentLibraryManager.tsx`
- `src/components/workshop/component-library-manager/AddComponentModal.tsx`
- `src/components/workshop/component-library-manager/LibraryFolderTree.tsx`
- `src/components/workshop/component-library/ComponentCard.tsx`
- `src/components/workshop/component-library/CommandPalette.tsx`
- `src/components/share/ShareEstimateTreePanel.tsx`
- `src/components/share/ShareEstimateTreeView.tsx`
- `src/components/share/SharePageTabs.tsx`
- `src/components/share/SharePageComments.tsx`
- `src/features/notifications/components/*`
- `src/components/sidebar/*`
- `src/components/landing/*`

## Existing Validation Scripts

From `package.json`:

- `bun run validate`
- `bun run build`
- `bun run lint:design-system`
- `bun run type-check`
- `bun run lint`
- `bun run test`
- `bun run test:dom`
- `bun run test:e2e`
- performance and launch verification scripts.

Storybook scripts are absent.

## Design-System Linter Behavior

`scripts/enforce-app-design-system.mjs` scans `src/app` and `src/components` outside landing allowlists. It blocks named Tailwind text sizes, text above 12px, label/meta text above 9px when uppercase, supporting text above 10px, disallowed font weights, non-`rounded-xs` radius, nonzero tracking, nonzero letter spacing, and bold/fill/duotone icon weights. It also validates global tokens in `src/app/globals.css`.

## Existing Package And Dependency State

Current relevant packages:

- Next.js `16.2.6`
- React `19.2.6`
- Tailwind CSS `^4.3.0`
- `@tailwindcss/postcss`
- `@phosphor-icons/react`
- `@radix-ui/react-context-menu`
- `@tanstack/react-query`
- `@tanstack/react-table`
- `react-complex-tree`
- `class-variance-authority`
- `clsx`
- `tailwind-merge`
- `d3`
- `zustand`

Absent from `package.json`:

- `storybook`
- `@storybook/*`
- `flowbite`
- `flowbite-react`
- `framer-motion`
- `motion`
- broad Radix primitives beyond context menu.

## Storybook Absence/Presence Verification

- `package.json` has no `storybook` or `build-storybook` scripts.
- `package.json` has no Storybook dependencies/devDependencies.
- No `.storybook` directory was found.
- No story files were found during the scoped search.

## Existing Component Naming And Import Patterns

- Shared primitives live under `src/components/ui` and export through `src/components/ui/index.tsx`.
- Most app/workshop icons import from `@phosphor-icons/react/dist/ssr`.
- `components.json` exists with shadcn `new-york`, RSC, TSX, Tailwind CSS variables, aliases for `@/components`, `@/components/ui`, `@/lib`, `@/hooks`, `@/lib/ui`, and `iconLibrary: "lucide"`.
- Future shadcn additions must reconcile `components.json` lucide default with ArchEstimator's app/workshop Phosphor rule.

## Existing Tailwind And Global CSS Architecture

`src/app/globals.css` uses Tailwind v4 CSS import, `@source not` exclusions, root CSS variables, and `@theme inline` mappings for colors, font, and radius. App/workshop surfaces use SF Pro tokens; landing switches to Inter via a landing page root selector.

## Existing Route/App Shell Constraints

Active protected workshop routes include `/workshop`, `/workshop/projects`, `/workshop/projects/[projectId]`, `/workshop/projects/[projectId]/estimates`, `/workshop/projects/[projectId]/estimates/[nodeId]`, `/workshop/library`, `/workshop/templates`, `/workshop/settings`, and sub-routes. The plan must not migrate these routes in the Storybook MVP.

## Existing Tests And Gaps

Relevant tests exist for modal/tooltip, toast, header icon toolbar, component-library UI, library folder tree, estimate sheet/tree, share tree reconstruction, project estimates tables, release announcement modal, workshop route error boundaries, and design-system contracts.

Gaps for the future UI library:

- no Storybook stories;
- no Storybook build/test runner;
- no component acceptance checklist in source;
- no automated story a11y/play tests yet;
- incomplete direct primitive coverage for all planned component categories.

## GitNexus And Code-Review Graph Evidence

- GitNexus index was refreshed in `--index-only` mode and reports current commit `495dfaa` up to date.
- GitNexus `Button` impact: CRITICAL, 107 impacted nodes, 13 processes, 13 modules.
- GitNexus `SearchInput` impact: CRITICAL, 27 impacted nodes, 2 processes, 6 modules.
- GitNexus `WorkshopTree` impact: HIGH, 8 impacted nodes.
- GitNexus share tree renderers: LOW, 1 impacted node each.
- code-review-graph representative impact for shared UI/tree/package surfaces: high risk, 500 impacted nodes, 128 files.
- code-review-graph affected flows for representative files: 0 flows, which is useful but not sufficient to weaken the high symbol/file blast-radius risk.

## External Source Research Evidence

Accessed 2026-06-06:

- Storybook Next.js with Vite docs: https://storybook.js.org/docs/get-started/frameworks/nextjs-vite/?renderer=react
- Storybook accessibility docs: https://storybook.js.org/docs/writing-tests/accessibility-testing
- shadcn/ui Tailwind v4 docs: https://ui.shadcn.com/docs/tailwind-v4
- shadcn/ui MCP docs: https://ui.shadcn.com/docs/mcp
- Flowbite introduction/components docs: https://flowbite.com/docs/getting-started/introduction/
- Flowbite MCP docs: https://flowbite.com/docs/getting-started/mcp/
- Flowbite Blocks: https://flowbite.com/blocks/
- Aceternity AI recommendations: https://ui.aceternity.com/ai-recommendations
- Tailwind CSS v4 upgrade guide: https://tailwindcss.com/docs/upgrade-guide

Continuation checks on 2026-06-06 also confirmed:

- Storybook docs still recommend `@storybook/nextjs-vite` for most Next.js projects, with `@storybook/nextjs` as the Webpack fallback for custom Webpack/Babel needs.
- Storybook Next.js Vite docs still document `nextjs.appDirectory` for stories using `next/navigation`, and `npm run storybook` / `npm run build-storybook` scripts after setup.
- Flowbite public Next.js docs now describe Flowbite React with Next.js and Tailwind CSS v4 setup, while paid/pro content remains owner/license-gated.
- Aceternity public catalog remains motion-heavy and includes free/pro components, blocks, text effects, cards, backgrounds, loaders, and interaction patterns; any app/workshop use remains dependency/performance/reduced-motion gated.

## Gaps And Unknowns

- Philip must approve Storybook package installation.
- Future implementation must re-check exact Storybook package versions before editing `package.json`.
- Future implementation must decide `@storybook/nextjs-vite` vs `@storybook/nextjs` with live compatibility checks.
- Flowbite Pro access/license is an owner decision.
- Motion/Framer-style dependencies are owner-approved only.
- Production app migration remains deferred.

## Continuation Addendum - 100/100 Handoff Closeout

- `15_COMPONENT_INVENTORY_MATRIX.md` was expanded to 809 rows so prompt-required component families are explicit rather than compressed category shorthand.
- `17_STORYBOOK_STORY_COVERAGE_MATRIX.md` was expanded to 703 P0/P1 story rows with owner-review labels, fixtures, controls, states, a11y, keyboard/play candidates, viewports, and reduced-motion posture.
- Docs `32` through `38` were added to capture source-adoption decisions, future Storybook config skeletons, fixture/decorator contracts, API references, implementation backlog, Philip review packet, and validation commands.
- No source, package, lockfile, runtime config, provider, migration, generated type, or app behavior file was changed by this docs continuation.
