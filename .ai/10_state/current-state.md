# Current State

**Date:** 2026-05-21
**Canonical reset audit:** `.ai/02_audits/2026-05-17-reset-cleanup-audit.md`
**Active restart guardrails:** `.ai/06_specs/restart-guardrails.md`
**Agent recovery protocol:** `.ai/00_system/AGENT_SELF_DIAGNOSTIC_PROTOCOL.md`

## Project

Archestimator is a pre-MVP construction estimating product being rebuilt after Philip rejected the earlier app/workshop prototype UX and UI.

The reset remains the baseline quality principle: do not blindly restore the deleted prototype. However, the repository has moved beyond the completely blank `/workshop` reset state and now contains a small post-reset workshop route slice.

## Repository / branch

- Repository folder: `/Users/philiplewis/archestimator`.
- Current canonical branch after consolidation: `main`. Agents must still verify the live branch with `git status --short --branch` before editing.
- Current working tree note: Supabase schema, auth bootstrap, repository expansion, protected workshop bootstrap, estimate tree/navigation, and local dev-auth inspection support are intended to land on `main` as the active branch.
- Stack: Next.js 16.2.6, React 19.2.4, Bun, TypeScript, Tailwind CSS v4, React Complex Tree 2.6.1.
- Backend: Supabase project `ebxxqidacheyapmmzavr` linked locally for Archestimator only; do not use SlateCamp Supabase resources. Supabase Auth is active, with `philipjonlewis@gmail.com` assigned CEO/platform-wide access by database role resolver. Philip's authenticated profile UUID `4e23801d-6fc2-4886-b980-d15ca2b164b8` owns the remote demo seed project/library/estimate shell through the profile default workspace; other authenticated emails should start with an empty default workspace unless they create their own records. As of migration `20260519173857_populate_lewis_residence_estimate_tree.sql`, the deterministic demo estimate is Lewis Residence and has a tree-only rebuild with top-level `General Requirements`, `Site Works`, and `Lot`; `Lot` contains `House` and `Services House`, with the requested house/service-room areas seeded as estimate nodes. Local browser/agent inspection can use the env-gated dev auth bypass (`ARCHESTIMATOR_DEV_AUTH_BYPASS=1`, `ARCHESTIMATOR_DEV_AUTH_EMAIL`, `SUPABASE_SERVICE_ROLE_KEY`) on localhost only; never commit or expose the service-role key.

## AI/tooling bench

- Available agent bench: Codex, Claude, OpenCode, CommandCode, Antigravity CLI (`agy`), and Kimi.
- Antigravity CLI replaces Gemini as the extra terminal-agent lane for parallel planning, review, audit, implementation, or other independent tasks. Do not route new work to Gemini unless Philip explicitly reapproves it.
- Kimi is especially strong for frontend/product UI work and long-context synthesis; prefer it for independent frontend passes when a separate branch/worktree is available.
- Ollama is not an approved agent LLM lane. Only the nomic embedding model used by ChunkHound is approved for active Ollama use; locally listed chat models must not be used for planning, review, writing, or coding unless Philip explicitly approves and documents them.

## Active mode

The project is in post-reset MVP exploration. Work must stay small, route-scoped, and easy to revise or delete. Agents must not treat historical prototype docs as active instructions unless this file, `decisions.md`, or a current plan explicitly reactivates that scope.

If Philip reports degraded agent performance, stale behavior, or repeated mistakes, agents must stop normal execution and run `.ai/00_system/AGENT_SELF_DIAGNOSTIC_PROTOCOL.md` before planning or coding.

## Current live surfaces observed in `src/app`

```txt
/                                                     -> preserved landing page, with the below-hero secondary claim “The most intuitive way to create construction cost estimates” plus public feature-copy anchors for Estimate Workspace, Component Library, Revision Intelligence, Proposal Comparisons, Visual Cost Breakdowns, Proposal-Ready Outputs, and Industry Standard Export Formats
/login                                                -> Supabase magic-link auth route
/auth/callback                                        -> Supabase auth callback route
/workshop                                             -> protected workshop entry page
/workshop/projects                                    -> protected post-reset live project list/create route with authenticated workspace bootstrap
/workshop/projects/[projectId]                        -> protected post-reset project dashboard/detail route
/workshop/projects/[projectId]/estimates              -> protected live estimate list/create route
/workshop/projects/[projectId]/estimates/[nodeId]     -> protected live estimate workspace route with project-scoped tree/row data
/workshop/components                                  -> protected Component Library workspace that mirrors the estimate workspace without the right sidebar: left category/supplier tree, center custom-component sheet, no route-level drag/drop/reorder, and no old standalone manager chrome. The category tree is backed by the V3 component taxonomy from `.ai/03_plans/component-category-library-taxonomy/`: nine top-level organizer rows only, then reporting categories, then subcategories. Fixtures, Furniture, Equipment, Doors, Windows, Materials, Finishes, Plumbing Systems, Sanitary Systems, Fire Alarm, and Life Safety remain separate. FF&E is only a procurement-scope tag, not a visible folder.
```

