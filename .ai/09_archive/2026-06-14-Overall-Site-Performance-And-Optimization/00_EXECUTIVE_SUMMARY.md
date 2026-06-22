# 00 — Executive Summary

**Date:** 2026-06-14  ·  **Status:** AUDIT / PLANNING / READINESS ONLY
**Readiness decision:** **CONDITIONALLY READY FOR CLOSED BETA — not for public launch** (`15_READINESS_DECISION.md`).

---

Archestimator is **conditionally ready for closed beta — not for public launch**. The
distinction is honest and load-bearing: the perceived-speed work a beta cohort touches first is
genuinely landed and reconciliation-confirmed, while the *proof* that the app is fast at scale
and stays fast is largely missing.

Verified live this session against HEAD: the route-transition plan (**10 loading shells, 7 error
boundaries, 14 `dynamic()` split points**, `React.cache` identity/project loaders, hover-intent
prefetch) is implemented; the four 2026-06-14 surface plans (**estimates-list RPC, library JS cut
from 618KB to ~232KB, charts buckets-only payload, teamspace presence/cursors**) are
archived/implemented with several migrations already on prod; and the estimate-sheet keystroke
path is an archived, profiler-backed decision whose virtualization/concurrent-feature options
were **deliberately rejected**. This is a mature felt-speed foundation. Re-implementing any of it
from stale docs would be a regression of effort, not progress.

The blocking truth is that readiness **proof** does not yet exist, and **four of the five gaps
are measurement/observability gaps, not unfinished optimization.** Most important: **production
RUM is physically off.** `@vercel/speed-insights` is absent from both `package.json` and
`node_modules` (only `@vercel/analytics` ships), with no `SpeedInsights` mount anywhere in `src`
— and it was previously **removed as a deliberate security remediation**, so it cannot simply be
re-added without owner sign-off on the original finding. Until a redaction-equipped beacon is
live, the readiness checker's core-vitals gate cannot turn green and every field claim is
blocked. The only authed lab evidence is a single non-reproducible Lighthouse run (perf **0.86,
LCP 3865ms, serverResponse 630ms**) on the **lightest** authed route; the heaviest and most
important surfaces — the estimate workspace, charts at scale, project detail — have **zero**
synthetic and zero field coverage.

The **database** story is structurally unproven and partly degraded. The dedicated
FK/composite-index plan is audit-only with zero plan-authored index migrations applied (the 28
existing feature indexes do not cover its scope); **`is_platform_admin()` still uses bare
`auth.uid()`+`auth.jwt()`** (verified in migration `20260518100000`) and gates every access
helper, with roughly **152–182 bare `auth.uid()` RLS sites** still unwrapped. Crucially, **there
is no DB-write seed path**, so nothing has ever been EXPLAIN-measured at realistic volume — the
small current table sizes are the only reason this is not already an incident. Two corrected
migrations are also unapplied deploy-time landmines: the chart-buckets RPC is fixed locally but
not on hosted and verified-unwired in code, and the estimate-tree sibling-order migration's prod
apply is unconfirmed.

The published **budgets** compound the risk: the only thresholds in the repo are deliberately
loose smoke tripwires (public 15s, authed 10s, slow3g 30s) that sit far above observed medians
and were never meant to gate launch. There is a real danger of mistaking a green smoke gate for
readiness. The path forward is precise and low-drama: enter closed beta with the no-regret wins
shipped (sidebar-BG re-encode, orphan-asset cleanup, landing-lib deferral, missing loading/error
shells, `next/image` thumbnails, CI import guard), adopt 2026-06-05 doc 17 as the real readiness
scorecard, and use the beta cohort itself to generate the field RUM and at-scale EXPLAIN evidence
the lab could not. Public launch is gated on that evidence arriving green, plus owner-supervised
DB-index and hosted-migration applies in a maintenance window.

**The single highest-leverage move is the owner decision on RUM** — it is both the cheapest
implementation and the master unblock for every other readiness claim. Everything else can be
prioritized rationally once real field numbers exist; without them, prioritization is inference.

---

## Findings at a glance

| Severity | Count |
|----------|-------|
| Critical | 0 |
| High | 18 |
| Medium | 46 |
| Low | 32 |
| **Total** | **96** (across 9 dimensions) |

> No findings are rated Critical — the architecture is sound and the security perimeter (RLS) is
> intact. The High findings are concentrated in **measurement/observability gaps** (RUM, budgets,
> unmeasured heavy surfaces, unproven DB at scale) rather than broken code.

## Top bottleneck themes

1. **Measurement & observability gap** (RUM off, no readiness budgets, heavy routes unmeasured) — the dominant theme.
2. **Server response dominates authed LCP** — route-transition infra is done; TTFB/data is the lever (DB + RLS).
3. **DB at-scale unproven** — bare-`auth.uid()` RLS overhead + unbuilt indexes + no seed-at-volume.
4. **Public LCP-critical bundle** — landing animation libs (roughjs/rough-notation/lenis) + a 2.7MB background image.
5. **Governance/reconciliation** — most perceived-speed work is already done; the risk is duplicating or undoing it.

## Next action

Run backlog **P0 (Measurement & Truth)** + the owner-gate-free **P1 no-regret wins**. See
`15_READINESS_DECISION.md` for the exact next prompt. Do not implement from stale docs; do not
mutate production/provider/database from this plan.
