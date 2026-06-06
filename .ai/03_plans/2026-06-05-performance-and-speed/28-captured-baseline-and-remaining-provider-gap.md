<!-- Docs-only performance planning pack. Added 2026-06-05. No application code implementation in this folder. -->

# Captured Baseline and Remaining Provider Gap

## Captured project/deployment context

Source: Vercel connector, 2026-06-05, with later 2026-06-06 production deployment proof noted separately.

| Field | Value |
| --- | --- |
| Vercel project | `archestimator` |
| Project id | `prj_QTjX1WrMb7b0ZxmMIRAL96ILRY9E` |
| Account/team | `team_eRuwqQwhMbYYDmvgIgpQW1GS` / `philipjonlewis-projects` |
| Framework | Next.js |
| Node version | `24.x` |
| Baseline production deployment for initial public-route and Speed Insights window proof | `dpl_4bMoArwC32Tup4dKK67wtKoBf2jv` |
| Baseline deployment URL | `archestimator-lz829v0ad-philipjonlewis-projects.vercel.app` |
| Current production deployment after 2026-06-06 post-fix proof | `dpl_3F9cagsB27x8iuEjYQ5nkCCfqecR` |
| Current production URL after 2026-06-06 post-fix proof | `archestimator-6mwjrwhnk-philipjonlewis-projects.vercel.app`, aliased to `www.archestimator.com` |
| Production domains | `www.archestimator.com`, `archestimator.com`, `archestimator.vercel.app` |
| Baseline production commit | `2d9e12d4d8b3f08a6da686bcb06f753474590511` |
| Baseline commit message | `Record shared-link clickthrough proof` |
| Current production proof commit | `207babf` |
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

## Speed Insights CLI p75 capture and remaining dashboard/window gap

The original connector/browser attempts did not expose Speed Insights values, but the later Vercel CLI `vercel metrics` surface does expose `vercel.speed_insights_metric.*` p75 metrics. Evidence now exists at:

- `evidence/vercel-speed-insights-cli-2026-06-06/vercel-speed-insights-cli-baseline.md`
- `evidence/vercel-speed-insights-cli-2026-06-06/current-*-overall.json`
- `evidence/vercel-speed-insights-cli-2026-06-06/current-*-route-device.json`

Captured current 7-day provider p75 values:

| Metric | Overall p75 | Worst captured route/device note |
| --- | ---: | --- |
| LCP | 1447ms | `/` desktop 3484ms |
| INP | 59,404,496ms | `/` desktop anomalous 59,404,496ms; `/` mobile 32ms |
| CLS | null | `/` desktop and `/login` desktop 0 |
| FCP | 1380ms | `/` desktop 3216ms |
| TTFB | 299ms | `/` mobile 721ms |

Remaining gaps:

- Dashboard overview score/screenshot and recommendation cards remain unavailable because Computer Use timed out and protected fetch could not create a shareable dashboard URL.
- Previous 7-day and previous-3-day route/device windows returned empty summaries, so Workstream 7.2 still lacks comparable traffic cohorts.
- Final performance-impact proof still requires before/after provider windows after a deployed change; the current CLI capture is a baseline, not a completion claim.

Closed fixture gaps on 2026-06-06:

- Signed-in hosted auth fixture proof: `evidence/2026-06-06-hosted-auth-production-synthetic-fixture-smoke-benchmark.md` / `.json`.
- Hosted proposal export fixture proof: `evidence/2026-06-06-hosted-export-production-synthetic-fixture-smoke-benchmark.md` / `.json`.
- Valid private media fixture proof: `evidence/2026-06-06-valid-private-image-production-synthetic-fixture-smoke-benchmark.md` / `.json`.
- Valid private share-token proof: `evidence/2026-06-06-valid-share-production-synthetic-fixture-smoke-benchmark.md` / `.json`.
- Synthetic provider-data cleanup proof: `evidence/2026-06-06-hosted-synthetic-fixture-cleanup-verification.md` / `.json` and `evidence/2026-06-06-valid-share-synthetic-fixture-cleanup-verification.md` / `.json`.

## 2026-06-06 refresh

Additional evidence files:

- `evidence/2026-06-06-pr0a-vercel-connector-and-public-route-timing.md`
- `evidence/2026-06-06-bundle-analyzer-baseline.md`

Current status:

- Deployment context for the baseline public-route/Speed Insights window points to production deployment `dpl_4bMoArwC32Tup4dKK67wtKoBf2jv`; later post-fix cache proof points to production deployment `dpl_3F9cagsB27x8iuEjYQ5nkCCfqecR`.
- Public hosted route timing/header evidence now includes `/about`, `/privacy`, and `/terms` in addition to the earlier public routes.
- Bundle analyzer baseline is captured through a clean webpack analyzer build.
- Speed Insights p75 metrics are captured via Vercel CLI; dashboard overview/recommendation cards and comparable prior windows remain open.

