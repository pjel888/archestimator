# Hosted proposal export smoke — 2026-06-06T03:21:03.216Z

Status: **PASSED**.

Mode: `hosted-proposal-export-route-smoke`

Base URL: `https://www.archestimator.com`

Route: `/api/projects/e4806c48-6645-41cf-8b1a-c1122c8c30c3/estimates/eb99dfbd-b679-4477-b6d5-213055e15e21/export/proposal.xlsx`

Runs: 2

Latest status: 200

Latest byte length: 12253

Minimum expected bytes: 5000

Duration: min 2247ms, avg 2299ms, max 2350ms

Content type: `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`

Content disposition: `attachment; filename="HOSTED_EXPORT_FILENAME_REDACTED.xlsx"`

Cache-Control: `private, no-store`

Private/no-store cache policy: yes

Workbook ZIP magic: yes

Workbook content type: yes

Attachment disposition: yes

| Sample | Result | Status | Duration | Bytes | Content type | Content disposition | Cache-Control | Private/no-store | ZIP magic | Workbook type | Attachment |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | pass | 200 | 2350ms | 12252 | application/vnd.openxmlformats-officedocument.spreadsheetml.sheet | attachment; filename="HOSTED_EXPORT_FILENAME_REDACTED.xlsx" | private, no-store | yes | yes | yes | yes |
| 2 | pass | 200 | 2247ms | 12253 | application/vnd.openxmlformats-officedocument.spreadsheetml.sheet | attachment; filename="HOSTED_EXPORT_FILENAME_REDACTED.xlsx" | private, no-store | yes | yes | yes | yes |

Note: Sanitized hosted export route smoke/benchmark. Auth cookies, headers, and production-derived export filenames are required for the request but are never written to this report.
