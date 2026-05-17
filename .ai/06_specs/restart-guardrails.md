# Archestimator Restart Guardrails

**Date:** 2026-05-17
**Status:** Active after reset cleanup.

## Reset baseline

Archestimator is restarting from:

- `/` — landing page only.
- `/workshop` — intentionally empty page.

Everything else from the previous prototype is considered rejected unless Philip explicitly reapproves it.

## Do not resurrect these by default

Future agents must not rebuild or restore the deleted prototype surfaces just because old docs mention them:

- project dashboard route family
- estimate editor/workspace
- component library manager
- right sidebar component picker
- proposal snapshot pages
- revision diff/versioning UI
- local-first repository/mutation layer
- app shells/project shells
- grid spike surfaces
- login/signup prototype pages
- legacy redirect routes

## Restart workflow

Before any new app implementation:

1. Write a short screen brief in `.ai/03_plans/`.
2. State the exact user job for the screen.
3. State what will not be included.
4. Get the simplest acceptable interaction working before adding more routes.
5. Keep code small enough to delete again if Philip rejects it.

## UI/UX principles for the restart

- Start empty and intentional, not feature-complete.
- Prefer one focused screen over a shell with many modules.
- Do not add navigation for features that do not exist.
- Do not add sample data unless the screen needs it to communicate the product idea.
- Do not create dense estimating controls before the estimating interaction is accepted.
- Avoid fake SaaS maturity: no settings, history, dashboards, auth, exports, or admin surfaces until the product slice earns them.

## Data principles for the restart

- No Supabase.
- No database migration work.
- No broad local-first repository layer until a screen needs persistence.
- Static fixtures or component-local state are acceptable for early UI exploration.
- If persistence becomes necessary, write the data boundary after the UX is accepted.

## Validation baseline

For the reset baseline, validate only:

- landing page compiles and renders;
- `/workshop` compiles and renders as an empty page;
- type-check, lint, unit/DOM tests, build, and diff whitespace pass.

Do not recreate route coverage for deleted routes.
