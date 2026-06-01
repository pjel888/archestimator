# Local Template Insert Smoke - 2026-06-02

## Result

Pass, local-only.

Command:

```bash
ARCHESTIMATOR_E2E_TEMPLATE_INSERT_SMOKE=1 ARCHESTIMATOR_DEV_AUTH_BYPASS=1 ARCHESTIMATOR_DEV_AUTH_ADMIN_DB=1 ARCHESTIMATOR_TEMPLATE_INSERT_SMOKE_DIR=.ai/09_archive/store/2026-06-02-mvp-closed-beta-manual-proof PLAYWRIGHT_PORT=3039 bun run test:e2e e2e/workshop-template-insert-smoke.spec.ts --project=chromium
```

Playwright result: 1 passed in 46.1s.

## Artifacts

- `template-insert-local-smoke-2026-06-02.png`
- `template-insert-local-smoke-2026-06-02.json`

## Covered Checks

- Created a throwaway user-owned estimate under the seeded Lewis Residence project.
- Opened the protected estimate workspace through local dev auth.
- Selected the right-sidebar `Templates` tab.
- Inserted `Condo Fit-Out Starter` into the `Second Floor` group through the visible `Add` button.
- Verified linked Supabase row counts changed from 51 nodes / 0 rows to 56 nodes / 8 rows.
- Verified one `template_inserted` history event for the target group.
- Deleted the throwaway estimate and verified zero residue for the estimate, nodes, rows, and history events.

## Scope Limits

- This proof used local dev auth on `http://127.0.0.1:3039` and linked Supabase service-role setup for fixture creation/cleanup.
- It is not hosted auth, production Vercel, RLS allow/deny, or provider dashboard evidence.
- It does not prove project-specific unlink detach/edit/library-unchanged/export.
- Closed beta remains NO-GO until the remaining hosted/provider/manual proof rows pass.