## 2026-06-06 synthetic hosted fixture proof refresh

Owner-granted authority allowed temporary synthetic production fixtures against the Archestimator Supabase project `ebxxqidacheyapmmzavr` and production domain `https://www.archestimator.com`. The run created temporary auth users, beta allowlist states, workspace/project/estimate rows, and a private image upload, then removed all synthetic data. Evidence files are sanitized and exclude cookies, passwords, raw tokens, storage paths, and customer data.

| Surface | Evidence | Result |
| --- | --- | --- |
| Auth/proxy | `evidence/2026-06-06-hosted-auth-production-synthetic-fixture-smoke-benchmark.md` / `.json` | PASS: signed-out, allowed, denied, revoked, expired/invalid-session all returned expected routing and private/no-store cache policy. |
| Proposal export | `evidence/2026-06-06-hosted-export-production-synthetic-fixture-smoke-benchmark.md` / `.json` | PASS: 2 hosted samples returned XLSX attachment, ZIP magic, 12,253 bytes, and `private, no-store`. |
| Valid private media | `evidence/2026-06-06-valid-private-image-production-synthetic-fixture-smoke-benchmark.md` / `.json` | PASS: upload/2x GET/delete passed; private WebP GET returned `private, max-age=300`, `x-vercel-cache: MISS`, and no shared-cache directive. |
| Cleanup | `evidence/2026-06-06-hosted-synthetic-fixture-cleanup-verification.md` / `.json` | PASS: auth users, beta rows, profiles, workspaces, projects, estimates, nodes, rows, and publications all zero; storage paths removed through app DELETE. |

Remaining provider gaps after this refresh are dashboard overview/recommendation cards and comparable Speed Insights windows.

## 2026-06-06 valid share-token fixture proof refresh

A headless production UI flow generated a temporary shared link through the real `createProjectPublication` server action, then sanitized the raw token before writing evidence. The valid share page, snapshot API, and activity API all returned `200` with no-store/private no-store cache policy and no `Set-Cookie`. Cleanup removed all run-scoped auth/database/publication rows. Evidence: `evidence/2026-06-06-valid-share-production-synthetic-fixture-smoke-benchmark.md` / `.json` and `evidence/2026-06-06-valid-share-synthetic-fixture-cleanup-verification.md` / `.json`.

## 2026-06-06 post-closeout provider refresh and current-production lab proof

Evidence added:

- `evidence/2026-06-06-vercel-speed-insights-scoring-doc-review.md`
- `evidence/vercel-speed-insights-refresh-2026-06-06-post-closeout/vercel-speed-insights-refresh-summary.md`
- `evidence/vercel-speed-insights-inp-attribution-2026-06-06/inp-attribution-summary.md`
- `evidence/current-production-lighthouse-2026-06-06/current-production-lighthouse-summary.md`
- `evidence/mono-font-preload-scope-2026-06-06/mono-font-preload-scope-spike.md`

Findings:

- Vercel docs confirm RES is a weighted real-user score over FCP, LCP, INP, and CLS; local Lighthouse cannot prove RES completion.
- Current production deployment: `dpl_3F9cagsB27x8iuEjYQ5nkCCfqecR`, commit `207babf7343d2d2508e1d0fb6bc98b1313522224`.
- Current-deployment filtered Speed Insights summaries are empty for LCP, INP, CLS, FCP, and TTFB.
- The existing 7-day Speed Insights rows, including `/` desktop INP `59,404,496ms`, are attributed to old production deployment `dpl_Cxeq5ATpif6Yk1zn4FmNmnX7nzhT`, main commit `2cddb0e0d23b21b013c66d0a1c086d129cfbd499`.
- Current live production Lighthouse: mobile score 94 (FCP 1,396ms, LCP 2,598ms, CLS 0, TBT 37ms), desktop score 100 (FCP 346ms, LCP 632ms, CLS 0, TBT 0ms).
- A narrow Roboto Mono preload/display spike was tried and reverted because three mobile Lighthouse runs remained score 91 with LCP around 3.46s-3.49s.

Remaining gap: current production needs real-user Speed Insights rows / dashboard RES before the owner-requested 95-100 RES target can be claimed.

## 2026-06-06 automated readiness checker result

New checker:

```bash
bun run perf:check-speed-insights
```

Latest evidence: `evidence/vercel-speed-insights-readiness-check-2026-06-06/vercel-speed-insights-readiness.md` / `.json`.

Result: **CURRENT DEPLOYMENT PROVIDER DATA OPEN**. The checker queried current production deployment `dpl_3F9cagsB27x8iuEjYQ5nkCCfqecR` and found no p75 rows for FCP, LCP, INP, CLS, or TTFB. It also had no dashboard RES score, so it correctly reports `resCompletionReady: false`. The script is intentionally read-only and does not submit vitals, create traffic, deploy, promote, mutate provider settings, or infer RES from lab data.
