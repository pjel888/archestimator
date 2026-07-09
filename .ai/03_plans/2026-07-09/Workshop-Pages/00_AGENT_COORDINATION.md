# 00 — Agent Coordination

## Master /goal

**Outcome.** Workshop cross-page navigation (`/workshop` ↔ `/workshop/proposals` ↔ `/workshop/projects` ↔ `/workshop/library` ↔ `/workshop/publisher` ↔ `/workshop/settings`) feels instant and shell-stable: the persistent chrome (sidebar, header, footer) does not unmount/remount/flash, and the smallest possible loading state shows only for the content actually streaming.

**Problem being solved.** The user observes that the `/workshop` dashboard skeleton still appears when loading `/workshop/proposals`, and suspects the nested URL is the cause. The audit shows the URL shape is *not* the cause; the real causes are (1) chrome rendered per-page instead of per-layout, (2) the auth-gate layout reading uncached request data, (3) page-load-vs-client-nav Suspense boundary differences.

**Planning scope.** Routing architecture, layout/shell ownership, loading/skeleton strategy, prefetch/cache config, and the flat-vs-nested-vs-route-groups question. Produce doc-cited evidence and an implementation-ready phased plan.

**Non-goals.** No code changes (planning-only). No DB/migration/provider/auth-gate-logic changes. No marketing/share/invite route changes. No Git branch/worktree ops.

**Required codebase analysis.** Full `/workshop` route tree; all `layout.tsx`/`loading.tsx`/`error.tsx`; `WorkshopPageShell`, `StaticWorkshopLoadingShell`, `MainSidebar`; root `layout.tsx` + `providers.tsx`; `middleware.ts`/`request-proxy.ts`; `next.config.ts`; `package.json` versions.

**Implementation-readiness criteria.** Every task has exact paths/symbols; root cause doc-cited; performance evaluator defined; flat/nested/groups decision resolved with rejected alternatives; auth/terms gate behavior preserved across any layout restructuring.

**Validation criteria.** Local-doc citations for every framework-behavior claim; performance evaluator contract (baseline, target, harness, regression threshold).

**Final deliverables.** This plan pack (`CONDITIONALLY READY` — behavior-bearing + emulated verification; see `17_FINAL_READINESS_REVIEW.md`).

---

## Orchestration used

**verification_mode: `emulated`.** Two read-only lanes were dispatched concurrently (one codebase-architecture Explore lane, one Next.js-docs research lane), plus the lead synthesized and independently spot-checked the load-bearing claims (layout content, shell component, sidebar component, proposals page/loading, next.config, RouteLoadingOverlay). True independent verification by a separate native agent was not separately dispatched for final sign-off; the readiness cap in `17_FINAL_READINESS_REVIEW.md` reflects this.

| Lane | Role | Status | Key evidence |
|---|---|---|---|
| Lead (this agent) | Scope, synthesize, write pack, spot-verify | Done | Direct reads of layout.tsx, WorkshopPageShell, StaticWorkshopLoadingShell, MainSidebar, proposals page/loading, next.config.ts, route-loading-overlay |
| Explore lane | Workshop routing architecture audit | Done | `03_SOURCE_AND_CODEBASE_AUDIT.md` §1–9 |
| Research lane | Next.js 16 local + official docs | Done | `19_RESEARCH_REVIEW_AND_QA_EVIDENCE.md`; citations embedded in `03` and `06` |

## Skills / repository instructions used
- `AGENTS.md` (Lean Agent Workflow, proportional verification, Next.js 16 doc-reading rule, no auto-branch).
- `archestimator-plan-pack` SKILL (dated `.ai/03_plans/<date>-<slug>/` convention; `standard` profile).
- `Creating-Plan-Prompt.md` + `Multi-Agent-Execution-Directive.md` (suite authority model, readiness labels, verification caps).

## Skills NOT used (and why)
- `ultrawork`/`ultragoal`/`autopilot` — this is planning-only; an in-session plan pack is the correct surface. Named as reference only.
- GitNexus impact tools — narrow, well-understood edit surface; `rg` + targeted reads were sufficient and cheaper (per AGENTS.md proportional-graph policy).
- Playwright/visual QA — planning-only task; no browser-only claim to prove here. Future implementation phases that touch interaction may need it (flagged in `12_TEST…`).

## Source authority decisions
- **Next.js behavior claims:** governed by local installed docs `node_modules/next/dist/docs/` (exact 16.2.10 install), supplemented by official `nextjs.org`. These overrule memory for version-sensitive behavior.
- **Current architecture:** governed by current source (re-read immediately before writing).
- **URL-shape decision:** product/intent question → recommended with rationale, flagged for owner sign-off (`DEC-01`).
