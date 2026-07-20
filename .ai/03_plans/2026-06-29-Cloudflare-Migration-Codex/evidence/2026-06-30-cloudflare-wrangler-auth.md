# Cloudflare Wrangler Auth Readiness

Generated: 2026-07-20T17:17:50.464Z

Runs `wrangler whoami --json` as a read-only CLI authentication check. It records only sanitized auth/account metadata, does not read env files, does not print tokens or secrets, does not create Cloudflare resources, does not deploy Workers, does not change DNS, does not purchase plans, and does not make production cutover ready.

## Summary

| Gate | Ready |
| --- | --- |
| Wrangler CLI available | yes |
| Auth check completed | yes |
| Wrangler/API authenticated | no |
| Provider readback ready | no |
| Production deploy ready | no |

## Auth

- Method: (none)
- Account email present: no
- Account names: (none)
- Account IDs: (none)
- Not authenticated reason: wrangler-login-required

## Sanitized Messages

- (none)

## Blockers

- Wrangler is not authenticated; run `wrangler login` or provide a scoped token outside the repo.
