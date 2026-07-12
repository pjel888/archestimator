# Cloudflare Browser Google + Project Smoke

Generated: `2026-07-01T13:52:01Z`

Base URL: `https://archestimator.com`

Result: **PASS**

## Google Auth Smoke

- Started from `https://archestimator.com/login?next=/workshop`.
- Clicked the production `Continue with Google` button in Chrome.
- Returned to `https://archestimator.com/workshop` as an authenticated session for Philip Lewis.
- No `error=state_mismatch` was observed.
- No post-auth redirect to `archestimator-proof.philipjonlewis.workers.dev` was observed.

## Project Create/List Smoke

- Opened the production New Project modal from Workshop.
- Created `Codex Cloudflare Smoke 2026-07-01`.
- Confirmed the project appears on the production Projects page.

| Field | Value |
| --- | --- |
| Project name | `Codex Cloudflare Smoke 2026-07-01` |
| Project ID | `bd9a8e68-4e24-49d8-aeed-e4651b7cab0b` |
| Project code | `Q5M2XN6L` |
| Project path | `/workshop/projects/bd9a8e68-4e24-49d8-aeed-e4651b7cab0b` |

The smoke project was intentionally left in place for audit visibility.

## Scope Boundary

This proves the live production Google auth and D1-backed project-create/list smoke path. It does not prove magic-link mailbox completion, upload lifecycle, estimate editing, publication, or strict p95 performance budgets.