These routes exist in the repo, but their presence does not reapprove the entire deleted prototype. Treat them as the current implemented slice only. Before expanding them, read the relevant active plan/spec and verify the route scope against Philip's latest direction.

## Superseded prototype direction

The previous local-first MVP implementation remains rejected as a default direction. Do not restore these from old handoffs without fresh approval:

- broad project dashboard route family beyond the current approved slice;
- full estimate editor/workspace;
- full estimate hierarchy tree;
- right-sidebar component picker;
- full component library manager/admin system;
- proposal snapshot pages;
- revision/versioning UI;
- broad local JSON repository and mutation layer;
- large app shells/project shells;
- grid spike and drag/drop surfaces;
- login/signup visual prototype pages;
- legacy redirect routes.

Historical docs may remain for context, but they are not active instructions unless linked by current-state, decisions, or a current plan.

## Active product direction

Proceed from the current small post-reset workshop slice, not from the deleted prototype. Future work must:

1. begin with a narrow screen/workflow brief or an existing active plan;
2. state exact user job, route scope, non-goals, and deletion criteria;
3. avoid fake SaaS maturity and broad module restoration;
4. preserve the density correction: compact app/workshop UI, with 12px as the maximum non-landing font size unless Philip explicitly approves an exception;
5. use the shared UI primitives first; if no reusable primitive exists for a repeated UI pattern, create or extend a shared primitive before adding feature-local controls;
6. keep data/persistence minimal until the UX earns a stable data boundary.

## Current feature specs

