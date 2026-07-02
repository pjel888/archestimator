---
title: Cloudflare Main Worker Current-Source Deploy
generated: 2026-07-01T22:49:28Z
status: pass
---

# Cloudflare Main Worker Current-Source Deploy

`archestimator-proof` current source uploaded and deployed successfully after trimming the Worker bundle.

## Production Version

- Worker version: `3d3f3873-3232-4591-9436-2e963860ddbb`
- Version number: `83`
- Tag: `lightweight-xlsx-direct-magic-link`
- Traffic: `100%`
- Deployment: `290812ff-9865-4e1a-b248-eeb3d9154445`
- Deployed at: `2026-07-01T22:46:35.454876Z`

## Upload Evidence

- Wrangler: `4.106.0`
- Total upload: `17019.69 KiB`
- Gzip: `4656.31 KiB`
- Worker startup: `36 ms`
- Previous upload blocker: resolved

The bundle trim removed runtime `exceljs` from the Worker path by adding a small proposal XLSX writer, and replaced `better-auth/plugins` barrel imports with the `better-auth/plugins/magic-link` subpath.

## Live Auth Recheck

Exact user-reported URL:

`https://archestimator.com/?error=state_mismatch`

Result:

- Redirect chain: `302 -> 302 -> 200`
- Final URL: `https://archestimator.com/login?next=%2Fworkshop&oauth_state_reset_done=1`
- Final status: `200`
- Final title: `Sign in — Archestimator — Archestimator`
- Body `state_mismatch` count: `0`
- Fresh Chromium: same final URL, no visible `state_mismatch`, one Google button, no state cookies left after cleanup

## Verification

- `CLOUDFLARE_HOSTED_ROUTE_BASE_URL=https://archestimator.com bun run cf:verify-hosted-routes`: passed, blockers empty
- `bun run cf:release-gates`: passed, `productionCutoverReady=true`, blockers empty
- Focused auth regression: `5` files / `66` tests passed
- Proposal/export + Better Auth proof regression: `5` files / `55` tests passed
- `git diff --check`: passed

The broad `archestimator-auth-callback-normalizer` edge adapter remains active as defense-in-depth, but the main `archestimator-proof` Worker is no longer stale. This artifact did not delete, downgrade, cancel, or mutate provider billing/resources.
