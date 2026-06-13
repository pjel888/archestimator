# Estimates List Page — Performance & Quality Optimization

**Route audited:** `/workshop/projects/[projectId]/estimates`
**Live URL:** `http://localhost:3000/workshop/projects/22222222-2222-4222-8222-222222222222/estimates`
**Date:** 2026-06-14
**Type:** Audit + implementation plan pack (no product code changed during planning)
**Status:** NEEDS PLAN-REPAIR GATE BEFORE IMPLEMENTATION

> 2026-06-14 repair note: independent implementation, QA, and architecture review
> lanes found this pack directionally correct but not yet safe to execute as-is.
> Do not start P0 until the mandatory pre-phase in `06_IMPLEMENTATION_PLAN.md`
> and the blockers in `08_PREIMPLEMENTATION_REVIEW_AND_REPAIR.md` are resolved.

---

## Why this exists

The user reports the page is "extremely slow and full of loading screens even with basic CRUD operations." This package answers, with file:line evidence, **why** that is true, **how to measure it objectively**, and **exactly what to change** to fix it — sequenced by felt-impact × risk.

---

## The single most important finding (read this first)

The audited project (`22222222…`) contains **1 estimate, 47 nodes, 5 row-items** (see `02_AUDIT_DATABASE.md` §E). At that volume, raw query time is trivial. **The felt slowness today is not data volume.** It is three architectural defects:

1. **A global full-screen blur+spinner overlay (`RouteLoadingOverlay`) fires on _every_ `router.refresh()`** with a hard 250 ms minimum display, and `router.refresh()` does not change the pathname so the overlay is only dismissed by that 250 ms floor timer — not by content arriving. Every create / duplicate / delete / inline rename / budget edit / even "reset column widths" calls `router.refresh()`. → `03_AUDIT_UX_UI.md`.
2. **No client data store → no optimistic UI.** `estimates` is an immutable server prop, so every mutation must round-trip the server _and_ re-render the entire layout+page tree before the change is visible. → `01_AUDIT_PERFORMANCE_AND_WATERFALL.md` §E.
3. **The route skeleton does not match the page.** `ProjectRouteContentFallback` renders a sidebar + 2-column grid + right rail (the node-route shape); the estimates page is a search box + toolbar + wide table. First paint flashes the wrong layout, then snaps. → `03_AUDIT_UX_UI.md` §(a)/(e).

The database aggregation work (pulling **all** nodes + **all** row-items of **every** estimate to compute counts/totals in JavaScript) is a **scaling cliff** — invisible at 5 rows, linear-blowup at thousands — and a **security over-fetch** (`select("*")`). It is cheap to fix and belongs in the plan, but it is **not** the cause of today's felt latency. Sequencing the plan by category would fix the wrong thing first; this plan sequences by felt-impact.

---

## Document map

| Doc | Contents |
|-----|----------|
| `00_INDEX.md` | This file — executive summary, prioritized findings, document map |
| `01_AUDIT_PERFORMANCE_AND_WATERFALL.md` | Rendering mode, server waterfall, round-trip count, caching, revalidation double-fetch, CRUD latency chain, streaming verdict |
| `02_AUDIT_DATABASE.md` | Schema, full index inventory, aggregation-RPC design, RLS cost, data volume, over-fetch |
| `03_AUDIT_UX_UI.md` | Loading-state inventory, per-operation CRUD UX, optimistic-update opportunities, CLS/jank, a11y |
| `04_AUDIT_INFOSEC.md` | Severity-ranked authZ / data-exposure / headers / rate-limit findings, what RLS already mitigates |
| `05_MEASUREMENT_METHODOLOGY.md` | How to measure everything: server timing, EXPLAIN ANALYZE, Web Vitals/RUM, HAR, RSC payload, repeatable before/after harness, acceptance thresholds |
| `06_IMPLEMENTATION_PLAN.md` | Bite-sized TDD task plan, now sequenced P-1→P3 so the row DTO/reconciliation contract exists before optimistic state |
| `07_DECISIONS_AND_OPEN_QUESTIONS.md` | Resolved design decisions + the few owner calls required before/within implementation |
| `08_PREIMPLEMENTATION_REVIEW_AND_REPAIR.md` | Independent review synthesis, BLOCK findings, and mandatory repairs before execution |
| `09_TRACEABILITY_AND_QA_MATRIX.md` | Finding-to-task-to-evidence matrix, adversarial QA scenarios, and rollback gates |

---

## Prioritized findings (consolidated)

Severity legend: 🔴 felt-latency / live issue · 🟠 scaling-cliff / security · 🟡 hardening / defense-in-depth.

