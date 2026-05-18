# Archestimator Restart Guardrails

**Date:** 2026-05-18
**Status:** Active guardrail. The original blank reset baseline has evolved into a small post-reset workshop slice; see `.ai/10_state/current-state.md` for live state.

## Current baseline

The reset principle remains active: do not blindly restore the rejected prototype.

Live state is defined by `.ai/10_state/current-state.md`. At the time of this update, the repo contains:

- `/` — preserved landing page;
- `/workshop` — workshop entry page;
- a small post-reset workshop/projects/components route slice.

The older 2026-05-17 blank `/workshop` state was the immediate cleanup baseline, not a permanent instruction if live repo state has moved forward.

Everything else from the previous full prototype is considered rejected unless Philip explicitly reapproves it through a fresh/current plan.

## Do not resurrect these by default

Future agents must not rebuild or restore the deleted prototype surfaces just because old docs mention them:

- broad project dashboard route family beyond the current approved slice;
- full estimate editor/workspace;
- full component library manager/admin system;
- right sidebar component picker;
- proposal snapshot pages;
- revision diff/versioning UI;
- broad local-first repository/mutation layer;
- large app shells/project shells;
- grid spike surfaces;
- login/signup prototype pages;
- legacy redirect routes.

## Restart workflow

Before expanding app implementation:

1. Run `.ai/00_system/AGENT_SELF_DIAGNOSTIC_PROTOCOL.md` if quality has degraded or context feels stale.
2. Read `.ai/10_state/current-state.md` and `.ai/10_state/decisions.md`.
3. Write or locate a short current screen/workflow brief in `.ai/03_plans/`.
4. State the exact user job for the screen.
5. State what will not be included.
6. Get the simplest acceptable interaction working before adding more routes.
7. Keep code small enough to delete again if Philip rejects it.

## UI/UX principles for the restart

- Start from the current approved slice, not from historical prototype breadth.
- Prefer one focused screen over a shell with many modules.
- Do not add navigation for features that do not exist.
- Do not add sample data unless the screen needs it to communicate the product idea.
- Do not create dense estimating controls before the estimating interaction is accepted.
- Avoid fake SaaS maturity: no settings, history, broad dashboards, auth, exports, or admin surfaces until the product slice earns them.
- Preserve the app/workshop density correction: outside the landing page, 12px is the maximum font size unless Philip explicitly approves an exception.

## Data principles for the restart

- No Supabase.
- No database migration work.
- No broad local-first repository layer until a screen needs persistence.
- Static fixtures or component-local state are acceptable for early UI exploration.
- If persistence becomes necessary, write the data boundary after the UX is accepted.

## Validation baseline

For documentation-only changes:

- referenced paths exist;
- `git diff --check` passes.

For code changes in the current app baseline:

- `bun run validate`;
- `bun run build`;
- `git diff --check`.

Do not recreate route coverage for deleted prototype routes. Add tests only for currently approved route behavior.
