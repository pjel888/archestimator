# Current State

**Date:** 2026-05-23
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
- Backend: Supabase project `ebxxqidacheyapmmzavr` linked locally for Archestimator only; do not use SlateCamp Supabase resources. Supabase Auth is active, with `philipjonlewis@gmail.com` assigned CEO/platform-wide access by database role resolver. Philip's authenticated profile UUID `4e23801d-6fc2-4886-b980-d15ca2b164b8` owns the remote demo seed project/library/estimate shell through the profile default workspace; other authenticated emails should start with an empty default workspace unless they create their own records. As of migration `20260519173857_populate_lewis_residence_estimate_tree.sql`, the deterministic demo estimate is Lewis Residence and has a tree-only rebuild with top-level `General Requirements`, `Site Works`, and `Lot`; `Lot` contains `House` and `Services House`, with the requested house/service-room areas seeded as estimate nodes. Local browser/agent inspection can use the env-gated dev auth bypass (`ARCHESTIMATOR_DEV_AUTH_BYPASS=1`, `ARCHESTIMATOR_DEV_AUTH_EMAIL`, `SUPABASE_SERVICE_ROLE_KEY`); server-rendered route smoke that may bootstrap or mutate workspace data also needs `ARCHESTIMATOR_DEV_AUTH_ADMIN_DB=1`. Use these on localhost only; never commit or expose the service-role key.

## AI/tooling bench

- Available agent bench: Codex, Claude, OpenCode, CommandCode, Antigravity CLI (`agy`), and Kimi.
- Antigravity CLI replaces Gemini as the extra terminal-agent lane for parallel planning, review, audit, implementation, or other independent tasks. Do not route new work to Gemini unless Philip explicitly reapproves it.
- Kimi is especially strong for frontend/product UI work and long-context synthesis; prefer it for independent frontend passes when a separate branch/worktree is available.
- Ollama is not an approved agent LLM lane. Only the nomic embedding model used by ChunkHound is approved for active Ollama use; locally listed chat models must not be used for planning, review, writing, or coding unless Philip explicitly approves and documents them.

## AI Copilot implementation