| # | Finding | Sev | Dimension | Doc |
|---|---------|-----|-----------|-----|
| F1 | Global blur overlay fires on every `router.refresh()`; 250 ms min, dismissed by timer not content | 🔴 | UX | 03 |
| F2 | No client store → no optimistic UI; every CRUD = full server re-render before visible | 🔴 | UX/Perf | 03,01 |
| F3 | Inline edits (rename/notes/budget/auto-code) call `router.refresh()` despite the action already returning the updated row | 🔴 | UX/Perf | 03 |
| F4 | Route skeleton (`ProjectRouteContentFallback`) layout ≠ estimates page → wrong-shape flash, CLS | 🔴 | UX | 03 |
| F5 | `ProjectLayout` awaits collaboration+publication+sheets fan-out before the shell paints; page skeleton gated behind layout data | 🔴 | Perf | 01 |
| F6 | `ensureDefaultWorkspace` not wrapped in `cache()` → workspace lookup runs 3×/render | 🟠 | Perf | 01 |
| F7 | `getProjectCollaborationSummary` / `…PublicationSummary` re-query `projects` + `workspace_members` already resolved upstream | 🟠 | Perf | 01 |
| F8 | `listProjectEstimates` pulls ALL nodes + ALL row-items of every estimate to count/sum in JS — no SQL aggregate, no pagination (scaling cliff) | 🟠 | DB/Perf | 02,01 |
| F9 | `estimates.select("*")` ships `created_by`, `metadata`, `assumptions`, `workspace_id` etc. to the client (over-fetch + data exposure) | 🟠 | DB/Infosec | 02,04 |
| F10 | RLS helpers (`can_access_estimate`, `current_project_access_rank`, `is_workspace_member`) use bare `auth.uid()`, not `(select auth.uid())` initplan caching — per-row tax that grows with estimate size | 🟠 | DB | 02 |
| F11 | Create = 2 sequential server round-trips (action POST → `router.refresh()` full re-render) with no optimistic insert | 🔴 | Perf/UX | 01,03 |
| F12 | `revalidateProjectEstimatePaths` (3 paths) **and** `router.refresh()` both fire on create/duplicate/delete | 🟡 | Perf | 01 |
| F13 | No `error.tsx` on the list route; `throw error` surfaces raw PG errors (dev leak) | 🟡 | Infosec/UX | 04,03 |
| F14 | No CSP / `X-Frame-Options` / `X-Content-Type-Options` on `/workshop/*` | 🟡 | Infosec | 04 |
| F15 | Create/rename/duplicate sheet actions skip `can_edit_estimate` (RLS-enforced, but app-layer DiD gap, obs 4408) | 🟡 | Infosec | 04 |
| F16 | No rate-limit on create/duplicate; `generateNextEstimateSheetCode` read-then-write race (mitigated by insert-retry) | 🟡 | Infosec | 04 |

**Not a problem (verified clean / already good):** indexes serve every list query (no missing-index seq scans — 02 §B); `getUser()` (not `getSession()`) used everywhere; no BOLA/BFLA reachable (RLS `with check` enforces); CSRF protected by Next server-action framework; filler-row table height prevents row-count CLS; hover-prefetch makes warm navigation fast; client-side search is correct.

---

## What "done" looks like (acceptance gate → `05` + `06`)

- A repeatable measurement harness produces a **baseline** and **after** number for: TTFB, FCP, LCP, INP, Supabase round-trips/load, RSC payload bytes, and a "create→visible" stopwatch.
- P0 ships: inline edits and create/delete feel instant (optimistic), no full-screen blur on in-place mutations, skeleton matches the page.
- P1 ships: shell + table skeleton paint immediately (layout streamed), redundant workspace/project queries removed.
- P2 ships: one aggregation RPC replaces the all-rows JS fold; `select("*")` → explicit safe columns; RLS initplan caching applied — verified by EXPLAIN ANALYZE before/after.
- P3 ships: `error.tsx`, workshop security headers, edit-authZ on sheet actions.
- Every change has a failing-test-first step and a measured delta.

## 2026-06-14 added guardrails

The plan is no longer allowed to optimize the UI before it freezes the data
contract. Required additions before implementation:

1. Extract a dedicated `ProjectEstimateListRow` DTO shared by the repository,
   server actions, client store, and table. Do not import `Tables<"estimates">`
   into the client list row.
2. Make create, duplicate, update, and regenerate return the canonical list row
   needed for reconciliation. Do not fabricate canonical rows from partial ids.
3. Add optimistic-store conflict policy for action rejection, external reseed,
   concurrent mutation, active search filters, and double-submit.
4. Expand measurement beyond create/rename/delete to include duplicate,
   auto-generate code, reset column widths, search-active mutations, and
   read-only collaborator denials.
5. Add phase-level rollback/backout notes and a temporary cutover gate for the
   optimistic list path.
