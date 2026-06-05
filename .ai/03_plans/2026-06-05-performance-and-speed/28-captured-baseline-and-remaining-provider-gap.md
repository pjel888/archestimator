<!-- Docs-only performance planning pack. Added 2026-06-05. No application code implementation in this folder. -->

# Captured Baseline and Remaining Provider Gap

## Captured project/deployment context

Source: Vercel connector, 2026-06-05.

| Field | Value |
| --- | --- |
| Vercel project | `archestimator` |
| Project id | `prj_QTjX1WrMb7b0ZxmMIRAL96ILRY9E` |
| Account/team | `team_eRuwqQwhMbYYDmvgIgpQW1GS` / `philipjonlewis-projects` |
| Framework | Next.js |
| Node version | `24.x` |
| Latest production deployment | `dpl_4bMoArwC32Tup4dKK67wtKoBf2jv` |
| Deployment URL | `archestimator-lz829v0ad-philipjonlewis-projects.vercel.app` |
| Production domains | `www.archestimator.com`, `archestimator.com`, `archestimator.vercel.app` |
| Latest production commit | `2d9e12d4d8b3f08a6da686bcb06f753474590511` |
| Commit message | `Record shared-link clickthrough proof` |
| Bundler metadata | `turbopack` |
| Runtime metadata | `{"nodejs":2}` |

## Captured hosted public header/timing evidence

Evidence file:

- `evidence/2026-06-05-hosted-public-header-timing-baseline.md`

Summary from curl on public marketing routes:

| Route | HTTP | Cache header | x-vercel-cache | time_starttransfer | size_download |
| --- | ---: | --- | --- | ---: | ---: |
| `/` | 200 | `private, no-cache, no-store, max-age=0, must-revalidate` | MISS | 0.534s | 133,076 bytes |
| `/features` | 200 | `private, no-cache, no-store, max-age=0, must-revalidate` | MISS | 0.481s | 92,316 bytes |
| `/pricing` | 200 | `private, no-cache, no-store, max-age=0, must-revalidate` | MISS | 0.544s | 64,205 bytes |
| `/contact` | 200 | `private, no-cache, no-store, max-age=0, must-revalidate` | MISS | 0.467s | 55,410 bytes |

Observed headers also preload four font files and the logo image on these public routes.

## Vercel httpstat status

Evidence files:

- `evidence/2026-06-05-vercel-httpstat-attempt.md`
- `evidence/2026-06-05-vercel-httpstat-production-baseline.md`

Status: toolchain attempted but not usable in this environment. Vercel CLI `54.6.1` is installed, but `vercel httpstat` failed in the shell with `env: node: No such file or directory` from the child invocation even when Node’s bin directory was added to `PATH`. Curl timing was used as the safe substitute.

## Remaining Speed Insights provider gap

The exposed Vercel connector supports project/deployment/docs/fetch, but no Speed Insights metrics endpoint/tool is currently available. Computer Use was previously attempted and timed out. Therefore exact dashboard values remain a provider/UI evidence gap:

- overall Speed Insights score,
- p75 LCP,
- p75 INP,
- p75 CLS,
- p75 FCP,
- p75 TTFB,
- route/device/geo breakdown,
- time window.

This gap blocks proof of final performance impact, but does not block PR-0B because PR-0B is a safety/measurement-enabling implementation packet.
