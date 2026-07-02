# Hosted auth route smoke — 2026-07-02T04:37:32.291Z

Status: **OPEN / NOT FULLY PROVEN**.

Mode: `hosted-auth-route-smoke`

Base URL: `https://archestimator.com`

Runs per provided case: 1

| Case | Result | Latest status | Latest redirect path | Cache-Control | Private/no-store | Min | Avg | Max | Error |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| signedOut | pass | 307 | /login?next=%2Fworkshop | private, no-cache, no-store, max-age=0, must-revalidate | yes | 1427ms | 1427ms | 1427ms |  |
| allowed | fail | n/a | n/a | n/a | no | n/a | n/a | n/a | Missing HOSTED_AUTH_ALLOWED_COOKIE. |
| denied | fail | n/a | n/a | n/a | no | n/a | n/a | n/a | Missing HOSTED_AUTH_DENIED_COOKIE. |
| revoked | fail | n/a | n/a | n/a | no | n/a | n/a | n/a | Missing HOSTED_AUTH_REVOKED_COOKIE. |
| expired | fail | n/a | n/a | n/a | no | n/a | n/a | n/a | Missing HOSTED_AUTH_EXPIRED_COOKIE. |

Note: Sanitized hosted auth smoke/benchmark. Session cookies and platform bypass headers are used only for requests and are never written to this report.

