<!-- Docs-only performance planning pack. Added 2026-06-05. No application code implementation in this folder. -->

# Per-Surface Acceptance Criteria

These criteria define what “better” means. Replace planning budgets with captured baselines after Workstream 0.

## Global rules

- A performance PR must improve the target metric without causing a meaningful regression in any guardrail metric.
- For local traces, compare median of at least three runs and inspect the worst outlier.
- For Speed Insights, compare p75 for the same route bucket, device class, and similar window.
- If production traffic is too low, mark provider evidence `PROVIDER PROOF OPEN` rather than inventing certainty.

## Quantitative criteria by surface

| Surface | Target metric | Minimum local/preview improvement to justify PR | Guardrail regression limit | Provider completion requirement |
| --- | --- | ---: | ---: | --- |
| Public marketing LCP | mobile LCP | >= 10% faster or >= 250ms faster, whichever is easier to observe | CLS <= 0.1; no INP regression > 50ms | Speed Insights p75 LCP improves for public route bucket |
| Public marketing INP | mobile INP / long tasks | INP <= 200ms locally or >= 20% long-task reduction | LCP not worse by > 100ms; no visual regression | Speed Insights p75 INP improves or remains good |
| Public marketing TTFB | TTFB | >= 20% hosted TTFB reduction on uncached/cached comparison | no cache leak; auth/consent/A-B output safe | Speed Insights p75 TTFB improves for public routes |
| Public cache correctness | headers/cache variants | no `Set-Cookie`/personalized shared cache for cached HTML | logged-in/anonymous/variant HTML safe | hosted header/cache proof |
| Auth/proxy | protected TTFB/redirect | hosted timing improves without auth regression | zero auth/security failures | Hosted auth proof; Speed Insights if available |
| Workshop navigation | route transition | existing route-transition budgets pass and target route improves >= 10% | no route overlay/bfcache regression | route-transition evidence plus hosted proof if available |
| Estimate workspace | React render/INP | profiler target interaction improves >= 20% or removes a top render stack | no editing/DnD/collab regression | Speed Insights route INP if traffic exists; otherwise local profiler proof remains local-only |
| Data/query | query time/payload | EXPLAIN/provider query time or payload improves >= 20% for target route | RLS/role tests pass; no stale/missing data | hosted timing/query proof |
| Share/publication | TTFB/API latency | redacted share/API timing improves >= 15% | no-store/security/password/session tests pass | hosted proof; no cache-based completion unless explicitly safe |
| Proposal export | latency/memory | benchmark latency or peak memory improves >= 15% on representative fixture | workbook content/filename/tests unchanged | hosted export verifier passes |
| Bundle size | route first-load JS | target route first-load JS drops >= 10KB gz or removes measured long task | no route chunk moves cost into another critical path | bundle analyzer plus route trace |

## Qualitative criteria that block completion

- Any closed-beta auth regression blocks completion even if speed improves.
- Any share/invite token or recipient leakage blocks completion.
- Any unapproved visual degradation on landing/public pages blocks completion.
- Any estimate editing, library insert, DnD, version history, or proposal preview regression blocks completion.
- Any database/index change without rollback evidence blocks completion.
