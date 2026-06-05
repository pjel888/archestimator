# Settings Hub Local Evidence - 2026-06-02

## Claim

`/workshop/settings` is a protected Settings hub instead of an immediate redirect to `/workshop/settings/profile`.

## Local Evidence

- `src/app/workshop/settings/page.tsx` calls `requireCurrentUserContext()` before rendering.
- The hub links to Profile settings and Workspace settings for all authenticated workshop users.
- The hub links to Beta users and Beta feedback only when `context.role === "ceo" || context.role === "admin"`.
- `scripts/measure-route-transitions.ts` now expects the authenticated Settings sidebar transition to land on `/workshop/settings`.
- `tests/vitest/auth-settings-ui-contract.test.ts` guards the hub links, platform role boundary, and removal of the profile redirect.
- `tests/vitest/route-transition-measure-script.test.ts` guards the updated route-transition benchmark target.
- `tests/vitest/closed-beta-readiness-docs.test.ts` keeps this evidence indexed while preserving the launch **NO-GO** wording.

## Verification

- `bunx vitest run tests/vitest/auth-settings-ui-contract.test.ts tests/vitest/route-transition-measure-script.test.ts tests/vitest/closed-beta-readiness-docs.test.ts --maxWorkers=1` passed 3 files / 15 tests.
- `bun run type-check` passed.
- `bun run lint:design-system` passed.
- `bun run lint` passed with the existing 14-warning baseline.
- `bun run build` passed and lists `/workshop/settings`, `/workshop/settings/beta-users`, `/workshop/settings/feedback`, `/workshop/settings/profile`, and `/workshop/settings/workspace` as dynamic app routes where appropriate.
- Local browser smoke with `ARCHESTIMATOR_DEV_AUTH_BYPASS=1`, `ARCHESTIMATOR_DEV_AUTH_ADMIN_DB=1`, and `ARCHESTIMATOR_DEV_AUTH_EMAIL=OWNER_EMAIL_PLACEHOLDER` loaded `http://localhost:3059/workshop/settings` and verified visible Settings, Profile settings, Workspace settings, Beta users, Beta feedback, plus 4 Open links.

## Scope Limit

This is local source/UI evidence for admin tool discovery. It does not prove hosted Google auth, hosted platform-admin access, linked beta migrations, monitored feedback operations, support inbox ownership, rollback, or owner launch sign-off.
