# Hosted auth route smoke — 2026-06-06T01:57:29.009Z

Status: **OPEN / NOT FULLY PROVEN**.

Mode: `hosted-auth-route-smoke`

Base URL: `https://www.archestimator.com`

Runs per provided case: 3

| Case | Result | Latest status | Latest redirect path | Cache-Control | Private/no-store | Min | Avg | Max | Error |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| signedOut | fail | 307 | /login?next=%2Fworkshop | public, max-age=0, must-revalidate | no | 71ms | 345ms | 880ms |  |
| allowed | fail | n/a | n/a | n/a | no | n/a | n/a | n/a | Missing HOSTED_AUTH_ALLOWED_COOKIE. |
| denied | fail | n/a | n/a | n/a | no | n/a | n/a | n/a | Missing HOSTED_AUTH_DENIED_COOKIE. |
| revoked | fail | n/a | n/a | n/a | no | n/a | n/a | n/a | Missing HOSTED_AUTH_REVOKED_COOKIE. |
| expired | fail | n/a | n/a | n/a | no | n/a | n/a | n/a | Missing HOSTED_AUTH_EXPIRED_COOKIE. |

Note: Sanitized hosted auth smoke/benchmark. Session cookies and platform bypass headers are used only for requests and are never written to this report.
