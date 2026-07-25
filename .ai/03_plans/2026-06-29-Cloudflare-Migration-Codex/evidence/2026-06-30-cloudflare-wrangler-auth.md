# Cloudflare Wrangler Auth Readiness

Generated: 2026-07-25T03:07:36.250Z

Runs `wrangler whoami --json` as a read-only CLI authentication check. It records only sanitized auth/account metadata, does not read env files, does not print tokens or secrets, does not create Cloudflare resources, does not deploy Workers, does not change DNS, does not purchase plans, and does not make production cutover ready.

## Summary

| Gate | Ready |
| --- | --- |
| Wrangler CLI available | yes |
| Auth check completed | yes |
| Wrangler/API authenticated | yes |
| Provider readback ready | yes |
| Production deploy ready | no |

## Auth

- Method: oauth
- Account email present: yes
- Account names: Philipjonlewis@gmail.com's Account
- Account IDs: 7f6229cfea61b59f6f48b517fde86039
- Not authenticated reason: (none)

## Sanitized Messages

- Account ID: 7f6229cfea61b59f6f48b517fde86039
- Account Name: Philipjonlewis@gmail.com's Account
- Email: (present)
- You are logged in with an OAuth Token

## Blockers

- (none)
