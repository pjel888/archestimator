# Research, Review, and QA Evidence

---

## 1. Research questions and sources (validator-gated)

| # | Research question | Primary source consulted | Current official guidance vs community convention | Plan decision it changed | Citation / date | Searched-but-not-found |
|---|---|---|---|---|---|---|
| R1 | Does Next.js 16 `loading.js` get prefetched for instant nav? | `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/loading.md` + `01-app/02-guides/prefetching.md` | Official: yes, fallback prefetched; dynamic routes prefetch layout-to-first-loading-boundary, 30s TTL (configurable via `staleTimes`) | Confirmed `staleTimes` is the warm-nav lever; PERF/arch decisions | local docs (Next 16.2.6) | n/a |
| R2 | Is there a framework-supported "instant navigation" guarantee? | `node_modules/next/dist/docs/01-app/02-guides/instant-navigation.md` (version: draft) + `03-api-reference/.../route-segment-config/instant.md` | Official (draft): `unstable_instant` + Cache Components validates at build/dev; requires Cache Components on | Added ARCH-05 future path; did NOT mandate (off today) | local docs (draft) | stable-version caveats |
| R3 | Where do skeletons/LCP/CLS interact? | `01-app/02-guides/streaming.md` §"Streaming and Web Vitals" | Official: keep LCP out of Suspense; `preload` LCP images; match skeleton dims for CLS; Suspense = hydration unit (INP) | UX-05, ARCH Suspense law, skeleton-dim rule | local docs | n/a |
| R4 | Does `loading.js` wrap `layout.js`? | loading.md L88 | Official: no; uncached layout data blocks nav w/o Cache Components | REL-01 + layout-streaming guidance | local docs | n/a |
| R5 | HTTP status mid-stream? | streaming.md §"HTTP contract" | Official: 200 once streaming starts; notFound/redirect become soft (noindex) | REL-01 token-route guidance | local docs | n/a |
| R6 | Existing canonical budgets location | `.ai/01_roadmap/27-performance-budget-and-regression-gates.md` | repo canonical | DEC-02 (reference, don't duplicate) | repo file | n/a |
| R7 | Where do universal agent rules live? | `.ai/00_system/ai-folder-canonical-map.md` | repo canonical ("00_system if it governs all agents") | DEC-01 | repo file | n/a |
| R8 | Is there production RUM today? | `src/components/workshop/WebVitalsProbe.tsx`, `providers.tsx`, `package.json` | repo evidence: dev-only, console-only | PERF-02 gap + design | repo source | n/a |
| R9 | Existing perf tooling | `package.json` scripts, `scripts/*`, `e2e/*`, `tests/vitest/perf/*` | repo evidence: rich but fragmented | PERF-01 evaluators (consolidate) | repo source | n/a |
| R10 | OpenNext/Workers streaming pass-through | streaming.md §"What can affect streaming" + `wrangler.jsonc` | Official: CDNs/proxies can buffer; Workers generally pass-through (to verify) | ASSUMP-01, Phase 0 verify | local docs + wrangler | Workers-specific streaming proof (Phase 0) |

**Validation rubric:** research is sufficient because each decision is grounded in local official docs (R1–R5, R10), repo canonical files (R6–R9), or explicit assumption (R10/ASSUMP-01). No community-blog-only claims drive a decision.

## 2. Skills and workflows used / unavailable

- **Used (referenced):** `web-perf` (CWV workflow reference), `performance-goal` (evaluator contract shape), `Creating-Plan-Prompt.md`, `Multi-Agent-Execution-Directive.md`, `AGENTS.md`.
- **Reflected (not invoked as native):** `ultragoal` (durable-goal contracts in Phase docs), `ultrawork` (parallel lane classification), `ultraqa` (adversarial matrix below), `autopilot` (clarify→plan→execute→review→QA shape), `autoresearch`/`autoresearch-goal` (validator-gated research above).
- **Unavailable (honest):** no native goal/ledger tool, no native independent verifier. Durable goals are document artifacts; verification is `emulated`.

## 3. Specialist workstream outputs

Summarized in `00_AGENT_COORDINATION.md` lane table; full evidence in `03_SOURCE_AND_CODEBASE_AUDIT.md` (L2 routes, L3 mount, L4 tooling, L5 agent-rules).

## 4. Critique-and-revision cycle summaries

- **Cycle 1:** Initial 00–16 drafted. Self-critique: shadow paths thin; EV-10 (bfcache) missing; `viewport` gap not a requirement; ARCH-02 not classified. → Added S1/S2, EV-10, UX-05, DISCOVERY on P2-T1.
- **Cycle 2:** Adversarial matrix added; concurrent-agent safety on AGENTS.md edit; readiness corrected to `CONDITIONALLY READY` (emulated cap); owner decisions isolated. Residual = owner-gated/future-proof.

## 5. UltraQA-style adversarial scenario matrix

| ID | User/attacker model | Scenario | Setup | Command/harness | Expected signal | Actual (planning) | Status | Evidence | Cleanup |
|---|---|---|---|---|---|---|---|---|---|
| AQ-01 | Slow-network user | Nav to `/invite/[token]` on Slow 3G | seeded token + CDP Slow 3G | Playwright | skeleton within 1 frame | today: blank | Phase 1 to fix | future e2e | — |
| AQ-02 | User double-clicking | Rapid nav between projects | two seeded projects | Playwright | interruptible; no overlay stuck | framework handles | verify Phase 1/2 | route-transition spec | — |
| AQ-03 | Network drop mid-stream | Skeleton shows forever | cut network after nav | Playwright | error boundary after timeout | today: may hang | REL-02 Phase 2/3 | new test | — |
| AQ-04 | Attacker oversized beacon | 100KB payload to `/api/internal/web-vitals` | curl | unit/denial | 413 + drop | n/a (not built) | Phase 0/impl | beacon test | — |
| AQ-05 | Attacker malformed beacon | bad metric/JSON | curl | unit | 400 + drop | n/a | impl | beacon test | — |
| AQ-06 | Replay/dupe beacon | same id twice | curl | unit | idempotent 204 | n/a | impl | beacon test | — |
| AQ-07 | Rate-limit evasion | 10k beacons/min | curl | load | 429 | n/a | impl | rate-limit test | — |
| AQ-08 | Token in URL beaconed | `/share/<token>` CWV | beacon with path | redaction test | query/hash stripped, no token | n/a | impl | redaction test | — |
| AQ-09 | Skeleton CLS | nav to dashboard | Playwright CLS | layout-shift | CLS <0.1 | today: mostly matched | Phase 1 verify | route-transition | — |
| AQ-10 | `ssr:false` hydration break | estimate DnD after dynamic ssr:false | seeded estimate | CRUD-latency spec | DnD works | unverified | P2-T1 discovery | discovery spike | — |
| AQ-11 | Concurrent agent edits AGENTS.md | two agents add lines | git simulation | `git diff --check` | no clobber | n/a | Phase 4 lease | ledger | — |
| AQ-12 | Hung command | perf:measure-routes hangs | timeout | bounded timeout | exit | n/a | ops | run with timeout | — |
| AQ-13 | Flaky rerun | transition variance | rerun | drop min/max median | stable | n/a | Phase 0 | metrics | — |
| AQ-14 | Misleading success | mutation returns 200 but failed | share migration | spec | rollback toast | today: hand-rolled | Phase 2 | shared-link spec | — |
| AQ-15 | Dirty worktree | uncommitted changes during impl | git status | none | preserve unfamiliar | n/a | all phases | git status | — |

## 6. Performance evaluator contract

Complete in `09_PERFORMANCE...md` EV-01..EV-10 (baseline/target/command/fixture/runs/threshold/rollback/evidence). Not duplicated here.

## 7. Independent final verifier evidence

`emulated` — see `17_FINAL_READINESS_REVIEW.md`. No native independent lane was dispatched. The lead performed a separated verifier pass (§3 of readiness review) covering: missing/hallucinated requirements, contradictions, unjustified architecture, missing code, downstream impact, edge cases, security/perf/ops gaps, vague tasks, untestable ACs, exact paths/symbols, Server/Client decisions, cache contracts, provider boundaries, budgets/evaluators, shadow-path coverage.

## 8. Explicit validation gaps

- No baselines captured (Phase 0).
- No browser/provider/hosted proof (planning-only).
- `validate:agents` not run (Phase 4).
- ARCH-02 discovery not performed (P2-T1).
- Owner decisions unresolved (OPEN-* list).
- Verification mode `emulated` → caps readiness/status.
