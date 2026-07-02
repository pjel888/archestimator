# Cloudflare Email Readiness

Generated: 2026-07-02T16:38:39.243Z

Readiness check records secret names only, never secret values. Cloudflare docs require a send_email Worker binding plus an onboarded sending domain on Cloudflare DNS before production email can be claimed.

## Summary

| Item | Value |
| --- | --- |
| Target domain | archestimator.com |
| Worker | archestimator-proof |
| Production email ready | yes |
| Email Sending list checked | yes |
| No-sending-domains message present | no |

## Checks

| Check | Result | Evidence |
| --- | --- | --- |
| Wrangler send_email EMAIL binding | PASS | present |
| .env.example email variables | PASS | complete |
| .dev.vars.example email variables | PASS | complete |
| Worker email secrets | PASS | complete |
| Cloudflare Email Sending domain | PASS | archestimator.com |

## Cloudflare Evidence

```text
 ⛅️ wrangler 4.105.0
────────────────────
┌───────────────────┬───────────────────┬─────────┬──────────────────────────────────┐
│ zone              │ name              │ enabled │ tag                              │
├───────────────────┼───────────────────┼─────────┼──────────────────────────────────┤
│ archestimator.com │ archestimator.com │ yes     │ 894a8c44c8f94473a2b105821a69a9f0 │
└───────────────────┴───────────────────┴─────────┴──────────────────────────────────┘
▲ [WARNING] 🚧 `wrangler email sending list` is an open beta command. Please report any issues to https://github.com/cloudflare/workers-sdk/issues/new/choose
```

## Docs

- https://developers.cloudflare.com/email-service/get-started/send-emails/
- https://developers.cloudflare.com/email-service/api/send-emails/workers-api/
- https://developers.cloudflare.com/email-service/observability/metrics-analytics/

## Blockers

- (none)
