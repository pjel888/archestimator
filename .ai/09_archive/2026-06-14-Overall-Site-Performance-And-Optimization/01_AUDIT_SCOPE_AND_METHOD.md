# 01 — Audit Scope & Method

**Status:** AUDIT / PLANNING / READINESS ONLY
**Date:** 2026-06-14
**Repo:** `/Users/philiplewis/archestimator` @ HEAD `3070c46c` (`main`)
**Product:** Archestimator — contractor-first construction estimating / proposal / collaboration SaaS.
**Stack audited:** Next.js 16.2.6 (App Router/RSC), React 19.2.6, Bun, TypeScript, Supabase/Postgres 17 + RLS, TanStack Query 5, Zustand 5, D3 7, React Complex Tree 2, ExcelJS, Playwright, Vitest, Vercel.

---

## 1. What this is (and is not)

This is a **whole-app performance audit and optimization-readiness plan**. It is:
- an audit of where the app is slow and why,
- a reconciliation of the 5+ pre-existing performance plans against the live code,
- a speed matrix + readiness-grade budget proposal,
- a phased, owner-gated optimization backlog,
- a readiness decision with explicit blockers and missing measurements.

It is **NOT** an implementation, refactor, or coding task. **No application source files,
dependencies, migrations, Supabase/Vercel/GitHub/DNS/env/provider settings, or secrets were
changed. No build, deploy, promote, or production mutation was performed.** (See `_STATUS.md`.)

## 2. Method

1. **Ground in source truth first.** Read `README.md`, `package.json`, `next.config.ts`,
   `src/app/layout.tsx`, `src/app/providers.tsx`, `src/proxy.ts`, the `.ai/10_state/*` docs,
   the active route-transition canonical plan, and the perf tooling
   (`scripts/measure-route-transitions.ts`, `e2e/route-transition-performance-budgets.json`)
   before drawing conclusions.
2. **Reconcile, don't repeat.** Many "optimizations" in older plans are already implemented
   (proxy public-route early-return, 5-min TanStack staleTime, `experimental.staleTimes`,
   phosphor `optimizePackageImports`, dynamic imports, static loading shells, error
   boundaries, sidebar hover-prefetch, charts buckets-only payload, estimates-list RPC
   summaries). A **GROUND TRUTH** block (verified 2026-06-14) was supplied to every audit
   agent so findings reconcile against current code instead of restating stale claims.
3. **Multi-agent parallel audit.** Nine independent grounded audits were run in parallel —
   Route/Architecture Inventory, Rendering/State/Client, Bundle/JS/CSS/Asset, Database/API/
   Server-Action, Supabase RLS/RPC/Index, Caching/Prefetch/Route-Transition, Images/Fonts/
   Third-Parties/Analytics, Testing/Benchmark/Readiness, and Existing-Plan Reconciliation/
   Governance. Each returned structured findings with verified evidence paths.
4. **Synthesis.** A single synthesis pass assigned the canonical readiness decision, the
   speed matrix, the prioritized backlog, and the budget critique across all findings.
5. **Authoring.** Deep-dive and cross-cutting documents were authored from the findings; the
   connective documents (this file, README, canonical plan, executive summary, readiness,
   open questions, evidence indices) were authored directly for coherence.

## 3. Evidence & language discipline

Every claim is graded:
- **Verified** — directly read in current source this session.
- **Observed** — backed by a captured benchmark/evidence artifact (path cited).
- **Likely** — inferred from code structure, not measured.
- **Unknown** — no evidence exists.
- **Blocked** — environment/auth/provider access prevented measurement.

**No production-readiness claim is made without live/production-like proof.** Where a metric
could not be measured this session it is labelled `blocked` with the reason, never fabricated.

## 4. Measurement environment (this session) — what was possible

| Capability | Status | Reason |
|------------|--------|--------|
| Static source inspection | ✅ available | Read/Grep/Glob + code-review-graph MCP |
| Captured historical evidence | ✅ available | route-transition archives (real Lighthouse + medians) |
| Live public route benchmark | ❌ blocked | no dev server running (ports 3000–3020 closed) |
| Live authenticated benchmark | ❌ blocked | dev-auth bypass disabled; no Playwright storage state |
| Production build / bundle analyzer | ⛔ deferred | `bun run build` writes shared `.next/`; would collide with concurrent agents |
| Lighthouse (fresh) | ❌ blocked | needs Chrome + `next start` + authed cookies |
| Vercel Speed Insights readiness | ❌ blocked | needs Vercel CLI/auth/env; `@vercel/speed-insights` not installed |

See `evidence/command-log.md` for the full, honest record.

## 5. Concurrency safety (multiple coding agents active)

Other agents were editing source during this audit (dirty tree:
`ProjectEstimatesClient.tsx`, `WorkshopCollectionLayout.tsx`, several `tests/vitest/*`). The
audit therefore: created files **only** inside this folder, edited **no** existing source,
switched **no** branches, and ran **no** shared-artifact build. Final commit stages only this
folder. See `_STATUS.md` and `13_RISK_REGISTER_AND_BLAST_RADIUS.md` (concurrent-agent safety).

## 6. Core questions this pack answers

1. Where is the app slow, and is it network / server / DB / client-render / bundle /
   hydration / route-transition / cache / RLS / asset / third-party / perceived?
   → `03_ROUTE_SPEED_MATRIX.md`, `04`–`09`.
2. Which routes have evidence vs are unmeasured? → `03` + `evidence/`.
3. Which prior plans are implemented / superseded / stale / valid? → reconciliation in
   `CURRENT_CANONICAL_PLAN.md` + `13`.
4. Which budgets are wrong/missing? → `evidence/current-budgets.md` + `11`.
5. What is the closed-beta speed target matrix? → `03` + `11`.
6. What is safe to optimize now vs needs proof vs must not be touched? → `12` + `13`.
7. Is it ready? → `15_READINESS_DECISION.md`.
