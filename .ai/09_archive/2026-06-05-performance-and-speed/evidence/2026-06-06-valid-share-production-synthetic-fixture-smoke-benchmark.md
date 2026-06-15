# Hosted valid share-token smoke — 2026-06-06T03:32:25.126Z

Status: **PASSED**.

Mode: `hosted-valid-share-token-smoke`

Base URL: `https://www.archestimator.com`

Publication route: `/share/VALID_TOKEN_REDACTED`

| Probe | Result | Status | Duration | Bytes | Content-Type | Cache-Control | Set-Cookie |
| --- | --- | --- | --- | ---: | --- | --- | --- |
| share-page | pass | 200 | 1857ms | 37164 | text/html; charset=utf-8 | private, no-cache, no-store, max-age=0, must-revalidate | no |
| share-snapshot-api | pass | 200 | 2560ms | 1116 | application/json | no-store | no |
| share-activity-api | pass | 200 | 1920ms | 58 | application/json | no-store | no |

Cleanup: pass (zero run-scoped rows: yes).

Note: Synthetic production UI generated a real publication token through the app server action. Raw token, cookies, passwords, and customer data are not written to this report.
