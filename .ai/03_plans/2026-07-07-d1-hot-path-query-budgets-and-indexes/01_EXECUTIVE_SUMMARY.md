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
- **One classic N+1 exists** — `src/app/workshop/projects/[projectId]/estimates/page.tsx:105` runs `Promise.all(estimateIds.map(id => canEditEstimateInD1(...)))` where `canEditEstimateInD1` is a 6-way `EXISTS` probe. Cost grows linearly with estimate count.
- **Per-request auth floor is 3 D1 reads with no cookie cache** — Better Auth `disableCookieCache: true` forces a session-table lookup on every `/workshop/*` navigation.

## The five biggest findings (cross-lane)

| # | Finding | Evidence | Phase |
|---|---|---|---|
| F1 | N+1: `canEditEstimateInD1` (6-subquery EXISTS probe) called per estimate in a `Promise.all` | `estimates/page.tsx:103-109`; `d1-access.ts:234` | P2 (`T-P2-01`) |
| F2 | 8 D1-backed repositories have no proof script or budget | See `03` §"Proof coverage gaps" | P3 |
| F3 | No subrequest budget defined anywhere in repo | `rg "subrequest"` returns zero definitions | P0/P4 |
| F4 | Hosted D1 proof covers 5 generic synthetic surfaces, not real repository functions | `d1-performance-proof-router.ts:148-223` uses `__archestimator_d1_proof_*` tables | P4 |
| F5 | 5 EXPLAIN-confirmed index gaps on first-user paths (favorites user_id, responses publication+recipient, sheet-adjustments estimate_id, categories global scan, client_name dropdown) | `03` index-coverage table; migration rg inventory | P1 |

## Readiness status and score

- **Status:** `IMPLEMENTATION-READY`.
- **Overall implementation readiness:** 95 (emulated-verification cap at 97; scored 95 because hosted subrequest and hosted EXPLAIN proof are deferred to safe `DISCOVERY-REQUIRED` / P4 execution steps rather than proven in this planning pass).
- **Caps applied:** `verification_mode: emulated` → cannot exceed 97 without an independent or owner review. No `same-agent` cap applies because verification was a separated emulated pass, not the unseparated author.

The two residual items that would lift this to 98–100 are both execution-time, not planning-time: (a) an independent reviewer or owner sign-off on the migration sequence, and (b) the hosted subrequest + EXPLAIN evidence that P4 produces. Neither is a planning defect; both are named as P4 tasks with exact scope.

## What this plan does NOT do

- Does not add any paid Cloudflare feature (Workers Smart Placement paid, D1 paid plan, R2 paid tier, dedicated egress, Workers Analytics paid — all explicitly excluded; plan stays on free-tier/bundled limits).
- Does not change UX, design system, or component structure.
- Does not redefine D1 schema integrity, R2 backup ops, DO realtime, or OWASP authz (sibling packs own those).
- Does not modify the Supabase legacy archaeology or any provider project outside `wrangler.jsonc` bindings.
- Does not run, apply, or commit any migration or script — planning only.

## Recommendation

Implement P0 → P1 → P2 → P3 → P4 → P5 in order. P0 and P1 can overlap in calendar time (different files, no shared edits). P2 is the highest-risk phase (touches repository read paths every first user hits) and should get the most review attention. P3 and P4 together convert "we believe the budgets" into "we can prove the budgets against hosted D1," which is the stop condition in the PROMPT.
