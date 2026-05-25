# Roadmap

**Last updated:** 2026-05-25
**Status:** Pre-launch MVP. Supabase/Auth/Postgres are active for Archestimator project `ebxxqidacheyapmmzavr`; the protected workshop, estimating sheet, component library, charts, proposal XLSX export, and Ask-only AI slice are in active MVP hardening.

## Current product baseline

The reset-era blank-workshop baseline is no longer current. Archestimator now preserves and actively builds on:

```txt
/                                                     public landing page
/about                                                public company/product page
/features                                             public feature page
/pricing                                              public pricing page
/contact                                              public contact page
/login                                                Supabase magic-link auth
/auth/callback                                        Supabase auth callback
/api/ai/ask                                           Ask-only AI copilot endpoint
/api/component-library/images                         component-library image upload API
/api/component-library/attachments                    component-library attachment upload API
/api/projects/[projectId]/estimates/[estimateId]/export/proposal.xlsx
/workshop                                             protected workshop entry
/workshop/projects                                    live project list/create route
/workshop/projects/[projectId]                        live project dashboard shell
/workshop/projects/[projectId]/estimates              live estimate list/create route
/workshop/projects/[projectId]/estimates/[nodeId]     live estimate workspace with project-scoped tree/row data
/workshop/projects/[projectId]/charts                 project cost charts
/workshop/library                                     component library workspace
/workshop/templates                                   reusable template workspace
/workshop/components                                  compatibility redirect to /workshop/library
```

## Current codebase pillars

- Public website: landing plus About, Features, Pricing, and Contact pages.
- Auth and tenancy: Supabase magic-link auth, protected `/workshop/*`, workspace bootstrap, CEO/profile role foundation, and RLS-backed app tables.
- Project and estimate workspace: project dashboard, estimate list/create, project-scoped estimate tree, row items, inline edits, Activity History, proposal export, and chart route.
- Component Library/Templates: `/workshop/library` for components, `/workshop/templates` for reusable templates, shared estimate-sidebar data loading, variants, brands, suppliers, folders, images, attachments, cost entries, and component lifecycle/history foundations.
- Proposal output: current-estimate XLSX preview/download exists; immutable issued proposal snapshots and PDF package workflows are not implemented yet.
- AI: global Ask-only copilot exists through `/api/ai/ask`; no write tools, Draft/Apply, retrieval/RAG, stored conversations, or autonomous actions are approved.

## Phase 0 - Governance and design-system guardrails

Status: active and continuous.

Done:

- Non-landing product design system enforced by `bun run lint:design-system` (`lint:font-size` is an alias).
- App/workshop typography scale: SF Pro system stack and regular/medium only, while preserving the compact `12px` maximum with normal controls/body/table/input/button text around `10px`.
- Shared UI primitive reuse is mandatory.
- Code-review graph/GitNexus and `.ai` source-of-truth docs are part of the normal agent workflow.

Next:

- Continue moving repeated controls into `src/components/ui` before feature-local markup spreads.
- Keep current-state, decisions, roadmap, and feature specs synchronized after each durable product/code change.
- Treat docs-only changes as verified only after referenced paths exist and `git diff --check` passes.

## Phase 1 - Authenticated workspace foundation

Status: implemented, with hosted-dashboard verification still required.

Done:

- Supabase project linked: `ebxxqidacheyapmmzavr`.
- Supabase Auth magic-link route added.
- `/workshop/*` protected by `src/proxy.ts`.
- Profiles/CEO role bootstrap implemented in database migration.
- Default workspace bootstrap implemented.
- Auth setup checklist documented in `.ai/06_specs/supabase-auth-setup.md`.

Remaining:

- Verify hosted Supabase Auth redirect URLs in the Dashboard before broader tester use.
- Keep local migration state and linked-remote migration state separately proven before claiming remote readiness.

## Phase 2 - Live project and estimate foundation

Status: implemented.

Done:

- `/workshop/projects` reads authenticated workspace projects.
- Project creation server action inserts live Supabase project records.
- Live project cards render Supabase rows.
- Project dashboard route loads authenticated workspace project data.
- `/workshop/projects/[projectId]/estimates` lists live Supabase estimates.
- Estimate creation creates a draft estimate and bootstraps lot -> structure -> level -> area hierarchy.
- Estimate list cards link to the first area node.
- `/workshop/projects/[projectId]/estimates/[nodeId]` reads live Supabase `estimate_nodes` and `estimate_row_items`.
- Node route validation is project-scoped through the selected node's parent estimate.

Current source:

- `.ai/06_specs/live-project-estimate-bootstrap.md`
- `.ai/06_specs/current-project-estimates-component-library-spec.md`

## Phase 3 - Estimate workspace editing and Activity

Status: implemented core, hardening active.

Done:

