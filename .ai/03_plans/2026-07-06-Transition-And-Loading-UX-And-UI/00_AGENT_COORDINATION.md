# Agent Coordination Ledger

**Plan:** Transition and Loading UX/UI — App-Wide Audit, Measurement Strategy, and AI-Agent Rules
**Plan folder:** `.ai/03_plans/2026-07-06-Transition-And-Loading-UX-And-UI/`
**Plan profile:** `exhaustive` (cross-cutting, app-wide, performance-sensitive, sets durable agent rules)
**Created:** 2026-07-06 (Asia/Manila)
**Verification mode:** `emulated` (separated passes by the same lead agent; no native independent reviewer lane was dispatched for this planning-only pass — see `17_FINAL_READINESS_REVIEW.md`).

---

## Master `/goal`

**Outcome.** Establish a comprehensive, evidence-based plan that (1) audits the current transition and loading UX/UI for the entire Archestimator app, (2) defines how performance will be measured, benchmarked, and regression-gated going forward, (3) prescribes the fastest, most efficient, best-practice mounting strategy for pages and components on Next.js 16 + React 19 + Cloudflare Workers/OpenNext, and (4) codifies durable AI-agent rules so future agents consistently apply these practices when adding features and pages.

**Problem being solved.** Loading and transition UX across the app is uneven (some routes have skeletons + streaming, others have neither), the heaviest client components mount eagerly on the critical path, there is no production RUM/Core Web Vitals telemetry, performance budgets and evaluators are fragmented across multiple docs, and there is no single agent-facing rule that governs loading/mount/streaming decisions for new work.

**Planning scope (in).**
- App-wide inventory of routes, `loading.tsx`, `error.tsx`, `<Suspense>`, prefetch, `next/dynamic`, client-component footprint, and existing loading primitives.
- Mount/hydration strategy (Server vs Client boundaries, `next/dynamic` `{ ssr, loading }`, virtualization, code-splitting of heavy modules).
- Performance measurement architecture: evaluator contracts, budgets, RUM/telemetry gap, existing Playwright/Vitest perf tooling, bundle budgets, and a benchmark cadence.
- Durable AI-agent rules (where they live, what they say, how they are enforced) and a forward "load this checklist when adding a page/component" procedure.
- Next.js 16 framework-specific guidance: streaming, static shell, `loading.js` prefetch behavior, `staleTimes`, and the `unstable_instant` / Cache Components path (evaluated as a future option, not mandated).

**Non-goals (out).**
- Implementing any code change. This is planning-only.
- Mutating D1/R2/DO/Queue/Email/Workers provider state.
- Building a new analytics backend or signing up for paid telemetry/observability add-ons (call those out as owner decisions).
- Design-system visual redesign. `DESIGN.md` is alpha and not law.
- Rewriting the estimate sheet, projects page, or library manager in this pass — those are characterized as future implementation phases.

**Required codebase analysis.** Route/loading/error inventory; client-component mount audit; prefetch/dynamic-import/Suspense audit; existing perf tooling + scripts inventory; existing agent-rules infrastructure map; Next.js 16 local docs on streaming/loading/prefetch/instant-navigation; existing perf roadmap `27-*.md` and Master Performance bible.

**Implementation-readiness criteria.** The package is `IMPLEMENTATION-READY` for the rule-authoring phase and the measurement-architecture phase; it is `CONDITIONALLY READY` for the larger UX remediation phases because they carry owner decisions (RUM backend, Cache Components opt-in, budget tightening) and real-asset proof (browser/provider) that cannot be settled in a planning-only pass.

**Validation criteria.** Two+ critique-and-revision cycles for this exhaustive package; requirement-by-requirement traceability; shadow-path matrices for the loading/transition flows that have runtime behavior; performance evaluator contracts for every budget-bearing requirement; no application code modified.

---

## Skills and repository instructions used

| Skill / instruction | Used? | Why |
|---|---|---|
| `Creating-Plan-Prompt.md` | Yes | Authoritative planning directive for this pack. |
| `Multi-Agent-Execution-Directive.md` | Yes | Coordination, evidence-class honesty, planning-only boundary. |
| `AGENTS.md` (repo root) | Yes | Stack baseline, verification policy, `.ai` map, Cloudflare standing auth. |
| `.ai/01_roadmap/27-performance-budget-and-regression-gates.md` | Yes | Existing canonical numeric budgets (do not duplicate; reference). |
| `.ai/13_research/2026-06-17-Master-Performance/...Bible...md` | Yes (read via lane) | Existing engineering law (Suspense, virtualization, row-edit). |
| `.ai/00_system/AGENT_OPERATING_PROTOCOL.md` | Referenced | Loop activation criteria (planning-only). |
| `.agents/skills/web-perf/SKILL.md` | Referenced | CWV measurement workflow reference. |
| `.agents/skills/performance-goal/SKILL.md` | Referenced | Evaluator contract shape. |
| `.agents/skills/react-doctor/SKILL.md` | Not invoked | Advisory CI scan, not needed for planning. |
| `ultraqa`, `ultragoal`, `ultrawork`, `autopilot`, `autoresearch*` | Not invoked as native workflows | Their *contracts* (adversarial matrix, durable goal ledger, parallelization, evaluator-gated research) are reflected into the plan documents per the workflow-contracts section of `Creating-Plan-Prompt.md`. No native goal/ledger tool was available in this session, so durable-goal contracts are recorded as document artifacts, not native goals. |
| GitNexus / code-review-graph | Not invoked | Proportional graph policy: this audit was a broad read sweep handled by parallel `Explore` lanes; no risky symbol refactor. |

