# Roadmap

**Last updated:** 2026-05-25
**Status:** Authenticated Supabase foundation is active; project and estimate bootstrap are now the current MVP path.

## Current product baseline

Archestimator now preserves and actively builds on:

```txt
/                                                     landing page
/login                                                Supabase magic-link auth
/auth/callback                                        Supabase auth callback
/workshop                                             protected workshop entry
/workshop/projects                                    live project list/create route
/workshop/projects/[projectId]                        live project dashboard shell
/workshop/projects/[projectId]/estimates              live estimate list/create route
/workshop/projects/[projectId]/estimates/[nodeId]     live estimate workspace route with project-scoped tree/row data
/workshop/components                                  component library surface
```

The reset-era blank-workshop baseline is no longer current. Supabase/Auth/Postgres have been explicitly approved for Archestimator through project `ebxxqidacheyapmmzavr`.

## Phase 0 — Governance and design-system guardrails

Status: active and continuous.

Done:

- Non-landing font cap enforced by `bun run lint:font-size`.
- App/workshop typography maximum: 12px.
- Shared UI primitive reuse is mandatory.
- `Button`, `ButtonLink`, `ControlInput`, cards/forms, and route-specific surfaces must remain compact.

Next:

- Continue moving repeated controls into `src/components/ui` before feature-local markup spreads.
- Keep feature specs current with every implementation slice.

## Phase 1 — Authenticated workspace foundation

Status: implemented, needs manual hosted-dashboard verification.

Done:

- Supabase project linked: `ebxxqidacheyapmmzavr`.
- Supabase Auth magic-link route added.
- `/workshop/*` protected by `src/proxy.ts`.
- Profiles/CEO role bootstrap implemented in database migration.
- Default workspace bootstrap implemented.
- Auth setup checklist documented in `.ai/06_specs/supabase-auth-setup.md`.

Remaining:

- Verify hosted Supabase Auth redirect URLs in the Dashboard before broader tester use.

## Phase 2 — Live project bootstrap

Status: implemented.

Done:

- `/workshop/projects` reads authenticated workspace projects.
- Project creation server action inserts live Supabase project records.
- Live project cards render Supabase rows.
- Project dashboard route loads authenticated workspace project data.

Spec:

- `.ai/06_specs/live-project-estimate-bootstrap.md`

## Phase 3 — Live estimate bootstrap

Status: implemented.

Done:

- `/workshop/projects/[projectId]/estimates` lists live Supabase estimates.
- Estimate creation server action creates a draft estimate.
- Estimate creation bootstraps initial hierarchy: lot → structure → level → area.
- Estimate list cards link to the first area node.
- `/workshop/projects/[projectId]/estimates/[nodeId]` reads live Supabase `estimate_nodes` and `estimate_row_items`.
- Node route validation is project-scoped through the selected node's parent estimate.
- Component-library area insertion, component replacement, row deletion, and inline row edits persist to Supabase via project-scoped server actions.

## Phase 4 — Live estimate workspace editing

Status: active/current.

Done:

- Insert/replace/delete/update row mutations now persist through TanStack Query mutation hooks backed by server actions.
- The estimate sheet shows compact mutation save state: `Ready`, `Saving`, `Saved`, `Save failed`.
- The route-loaded live estimate tree is seeded into a TanStack Query `area-tree` cache and optimistic failures restore the previous local tree/editable-row state.
- Mutations validate project/estimate/node/row ownership before writing.

Target:

- Implement row-specific dirty/saved/error markers beyond the sheet-level compact failed-save state.
- Preserve route-backed node selection.
- Keep area-only row insertion enforcement.
- Keep component/library picker separate from full component-library admin.

## Phase 5 — Proposal/export/versioning/library hardening

Status: partly implemented for estimate Activity; remaining work is gated or future-scope.

Target capabilities:

- proposal snapshots;
- revision diff lineage;
- cost-library management;
- export package generation;
- pricing/source trust metadata.

Estimate Activity residual roadmap:

- Live mutation/atomicity proof is not local-safe implementation work yet. It needs local Supabase or an approved throwaway database, and must cover node create/rename, template event reads, rollback, and concurrency.
- Scalar edit latency benchmarking also needs the same safe mutation harness before any production-runtime performance claim.
- Deleting the linked-remote `V2` / `QA checkpoint` residue is destructive and remains out of scope unless a separate cleanup task explicitly approves exact-id deletion.
- Activity export/report, Supabase Realtime, retention pruning/archive compaction, and undo/redo remain future product slices, not unfinished local-safe implementation.

Current source:

- `.ai/03_plans/estimate-sheet-version-control/18-current-activity-contract.md`
- `.ai/03_plans/estimate-sheet-version-control/19-local-safe-completion-audit.md`

## Permanent guardrails

- No merge to `main` without Philip approval.
- No deploy without Philip approval.
- Never touch SlateCamp Supabase resources.
- No app/workshop font above 12px.
- No duplicated feature-local buttons, search inputs, icon buttons, chips, cards, panels, dropdowns, or repeated controls; make/reuse shared UI primitives.
- Tests protect accepted behavior and key governance rules.
