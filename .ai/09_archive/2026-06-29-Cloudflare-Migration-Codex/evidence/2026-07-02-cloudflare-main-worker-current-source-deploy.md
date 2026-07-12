---
title: Cloudflare Main Worker Current-Source Deploy
generated: 2026-07-05T05:06:03.000Z
status: pass
---

# Cloudflare Main Worker Current-Source Deploy

`archestimator-proof` current source deployed successfully for the D1-backed project-group ordering runtime and React Doctor staged-gate cleanup.

## Source

- Commit: `fd2a164553ad9820390a7641240f177cb338171d`
- Committed at: `2026-07-05T12:54:07+08:00`
- Subject: `Keep project-group deploy work inside React Doctor gates`

## Production Version

- Worker version: `a57a03a7-af11-4310-a55e-73c87188bba2`
- Version number: `96`
- Traffic: `100%`
- Deployment: `1f07f9e7-2494-4afa-adfb-3da69a478257`
- Deployed at: `2026-07-05T05:04:34.644159Z`
- Message: none recorded by Wrangler

## Upload Evidence

- Wrangler: `4.105.0`
- Total upload: `17385.27 KiB`
- Gzip: `4762.40 KiB`
- Worker startup: `38 ms`
- Upload/deploy duration: `421.78 s` (`418.37 s` Worker upload + `3.41 s` trigger deploy)
- Previous upload blocker: resolved

## D1 Ownership Fix

- Remote D1 migration `0030_workspace_owner_membership_backfill.sql`: applied at `2026-07-03 17:03:17`
- Migration conflict policy: insert-only, preserves existing memberships
- Missing owner memberships: `0`
- Inaccessible creator projects: `0`
- Inaccessible creator estimates: `0`

## Verification

- `CLOUDFLARE_HOSTED_ROUTE_BASE_URL=https://archestimator.com bun run cf:verify-hosted-routes`: passed, blockers empty, generated `2026-07-05T05:05:30.426Z`
- `CLOUDFLARE_HOSTED_ROUTE_BASE_URL=https://archestimator.com bun run cf:d1-runtime-proof`: `d1RuntimeProofReady=true`, hosted D1 schema/seed/query-count/p95 checks passed, blockers empty, generated `2026-07-05T05:05:27.900Z`
- `bun run cf:release-gates`: `productionCutoverReady=true`, blockers empty, generated `2026-07-05T05:05:12.996Z`
- Focused CRUD/authz regression cluster: `17` files / `95` tests passed
- Insert-only migration regression cluster: `4` files / `16` tests passed
- Project-group ordering regression cluster: `8` files / `130` tests passed
- `bun run doctor -- --staged --blocking warning --no-score --verbose`: passed
- `bun run type-check`: passed
- `bun run cf:build`: passed

Wrangler deploy output printed the configured preview D1 id, but hosted D1 runtime proof against `https://archestimator.com` passed schema, seed, cleanup, query-count, and p95 checks after deployment.

This artifact did not delete, downgrade, cancel, rotate, or mutate Vercel, Supabase, Resend, DNS, billing resources, or provider-exit operator decisions.