- `.ai/06_specs/current-project-estimates-component-library-spec.md` is the canonical current-state feature spec for the implemented project estimate workspace and connected Component Library sidebar. Read it before expanding `/workshop/projects/[projectId]/estimates/[nodeId]`, `EstimateSheetContent`, `EstimateSheetTree`, or `src/components/workshop/component-library/*`.
- `.ai/06_specs/supabase-auth-setup.md` documents active Supabase Auth/Profile/CEO access setup, hosted-dashboard redirect checks, and the manual magic-link smoke test.
- `.ai/06_specs/live-project-estimate-bootstrap.md` is the canonical current-state spec for live project creation, live project dashboard loading, estimate creation/listing, initial estimate hierarchy bootstrap, project-scoped live estimate node tree/row loading, empty-estimate fallback routing by estimate id, and TanStack Query-backed persisted/rollback-safe estimate row mutations with row-level dirty/saving/saved/failed status markers.
- Estimate tree interaction now uses React Complex Tree for navigation, immediate Zustand-backed selected-node UI state, route reconciliation, expand/collapse, add-node hierarchy creation, and drag/drop reorganization. Drag/drop uses RCT `onDrop`, app-side hierarchy validation, optimistic local/query-cache updates, rollback on persistence failure, and `public.reorder_estimate_nodes` for atomic persistence; it must not use `router.refresh()` after a drop. The tree's active technical model is exactly two node kinds: Group Nodes (`kind = group`) organize and may nest other Group Nodes and Area Nodes; Area Nodes (`kind = area`) are leaves and are the only row-owning nodes. Lot, General Requirements, House, Floor, Phase, Trade, or similar domain labels are user/UX content on Group Nodes, not separate technical node kinds. Area Nodes must not be parents and must not be root children under the current root invariant. The removed single-pointer Move modal/button must not be restored as-is. The tree toolbar exposes expand-all/collapse-all actions. Keep future tree changes aligned with the central hierarchy matrix and database-side invariants; legacy `lot`, `general`, `structure`, `level`, and `assembly` values are not active technical estimate tree kinds. Migration `20260520222038_enforce_two_kind_estimate_nodes.sql` normalizes existing legacy estimate-node values to `group` and validates `kind in ('group', 'area')`; app/domain/read-path guards expose only `group | area`. On 2026-05-21 the linked Archestimator Supabase project was repaired to this contract for the Lewis Residence estimate (`38 area`, `9 group`), with `reorder_estimate_nodes` installed and `move_estimate_nodes` absent.
- `.ai/09_archive/store/2026-05-21-estimate-tree-dnd-reorganization-complete/` is the archived closeout/audit source for the completed seamless React Complex Tree drag/drop estimate-tree reorganization. Gates A-E are implemented: the Supabase `rpc()` receiver crash reported as `Cannot read properties of undefined (reading 'rest')` is covered, the stale `EstimateAreaNode` compatibility bridge is removed from feature code, the runtime fallback to the historical `move_estimate_nodes` RPC is removed, stale-props and Group Node reparent regressions are covered, isolated-clone mutating Playwright DnD coverage passed, and top/bottom root-level drop affordances were widened for easier manual use. Future reruns of the mutating browser matrix still require local service-role/dev-auth env.
- `.ai/03_plans/landing-page-improvement/` is the active public `/` landing-page improvement plan. It replaces the archived broad Intercom/v4 plan, starts from the current landing source inventory, and must not revive stale app-shell or estimate-workspace migration scope.
- `.ai/09_archive/store/2026-05-21-workshop-components-library-ux-ui-complete/` is historical context only for the rejected `/workshop/components` global manager slice. As of 2026-05-21, `/workshop/components` has been rebuilt from `.ai/09_archive/store/2026-05-21-workshop-components-library-redesign-complete/` into an estimate-workspace-style Component Library: the route uses the same compact workspace rhythm as the estimate page, removes the right sidebar because the page itself is the Component Library, replaces the old standalone search/toolbar with tree/sheet search rows, adds category/supplier tree tabs with no drag/drop/reorder controls, and displays custom user components in a center sheet with desktop table and mobile cards. As of 2026-05-22, the category tab uses the V3 component taxonomy artifact: the top level is exactly nine organizer rows, categories are first children, subcategories are second children, all tree rows share the same text/icon sizing, and blended labels such as FF&E, Furniture & Equipment, Fixtures & Equipment, Architectural & Interiors, Plumbing & Sanitary, Electrical & Low Voltage, Fire Protection & Life Safety, and Assemblies & Templates are not visible category folders.
- `.ai/03_plans/project-estimates-component-library-improvement-plan.md` is the research-backed UX/UI improvement plan for that feature. Its immediate recommended next slice is target-aware insert + insert-and-edit + keyboard editing baseline.
- `.ai/09_archive/store/2026-05-21-estimate-component-library-sidebar-audit-complete/` is the archived closeout for the completed Component Library sidebar audit. P0-P4 are implemented in the live estimate workspace: target-aware sheet-owned insertion, view/group/sort/recent/source-staleness controls, inline edit, multi-insert quantity, image upload, command-palette insert, guarded localStorage, cross-tab favorites/recents sync, undo delete, dirty-form protection, aria-live action announcements, assemblies/templates tabs, bulk component actions, CSV import, versioned JSON export/import with bundle round-trip, card-list arrow navigation, native preview button card markup, and custom drag ghosts.
- `.ai/03_plans/ui-componentization-and-storybook-plan.md` is the active reusable UI primitive matrix and Storybook organization plan. Read it before creating app/workshop controls, component-library controls, toolbars, cards, filters, panels, or stories.
- `.ai/09_archive/store/2026-05-21-shadcn-context-menu-integration-complete/` is the archived closeout source for the first gradual shadcn/ui integration. The first target is implemented: estimate tree Group Node and Area Node rows use a compact shadcn/Radix Context Menu for Rename/Delete. Rename is inline in the tree row with optimistic local/query-cache updates and rollback; Delete uses the existing Modal confirmation before optimistic subtree removal, selected-node fallback, and route repair with `router.replace()` only when the active route is deleted. shadcn enters as copied shared primitives under the existing compact UI system; the reusable action-menu model is available for later filter/icon trigger adapters, but those future adapters are not implemented yet.
- Estimate workspace persistence is state-first after RSC hydration. The `estimateQueryKeys.areaTree(estimateId)` TanStack Query cache is the live client tree source shared by `EstimateSheetTree` and `EstimateSheetContent`; RSC page props seed the cache, and Supabase server actions validate/persist mutations. Node rename is a scalar patch path that returns `{ nodeId, name }`, does not refetch/reapply the full tree, and does not call `revalidatePath()` on the active estimate route. Rename rollback is scoped to the edited node so it cannot restore older whole-tree snapshots over newer cache writes. Delete/reorder remain structural mutation paths that can reconcile with a confirmed server tree, and route repair derives the current route node from the client pathname before falling back to server props. Shared area-tree cache revisions guard rollback paths from clobbering newer tree writes. Supabase Realtime is not active yet; keep the code realtime-ready, but do not add Realtime channels/triggers/RLS policies until collaboration or cross-device live sync becomes explicit MVP scope.

Read before implementation:

1. `.ai/00_system/AGENT_SELF_DIAGNOSTIC_PROTOCOL.md`
2. `.ai/03_plans/current-post-reset-workshop-slice.md`
3. `.ai/02_audits/2026-05-17-reset-cleanup-audit.md`
4. `.ai/06_specs/restart-guardrails.md`
5. `.ai/10_state/decisions.md`
6. `.ai/10_state/known-issues.md`
7. `DESIGN.md`
8. `.ai/03_plans/ui-componentization-and-storybook-plan.md`
9. `.ai/09_archive/store/2026-05-21-estimate-tree-dnd-reorganization-complete/README.md`

## Validation baseline

For documentation-only changes:

```bash
git diff --check
```

For code changes in the current app baseline:

```bash
bun run validate
bun run build
git diff --check
```

`bun run validate` currently includes type-check, lint, app font-size lint, Bun unit tests, and Vitest DOM tests.

E2E route coverage should only be added for currently approved behavior. Do not recreate E2E coverage for deleted prototype routes unless those routes are explicitly reapproved.

## Agent quality controls

- Read live files before product claims.
- Check git branch/status before editing.
- Inspect existing uncommitted changes before touching a file.
- Patch canonical `.ai` docs when reality changes.
- Report skipped validation and remaining uncertainty plainly.
