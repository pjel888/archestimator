---
title: Cloudflare Main Worker Current-Source Deploy
generated: 2026-07-03T17:36:48.000Z
status: pass
---

# Cloudflare Main Worker Current-Source Deploy

`archestimator-proof` current source deployed successfully for the D1 creator ownership fix.

## Source

- Commit: `230930b39ffed927cb397aec4d9dde161f8169b0`
- Committed at: `2026-07-04T01:29:30+08:00`
- Subject: `Fix D1 creator ownership before deploy proof`

## Production Version

- Worker version: `01c577ee-ab6a-4da7-bcaf-ddab7baea524`
- Version number: `95`
- Traffic: `100%`
- Deployment: `1c42a5c0-7b14-4c11-9fba-6501381d5c49`
- Deployed at: `2026-07-03T17:34:08.169674Z`
- Message: `Deploy D1 creator ownership fix 230930b3`

## Upload Evidence

- Wrangler: `4.105.0`
- Total upload: `17237.70 KiB`
- Gzip: `4709.11 KiB`
- Worker startup: `28 ms`
- Upload/deploy duration: `214.61 s`
- Previous upload blocker: resolved

## D1 Ownership Fix

- Remote D1 migration `0030_workspace_owner_membership_backfill.sql`: applied at `2026-07-03 17:03:17`
- Migration conflict policy: insert-only, preserves existing memberships
- Missing owner memberships: `0`
- Inaccessible creator projects: `0`
- Inaccessible creator estimates: `0`

## Verification

- `CLOUDFLARE_HOSTED_ROUTE_BASE_URL=https://archestimator.com bun run cf:verify-hosted-routes`: passed, blockers empty, generated `2026-07-03T17:36:07.357Z`
- `bun run cf:release-gates`: `productionCutoverReady=true`, blockers empty, generated `2026-07-03T17:36:02.789Z`
- Focused CRUD/authz regression cluster: `17` files / `95` tests passed
- Insert-only migration regression cluster: `4` files / `16` tests passed
- `bun run type-check`: passed
- `bun run cf:build`: passed

This artifact did not delete, downgrade, cancel, rotate, or mutate Vercel, Supabase, Resend, DNS, billing resources, or provider-exit operator decisions.
