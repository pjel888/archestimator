# Rollout, Rollback, and Operations

This is a planning-only pass → **no production rollout from this pass.** This document defines rollout/performance gates for the future implementation phases.

---

## 1. Baseline → target metrics (cross-ref `09_PERFORMANCE...md` EV-* and `27-*.md`)

| Route/action | Baseline (Phase 0) | Target | Source |
|---|---|---|---|
| `/` LCP | capture | <2.0s | EV-01, `27-*.md` L54 |
| `/share/[token]` FMP | capture | <1.5s | EV-02 |
| Workshop transition | capture | <100ms (target) / <200ms (beta) | EV-03 |
| Row edit perceived | capture | <100ms | EV-04 |
| Main chunk gzip | capture | <150KB (Enterprise) | EV-08, `27-*.md` L55 |
| Per-route first-load JS | capture | per `27-*.md` route table | EV-08 |

## 2. Observability sources

- Local: `perf:*` scripts, `ANALYZE=true` build, Vitest perf.
- Browser: Playwright suite + manual Chrome (bfcache/Profiler — known gate).
- Provider: Cloudflare Workers Observability (logs/traces), `cf:verify-hosted-performance`, `cf:d1-runtime-performance-proof`.
- RUM (planned, owner-gated): PERF-02 beacon → sink.

## 3. Release gates

| Gate | Blocks |
|---|---|
| **Merge (current CI)** | type-check + lint + design-system + design + unit + vitest + build + bundle advisory + e2e smoke + `test:e2e:perf` |
| **Merge (proposed additions)** | + Phase-1/2 Playwright extensions green; + bundle impact stated |
| **Closed-beta** | EV-01/02/03/08 baselines captured; RUM beacon live (PERF-02); PII scrub verified; SEC-01/02 denial tests pass |
| **Production** | Strict bundle budget (PERF-03); authenticated CI perf (PERF-04); RUM p95/p75 within thresholds 7 days; no open P0/P1 |
| **Rollback triggers** | per EV-* threshold table (e.g., LCP p95 >3.0s; INP p75 >200ms; CRUD latency >200ms; median transition >300ms; any route over strict budget) |

## 4. Rollout rings (proposed)

1. Local dev → branch → CI (advisory) → PR review.
2. Merge to main → deploy Worker (cf:deploy) → hosted route smoke (`cf:verify-hosted-routes`).
3. Closed-beta observation (RUM + Workers Observability) for 7 days.
4. Widen to production traffic (100% single-version, current pattern).

## 5. Rollback steps

- **Code/rule:** `git revert` the phase commits; redeploy Worker (cf:deploy). Rule rollback = revert protocol file + AGENTS.md line + `validate:agents`.
- **Bundle/perf:** revert the `dynamic`/ssr/loading change (Phase 2); redeploy.
- **RUM beacon:** disable client gate (env flag) + remove route (or 410) — beacon is non-critical, no data repair needed.
- **Data:** none (no DB changes).

## 6. Feature flags

- PERF-02 RUM: client-side sampling flag (`NEXT_PUBLIC_WEB_VITALS_SAMPLE`).
- PERF-03 strict budget: `PERF_BUDGET_STRICT` CI secret.
- Phase-2 `ssr:false`: can be feature-flagged during P2-T1 discovery if desired.

## 7. Backward compatibility

All changes additive or in-place UI; no API/contract break. RUM endpoint is new (additive). Rule additions are policy (additive).

## 8. Known gaps

- bfcache: Playwright still reports `pageshow.persisted=false` even on trivial controls (per `27-*.md`); manual Chrome DevTools proof remains a gate.
- Authenticated perf skips in CI until PERF-04.
- No production RUM until PERF-02 + owner sink decision.
