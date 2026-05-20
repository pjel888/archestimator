# Gate B Browser Verification Notes

Date: 2026-05-20
Branch: feat/estimate-tree-dnd-gate-b

## Browser route probe

Target:
`http://localhost:3000/workshop/projects/22222222-2222-4222-8222-222222222222/estimates/77777777-7777-4777-8777-777777777729`

Observed result in live browser:
- Redirected to `/login?next=%2Fworkshop%2Fprojects%2F22222222-2222-4222-8222-222222222222%2Festimates%2F77777777-7777-4777-8777-777777777729`.
- Login page rendered `Sign in to workshop`.
- Browser console showed 0 console messages and 0 JavaScript errors during the probe.

Reason DnD could not be manually exercised in this session:
- `.env.local` currently exposes only `DATABASE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, and `NEXT_PUBLIC_SUPABASE_ANON_KEY` as set keys.
- `ARCHESTIMATOR_DEV_AUTH_BYPASS`, `ARCHESTIMATOR_DEV_AUTH_EMAIL`, and `SUPABASE_SERVICE_ROLE_KEY` are not set in the environment, so protected workshop rendering redirects before the estimate tree mounts.
- This is an auth/test-fixture prerequisite, not evidence that DnD failed.

## Browser automation added

Added `e2e/estimate-tree-dnd.spec.ts` as an opt-in mutating seamlessness gate.

The spec is intentionally skipped unless all of the following are set:
- `ARCHESTIMATOR_E2E_MUTATING_DND=1`
- `ARCHESTIMATOR_DEV_AUTH_BYPASS=1`
- `ARCHESTIMATOR_DEV_AUTH_EMAIL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

When enabled, it:
- resets the seeded second-floor sibling order before and after the test;
- opens the concrete estimate route;
- drags `Master Walk-In Closet` before `Master Bedroom`;
- asserts optimistic DOM order changes;
- asserts `Tree order saved` status;
- asserts no document requests and no main-frame navigations during drop;
- samples the tree through `requestAnimationFrame` and asserts zero blank frames;
- reloads and asserts the reordered tree persists.

## Playwright evidence

Command:
`PLAYWRIGHT_PORT=3000 npx playwright test e2e/auth.spec.ts e2e/estimate-tree-dnd.spec.ts --project=chromium --reporter=list`

Result:
- 2 auth/browser tests passed.
- 1 DnD seamlessness test skipped because mutating dev-auth/admin prerequisites are not configured.

Evidence log:
`.ai/03_plans/estimate-tree-dnd-reorganization/evidence/gate-b-playwright-auth-and-dnd-gate-port3000.txt`

A first attempt against port 3020 failed because a Next dev server was already running for this repo on port 3000. The rerun used `PLAYWRIGHT_PORT=3000` against that existing server.
