# Performance, Caching, Redis, and Scalability Plan

## Fourth-Pass Closed Beta Redis Decision - 2026-06-02

Redis is deferred for closed beta unless evidence appears during beta smoke or monitoring.

Rationale:

- Cohort is manually curated and expected to be small.
- Existing Supabase/Postgres, TanStack Query, Next.js caching, and current rate-limit mechanisms are sufficient for initial beta assumptions.
- No background job queue is required for manual invites.
- Export generation should be monitored first before adding infrastructure.

Redis triggers post-beta or later beta:

- Distributed rate limiting is required for public abuse surfaces.
- Export jobs need async status/queues.
- Share/invite traffic grows beyond Supabase-backed limits.
- Realtime cursor/activity volume exceeds current constraints.
- Vercel function constraints require durable queue/cache support.

If adopted later, specify provider, env vars, data retention, tests, and rollback in a separate implementation spec.

Commit audited: `681c95e64864f283950a88dba304eaffe8f2f8b3`

## Current Performance Model

| Area | Current model | Risk |
| --- | --- | --- |
| Next.js caching | Protected/dynamic app routes and no-store public/security-sensitive flows. | Safe, but route transition proof still needed. |
| Server actions/routes | Supabase-backed actions and route handlers. | API timeouts not proven in Vercel for export/share/email. |
| TanStack Query | Client caching in workshop flows. | Good MVP fit; stale cache must reconcile with row revision conflicts. |
| Zustand/local UI state | Estimate/editor UI state. | High-blast-radius `EstimateSheetContent` can become slow. |
| Export generation | `exceljs` Node route, in-memory `writeBuffer()`. | Large estimates can hit memory/time. |
| Component/template loading | Server loaded + client managers. | Seed/demo size likely fine; needs fixture thresholds. |
| Activity history | Version/event tables. | Large event histories need pagination/windowing if slow. |
| Share/invite rate limiting | Durable Postgres event table and route-level limits. | Good audit ledger; hot-path abuse may need Redis. |
| AI routes | Dormant target for MVP; currently no AI rate limiter. | Must disable for MVP. |
| Realtime cursors | Not launch-critical. | Defer. |
| Images | Next image remote patterns for Supabase storage. | Bucket policy and image weight proof needed. |
| Bundle size | Build passes; no current budget evidence. | Add bundle check if route feels slow. |
| Route transitions | Prior work exists; current launch evidence missing. | P1/P0 for demo if stutter appears. |

## Redis Decision

MVP decision: **Redis is not required as a broad cache for launch** if AI remains disabled, share/invite email surfaces are limited/proven, and route/export performance thresholds pass. Current Next.js, Supabase, TanStack Query, and durable Postgres rate-limit audit are sufficient for closed beta scale.

Current local export benchmark evidence: `.ai/09_archive/store/2026-06-02-mvp-closed-beta-manual-proof/proposal-workbook-large-fixture-benchmark-2026-06-02.md` records the synthetic `createProposalWorkbookBuffer()` benchmark for 500 / 1,000 / 2,500 proposal rows. The 2,500-row workbook generated in 362.06ms, produced a 402,284 byte (0.38 MiB) buffer, and reported local process RSS at 270.56 MiB. Benchmark fixture regression coverage at `.ai/09_archive/store/2026-06-02-mvp-closed-beta-manual-proof/proposal-workbook-benchmark-regression-coverage-2026-06-02.md` now covers row-count parsing, deterministic BOQ fixture rows, summary/source/totals consistency, and a tiny real workbook-builder run. Local route-handler proof at `.ai/09_archive/store/2026-06-02-mvp-closed-beta-manual-proof/proposal-export-route-workbook-local-2026-06-02.md` verifies the actual XLSX route can return loadable workbook bytes when repository data is available. Hosted auth-blocker proof at `.ai/09_archive/store/2026-06-02-mvp-closed-beta-manual-proof/hosted-export-route-auth-blocked-231c27e-2026-06-02.md` confirms an anonymous/fake-ID Vercel probe cannot exercise workbook generation; the hosted timing/memory proof needs a logged-in app session and real authorized project/estimate IDs. The operator helper `bun run launch:verify-hosted-export` now provides a sanitized proof path for that authenticated hosted smoke without writing cookies or auth headers to artifacts. This supports keeping export generation synchronous locally for closed-beta scale, but it does not replace authenticated Vercel preview/staging route timing or memory proof.

Redis becomes required before launch if any of these fail:

- Public share/invite endpoints are enabled and Postgres limiter adds unacceptable latency or can be abused.
- AI is re-enabled.
- Export becomes async/job-based.
- Presence/realtime or high-frequency collaboration is launch-visible.

Candidate providers:

| Provider | Fit | Risk |
| --- | --- | --- |
| Upstash Redis | Good serverless atomic limiter/job status fit. | New vendor/env/latency/cost. |
| Vercel KV | Operationally aligned with Vercel. | Product availability/pricing and API fit must be verified. |
| Supabase alternatives | Keeps vendor count low. | Not a low-latency atomic edge limiter replacement. |

## Redis vs Postgres Rate Limiting

| Use case | MVP approach | Post-MVP |
| --- | --- | --- |
| Share password/comment/decision | Durable Postgres limiter + audit if thresholds pass. | Redis counter + async Postgres audit under public abuse. |
| Invite resolve/accept/resend | Postgres durable limits; keep invite disabled until proof. | Redis if public invite traffic grows. |
| AI provider spend | AI disabled. | Redis/queue/budget limiter required before reactivation. |
| Export job status | Sync export with guard/benchmark. | Redis/job queue if large/async export needed. |
| Expensive route cache | Avoid broad cache on auth-sensitive data. | Request/user-scoped caching only. |
| Presence fallback | Deferred. | Redis or managed realtime if needed. |

## Caching Matrix

| Data | Cache strategy | Invalidated by |
| --- | --- | --- |
| Public marketing pages | Static/Next default where safe | deploy |
| Workshop project list | Server fetch + client query cache | project mutation |
| Estimate tree | client cache + row revision reconciliation | row/node mutation |
| Library/templates | server fetch + client state | library/template mutation |
| Share/invite token flows | no-store | token/session state |
| Export workbook | no-store attachment | estimate update |
| Images | Next image/Supabase cache headers | upload/delete/version |

## Metrics and Thresholds

| Metric | Threshold | No-go if |
| --- | ---: | --- |
| Workshop first load staging | p95 < 3s on demo account | repeated p95 >= 4s |
| Route transition to estimate | p95 < 1.5s warm | visible jank in demo |
| Export small estimate | < 5s | timeout/error |
| Export large fixture | < 15s and memory within Vercel limit | timeout/OOM |
| Share/invite public route | p95 < 1s | limiter causes slow failures |
| Auth callback | < 5s | intermittent redirect failure |

## Load Test Plan

- Seed fixture: 50 projects, 200 estimate rows, realistic library/templates.
- Export fixture: 500, 1,000, and 2,500 rows if app supports it. Local synthetic workbook-buffer proof now exists for these row counts; hosted route proof is still required.
- Run local, Vercel preview, and staging.
- Record cold/warm timings, memory errors, server logs, and browser screenshots.

## Investor Demo Checklist

- Warm demo route once before presentation.
- Keep export artifact pre-generated as fallback.
- Avoid showing route-transition benchmarks unless current proof exists.
- Do not show AI.

## No-Go Criteria

- Export times out or OOMs on MVP-size fixture.
- Route transitions visibly stutter in investor demo.
- Public share/invite route can be abused without throttle.
- CI/perf specs skip silently on release.
