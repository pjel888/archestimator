# 01 — Executive Summary

## What this plan delivers

A measurable D1 query-budget, index-coverage, and hosted-proof contract for every first-user hot path in the Archestimator closed-beta `/workshop` app, with no paid Cloudflare features added and no UX scope mixed in.

The implementation is six dependency-aware phases:

1. **P0 — Foundation.** One shared budget helper (`scripts/lib/d1-query-budget.ts`) and an extended static query inventory. Every later phase depends on the shared budget shape.
2. **P1 — Additive indexes.** Two additive migrations (`0037`, `0038`) closing five EXPLAIN-confirmed index gaps on favorites, recipient-responses, and sheet-adjustments lookups. No rewrite of existing indexes.
3. **P2 — Repository-layer fixes.** Kill the one classic N+1 (`canEditEstimateInD1` per estimate in `estimates/page.tsx`), add explicit LIMITs to the unbounded `SELECT *` reads, optional Better-Auth cookie-cached session fast path.
4. **P3 — Local proof per repository.** Eight new SQLite query-budget/p95 proof scripts (one per D1-backed repository currently lacking proof), all emitting the shared budget schema.
5. **P4 — Hosted proof surface expansion.** Extend `d1-performance-proof-router.ts` from 5 generic synthetic surfaces to real repository functions, add subrequest capture, add hosted `EXPLAIN QUERY PLAN` gate.
6. **P5 — CI/rollout gates.** Wire budget regression into CI and define hosted-proof release gates + rollback runbook.

## Why now

Archestimator is preparing for first users. The closed-beta MVP lives entirely in `/workshop/*`. Three lanes of read-only evidence agree the current state is "good foundations, uneven coverage":

- **Index coverage is mostly strong** — migration `0031` already fixed the single hottest project-list query (FULL SCAN + TEMP B-TREE → index-covered). Five residual gaps remain, all on first-user paths.
- **Query budgets are scattered and partial** — local budgets are inlined per-script (no central table); hosted budgets cover 5 generic surfaces only; **no subrequest budget is defined anywhere** despite it being a hard Cloudflare Workers limit.
- **Proof is not tied to every active repository** — 8 of the ~12 D1-backed repositories (project-activity-feed, project-estimate-sheets, project-activity, project-charts, project-data, project-location, recipient-proposals, estimate-favorites) have **no dedicated query-budget/p95 proof**.
- **One classic N+1 exists** — `src/app/workshop/projects/[projectId]/estimates/page.tsx:103-109` runs `Promise.all(estimateIds.map(async estimateId => [estimateId, await canEditEstimateInD1(...)]))` where `canEditEstimateInD1` (`d1-access.ts:271`) is a 3-`EXISTS` + 2-creator-shortcut probe. Cost grows linearly with estimate count.
- **Per-request auth floor is 3 D1 reads with no cookie cache** — Better Auth `disableCookieCache: true` forces a session-table lookup on every `/workshop/*` navigation.

## The five biggest findings (cross-lane)

| # | Finding | Evidence | Phase |
|---|---|---|---|
| F1 | N+1: `canEditEstimateInD1` (3-EXISTS + 2-creator probe) called per estimate in a `Promise.all` | `estimates/page.tsx:103-109`; `d1-access.ts:271` | P2 (`T-P2-01`) |
| F2 | 8 D1-backed repositories have no proof script or budget | See `03` §"Proof coverage gaps" | P3 |
| F3 | No subrequest budget defined anywhere in repo | `rg "subrequest"` returns zero definitions | P0/P4 |
| F4 | Hosted D1 proof covers 5 generic synthetic surfaces, not real repository functions | `d1-performance-proof-router.ts:148-223` uses `__archestimator_d1_proof_*` tables | P4 |
| F5 | 5 EXPLAIN-confirmed index gaps on first-user paths (favorites user_id, responses publication+recipient, sheet-adjustments estimate_id, categories global scan, client_name dropdown) | `03` index-coverage table; migration rg inventory | P1 |
| **F6** | **Rows-read (D1's load-bearing free-tier metric: 5M/day, counting scanned rows incl. JOIN fan-out) was entirely unbudgeted in the original pack** | Cloudflare D1 Pricing docs (official, 2026-07-07); `09` post-audit rowsRead columns + projection | **P0/P1/P2/P4** — added as PERF-011 in audit cycle 3 |

## Readiness status and score

- **Status:** `CONDITIONALLY READY` (revised in audit cycle 3 — see `20`). **P0–P3 implementation-ready; P4–P5 gated on hosted evidence.**
- **Overall implementation readiness:** 94 (emulated-verification cap at 97; scored 94 because hosted rows-read and hosted EXPLAIN proof are deferred to P4 execution steps, and `verification_mode: emulated` caps high-blast-radius packs without owner accept).
- **Caps applied:** `verification_mode: emulated` → cannot exceed 97 without an independent or owner review. No `same-agent` cap applies because verification was a separated emulated pass plus a native Explore verification lane, not the unseparated author.

**Biggest audit-cycle-3 improvement:** the original pack missed **rows-read budgeting** entirely — and on D1 Free, rows-read (5M/day, counting every scanned row including JOIN fan-out) is the load-bearing free-tier cost metric. PERF-011 was added; the `09` budget table gained rowsRead columns + a verified free-tier ceiling table sourced from Cloudflare's official D1 Pricing docs. Before/after scores in `20`.

The residual items that would lift this to 98–100 are execution-time, not planning-time: (a) owner (Philip) accepts the package, and (b) P4 produces hosted rows-read + EXPLAIN + subrequest evidence. Neither is a planning defect; both are named as P4 tasks with exact scope.

## What this plan does NOT do

- Does not add any paid Cloudflare feature (Workers Smart Placement paid, D1 paid plan, R2 paid tier, dedicated egress, Workers Analytics paid — all explicitly excluded; plan stays on free-tier/bundled limits).
- Does not change UX, design system, or component structure.
- Does not redefine D1 schema integrity, R2 backup ops, DO realtime, or OWASP authz (sibling packs own those).
- Does not modify the Supabase legacy archaeology or any provider project outside `wrangler.jsonc` bindings.
- Does not run, apply, or commit any migration or script — planning only.

## Recommendation

Implement P0 → P1 → P2 → P3 → P4 → P5 in order. P0 and P1 can overlap in calendar time (different files, no shared edits). P2 is the highest-risk phase (touches repository read paths every first user hits) and should get the most review attention. P3 and P4 together convert "we believe the budgets" into "we can prove the budgets against hosted D1," which is the stop condition in the PROMPT.
