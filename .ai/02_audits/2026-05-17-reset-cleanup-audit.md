# Archestimator Reset Cleanup Audit

**Date:** 2026-05-17
**Scope:** Full pre-MVP app surface after Philip rejected the current Archestimator prototype UX/UI.
**Outcome:** Preserve only the landing page and an intentionally empty `/workshop` page; remove the authenticated workshop prototype, project dashboards, estimate editor, proposal pages, component library, local-first estimating data layer, and related tests.

## Executive finding

The current app attempted to implement too much of the MVP at once: project dashboard, estimate hierarchy, component library, proposal issuance, revision logic, local persistence, route redirects, shells, grid spikes, drag/drop, and UI primitives. The result is not a trustworthy foundation. The landing page can remain as the only acceptable surface; the app product should be restarted from a blank `/workshop` route.

This audit supersedes the previous active recovery direction that treated the current `/workshop` route family as salvageable.

## What went wrong

1. UI and UX were overbuilt before the core product interaction was proven.
   - Too many routes existed for a pre-MVP app.
   - The estimate workspace became a dense prototype rather than a validated contractor workflow.
   - The component library, proposal issuing, revisions, hierarchy tree, and project modules were all introduced before a stable baseline interaction existed.

2. The prototype optimized for feature coverage instead of product clarity.
   - `/workshop` tried to be an app dashboard.
   - Project routes tried to behave like a mature SaaS product.
   - The estimate editor carried too many responsibilities at once.
   - The UI contained advanced controls before the user journey was accepted.

3. Local-first data implementation became premature product gravity.
   - JSON repository boundaries, schemas, mutations, proposal snapshots, and revision records were built before the UI direction was settled.
   - Keeping those systems would bias the restart toward the rejected structure.

4. Route compatibility was the wrong concern.
   - Legacy redirects and broad route coverage added maintenance surface without product value.
   - Pre-MVP Archestimator has no users, no backend, and no compatibility obligation.

5. Test coverage locked in the wrong experience.
   - E2E and DOM tests validated the rejected prototype rather than the desired product.
   - Tests should be rebuilt only after a new product direction is approved.

6. Documentation drifted into implementation momentum.
   - `.ai` docs described the current prototype as active and successful.
   - Future agents would continue the wrong direction unless the state documents clearly mark this reset.

## Hard reset decision

Effective now:

- Keep `/` as the public landing page.
- Keep `/workshop` as an intentionally empty page.
- Delete all other app routes until reapproved.
- Delete current app/workshop/project/estimate/proposal/component UI code.
- Delete the current local-first estimating data layer and prototype tests that target removed surfaces.
- Do not preserve backward compatibility, legacy redirects, or old route aliases.
- Do not rebuild the estimate editor, project dashboard, component library, proposal builder, revision system, or local data repositories until a fresh screen-by-screen direction is approved.

## Required restart guardrails

Future implementation must follow these rules:

1. Product before screens.
   - Document the exact first user workflow before writing UI code.
   - Define what the user must accomplish in the first 60 seconds.
   - Do not add secondary modules until the first workflow is useful.

2. One surface at a time.
   - Start from `/workshop` only.
   - Add one new route only when its job is clear and accepted.
   - Avoid nested route families until the parent experience works.

3. No fake maturity.
   - No dashboard shell, module nav, proposal history, component manager, revision timeline, import/export, or settings unless explicitly approved.
   - No compatibility redirects for removed prototype routes.

4. No premature data architecture.
   - Do not rebuild local repositories until the screen needs persistent state.
   - Start with small local component state or static fixtures when exploring UI.
   - Add schemas/repositories only after the UX is accepted.

5. No advanced grid/drag/drop by default.
   - Do not introduce Glide, dnd-kit, spreadsheet interaction, or complex keyboard behavior until a simple workflow proves insufficient.
   - If a package is proposed, write a spike plan first.

6. Tests should protect approved behavior, not prototype assumptions.
   - Recreate tests only for the landing page and blank `/workshop` baseline immediately after reset.
   - Add more tests after the new UX direction is accepted.

7. Documentation must mark superseded work clearly.
   - Keep historical docs for context, but the current state must say the previous prototype is deleted and not to be resumed.
   - New agents must not follow old MVP completion/readiness plans as active instructions.

## Deleted surface inventory

The reset removes these product areas from the live app:

- `/login`
- `/signup`
- `/projects`
- `/projects/[projectId]`
- `/component-library`
- `/proposals/[proposalId]`
- `/spikes/estimate-grid`
- `/workshop/projects`
- `/workshop/projects/[projectId]`
- `/workshop/projects/[projectId]/estimates`
- `/workshop/projects/[projectId]/estimates/[estimateId]`
- `/workshop/projects/[projectId]/components`
- `/workshop/projects/[projectId]/publish`
- `/workshop/projects/[projectId]/data`
- `/workshop/projects/[projectId]/settings`
- `/workshop/components`

## Preserved surface inventory

- `/` landing page.
- `/workshop` intentionally empty page.
- Root layout, global styles, and the minimal UI helper required by the landing page button.

## Acceptance criteria for this reset

- `src/app/page.tsx` still renders the landing page.
- `src/app/workshop/page.tsx` renders a blank page.
- No removed app route files remain.
- No old estimate/project/proposal/component-library implementation files remain under `src/components` or `src/lib` except minimal landing dependencies.
- Tests are reduced to the reset baseline.
- `.ai/README.md`, `.ai/10_state/current-state.md`, `.ai/10_state/decisions.md`, and `.ai/10_state/known-issues.md` warn future agents not to resume the rejected prototype.
- Type-check, lint, tests, build, and `git diff --check` pass.
