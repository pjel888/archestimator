# Cloudflare Hosted D1 Row And Publication Refresh Proof

Generated: 2026-07-02 04:31 UTC

Status: **PASS** for the hosted authenticated estimate-row edit, D1 readback, Publisher republish, and unauthenticated public share refresh.

## Scope

Production base URL: `https://archestimator.com`

Cloudflare Worker: `archestimator-proof`

Deployed Worker version: `d47bcd1d-37f0-41e3-864a-05a90b28518b`

D1 database: `archestimator-proof-db` (`9bdb29bb-687e-4f51-ae81-7659c426ea5f`)

Project: `Codex Cloudflare Smoke 2026-07-01` (`bd9a8e68-4e24-49d8-aeed-e4651b7cab0b`)

Estimate: `ES-001 Estimate` (`985f6690-741e-4136-9fa1-a4896cd364e4`)

## Result

The signed-in production browser edited the estimate row quantity from `3.15` to `3.16`; the UI showed row save completion. Remote D1 readback from `archestimator-proof-db` returned row `878e98e0-6a5a-4e58-ac42-4b73284eae4d` with quantity `3.16`, base quantity `3.16`, contingency amount `0`, adjustment percentage `2`, unit cost `123.45`, and `updated_at=2026-07-02T04:20:52.416Z`.

The production Publisher UI then showed `Shared page updated.` Remote D1 readback found publication `337f1427-2dd1-4ff4-b89f-5e518aecb66e` as `published`, `snapshot_version=2`, selected estimate `985f6690-741e-4136-9fa1-a4896cd364e4`, snapshot total `397.90404`, first-row quantity `3.16`, and first-row total `397.90404`.

Unauthenticated `curl -L` for the redacted `/share/...` URL returned HTTP `200`, zero redirects, and HTML containing `PHP 397.90`, quantity `3.16`, `Hosted D1 browser row mutation proof`, `Cloudflare QA Area 2026-07-02 04:24`, and `Cloudflare QA Component 2026-07-02`.

## Related Deployment Proof

`/login` is static/prerendered after the latest deployment: the build manifest shows `○ /login`, and live headers include `cache-control: s-maxage=31536000`, `x-nextjs-prerender: 1`, and `x-opennext: 1`.

The exact stale URL `https://archestimator.com/?error=state_mismatch` still recovers cleanly: first hop `302` to `/login?next=%2Fworkshop&oauth_state_reset=1`, then final `200` at `/login?next=%2Fworkshop&oauth_state_reset_done=1` with stale OAuth state cleanup.

## Verification

- Focused Vitest passed: `5` files / `78` tests.
- `bun run type-check` passed.
- `bun run cf:build` passed.
- `bun run cf:deploy` passed and deployed Worker version `d47bcd1d-37f0-41e3-864a-05a90b28518b`.
- Hosted route proof passed in `2026-07-02-cloudflare-hosted-route-proof-login-static-deploy.*`.
- Hosted performance proof in `2026-07-02-cloudflare-hosted-performance-login-static-deploy.*` passed route contracts but failed strict public-route p95 budgets. Worker tail showed mostly `0-1ms` wall/cpu time, so P1-PERF remains open as client/edge timing variance rather than an app CPU blocker.

## Residual Risks

Named recipient invite/session/comment/decision proof remains open.

Media upload UX/scanner persistence remains open in the single production browser journey.

Strict credential-free public-route p95 budgets remain red.

A stale client-side estimate URL was observed while the rendered/D1 estimate data belonged to the canonical estimate. The provider proof above uses canonical D1 IDs.