**Unavailable capabilities honestly recorded:** no native independent verifier lane and no native goal/ledger tool in this session. Verification is `emulated`; durable-goal contracts live in `11_IMPLEMENTATION_PLAN.md` as artifacts.

---

## Specialist workstreams (lanes)

| # | Lane | Mode | Status | Key findings location |
|---|---|---|---|---|
| L1 | Lead coordinator / synthesizer | same-agent | Done | All docs |
| L2 | Route + loading/error inventory | native `Explore` subagent | Done | `03_SOURCE_AND_CODEBASE_AUDIT.md` §A |
| L3 | Client-component mount/hydrate audit | native `Explore` subagent | Done | `03_SOURCE_AND_CODEBASE_AUDIT.md` §B |
| L4 | Build/test/perf tooling inventory | native `Explore` subagent | Done | `03_SOURCE_AND_CODEBASE_AUDIT.md` §C, `09_PERFORMANCE...md` |
| L5 | AI-agent rules infrastructure map | native `Explore` subagent | Done | `03_SOURCE_AND_CODEBASE_AUDIT.md` §D, `06_ARCHITECTURE...md` §F, `11_IMPLEMENTATION_PLAN.md` Phase 4 |
| L6 | Next.js 16 framework research (local docs) | lead, read-only | Done | `19_RESEARCH_REVIEW_AND_QA_EVIDENCE.md` |
| L7 | Adversarial reviewer | emulated pass | Done | `19_RESEARCH...md`, `17_FINAL_READINESS_REVIEW.md` |
| L8 | Final verifier | emulated pass | Done | `17_FINAL_READINESS_REVIEW.md` |

---

## Coordination ledger (summary)

| Lane | /goal | Owned scope | Dependencies | Findings | Decisions/Rejected | Conflicts | Evidence | Status |
|---|---|---|---|---|---|---|---|---|
| L2 | Map every route's loading/error/not-found/metadata/Suspense | `src/app/**` | none | 42 UI routes; 14 own loading.tsx; 8 own error.tsx; uneven workshop coverage; no root loading.tsx; `/invite/[token]` dynamic with no loading/error | Reject generic "add loading everywhere" — static marketing routes don't need it | none | file:line inventory | Done |
| L3 | Audit mount/hydrate patterns | `src/components/**`, providers, stores | none | 252 client files; EstimateSheet{Tree,Content} SSR'd via default dynamic with no skeleton; fetch-in-effect in share comments/activity; no useSuspenseQuery/HydrationBoundary; deliberate hover-prefetch pattern | Reject blanket `ssr:false` — modals correct; critical-path estimate chunks are the real target | none | file:line + LOC | Done |
| L4 | Inventory perf/build/test tooling | package.json, configs, scripts/, tests/, e2e/, CI | none | No production RUM; WebVitalsProbe dev-only; Playwright route-transition suite + CDP throttle exists; CI bundle budget 350KB advisory; no Lighthouse CI, no web-vitals pkg | Reject new paid telemetry as default — owner decision | none | scripts verbatim | Done |
| L5 | Map agent-rules infra | `.ai/**`, root agent files | none | New rules belong in `.ai/00_system/PERFORMANCE_LOADING_AND_MOUNT_PROTOCOL.md` (flat file, no rules/ subdir) referenced from AGENTS.md; numeric budgets already in `27-*.md` | Reject forking rules into tool adapter dirs | none | canonical-map quote | Done |
| L6 | Ground framework claims | `node_modules/next/dist/docs/` | none | `loading.js` fallback is prefetched; `staleTimes` controls warm-nav re-suspend; `unstable_instant` + Cache Components is the future instant-nav path (currently off); LCP must stay out of Suspense; CLS needs dimension-matched skeletons | Do NOT mandate Cache Components now — opt-in owner decision | none | doc quotes | Done |
| L7 | Adversarial | whole pack | L1–L6 | See `19_RESEARCH...md` adversarial matrix | none | none | findings list | Done |
| L8 | Final verify | whole pack | L1–L7 | See `17_FINAL_READINESS_REVIEW.md` | none | none | scorecard | Done |

---

## File/module ownership for this planning pass

All writes confined to `.ai/03_plans/2026-07-06-Transition-And-Loading-UX-And-UI/`. No writes outside the plan folder. No application code, tests, migrations, configs, or provider state touched.

---

## Concurrent-repository safety

`git status` at start showed unrelated modified/untracked files (brand/landing plan docs, activity UX files, `.hallmark/log.json`, `src/app/new/`, `src/components/landing-new/`). These were not touched. All planning writes are isolated to the new plan folder.
