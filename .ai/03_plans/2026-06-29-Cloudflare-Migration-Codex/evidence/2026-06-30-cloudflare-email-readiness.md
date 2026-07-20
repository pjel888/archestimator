# Cloudflare Email Readiness

Generated: 2026-07-20T16:37:46.971Z

Readiness check records secret names only, never secret values. Cloudflare docs require a send_email Worker binding plus an onboarded sending domain on Cloudflare DNS before production email can be claimed.

## Summary

| Item | Value |
| --- | --- |
| Target domain | archestimator.com |
| Worker | archestimator-proof |
| Production email ready | no |
| Email Sending list checked | yes |
| No-sending-domains message present | no |

## Checks

| Check | Result | Evidence |
| --- | --- | --- |
| Wrangler send_email EMAIL binding | PASS | present |
| .env.example email variables | PASS | complete |
| .dev.vars.example email variables | PASS | complete |
| Worker email secrets | FAIL | ARCHESTIMATOR_EMAIL_DELIVERY_ENABLED, ARCHESTIMATOR_EMAIL_PROVIDER, CLOUDFLARE_EMAIL_FROM, CLOUDFLARE_EMAIL_REPLY_TO |
| Cloudflare Email Sending domain | FAIL | (none) |

## Cloudflare Evidence

```text
 ⛅️ wrangler 4.112.0
────────────────────
▲ [WARNING] Proxy environment variables detected. We'll use your proxy for fetch requests.
▲ [WARNING] 🚧 `wrangler email sending list` is an open beta command. Please report any issues to https://github.com/cloudflare/workers-sdk/issues/new/choose
✘ [ERROR] In a non-interactive environment, it's necessary to set a CLOUDFLARE_API_TOKEN environment variable for wrangler to work. Please go to https://developers.cloudflare.com/fundamentals/api/get-started/create-token/ for instructions on how to create an api token, and assign its value to CLOUDFLARE_API_TOKEN.
✘ [ERROR] Failed to write to log file Error: EPERM: operation not permitted, open '/Users/philiplewis/Library/Preferences/.wrangler/logs/wrangler-2026-07-20_16-37-45_387.log'
      at async open (node:internal/fs/promises:640:25)
      at async writeFile (node:internal/fs/promises:1260:14)
      at async /Users/philiplewis/archestimator/node_modules/wrangler/wrangler-dist/cli.js:59866:7
      at async Mutex.runWith (/Users/philiplewis/archestimator/node_modules/miniflare/dist/src/index.js:71860:48)
      at async appendToDebugLogFile (/Users/philiplewis/archestimator/node_modules/wrangler/wrangler-dist/cli.js:59863:3) {
    errno: -1,
    code: 'EPERM',
    syscall: 'open',
    path: '/Users/philiplewis/Library/Preferences/.wrangler/logs/wrangler-2026-07-20_16-37-45_387.log'
  }
✘ [ERROR] Would have written:
  --- 2026-07-20T16:37:45.665Z debug
  🪵  Writing logs to "/Users/philiplewis/Library/Preferences/.wrangler/logs/wrangler-2026-07-20_16-37-45_387.log"
  ---
🪵  Logs were written to "/Users/philiplewis/Library/Preferences/.wrangler/logs/wrangler-2026-07-20_16-37-45_387.log"
```

## Docs

- https://developers.cloudflare.com/email-service/get-started/send-emails/
- https://developers.cloudflare.com/email-service/api/send-emails/workers-api/
- https://developers.cloudflare.com/email-service/observability/metrics-analytics/

## Blockers

- Worker archestimator-proof missing email secrets ARCHESTIMATOR_EMAIL_DELIVERY_ENABLED, ARCHESTIMATOR_EMAIL_PROVIDER, CLOUDFLARE_EMAIL_FROM, CLOUDFLARE_EMAIL_REPLY_TO.
- Email Sending domain archestimator.com is not onboarded/readable.
