# 15 — Readiness Decision

**Date:** 2026-06-14  ·  **Status:** AUDIT / PLANNING / READINESS ONLY
**Basis:** 96 findings across 9 audit dimensions, reconciled against live source @ HEAD `3070c46c` (repo advanced to `4f0ca5ab` mid-session via concurrent agents; key line refs re-verified, unchanged). All numeric metrics are from prior captured evidence — **no live measurement was possible this session** (see `evidence/command-log.md`).

---

## Decision

> ## CONDITIONALLY READY FOR CLOSED BETA — NOT READY FOR PUBLIC LAUNCH

**Why not NOT-READY:** the perceived-speed surface a beta cohort touches first is genuinely
landed and reconciliation-confirmed — route-transition infra (10 `loading.tsx`, 7 `error.tsx`,
14 `dynamic()` split points, `React.cache` identity/project loaders, hover-intent prefetch),
plus the four 2026-06-14 surface plans (estimates-list RPC summaries, library JS 618KB→~232KB,
charts buckets-only payload, teamspace presence) which are archived/implemented with several
migrations already on prod. The estimate-sheet keystroke path is an archived, profiler-backed
decision whose virtualization/concurrent-feature options were **deliberately rejected**.

**Why not READY (for public launch):** readiness **proof** does not exist. Production RUM is
physically off; the only authed lab number is a single non-reproducible Lighthouse run on the
*lightest* authed route; the heaviest surfaces are unmeasured; DB performance is structurally
unproven and partly degraded; and the only published budgets are loose smoke tripwires.

Closed beta is the correct gate **because it generates the very field RUM + at-scale EXPLAIN
evidence the lab could not** — provided the owner gates (`16_OPEN_QUESTIONS_OWNER_GATES.md`)
are honored and the no-regret wins land first.

---

## Top 5 blockers (to PUBLIC launch; none block closed beta entry)

1. **RUM is physically off and was removed as a security fix** (AS01/INV04/TG03/GOV02). `@vercel/speed-insights` is absent from `package.json` **and** `node_modules`; no `SpeedInsights` mount in `src`; only `@vercel/analytics` ships. It was previously **removed** as a security remediation, so it cannot be silently re-added. Until a redaction-equipped beacon is owner-approved and live, the readiness checker's core-vitals gate can never go green.
2. **No readiness-grade budgets exist** (TG01/GOV08/GOV11). The only thresholds (public 15s / authed 10s / slow3g 30s / bfcache 1.5s) are deliberately-loose CI smoke tripwires far above observed medians. A green smoke gate is being mistaken for readiness. Adopt 2026-06-05 doc 17 acceptance criteria as the real scorecard.
3. **Deep authed surfaces are completely unmeasured** (TG02/INV08/CR01/PERF-BN-07). The estimate workspace, charts-at-scale, and project-detail routes — heaviest JS + the core product — have zero synthetic and zero field coverage. The one authed point (0.86 / LCP 3865ms) is on the lightest route, non-reproducible, empty raw report (TG07).
4. **DB performance is structurally unproven and partly degraded** (RLS01/RLS04/DB03/DB04/GOV03/GOV10). `is_platform_admin()` uses bare `auth.uid()`+`auth.jwt()` (verified `20260518100000:81`) and gates every access helper; ~152–182 bare `auth.uid()` policy sites remain (~15% wrapped); the dedicated FK/composite-index plan is audit-only (0 plan-authored index migrations applied); **no DB-write seed path exists**, so nothing has been EXPLAIN-measured at volume.
5. **Two corrected migrations are unapplied deploy-time landmines** (GOV05/DB02/RLS09). `get_project_chart_buckets` is fixed locally but NOT on hosted and verified-unwired in `src` (comment-only at `project-charts-repository.ts:117`); the estimate-tree sibling-order migration's prod apply is unconfirmed. A clean-apply deploy could ship a divergent RPC — pipeline must probe-and-fail-open.

## Top 5 no-regret optimizations (safe to ship into closed beta)

