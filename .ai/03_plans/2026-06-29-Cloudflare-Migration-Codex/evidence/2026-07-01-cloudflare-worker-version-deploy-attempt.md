# Cloudflare Worker Version Deploy Attempt

Started: 2026-07-01T05:59:00Z
Command: npx -y wrangler@4.106.0 versions deploy 8a55ee02-8186-4c8a-a785-5c4bc214cfa7@100% --name archestimator-proof -y --message 'Deploy Cloudflare-only runtime'


 ⛅️ wrangler 4.106.0
────────────────────
╭ Deploy Worker Versions by splitting traffic between multiple versions
│
├ Fetching latest deployment
│
├ Your current deployment has 1 version(s):
│
│ (100%) a256df99-ff88-43c2-b0ca-34537460dd42
│       Created:  2026-07-01T05:41:18.111965Z
│           Tag:  -
│       Message:  -
│
├ Fetching versions
│
├ Which version(s) do you want to deploy?
├ 1 Worker Version(s) selected
│
├     Worker Version 1:  8a55ee02-8186-4c8a-a785-5c4bc214cfa7
│              Created:  2026-07-01T05:58:39.878187Z
│                  Tag:  cloudflare-only-20260701054811
│              Message:  Publish Cloudflare-only runtime
│
├ What percentage of traffic should Worker Version 1 receive?
├ 100% of traffic
├
├ Add a deployment message
│ Deployment message Deploy Cloudflare-only runtime
│
├ Deploying 1 version(s)
│
├ Syncing non-versioned settings
│
│ Synced non-versioned settings:
│                      logpush:  false
│                observability:  enabled:             true
│                                head_sampling_rate:  0.1
│               tail_consumers:  <skipped>
│     streaming_tail_consumers:  <skipped>
│
╰  SUCCESS  Deployed archestimator-proof version 8a55ee02-8186-4c8a-a785-5c4bc214cfa7 at 100% (2.28 sec)

Finished: 2026-07-01T05:59:12Z
Exit status: 0
