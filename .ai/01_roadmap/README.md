# Roadmap

**Last updated:** 2026-05-17
**Status:** Reset baseline after rejected app/workshop prototype.

## Current product baseline

Archestimator currently preserves only:

```txt
/          landing page
/workshop  intentionally empty page
```

The previous app/workshop prototype is not the active roadmap. Do not resume old project dashboard, estimate editor, component library, proposal, revision, shell, grid, or local-first data work unless Philip explicitly reapproves a fresh plan.

## Phase 0 — Reset and cleanup

Status: active/completing.

Done:

- Audit recorded at `.ai/02_audits/2026-05-17-reset-cleanup-audit.md`.
- Restart guardrails recorded at `.ai/06_specs/restart-guardrails.md`.
- Live app reduced to landing page plus empty `/workshop`.
- Validation baseline reduced to reset-appropriate tests.

## Phase 1 — Fresh product definition

Status: next.

Goal: define one focused first workflow before rebuilding UI.

Required before implementation:

- Identify the first user job.
- Define the first `/workshop` screen in plain language.
- State non-goals explicitly.
- Decide what data, if any, is needed for that screen.
- Write a small screen brief in `.ai/03_plans/`.

Do not add routes, app shells, dashboards, libraries, proposal pages, revision history, grid packages, or persistence until the screen brief justifies them.

## Phase 2 — First approved workshop slice

Status: blocked until Phase 1 is complete.

Possible direction, not approved:

- One empty-canvas estimating interaction.
- One manually editable estimate draft.
- One contractor-facing concept demo.

The implementation must be small enough to delete if rejected.

## Phase 3 — Data and persistence

Status: deferred.

Do not rebuild the local-first repository/mutation layer until an accepted screen needs persistence.

## Phase 4 — Proposal/export/versioning/library systems

Status: deferred.

These remain important product concepts, but they must not return as broad prototype modules. Reintroduce one capability at a time only after the first workflow is accepted.

## Permanent guardrails

- No Supabase/Postgres until explicitly approved.
- No merge/deploy until explicitly approved.
- No compatibility redirects for deleted prototype routes.
- No fake SaaS maturity.
- Tests protect accepted behavior only.
