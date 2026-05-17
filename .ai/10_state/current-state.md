# Current State

**Date:** 2026-05-17
**Canonical reset audit:** `.ai/02_audits/2026-05-17-reset-cleanup-audit.md`
**Active restart guardrails:** `.ai/06_specs/restart-guardrails.md`

## Project

Archestimator is a pre-MVP construction estimating product that has been reset after Philip rejected the current app/workshop prototype UX and UI.

## Repository / branch

- Repository folder: `/Users/philiplewis/archestimator`.
- Active branch: `feat/auth-component-library-workspace`.
- Stack: Next.js 16, React 19, Bun, TypeScript, Tailwind CSS v4.
- Backend: no Supabase/Postgres connection.
- Product app baseline: landing page plus blank workshop only.

## Active mode

Philip approved a destructive cleanup/reset of the current prototype: delete everything except the landing page and an empty `/workshop` page, then stage, commit, and push.

## Current live surfaces

```txt
/          -> preserved landing page
/workshop  -> intentionally empty reset page
```

No other product/app routes are active. Removed routes should not be restored for compatibility.

## Superseded prototype direction

The previous local-first MVP implementation is rejected and must not be resumed as the default direction. Superseded areas include:

- project dashboard route family;
- estimate editor/workspace;
- estimate hierarchy tree;
- right-sidebar component picker;
- component library manager;
- proposal snapshot pages;
- revision/versioning UI;
- local JSON repository and mutation layer;
- app shells/project shells;
- grid spike and drag/drop surfaces;
- login/signup visual prototype pages;
- legacy redirect routes.

Historical docs may remain for context, but they are not active instructions.

## Active product direction

Restart from a blank canvas. Future work must begin with a small screen brief and a clearly approved first workflow before rebuilding app UI or data architecture.

Read before any future implementation:

1. `.ai/02_audits/2026-05-17-reset-cleanup-audit.md`
2. `.ai/06_specs/restart-guardrails.md`
3. `.ai/10_state/decisions.md`
4. `DESIGN.md`

## Validation baseline

The reset baseline should validate:

```bash
bun run validate
bun run build
git diff --check
```

E2E route coverage for deleted routes is intentionally removed. Tests should only protect approved baseline behavior until the new app direction is accepted.

- Typography correction: outside the landing page, Archestimator app/workshop UI now treats 12px as the maximum font size. Component-library/sidebar/table/modal/body/control text should generally be 8-10px, with 11px subtitles and 12px only for strongest app/card titles.
