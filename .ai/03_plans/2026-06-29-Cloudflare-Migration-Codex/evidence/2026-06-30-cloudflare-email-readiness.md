# Cloudflare Email Readiness

Generated: 2026-06-30T21:54:43.717Z

Readiness check records secret names only, never secret values. Cloudflare docs require a send_email Worker binding plus an onboarded sending domain on Cloudflare DNS before production email can be claimed.

## Summary

| Item | Value |
| --- | --- |
| Target domain | archestimator.com |
| Worker | archestimator-proof |
| Production email ready | no |
| Email Sending list checked | yes |
| No-sending-domains message present | yes |

## Checks

| Check | Result | Evidence |
| --- | --- | --- |
| Wrangler send_email EMAIL binding | PASS | present |
| .env.example email variables | PASS | complete |
| .dev.vars.example email variables | PASS | complete |
| Worker email secrets | PASS | complete |
| Cloudflare Email Sending domain | FAIL | (none) |

## Cloudflare Evidence

```text
 ⛅️ wrangler 4.105.0 (update available 4.106.0)
───────────────────────────────────────────────
No sending subdomains found in this account.
▲ [WARNING] 🚧 `wrangler email sending list` is an open beta command. Please report any issues to https://github.com/cloudflare/workers-sdk/issues/new/choose
```

## Docs

- https://developers.cloudflare.com/email-service/get-started/send-emails/
- https://developers.cloudflare.com/email-service/api/send-emails/workers-api/
- https://developers.cloudflare.com/email-service/observability/metrics-analytics/

## Blockers

- Cloudflare account reports no Email Sending domains/subdomains.
- Email Sending domain archestimator.com is not onboarded/readable.