- `.ai/03_plans/ai-chatbot-agent-readiness/` has moved from readiness-only into a staged implementation. The current live implementation is still Ask-only: the global `EstimateCopilotFloatingButton` is mounted in `src/app/providers.tsx`, posts to `/api/ai/ask`, and uses the server-only DeepSeek Chat Completions client because Philip explicitly approved this first slice with the existing `.env.local` key/credits.
- The AI route is internally auth-gated because `/api` is bypassed by route protection. `src/lib/ai/auth.ts` rejects `ARCHESTIMATOR_DEV_AUTH_ADMIN_DB=1` before resolving AI context, allows local dev auth only as a pseudo-user for UI inspection, derives a real authenticated user's default workspace id for audit ownership, and rejects real Supabase users without a workspace before provider calls.
- Migration `20260523144932_ai_audit_foundation.sql` adds metadata-only AI audit tables: `ai_action_runs`, `ai_tool_calls`, and `ai_data_access_events`. These tables are workspace/user scoped, RLS-protected, revoke direct anon/authenticated table grants so browser clients cannot forge audit rows, and intentionally do not store raw prompts, hidden prompts, full retrieved data, or conversation history.
- `/api/ai/ask` now records best-effort completed/failed Ask audit metadata through `src/lib/ai/audit.ts`. Audit records hash the user message, bounded browser route context, and user-agent value; browser-provided route context remains untrusted descriptive context only and never becomes authorization input.
- Draft mode, Apply mode, stored conversations, read-tool retrieval, component-library/template search tools, project/estimate mutation tools, vector/RAG, and any write-capable agent actions remain unimplemented. Any future write path must keep user-scoped data access, dry-run/preview, explicit confirmation, idempotency, audit trails, and Supabase/RLS compatibility before mutation.

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
/workshop/projects/[projectId]/estimates              -> protected live estimate list/create route. The TanStack estimate table supports inline sheet-code/name editing, auto-generated sheet codes, and row-level duplicate sheet action. Duplicate copies the estimate record, estimate node hierarchy, and estimate row items into a new sheet with the next available generated sheet code.
/workshop/projects/[projectId]/estimates/[nodeId]     -> protected live estimate workspace route with project-scoped tree/row data
/workshop/projects/[projectId]/charts                 -> protected project charts route for comparing estimate cost distributions by space, component category, or supplier. The route uses D3 shape utilities only inside `src/components/workshop/project-charts/`, loads chart-specific estimate/node/row/category/supplier facts through `getProjectChartsData()`, and renders a chart board that starts with one estimate column and can add up to three estimate chart columns. The top toolbar uses the shared `HeaderIconToolbar` rhythm plus compact segmented controls for `Group By` (Space, Category, Suppliers) and `View By` (Donut Chart, Bubble Chart). Each column owns either one enlarged SVG donut chart with side-gutter callout labels or one D3 packed bubble chart, plus its own grouped table below the chart; column headers show the estimate sheet name with the total centered on one line, not the sheet code/name combo. Donut centers stay empty until a user hovers or focuses a slice. Donut callout labels are placed in left/right SVG gutters outside the donut ring to avoid clipping and arc intersection. Space-mode tables preserve estimate tree nesting with Group rows and Area rows; category/supplier tables stay flat. The old combined cross-estimate delta table is not the active UX.
/workshop/library                                     -> protected component Library workspace that mirrors the estimate workspace without the estimate right sidebar: center component sheet on the left, library tree on the right, no old standalone manager chrome. The route is component-only. The right tree has a single `Components` tab and two view modes: `View By: Default` for workspace-scoped editable `library_folders` with React Complex Tree create/rename/delete/reorder actions, and `Suppliers` for supplier-backed organization. The old row-collection dropdown and its Estimate Row Items, Custom Row Items, Uncategorized, and Supplier Row Items modes are removed; selecting a folder or supplier scopes the center sheet directly. Component line-item rows stay out of the tree and render in the center sheet from the shared Supabase Component Library source (`component_category_nodes`, `component_suppliers`, `library_folders`, `cost_library_items`) seeded from the V3 taxonomy and PH-context supplier list. The center sheet now has an Add Component modal that persists Supabase-backed components with workspace folder, reporting category, supplier, lifecycle state, and multiple price options. Existing rows show lifecycle badges, editable lifecycle-state dropdowns, pricing-option dropdowns when multiple options exist, and compact version/price/state history. Migration `20260523120957_component_library_item_versioning.sql` adds version, price-option, price-history, and lifecycle-state history tables and backfilled the linked project. The visible taxonomy still has nine top-level organizer rows only, then reporting categories, then subcategories. Fixtures, Furniture, Equipment, Doors, Windows, Materials, Finishes, Plumbing Systems, Sanitary Systems, Fire Alarm, and Life Safety remain separate. FF&E is only a procurement-scope tag, not a visible folder.
/workshop/templates                                   -> protected template Library workspace that visually mirrors `/workshop/library` for now, but loads reusable estimate templates only. Templates are made from Group Nodes, Area Nodes, and copied estimate row item snapshots and are loaded through the template-only repository helper. The estimate workspace keeps the combined component/template helper for its right sidebar, and that combined helper bootstraps the current workspace once before loading both datasets.
/workshop/components                                  -> compatibility redirect to `/workshop/library`
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
- `.ai/06_specs/live-project-estimate-bootstrap.md` is the canonical current-state spec for live project creation, live project dashboard loading, estimate creation/listing, initial estimate hierarchy bootstrap, project-scoped live estimate node tree/row loading, empty-estimate fallback routing by estimate id, and TanStack Query-backed persisted/rollback-safe estimate row mutations with internal dirty/saving/saved/failed state that does not render row-level save pills in the sheet.
- `.ai/03_plans/project-charts-estimate-comparison/` is implemented as `/workshop/projects/[projectId]/charts`. Chart aggregation reads `estimate_row_items` totals as `quantity * unit_cost + misc_cost`, maps spaces through highest ancestor Area nodes, maps categories through `source_snapshot.categoryNodeId` into the shared `component_category_nodes` taxonomy while excluding organizer nodes from reporting buckets, and maps suppliers through `source_snapshot.supplierId`, row supplier text, snapshot supplier text, then `No supplier`. The visual donut collapses display buckets after the top eight plus `Other`; each chart column's table keeps all rows in text for auditability. The active chart UI uses large D3 donuts with side-gutter callout labels, a blank center until hover/focus, a D3 packed bubble chart alternative, centered total values in one-line chart headers, a three-chart-column limit, and `/workshop/library`-style segmented grouping/view controls. Space-mode table rows preserve estimate-node nesting from Group rows to Area rows; non-space grouping tables remain flat.
- The Lewis Residence chart demo seed `lewis-chart-demo-v1` is active in the linked Supabase project as of 2026-05-23. It adds 83 Supabase-backed `cost_library_items` with active default price options and inserts linked estimate row items into both Lewis Residence sheets: `ES-001` has 42 seeded rows across 16 rooms totaling PHP 982,800, and `ES-002` has 41 seeded rows across 16 rooms totaling PHP 1,923,499. The seed is tagged in row/library metadata and is intended to be replaceable by deleting/reinserting only rows/items with `metadata.seed_pack = 'lewis-chart-demo-v1'`.
- Estimate tree interaction now uses React Complex Tree for navigation, immediate Zustand-backed selected-node UI state, route reconciliation, expand/collapse, add-node hierarchy creation, and drag/drop reorganization. Drag/drop uses RCT `onDrop`, app-side hierarchy validation, optimistic local/query-cache updates, rollback on persistence failure, and `public.reorder_estimate_nodes` for atomic persistence; it must not use `router.refresh()` after a drop. The tree's active technical model is exactly two node kinds: Group Nodes (`kind = group`) organize and may nest other Group Nodes and Area Nodes; Area Nodes (`kind = area`) are leaves and are the only row-owning nodes. Lot, General Requirements, House, Floor, Phase, Trade, or similar domain labels are user/UX content on Group Nodes, not separate technical node kinds. Area Nodes must not be parents and must not be root children under the current root invariant. The removed single-pointer Move modal/button must not be restored as-is. The tree toolbar exposes expand-all/collapse-all actions. Keep future tree changes aligned with the central hierarchy matrix and database-side invariants; legacy `lot`, `general`, `structure`, `level`, and `assembly` values are not active technical estimate tree kinds. Migration `20260520222038_enforce_two_kind_estimate_nodes.sql` normalizes existing legacy estimate-node values to `group` and validates `kind in ('group', 'area')`; app/domain/read-path guards expose only `group | area`. On 2026-05-21 the linked Archestimator Supabase project was repaired to this contract for the Lewis Residence estimate (`38 area`, `9 group`), with `reorder_estimate_nodes` installed and `move_estimate_nodes` absent.
- `.ai/09_archive/store/2026-05-21-estimate-tree-dnd-reorganization-complete/` is the archived closeout/audit source for the completed seamless React Complex Tree drag/drop estimate-tree reorganization. Gates A-E are implemented: the Supabase `rpc()` receiver crash reported as `Cannot read properties of undefined (reading 'rest')` is covered, the stale `EstimateAreaNode` compatibility bridge is removed from feature code, the runtime fallback to the historical `move_estimate_nodes` RPC is removed, stale-props and Group Node reparent regressions are covered, isolated-clone mutating Playwright DnD coverage passed, and top/bottom root-level drop affordances were widened for easier manual use. Future reruns of the mutating browser matrix still require local service-role/dev-auth env.
- `.ai/03_plans/landing-page-improvement/` is the active public `/` landing-page improvement plan. It replaces the archived broad Intercom/v4 plan, starts from the current landing source inventory, and must not revive stale app-shell or estimate-workspace migration scope.
- `.ai/09_archive/store/2026-05-21-workshop-components-library-ux-ui-complete/` is historical context only for the rejected `/workshop/components` global manager slice. As of 2026-05-23, the canonical component route is `/workshop/library`, `/workshop/components` redirects there, and reusable template browsing lives on `/workshop/templates`. `/workshop/library` uses the same compact workspace rhythm as the estimate page, removes the estimate right sidebar because the page itself is the Library, replaces the old standalone search/toolbar with tree/sheet search rows, and displays component rows in a center sheet. The component route has one `Components` tree tab. `View By: Default` exposes editable workspace `library_folders` with create/rename/delete/reorder and React Complex Tree drag/drop; `Suppliers` is the second view mode. The removed center-sheet collection dropdown must not be restored. The category folders continue to derive from the Supabase-backed V3 component taxonomy seed: the top level is exactly nine organizer rows, categories are first children, subcategories are second children, all tree rows share the same text/icon sizing, and blended labels such as FF&E, Furniture & Equipment, Fixtures & Equipment, Architectural & Interiors, Plumbing & Sanitary, Electrical & Low Voltage, Fire Protection & Life Safety, and Assemblies & Templates are not visible category folders. The tree is folder-only: line-item rows are rendered in the center sheet after folder/supplier selection, not as tree leaves. `/workshop/templates` lists reusable estimate-structure bundles and never stores templates in `cost_library_items`.
- `.ai/03_plans/workshop-library-component-creation-versioning/` is implemented as of 2026-05-23. Add Component uses SQL RPCs to create Supabase-backed components atomically with multiple price options and lifecycle state; price-option changes and lifecycle transitions increment `current_version_number` and insert history/version records. As of 2026-05-24, Add Component image upload posts to `/api/component-library/images`, client-resizes supported image files before upload, server-validates magic bytes/dimensions with `sharp` including MIME-less uploads and AVIF/heif metadata, converts full/thumbnail images to WebP, stores them in public Supabase Storage bucket `component-images`, saves the returned thumbnail URL into `cost_library_items.thumbnail_path`, persists full-size/thumbnail object paths in component metadata for later cleanup, blocks save while upload is running, and deletes replaced/cancelled draft upload objects. Legacy external thumbnail URLs are rendered with a plain image fallback so `next/image` remote host validation remains limited to the Supabase image bucket. The linked Supabase component library now has internet-sourced seed/demo reference thumbnails for all 154 existing `cost_library_items`, with 154 thumbnail objects and 154 full-size objects under `component-images/internet-component-thumbnails/v1/`; `/workshop/library` renders the thumbnail beside each center-sheet row. `scripts/seed-internet-component-thumbnails.mjs` is the approved simple seed-data pipeline: it searches public web image results, downloads a candidate, converts it to full/thumbnail WebP with `sharp`, uploads to Supabase Storage, records source/title/landing URL metadata, rejects duplicate source URLs/exact hashes/average hashes during a run, and syncs existing `estimate_row_items.source_snapshot.imageUrl` values so seeded estimate sheets do not keep stale placeholder/category images. Existing estimate rows keep copied price/metadata snapshots; this thumbnail sync is only for seed/demo image replacement, not for silently changing prices.
- `.ai/03_plans/project-estimates-component-library-improvement-plan.md` is the research-backed UX/UI improvement plan for that feature. Its immediate recommended next slice is target-aware insert + insert-and-edit + keyboard editing baseline.
- `.ai/09_archive/store/2026-05-21-estimate-component-library-sidebar-audit-complete/` is historical context for the completed Component Library sidebar audit, not the current visible sidebar contract. As of 2026-05-22, the live estimate-page sidebar keeps target-aware sheet-owned insertion, inline edit, preview, favorites/recents metadata, image upload through the new/edit form, guarded localStorage, cross-tab favorites/recents sync, undo delete, dirty-form protection, aria-live action announcements, card-list arrow navigation, native preview button card markup, and custom drag ghosts. It no longer renders the old Components/Assemblies/Templates bundle model, import/export actions, view/sort control strips, target-status strips, bulk component actions, or a recent-items strip between `HeaderIconToolbar` and the grouped component rows. A new Templates tab is active for reusable estimate templates only; it inserts copied Group Nodes, Area Nodes, and row snapshots into the selected estimate Group Node.
- The estimate-page Component Library sidebar Categories and Suppliers trees share the same Supabase Component Library dataset and taxonomy/supplier backbone as `/workshop/library`: `All Components` remains the estimate-sidebar category root, V3 organizer/category/subcategory order is preserved including empty folders, supplier folders come from `component_suppliers`, and the estimate sidebar adds draggable/click-insertable library line-item leaves under matching `category_node_id` / `supplier_id` folders so they can be inserted into estimate areas.
- Component-library inserts into live estimate rows generate UUID row ids before calling `insertEstimateRowItemFromLibrary()`, and the server action normalizes stale/non-UUID client row ids to server-generated UUIDs before Supabase sees the `estimate_row_items.id` UUID column. Static UI library items such as `lib-sofa` are treated as copied row snapshots, not `cost_library_items.id` foreign keys; only UUID-backed library items are persisted as `source_library_item_id` with `linked-clean`. Estimate row-item edits now expose quantity and Misc Cost only; discipline belongs to component-library metadata, and designation is not visible/editable on row items for now.
- Reusable estimate templates are active as of migration `20260522091621_component_library_templates.sql`. The template model is workspace scoped through `estimate_templates`, `estimate_template_nodes`, and `estimate_template_row_items` with RLS, explicit authenticated grants, deferred hierarchy triggers, and root-sort uniqueness that treats `parent_id = null` as a real sibling slot. The migration seeds default persisted templates for existing workspaces; the repository falls back to static seed templates only when the template tables are not present yet, not when migrated tables exist but are empty. Component surfaces do not apply their own static template defaults. Template insertion passes only `templateId` from the client and calls `public.insert_estimate_template_into_estimate`, which validates the source template tree and copies structures into `estimate_nodes` and `estimate_row_items` atomically with fresh UUIDs and snapshot metadata. Templates themselves remain immutable library source data during insertion.
- Estimate area drop zones now support click and keyboard activation in addition to drag/drop. Activating the drop zone appends an unlinked manual row so users can enter quantity/Misc Cost before selecting a component; the component cell stays labeled `Drag or add a component here` and must not show a thumbnail/fallback image until replaced by a Component Library item.
- `.ai/03_plans/ui-componentization-and-storybook-plan.md` is the active reusable UI primitive matrix and Storybook organization plan. Read it before creating app/workshop controls, component-library controls, toolbars, cards, filters, panels, or stories.
- `.ai/09_archive/store/2026-05-21-shadcn-context-menu-integration-complete/` is the archived closeout source for the first gradual shadcn/ui integration. The first target is implemented: estimate tree Group Node and Area Node rows use a compact shadcn/Radix Context Menu for Rename/Delete. Rename is inline in the tree row with optimistic local/query-cache updates and rollback; Delete uses the existing Modal confirmation before optimistic subtree removal, selected-node fallback, and route repair with `router.replace()` only when the active route is deleted. shadcn enters as copied shared primitives under the existing compact UI system; the reusable action-menu model is available for later filter/icon trigger adapters, but those future adapters are not implemented yet.
- Estimate workspace persistence is state-first after RSC hydration. The `estimateQueryKeys.areaTree(estimateId)` TanStack Query cache is the live client tree source shared by `EstimateSheetTree` and `EstimateSheetContent`; RSC page props seed the cache, and Supabase server actions validate/persist mutations. Node rename is a scalar patch path that returns `{ nodeId, name }`, does not refetch/reapply the full tree, and does not call `revalidatePath()` on the active estimate route. Estimate row scalar edits for quantity and Misc Cost now keep focused draft text local, patch the shared area-tree cache optimistically on commit, reconcile from the Supabase-returned canonical row fields, and rollback failed saves without visible row-level save pills. Rename rollback is scoped to the edited node so it cannot restore older whole-tree snapshots over newer cache writes. Delete/reorder remain structural mutation paths that can reconcile with a confirmed server tree, and route repair derives the current route node from the client pathname before falling back to server props. Shared area-tree cache revisions guard rollback paths from clobbering newer tree writes. Supabase Realtime is not active yet; keep the code realtime-ready, but do not add Realtime channels/triggers/RLS policies until collaboration or cross-device live sync becomes explicit MVP scope.

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
