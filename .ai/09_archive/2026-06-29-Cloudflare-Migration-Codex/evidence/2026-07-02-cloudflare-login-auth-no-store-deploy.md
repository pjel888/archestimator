# Cloudflare Login/Auth No-Store Deploy

Status: PASS

Production Worker `archestimator-proof` is now deployed at 100% on version `e4476425-2fdb-41ce-856a-de78e3a22fd8` with tag `login-auth-no-store-final`.

Changes proved:

- `/login` is dynamic and `revalidate = 0`.
- `/login` is no longer in the Worker anonymous static-page cache.
- Delegated `/api/auth/*` Better Auth responses receive `private, no-cache, no-store, max-age=0, must-revalidate`.

Hosted probes:

- `https://archestimator.com/login?next=%2Fworkshop` returned `200` with `Cache-Control: private, no-cache, no-store, max-age=0, must-revalidate`.
- `https://archestimator.com/api/auth/get-session` returned `200` with the same no-store cache policy.
- `https://archestimator.com/?error=state_mismatch` returned `302` to `/login?next=%2Fworkshop&oauth_state_reset=1`, cleared OAuth state cookies, and did not render visible `state_mismatch`.
- Browser flow from the exact bad URL reached Google OAuth, produced one `__Secure-better-auth.state` cookie, and the cookie state matched the Google `state`.
- Synthetic callback with matching state plus a fake code returned `invalid_code`, not `state_mismatch`.

Verification:

- `bunx vitest run tests/vitest/cloudflare-better-auth-route.test.ts tests/vitest/auth-entry-ui-contract.test.ts tests/vitest/public-static-route-contract.test.ts tests/vitest/cloudflare-worker-route-optimizations.test.ts --maxWorkers=1`
- `bun run type-check`
- `bun run cf:build`
- `CLOUDFLARE_HOSTED_ROUTE_BASE_URL=https://archestimator.com ... bun run cf:verify-hosted-routes`
- `bun run cf:release-gates`
- `git diff --check`

