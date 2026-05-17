# Current State

**Date:** 2026-05-16

## Project

Archestimator is a new application concept by Philip Echavez Lewis.

## Current stage

- Repository folder exists: `/Users/philiplewis/archestimator`
- Tech stack baseline selected for MVP speed: Next.js 16, React 19, Bun, TypeScript, and Tailwind CSS v4.
- Data is local-first JSON for now, using repository boundaries for future Supabase/Postgres migration.
- Supabase is intentionally not connected yet.
- `.ai/` operational-intelligence workspace has been initialized first so agents can collaborate from a single shared source of truth.

## Working product direction

Archestimator is for contractors who need to create construction cost estimates quickly while handling multiple projects and frequent design changes.

The emerging product wedge is:

> Fast contractor-first estimates and revision updates without the overhead of traditional takeoff software or enterprise construction-management platforms.

## Evidence gathered

- Legacy GitHub repos were cloned and inventoried under `.ai/13_research/github-legacy-repos/`.
- Legacy repo lessons were distilled in `.ai/06_specs/legacy-repo-lessons.md`.
- Competitor landscape was captured in `.ai/13_research/competitor-landscape-construction-estimating-2026-05-16.md`.
- Product thesis was drafted in `.ai/06_specs/archestimator-product-thesis.md`.
- MVP definition plan was drafted in `.ai/03_plans/mvp-definition-plan.md`.
- Contractor proposal sample analysis was captured under `.ai/13_research/proposal-samples/grand-hyatt-construction-proposal/`.
- Proposal package system spec was drafted in `.ai/06_specs/proposal-package-system.md`.
- Project/estimate versioning system spec was drafted in `.ai/06_specs/project-estimate-versioning-system.md`.
- Programa.design product/UI research was captured in `.ai/13_research/programa-design-product-research-2026-05-16.md`.
- Google's DESIGN.md agentic workflow research was captured in `.ai/06_specs/design-md-agentic-design-workflow.md`.

## Immediate next useful work

- Next.js + Bun app shell has been scaffolded at the project root.
- GitHub private repo created: `https://github.com/pjel888/archestimator`.
- Interactive estimate workspace slice implemented: editable rows, library insertion, live totals, versions panel, proposal preview.
- Local persistence/project routing slice implemented: dashboard at `/`, project workspace at `/projects/[projectId]`, mutable ignored runtime JSON, save/revision/proposal snapshot server actions.
- Proposal package builder/UI system slice implemented: reusable UI primitives, editable proposal terms, immutable proposal snapshots with terms, and print-ready `/proposals/[proposalId]` route.
- Project creation/proposal history/UI hardening slice implemented: dashboard create-project form, first empty draft estimate, reusable PageShell/ObjectCard/EmptyState primitives, project proposal history links, grid/drag-drop package ADR.
- Estimate grid drop-targeting UX micro-spike implemented at `/spikes/estimate-grid`: chose dnd-kit overlay + explicit row hit-testing over native HTML DataTransfer for stronger micro-interactions, stable no-layout-shift library cards, visible grid drop intent, and space/area-oriented estimating inspired by legacy v4.
- Autopilot documentation added/updated:
  - `.ai/01_roadmap/README.md`
  - `.ai/04_tasks/current-autopilot-board.md`
  - `.ai/10_state/execution-ledger.md`
- Production model bridge started: `Estimate.sections` remains the working space/area axis for now, `Estimate.proposalSections` is the client-facing BOQ/proposal consolidation axis, and `EstimateLineItem.proposalSectionId` maps rows into proposal summaries.
- Production workspace proposal mapping slice implemented: blank/library row creation now uses the selected working section to infer/default the proposal section, each row exposes an editable proposal-section selector, proposal preview summarizes by proposal section, and unmapped billable rows show an issuance warning.
- Full route/feature E2E baseline implemented for `/`, `/projects/[projectId]`, `/proposals/[proposalId]`, `/spikes/estimate-grid`, and unknown project 404; covered MVP flows include section selection, blank/library insertion, proposal-section mapping, live total recalculation, proposal issuance, revision duplication, and spike insertion.
- SaaS landing page implemented at `/` with hero, features, workflow, and CTA sections; existing project dashboard moved to `/projects` and preserved.
- Production Glide workspace migration started: project estimate page now renders a client-only Glide Data Grid sheet backed by the shared adapter, while accessible proposal-section mapping/action controls remain available below during the incremental migration.
- Production library-to-Glide insertion added: cost cards now have drag handles for dnd-kit grid targeting plus an accessible selected-item row fallback that inserts the intended library item through the shared grid adapter.
- Production selected-row inspector added: proposal-section assignment, proposal-section mapping, scope, quantity/rate edits, reset, and delete now live in keyboard-accessible grid-side controls instead of the old full accessible table.
- Floor/room/area hierarchy slice added: estimates now support explicit `floors` and `spaces`, line items can reference `spaceId`, the selected-row inspector can assign locations, proposal preview shows location-aware detail rows, issued proposal snapshots freeze detail rows with location references, `/proposals/[proposalId]` renders those detail rows, and Glide keyboard selection updates the inspector through `onGridSelectionChange`.
- Cost Library Management v1 slice added: the project workspace library tab now creates/edits reusable cost items with source notes, pricing date, confidence, waste percent, material defaults, and labor defaults while preserving inserted estimate rows as copied project-specific data.
- Row move/copy between spaces slice added: selected-row inspector can move or copy a line item to another floor/room/area space while preserving proposal-section mapping; copied rows receive new ids and remain editable estimate instances.
- Revision/diff semantics slice added: `compareEstimateRevisions` classifies space-only moves separately from BOQ/proposal remaps, commercial changes, scope changes, additions, and removals; the Versions panel displays the active revision summary when a prior version exists.
- Persisted revision records slice in progress: local database now stores `revisionChangeRecords`, save operations persist revision summaries when a newer estimate is saved against a prior version, the Versions panel can show saved records, and Codex comments from PR #8/#9 were remediated.
- PR #7 Codex comments remediated: `next-env.d.ts` is no longer ignored, grid edits mark library-backed rows as `linked-overridden` when appropriate, and numeric Glide edits clamp to nonnegative values before persistence.
- Code-intelligence cadence established: ChunkHound, GitNexus, and CodeGraph are installed/run for migration slices; generated indexes live under ignored `.ai/14_code_intelligence/`.
- Codex/GitHub PR comments checked on PR #5 and PR #6; actionable material-cost edit, default proposal-section mapping, and non-billable section-header total issues fixed in the grid/model path.
- Root `DESIGN.md` has been created and validated with Google DESIGN.md lint: 0 errors.
- Initial token exports created:
  - `.ai/07_design/tailwind.theme.json`
  - `.ai/07_design/tokens.dtcg.json`
- Next: draft MVP screen architecture using `DESIGN.md`, proposal package spec, versioning spec, and library-linking model.
- Decide first MVP project type: residential, renovation, fit-out, small commercial, or broader contractor work.
- Define source/pricing policy: user-owned cost library first vs seeded local cost references.
- Decide whether AI enters v1 as assistant, import/parser, reviewer, or not yet.
