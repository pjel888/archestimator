# Hosted auth route smoke — 2026-06-06T02:42:28.904Z

Status: **OPEN / NOT FULLY PROVEN**.

Mode: `hosted-auth-route-smoke`

Base URL: `https://www.archestimator.com`

Runs per provided case: 3

| Case | Result | Latest status | Latest redirect path | Cache-Control | Private/no-store | Min | Avg | Max | Error |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| signedOut | pass | 307 | /login?next=%2Fworkshop | private, no-cache, no-store, max-age=0, must-revalidate | yes | 71ms | 118ms | 176ms |  |
| allowed | fail | n/a | n/a | n/a | no | n/a | n/a | n/a | Missing HOSTED_AUTH_ALLOWED_COOKIE. |
| denied | fail | n/a | n/a | n/a | no | n/a | n/a | n/a | Missing HOSTED_AUTH_DENIED_COOKIE. |
| revoked | fail | n/a | n/a | n/a | no | n/a | n/a | n/a | Missing HOSTED_AUTH_REVOKED_COOKIE. |
| expired | fail | n/a | n/a | n/a | no | n/a | n/a | n/a | Missing HOSTED_AUTH_EXPIRED_COOKIE. |

Note: Sanitized hosted auth smoke/benchmark. Session cookies and platform bypass headers are used only for requests and are never written to this report.
