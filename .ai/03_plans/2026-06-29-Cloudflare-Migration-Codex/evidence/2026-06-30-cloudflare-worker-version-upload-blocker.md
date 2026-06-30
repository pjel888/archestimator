# Cloudflare Worker Version Upload Blocker

Generated: 2026-06-30T04:15:10Z

## Result

- Updated local build ready: yes
- Updated Worker version uploaded: no
- Current deployed version remains: `a1684c49-0d32-4b49-abb0-d9fcda050c5d`
- Production cutover ready: no

## What Happened

Wrangler reached asset handling successfully. The first deploy attempt uploaded 3 changed static assets, and later attempts found no updated assets. Each deploy then stalled at the Worker version upload API call:

`POST https://api.cloudflare.com/client/v4/accounts/7f6229cfea61b59f6f48b517fde86039/workers/scripts/archestimator-proof/versions`

No structured Cloudflare API error was returned, and readback showed no new Worker version or deployment.

## Limit Checks

The bundle size is not over the documented Workers Paid size limit. Cloudflare's Workers limits page lists Workers Paid Worker size as 10 MB after gzip and 64 MB before compression; this build reports about 4.5 MB gzip and 20.8 MB raw.

Startup profiling also completed locally with `wrangler check startup`. The generated profile summarized about 222 ms of startup samples, under Cloudflare's documented 1 second startup limit. This does not prove Cloudflare production startup exactly, but it makes a local startup-limit failure less likely than the observed upload/API stall.

## Attempts

- `bunx wrangler deploy --keep-vars`
- `bunx wrangler deploy --keep-vars --message "Static public route performance proof"`
- Bundled Node 24.14.0 running `node_modules/wrangler/bin/wrangler.js deploy --keep-vars --message "Static public route performance proof"`

Wrangler version was `4.105.0` in all attempts.

## Readback

`wrangler versions list --name archestimator-proof` and `wrangler deployments list --name archestimator-proof` still show the latest deployed version as `a1684c49-0d32-4b49-abb0-d9fcda050c5d`, created at `2026-06-30T03:28:47.033Z` and deployed at `2026-06-30T03:28:51.451Z`.

## Blocker

Hosted static-route speed proof cannot be regenerated until Cloudflare accepts the new Worker version.
