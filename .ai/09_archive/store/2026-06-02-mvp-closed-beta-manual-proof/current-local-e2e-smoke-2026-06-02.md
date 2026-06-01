# Current Local E2E Smoke Evidence

Date: 2026-06-02
Scope: local Playwright smoke only.
Result: partial/local pass with hosted/manual blockers remaining.

## Commands

Signed-out auth:

```bash
PLAYWRIGHT_PORT=3039 bun run test:e2e -- e2e/auth.spec.ts --project=chromium
```

Result: pass, 2 tests in 5.0s.

Library/template smoke:

```bash
PLAYWRIGHT_PORT=3041 ARCHESTIMATOR_DEV_AUTH_BYPASS=1 ARCHESTIMATOR_DEV_AUTH_ADMIN_DB=1 ARCHESTIMATOR_E2E_LIBRARY_DEMO_SMOKE=1 ARCHESTIMATOR_E2E_TEMPLATE_INSERT_SMOKE=1 ARCHESTIMATOR_LIBRARY_DEMO_SMOKE_DIR=.ai/09_archive/store/2026-06-02-mvp-closed-beta-manual-proof/current-local-e2e-smoke-2026-06-02 ARCHESTIMATOR_TEMPLATE_INSERT_SMOKE_DIR=.ai/09_archive/store/2026-06-02-mvp-closed-beta-manual-proof/current-local-e2e-smoke-2026-06-02 bun run test:e2e -- e2e/workshop-library-demo-smoke.spec.ts e2e/workshop-template-insert-smoke.spec.ts --project=chromium
```

Result: pass, 3 tests in 38.9s.

## Artifacts

- `current-local-e2e-smoke-2026-06-02/component-library-demo-smoke-2026-06-02.png`
- `current-local-e2e-smoke-2026-06-02/component-library-demo-smoke-2026-06-02.json`
- `current-local-e2e-smoke-2026-06-02/template-library-demo-smoke-2026-06-02.png`
- `current-local-e2e-smoke-2026-06-02/template-library-demo-smoke-2026-06-02.json`
- `current-local-e2e-smoke-2026-06-02/template-insert-local-smoke-2026-06-02.png`
- `current-local-e2e-smoke-2026-06-02/template-insert-local-smoke-2026-06-02.json`

## Covered

- Signed-out `/workshop/projects` redirects to `/login?next=%2Fworkshop%2Fprojects`.
- `/login?next=/workshop/projects` renders the compact email-link sign-in controls.
- Local dev-auth `/workshop/library` renders component library search, navigation tree, result count, pricing source, and checked-date trust fields.
- Local dev-auth `/workshop/templates` renders template search, navigation tree, structure, and sample-row preview.
- Local dev-auth template insertion into a throwaway linked Supabase estimate inserted 5 nodes and 8 rows, recorded one `template_inserted` event, and the spec cleanup/residue verification completed.

## Initial Attempt Note

An earlier run without `ARCHESTIMATOR_DEV_AUTH_ADMIN_DB=1` failed with Supabase `42501` on fallback workspace bootstrap. This matches the documented local protected-route smoke requirement for server-rendered dev-auth routes that may bootstrap workspace data. The corrected run used `ARCHESTIMATOR_DEV_AUTH_ADMIN_DB=1` and passed.

## Not Proven

- Hosted Google OAuth.
- Closed-beta allowlist allowed/denied/revoked states.
- Hosted first-run fresh account.
- Project-specific unlink/export in the linked target; existing evidence remains blocked by missing linked RPC `unlink_estimate_row_item_from_library_with_history`.
- Spreadsheet-app open/recalc/print.
- Logout/session expiry.
- Target hosted end-to-end journey without dev-auth.

Closed beta remains **NO-GO** until hosted/provider/manual proof replaces this local-only smoke.
