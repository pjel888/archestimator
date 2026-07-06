# Feature Brief and Scope

**Source:** User objective (2026-07-06), verbatim intent:

> "We need to comprehensively audit the transition and loading UX and UI for our whole app. We need to be able to measure performance, benchmark speed and optimization etc and also be able to plan for proper handling when we add more features and pages. We need to be able to mount the components in the quickest and most effective and efficient way. We need to be able to apply best Next.js and React practices when it comes to quickly mounting pages and components for our whole app. So this will consist of setting up rules for the AI agents as well. **This is not a coding task, this is an audit, planning, preparation, analysis task.** Output goes in `.ai/03_plans/2026-07-06-Transition-And-Loading-UX-And-UI/`. Follow `Creating-Plan-Prompt.md` and `Multi-Agent-Execution-Directive.md`."

**Brief classification:** `planning-only`. No application code, tests, migrations, package manifests, provider state, or runtime data may be modified by this pass.

---

## Product outcome

A future implementer (human or AI agent) can, from this pack alone: (a) see exactly where the app's transition/loading UX is strong, weak, or missing; (b) pick up a measurement/benchmark harness and a set of evaluator contracts and budgets; (c) apply a single canonical rule set when adding any new page or component so that fast mounting and good loading UX are the default, not an afterthought.

## In scope

1. **App-wide transition & loading UX/UI audit** — every route segment, `loading.tsx`, `error.tsx`, `not-found.tsx`, `<Suspense>`, prefetch behavior, route-loading overlay, skeletons vs. spinners, empty/error/disabled/loading states.
2. **Mount strategy** — Server vs Client Component boundaries, `"use client"` footprint, `next/dynamic` (ssr/loading) decisions, code-splitting of heavy modules, virtualization, hydration, `useTransition`/`useDeferredValue`, TanStack Query (suspense/hydration bridge), Zustand colocated state.
3. **Performance measurement & benchmarking** — evaluator contracts, budgets, RUM/CWV telemetry gap, existing Playwright/Vitest/bundle tooling, CI gates, regression thresholds, a repeatable benchmark cadence, and a "how to measure a new feature" procedure.
4. **AI-agent rules** — a durable, repo-native rule document (location, content, enforcement) plus a forward "load this checklist when adding a page/component" procedure, integrated with the existing `.ai/` brain and the existing `27-*.md` budgets so numbers are not duplicated.
5. **Framework currency** — explicit Next.js 16 / React 19 guidance: streaming, static shell, `loading.js` prefetch, `staleTimes`, `unstable_instant` + Cache Components (evaluated as a future option), LCP/CLS/INP implications of Suspense placement.

## Out of scope (non-goals)

- Implementing any of the above in code. This pass produces the plan only.
- Mutating Cloudflare D1/R2/DO/Queue/Email/Workers state.
- Visual/design-system redesign (`DESIGN.md` is alpha, not law).
- Rewriting the estimate sheet, projects page, or library manager — characterized here as *future implementation phases*, not done in this pass.
- Selecting/paying for a new analytics/APM vendor — surfaced as owner decisions.
- Mandating Cache Components / `unstable_instant` now — evaluated, recommended as future owner-gated adoption.

## Success criteria for the planning pack

- App-wide inventory is complete and reproducible (file:line evidence).
- Every loading/transition gap is enumerated with a recommended remediation and a phase.
- A performance evaluator contract exists for every budget-bearing requirement.
- A single canonical agent-rule document is specified with exact path, content outline, and enforcement hook.
- Shadow-path matrices cover the runtime loading/transition flows.
- Requirements traceability is complete (no untraced requirement).
- No application code was modified.

## Stakeholders

- **Philip Lewis (owner):** decides RUM sink, Cache Components adoption, budget tightening, and whether the agent rules ship as proposed.
- **Future implementation agents (any vendor):** consume `11_IMPLEMENTATION_PLAN.md` and the agent-rule document.
- **End users (pre-launch closed beta):** beneficiaries of faster, more consistent loading UX.

## Constraints

- Free-tier / bundled Cloudflare posture: no paid add-ons (Workers Analytics paid, dedicated egress, paid APM) without owner approval.
- Next.js 16 + React 19 + OpenNext/Cloudflare Workers runtime (not Node/Vercel).
- Proportional verification: planning-only pass validated by static review + `git diff --check`, not by running the app.