- Insert, replace, delete, and update row mutations persist through TanStack Query mutation hooks backed by server actions.
- Row mutations validate project, estimate, node, row, and ownership before writing.
- Route-loaded estimate tree is seeded into TanStack Query cache and optimistic failures restore previous local state.
- React Complex Tree drag/drop reorder is active with hierarchy guards and reorder server action support.
- One unified `Activity History` modal exists for sheet and row activity.
- Named sheet `Versions`, `Compare`, restore-as-copy, and app-level named-version actions are intentionally absent from the current UI.

Remaining:

- Live mutation/atomicity proof needs local Supabase or an approved throwaway database. It must cover node create/rename, template event reads, rollback, and concurrency.
- Scalar edit latency benchmarking needs the same safe mutation harness before any production-runtime performance claim.
- Activity export/report, Supabase Realtime, retention pruning/archive compaction, and undo/redo remain future product slices.
- Do not add visible row-level save pills; preserve spreadsheet-like editing and the accepted compact sheet-level save state unless Philip approves a new interaction contract.

Current source:

- `.ai/03_plans/estimate-sheet-version-control/18-current-activity-contract.md`
- `.ai/03_plans/estimate-sheet-version-control/19-local-safe-completion-audit.md`

## Phase 4 - Component Library and Templates

Status: partially implemented, active hardening.

Done:

- `/workshop/library` is the current component-library workspace.
- `/workshop/templates` is the current reusable-template workspace.
- `/workshop/components` redirects to `/workshop/library`.
- Add Component flow persists component names, variants, brand/supplier metadata, images, attachments, cost entries, and linked thumbnails.
- Component/library data loading is shared with the estimate sidebar and must bootstrap the workspace once.
- Component lifecycle/history and versioning schema foundations are present.

Remaining:

- Prove the newest local component-library cleanup migration against the linked remote before claiming remote parity.
- Continue UI polish for dense component/template workflows.
- Tighten pricing/source trust metadata, supplier provenance, and lifecycle reporting before launch claims.

Current source:

- `.ai/03_plans/workshop-library-components-templates-split/`
- `.ai/03_plans/workshop-library-component-creation-versioning/`
- `.ai/03_plans/component-variant-assets-and-cost-history/`
- `.ai/06_specs/current-project-estimates-component-library-spec.md`

## Phase 5 - Proposal export and project charts

Status: implemented partials, launch hardening active.

Done:

- Proposal XLSX preview/download exists for the current mutable estimate.
- Proposal workbook generation uses project/estimate data and is covered by focused proposal tests.
- `/workshop/projects/[projectId]/charts` exists with project cost chart surfaces.

Remaining:

- Immutable issued proposal snapshots are not implemented.
- PDF/client-facing package workflow is not implemented.
- Revision comparison and issued-proposal audit policy need a product decision before public claims.
- Chart grouping, empty states, and drill-downs need beta-user validation before they become core launch positioning.

Current source:

- `.ai/03_plans/industry-standard-excel-proposal-export/`
- `.ai/03_plans/project-charts-estimate-comparison/`

## Phase 6 - AI copilot

Status: Ask-only slice implemented; write-capable AI is future-gated.

Done:

- Global floating copilot opens an Ask-only workflow.
- `/api/ai/ask` uses the approved first-slice provider path and server-only provider keys.
- Workspace auth is required for real provider calls.
- Admin DB bypass is rejected for AI routes.
- Metadata-only audit persistence exists for real Supabase workspace users.

Remaining:

- No Draft/Apply, write tools, read tools, retrieval/RAG, stored conversations, or autonomous mutations until separately approved.
- Future write paths require confirmation UX, idempotency, audit trails, RLS compatibility, data-leakage tests, and rollback strategy.
- AI launch copy must stay honest: assistant for questions only, not an autonomous estimator.

Current source:

- `.ai/03_plans/ai-chatbot-agent-readiness/`

## Phase 7 - Pre-launch MVP readiness

Status: active next operating lane.

Launch gates:

- Hosted Supabase auth redirects verified.
- Local and linked-remote migrations reconciled and documented.
- Protected workshop smoke passes for project create, estimate create, estimate edit, library/template access, charts, proposal export, and Ask-only copilot.
- Public pages claim only currently shipped, verified capability.
- Proposal export copy clearly distinguishes mutable current XLSX export from future issued snapshots.
- AI privacy, audit, and no-write posture are tested and documented.
- Pricing, customer segments, onboarding steps, and beta feedback loop are documented in the startup homebase and mirrored into `.ai` when they affect product scope.
- Known destructive cleanup, including linked-remote `V2` / `QA checkpoint` residue, is handled only by an explicit cleanup task with exact IDs and approval.

## Permanent guardrails

- No merge to `main` without Philip approval.
- No deploy without Philip approval.
- Never touch SlateCamp Supabase resources.
- No app/workshop font above `12px`, no non-xs radius, no nonzero tracking, and no bold/fill icon weights.
- No duplicated feature-local buttons, search inputs, icon buttons, chips, cards, panels, dropdowns, or repeated controls; make/reuse shared UI primitives.
- No AI writes, autonomous actions, retrieval/RAG, or stored conversations by implication.
- Tests protect accepted behavior and key governance rules.
