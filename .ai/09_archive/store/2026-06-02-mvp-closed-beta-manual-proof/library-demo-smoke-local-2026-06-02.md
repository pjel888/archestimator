# Local Library Demo Smoke - 2026-06-02

## Result

Pass, local-only.

Command:

```bash
ARCHESTIMATOR_E2E_LIBRARY_DEMO_SMOKE=1 ARCHESTIMATOR_DEV_AUTH_BYPASS=1 ARCHESTIMATOR_DEV_AUTH_ADMIN_DB=1 ARCHESTIMATOR_LIBRARY_DEMO_SMOKE_DIR=.ai/09_archive/store/2026-06-02-mvp-closed-beta-manual-proof PLAYWRIGHT_PORT=3038 bun run test:e2e e2e/workshop-library-demo-smoke.spec.ts --project=chromium
```

Playwright result: 2 passed in 17.6s.

## Artifacts

- `component-library-demo-smoke-2026-06-02.png`
- `component-library-demo-smoke-2026-06-02.json`
- `template-library-demo-smoke-2026-06-02.png`
- `template-library-demo-smoke-2026-06-02.json`

## Covered Checks

- `/workshop/library` rendered the Library page, Component library workspace, component sheet, component sheet search, component tree search, component result count, component cards, and visible `Source` / `Checked` pricing trust fields.
- `/workshop/templates` rendered the Templates page, Template library workspace, template sheet, template sheet search, template tree search, visible `All Templates` count text, `Structure`, and `Sample rows` preview content.

## Scope Limits

- This proof used local dev auth on `http://127.0.0.1:3038`.
- It is not hosted auth, production Vercel, RLS, or provider evidence.
- It does not prove template insertion into an estimate.
- It does not prove the project-specific unlink detach/edit/library-unchanged/export flow.
- Closed beta remains NO-GO until the remaining hosted/provider/manual proof rows pass.
