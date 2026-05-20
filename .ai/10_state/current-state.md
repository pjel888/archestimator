# Current State

**Date:** 2026-05-20
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

- Available agent bench: Codex, Claude, OpenCode, CommandCode, Gemini, and Kimi.
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
/workshop/components                                  -> protected post-reset component/library surface
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
- Estimate tree interaction now uses React Complex Tree for navigation, immediate Zustand-backed selected-node UI state, route reconciliation, expand/collapse, and add-node hierarchy creation. Drag/drop reorganization has been removed completely from the estimate tree: there are no tree drop zones, drag previews, reorder handlers, optimistic move pipeline, `moveEstimateNode` server action, or `public.move_estimate_nodes` RPC. The tree's active technical model is exactly two node kinds: Group Nodes (`kind = group`) organize and may nest other Group Nodes and Area Nodes; Area Nodes (`kind = area`) are leaves and are the only row-owning nodes. Lot, General Requirements, House, Floor, Phase, Trade, or similar domain labels are user/UX content on Group Nodes, not separate technical node kinds. Area Nodes must not be parents and must not be root children under the current root invariant. The removed single-pointer Move modal/button must not be restored as-is; tree movement has no current UI path pending a replacement design. The tree toolbar exposes expand-all/collapse-all actions. Keep future tree changes aligned with the central hierarchy matrix and database-side invariants; legacy `lot`, `general`, `structure`, `level`, and `assembly` values are not active technical estimate tree kinds and must be normalized/rejected by the DnD implementation plan before drag/drop is enabled.
- `.ai/03_plans/estimate-tree-dnd-reorganization/` is the active replacement-design audit/plan for reintroducing seamless drag/drop estimate-tree reorganization with React Complex Tree. It does not mean the feature is implemented yet; it supersedes only the “no current UI path pending a replacement design” gap above and must be read before implementing tree movement.
- `.ai/03_plans/project-estimates-component-library-improvement-plan.md` is the research-backed UX/UI improvement plan for that feature. Its immediate recommended next slice is target-aware insert + insert-and-edit + keyboard editing baseline.
- `.ai/03_plans/ui-componentization-and-storybook-plan.md` is the active reusable UI primitive matrix and Storybook organization plan. Read it before creating app/workshop controls, component-library controls, toolbars, cards, filters, panels, or stories.

Read before implementation:

1. `.ai/00_system/AGENT_SELF_DIAGNOSTIC_PROTOCOL.md`
2. `.ai/03_plans/current-post-reset-workshop-slice.md`
3. `.ai/02_audits/2026-05-17-reset-cleanup-audit.md`
4. `.ai/06_specs/restart-guardrails.md`
5. `.ai/10_state/decisions.md`
6. `.ai/10_state/known-issues.md`
7. `DESIGN.md`
8. `.ai/03_plans/ui-componentization-and-storybook-plan.md`
9. `.ai/03_plans/estimate-tree-dnd-reorganization/README.md`

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
