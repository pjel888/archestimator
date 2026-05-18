# Plans

This folder contains historical and future implementation plans.

## Active status

The canonical current state is `.ai/10_state/current-state.md`.

Archestimator is no longer at the completely blank `/workshop` reset snapshot. The repo currently contains a small post-reset workshop route slice. Older plans in this folder that describe the rejected full prototype, local-first MVP, proposal/revision system, Glide migration, or broad workshop route family are historical context only unless a current plan explicitly reactivates a narrow piece.

Current planning baseline:

- `/` landing page is preserved.
- `/workshop` and a small workshop/projects/components route slice exist in `src/app`.
- The deleted full prototype remains superseded.
- Future work must be route-scoped, screen-scoped, and easy to delete if Philip rejects it.

Active/current plan:

- `.ai/03_plans/current-post-reset-workshop-slice.md` — narrow orientation plan for the current workshop/projects/components route slice.

Read first before planning new work:

1. `.ai/00_system/AGENT_SELF_DIAGNOSTIC_PROTOCOL.md`
2. `.ai/10_state/current-state.md`
3. `.ai/10_state/decisions.md`
4. `.ai/10_state/known-issues.md`
5. `.ai/03_plans/current-post-reset-workshop-slice.md`
6. `.ai/02_audits/2026-05-17-reset-cleanup-audit.md`
7. `.ai/06_specs/restart-guardrails.md`

## Rules for new plans

A new plan must state:

- exact user job;
- route/screen affected;
- non-goals;
- files expected to change;
- validation gate;
- deletion criteria if Philip rejects the direction.

Do not create broad route families, dashboards, proposal systems, component libraries, grids, or persistence layers without explicit approval in the plan.

## Superseded historical plans

Older plans in this folder may mention Glide, local persistence, project dashboards, estimate workspaces, proposal snapshots, and workshop route families. Treat them as historical context only unless a future plan explicitly reactivates a specific piece.
