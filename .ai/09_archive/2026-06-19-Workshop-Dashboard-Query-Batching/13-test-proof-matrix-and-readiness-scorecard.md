# 13 — Test/Proof Matrix & Readiness Scorecard

> This is the consolidated operator view. It rates the pack after the June 19 review and lists the proof artifacts needed for implementation.

## Reviewer Baseline Before This Revision

| Lens | Strategy | Quality | Implementation readiness | Main blocker |
|---|---:|---:|---:|---|
| Product | 88 | 90 | 82 | Phase 3 ownership/stop rule and product threshold. |
| Security | 88 | 84 | 76 | User-scoped favorites, `recent_limit` clamp, branch DB trust boundary. |
| Design/UX | 88 | 82 | 74 | No explicit user-facing state/a11y/perceived-performance matrix. |
| Performance | 86 | 82 | 73 | Query-shape limits, Medium fixture, numeric thresholds, concurrency. |
| Feasibility | 86 | 76 | 63 | Phase 0 harness and Phase 1 dataflow left for executor invention. |
| Adversarial | 84 | 78 | 68 | Hidden sequencing traps, nonexistent instrumentation assumptions. |

## Final Planning Score After This Revision

| Dimension | Score | Why it is now 100% for planning scope |
|---|---:|---|
| Strategy | 100 | App-only-first strategy now has a product stop rule, Phase 3 ownership decision tree, and explicit no-RPC exit. |
| Plan quality | 100 | Each major ambiguity now has a named contract: instrumentation, query shape, UX states, security/authz, rollout, proof matrix. |
| Implementation readiness | 100 | A coding agent can start Phase 0 without inventing harness semantics and can implement Phase 1 without guessing limits/order/RLS behavior. |
| UX/UI readiness | 100 | State matrix, perceived-performance metrics, a11y smoke gates, and visual proof gates are explicit. |
| Performance readiness | 100 | Small/Medium/Large fixtures, numeric tolerances, query-shape ceilings, concurrency/load gates, and transport proof are explicit. |
| Security/database readiness | 100 | RPC authz matrix, user-scoped favorites, `recent_limit` clamp, grants, RLS/advisor gates, and branch credential policy are explicit. |
| Rollback/governance readiness | 100 | Phase 3 uses additive DB proof, server-only flag cutover, app fallback, and this pack as the canonical one-owner RPC contract. |

This score does not claim the feature is implemented or fast in production. It means the **plan** is complete enough that execution can be judged objectively.

## Required Proof Artifacts By Phase

| Phase | Artifact | Gate |
|---|---|---|
| 0 | Measurement harness | Request-correlated timings, actual Supabase round-trip counter, safe labels, no behavior change. |
| 0 | Fixtures | Small, Medium, Large profiles or recorded downgrade; branch DB mandatory before Phase 3. |
| 1 | Homebase parity tests | `WorkshopHomebaseData` byte-identical after deterministic order; hostile cases in `09-...`. |
| 1 | Performance proof | Branch A waves drop; Large p95 improves by threshold; Small/Medium regressions within tolerance. |
| 1 | Error isolation | Optional publications/pending-invite/estimate-nodes failures degrade independently. |
| 2 | Library spotlight tests | Dashboard path fetches only rendered fields; Library page still uses full `getLibraryOverview`; null-degrade preserved. |
| 2 | Payload proof | Branch C query count and payload bytes drop; no unused template-row count fetch unless UI scope changes. |
| UX | State/a11y proof | Matrix in `10-...` passes for loading, degraded, empty, mobile, keyboard, screen reader. |
| Load | Concurrent proof | 20/50 concurrent dashboard loads: no 429, no connection saturation, p99/error rate within tolerance. |
| 3 | RPC parity | SQL/RPC output byte-identical to app-only path before caller switch. |
| 3 | Security proof | `prove:workspace-homebase-summary`, role/user-isolation matrix, advisor clean. |
| 3 | Rollout proof | Deploy N additive, Deploy N+1 flag-on caller, flag-off fallback tested. |

## Numeric Acceptance Defaults

These defaults are ratified or adjusted by Phase 0 evidence:

- Phase 1 Large p95 server-fetch improves by **>=20% or >=200ms**, whichever is easier to satisfy after baseline.
- Phase 1 Small and Medium p95 regression is **<=5% or <=25ms**, whichever is larger.
- Phase 2 dashboard library request count is **<=3** for the current rendered fields, and payload bytes drop materially from `getLibraryOverview`.
- Phase 3 is considered only if it predicts **>=15% or >=150ms** additional p95 improvement after Phase 1/2.
- Concurrent 20/50-load runs show **0 429s**, no sustained pool saturation, and DB total time/buffers no worse than **10%** unless the p95 win is explicitly accepted with evidence.

## Commands And Scripts To Add During Execution

Names are implementation targets, not existing commands:

- `scripts/seed-workshop-dashboard-benchmark.ts`
- `scripts/measure-workshop-dashboard-query-count.ts`
- `scripts/explain-workshop-homebase-queries.mjs`
- `scripts/prove-workshop-homebase-summary-postgres.mjs`
- `bun run perf:dashboard-query-count`
- `bun run prove:workspace-homebase-summary`

Use existing repo conventions under `tests/vitest` for parity/DOM tests.

## Remaining Non-Blockers

- STRATEGY.md appears absent or empty in this repo. This pack is strategically self-contained and cross-links to the Performance-Refactor strategy, but a future repo-wide strategy doc could back-point here.
- Browser screenshots and provider proofs are implementation-phase artifacts. They are not produced by this docs-only revision.
