# PR-0A Vercel Connector and Public Route Timing Refresh

Date: 2026-06-06 (Asia/Manila local session; connector deployment time UTC)
Branch/worktree: `feat/performance-and-speed-pr-0b-cache-safety` in `/Users/philiplewis/archestimator.omx-worktrees/impl-performance-and-speed-pr-0b-cache-safety`

## Scope

This is PR-0A substitute evidence. It captures current read-only Vercel project/deployment context and hosted route timing/header checks. It did **not** replace Vercel Speed Insights p75 data when captured; later `vercel metrics` CLI evidence supersedes the numeric p75 gap, while dashboard overview/export evidence remains separate.

## Vercel connector evidence

Tool: Vercel MCP connector, read-only `get_project` and `list_deployments`.

| Field | Value |
| --- | --- |
| Team slug | `philipjonlewis-projects` |
| Team id | `team_eRuwqQwhMbYYDmvgIgpQW1GS` |
| Project | `archestimator` |
| Project id | `prj_QTjX1WrMb7b0ZxmMIRAL96ILRY9E` |
| Framework | `nextjs` |
| Node version | `24.x` |
| Latest production deployment | `dpl_4bMoArwC32Tup4dKK67wtKoBf2jv` |
| Latest production deployment time | `2026-06-04T18:04:02.727Z` |
| Latest production URL | `archestimator-lz829v0ad-philipjonlewis-projects.vercel.app` |
| Latest production state | `READY` |
| Latest commit SHA | `2d9e12d4d8b3f08a6da686bcb06f753474590511` |
| Latest commit message | `Record shared-link clickthrough proof` |
| Git ref | `main` |
| Bundler metadata | `turbopack` |
| Runtime metadata | `{"nodejs":2}` |
| Production domains | `www.archestimator.com`, `archestimator.com`, `archestimator.vercel.app` |

## Hosted public route timing refresh

Command shape:

```bash
base=https://www.archestimator.com
for route in / /about /features /pricing /contact /privacy /terms; do
  curl -sS -o /tmp/archestimator-timing-body \
    -D /tmp/archestimator-timing-headers \
    -w 'http_code=%{http_code} time_starttransfer=%{time_starttransfer} time_total=%{time_total} size_download=%{size_download}\n' \
    "$base$route"
  awk 'BEGIN{IGNORECASE=1} /^(cache-control|cdn-cache-control|vercel-cdn-cache-control|x-vercel-cache|vary|set-cookie):/{print}' /tmp/archestimator-timing-headers
done
```

| Route | HTTP | TTFB (`time_starttransfer`) | Total | Size | Cache-Control | x-vercel-cache | Vary |
| --- | ---: | ---: | ---: | ---: | --- | --- | --- |
| `/` | 200 | 1.139s | 1.374s | 133,076 bytes | `private, no-cache, no-store, max-age=0, must-revalidate` | MISS | `rsc, next-router-state-tree, next-router-prefetch, next-router-segment-prefetch` |
| `/about` | 200 | 0.430s | 0.663s | 57,000 bytes | same | MISS | same |
| `/features` | 200 | 0.454s | 0.693s | 92,316 bytes | same | MISS | same |
| `/pricing` | 200 | 0.439s | 0.683s | 64,205 bytes | same | MISS | same |
| `/contact` | 200 | 0.438s | 0.678s | 55,410 bytes | same | MISS | same |
| `/privacy` | 200 | 0.448s | 0.466s | 46,405 bytes | same | MISS | same |
| `/terms` | 200 | 0.446s | 0.687s | 47,139 bytes | same | MISS | same |

No `Set-Cookie` header was observed in this header filter for these anonymous requests.

## Provider gap and decision

The current Vercel connector exposes project/deployment/log/domain/deploy-style operations, but no Speed Insights metrics endpoint was available in this session. Computer Use dashboard attempts are already documented as timed out. Therefore the PR-0A required dashboard/export fields remain open:

- overall score,
- p75 LCP, INP, CLS, FCP, and TTFB,
- route/path breakdown,
- device and geo split,
- 7-day and 30-day windows,
- confirmation that deployment `dpl_4bMoArwC32Tup4dKK67wtKoBf2jv` is inside the selected window.

Status language: **PR-0A SUBSTITUTE EVIDENCE CAPTURED / SPEED INSIGHTS PROVIDER METRICS OPEN**.

Do not use this curl table as real-user Core Web Vitals proof. It is hosted request timing/header evidence only.