1. **Re-encode the 2.7MB `sidebar-BG.png` to WebP/AVIF at rendered size** (AS04) — loads on *every* cold authed page; pair with deleting ~10MB of grep-verified orphan `public/` assets (AS03).
2. **Migrate the 2 persisted-URL Supabase thumbnails to `next/image`** (PERF-BN-05) — remotePattern already set; bounded bytes + CLS 0; keep `blob:` preview as a documented raw-`<img>` exception.
3. **Defer landing animation/annotation libs off the synchronous LCP path** (PERF-BN-01 roughjs, PERF-BN-02 rough-notation, PERF-BN-03/AS09 lenis) via `await import()` inside existing IntersectionObserver/reduced-motion effects (reuse the proven Neat pattern).
4. **Add the few missing `loading.tsx`/`error.tsx` boundaries** (RT01 settings, RT02 `[projectId]`, RT03 `share/[token]` + share `error.tsx`, RT04 `/workshop` + `global-error.tsx`) — additive shells reusing `StaticWorkshopLoadingShell`; no data/DB risk.
5. **Add a CI grep-guard forbidding static `three`/`@firecms/neat` imports outside `NeatWireframeBackground.tsx`** (PERF-BN-08) and move `recordProjectPublicationEvent` off the share GET critical path via `after()`/`waitUntil` (DB08).

## Top 5 measurements still missing

1. **Field Web Vitals (p75 LCP/INP/CLS/TTFB) per route** from real closed-beta users — the master unblock (blocked: RUM absent).
2. **Reproducible synthetic Lighthouse on the heavy authed routes** vs `next build`+`next start` with owner storage state — editor/charts/project-detail have no coverage.
3. **`EXPLAIN (ANALYZE, BUFFERS)` + `pg_stat_statements` on production-size seed** for hot RLS reads, `project_estimate_list_summaries`, and `get_project_chart_buckets` (blocked: no DB-write seed path).
4. **`ANALYZE=true bunx next build --webpack` treemap + Turbopack production manifest-byte audit** to set real first-load JS budgets (blocked this session).
5. **Manual Chrome DevTools bfcache test (`pageshow.persisted=true`) + production React Profiler flamegraph of the estimate workspace** — the two open manual gates.

---

## Risk summary

**Risks to user experience:** cold authed LCP dominated by server response (~3.8s observed on the lightest route; heavy routes unknown); estimate editor + charts at scale unmeasured (could degrade on large projects); a handful of missing loading/error shells leave `[projectId]`, settings, and `share/[token]` without graceful states. None are catastrophic for a small controlled cohort.

**Risks to data/security:** **do not weaken auth/RLS for speed** — `src/proxy.ts` must keep `getUser()` (never `getSession()`); RUM re-wiring must preserve the share-link token redaction (Speed Insights was removed precisely to stop markers/token leakage); the unapplied `get_project_chart_buckets` RPC is a deploy landmine; any index/RLS migration is owner-window-only on the authorized DB channel with EXPLAIN + parity proof. See `13_RISK_REGISTER_AND_BLAST_RADIUS.md`.

**Risks to implementation velocity (concurrent agents):** multiple agents are editing this repo (HEAD moved during the audit; `ProjectEstimatesClient.tsx` etc. dirty). Perf changes must be **small, reversible, and land via ff-push to `origin/main`** without colliding with the route-transition plan or the four archived surface plans. Re-implementing already-landed/rejected work (virtualization, etc.) from stale docs would be negative-value churn (GOV12).

---

## Recommended next agent task

**Wire production RUM (owner-gated) + adopt readiness budgets, then run the P0 measurement battery.** Concretely: (1) get the owner decision on the RUM beacon (re-checking the original security finding + reusing the analytics redaction), (2) capture an authed Playwright storage state, (3) run the heavy-route synthetic Lighthouse + `measure-routes` battery + the `--webpack` treemap, (4) land the five no-regret wins behind the route-transition plan's conventions. Everything downstream prioritizes rationally once field/at-scale numbers exist.

## Exact next prompt Philip should run

```
Read .ai/03_plans/2026-06-14-Overall-Site-Performance-And-Optimization/CURRENT_CANONICAL_PLAN.md
and 12_OPTIMIZATION_BACKLOG.md. Execute ONLY backlog phase P0 (Measurement & Truth) plus the
P1 no-regret wins that require no owner gate. Do NOT touch production, Supabase, migrations, or
provider settings. For RUM, STOP and ask me to approve the Speed-Insights re-wire (it was removed
as a security fix). Capture an authed storage state, then run: ANALYZE=true bunx next build
--webpack (isolated .next); perf:measure-routes (No throttle / Fast 3G / Slow 3G) for public AND
authed heavy routes; Lighthouse on /workshop/projects/[id]/estimates/[nodeId] and /charts. Write
all evidence under the plan's evidence/ folder. Then re-score 15_READINESS_DECISION.md with the
real numbers. Land code only via small reversible commits ff-pushed to origin/main.
```
