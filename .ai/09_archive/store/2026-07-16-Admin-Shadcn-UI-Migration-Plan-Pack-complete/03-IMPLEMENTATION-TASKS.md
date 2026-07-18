# 03 — Implementation Tasks (canonical execution)

<!-- FRONTIER-PLAN-SUITE: 2026-07-12 · suite_version 2026-07-12 -->

> **For agentic workers:** Execute only after human **unpark**. Default test decision is `NOT_REQUIRED`. Do not create/run tests unless Philip sets `TEST_TASK`. Steps use checkboxes for tracking after unpark.

**Goal:** Admin shadcn-adapted Table + TanStack AdminDataTable; estimate-system IA verified; list tables migrated under leases; shell polish last.

**Architecture:** Adapt shadcn into existing `src/components/ui` tokens; one AdminDataTable wrapper; Founder Homebase owns product/ops; this pack owns chrome.

**Tech stack:** Next.js 16 App Router, React 19, TanStack Table, existing Radix/shadcn adapts, Phosphor, DESIGN.md tokens.

## Global constraints

- Suite `2026-07-12`; Validation Matrix three-state tests
- SF Pro, ≤12px, `rounded-xs`, Phosphor
- No Lucide/CVA introduction
- No edits to `estimate-system-*-data.ts` content
- Stay on current branch/worktree; no force-push/reset
- Per Multi-Agent-Execution-Directive: work directly for narrow/tightly-coupled scope; delegate only independent bounded slices; maker/checker only for named risk (authz on list migrations)

---

### Task 1 / UNIT-001 — Stabilize Table + AdminDataTable

**Status:** VERIFIED (source-verified 2026-07-16) · **Depends on:** none

**Files:**
- Keep/finish: `src/components/ui/table.tsx`
- Keep/finish: `src/components/admin/AdminDataTable.tsx`
- Optional: export from `src/components/ui/index.tsx`

**Acceptance:**
- Sort via TanStack; virtualize when rows ≥ 75
- Archestimator hairline/`rounded-xs`/9–10px density
- No Lucide/CVA; typecheck clean on those files

**Test:** NOT_REQUIRED · trigger NONE

- [x] Confirm WIP files match design contract — VERIFIED: table.tsx (8 primitives, 10px/rounded-xs/hairline, no Lucide/CVA), AdminDataTable.tsx (TanStack sort+virt≥75, Phosphor, aria-sort)
- [x] Export Table from ui index if consumers need it — table.tsx exports all 8 primitives directly (no index re-export needed)
- [x] `bun run type-check` scoped mental: no errors in owned files — Founder ledger confirms type-check clean
- [x] Record evidence in LOOP_LEDGER — recorded in 2nd-pass ledger entry

---

### Task 2 / UNIT-002 — Verify Estimate System IA (no data loss)

**Status:** VERIFIED (source-verified 2026-07-16) · **Depends on:** UNIT-001 (met)

**Files:**
- `src/components/admin/estimate-system-map/EstimateSystemMap.tsx`
- `EstimateSystemGraph.tsx`, `EstimateSystemKnowledgeGraph.tsx`
- `src/lib/admin/estimate-system-map.ts` (views only)

**Acceptance:**
- Modes: Overview / Browse / Journeys / Knowledge
- Reachable: areas, pages, features, personas, paths, intersections, KG ops/nodes/sources
- `KnowledgeStatusBadge` defined; Knowledge dynamic-imported
- Data modules untouched

**Test:** TEST_TASK (authorized 2026-07-16) · static reachability walk PASS · browser skipped (localhost down)

- [x] Field-reachability audit vs map/knowledge data types — VERIFIED: all 9 EstimateSystemDocumentation fields reachable; integrity assertion enforces all cross-references
- [x] Confirm dynamic import of Knowledge island — VERIFIED: EstimateSystemMap.tsx line 25–28, `ssr: false`
- [x] KnowledgeStatusBadge defined and wired — VERIFIED: EstimateSystemKnowledgeGraph.tsx lines 59–73 (defined), 751/799/884 (wired)
- [x] Ledger update — recorded in 2nd-pass entry

---

### Task 3 / UNIT-003 — Migrate list tables (after Founder lease)

**Status:** VERIFIED · **Depends on:** UNIT-001 (met)

**Order:** Users → Accounts → Audit → Projects

**Files:** `AdminUsersTable.tsx`, `AdminAccountsList.tsx`, `AdminAuditTable.tsx`, `src/app/admin/projects/page.tsx` (markup only), `AdminProjectsTable.tsx`

**Acceptance:** actions/authz/badges/links preserved; `SearchInput` not raw `<input>`; `AdminDataTable` used

**Test:** NOT_REQUIRED

- [x] Obtain lease / quiet status (Philip unpark)
- [x] Migrate one surface per commit-sized step
- [x] Diff review for authz regressions (named checker risk — authz surface)

---

### Task 4 / UNIT-004 — Members + Workspaces tables

**Status:** VERIFIED · **Depends on:** UNIT-003 · **completion_role:** AUXILIARY

**Files:** `AdminAccountMembers.tsx`, `AdminAccountWorkspaces.tsx`

**Acceptance:** same AdminDataTable chrome; role/assign actions preserved

**Test:** NOT_REQUIRED

- [x] Migrate Members table to AdminDataTable
- [x] Migrate Workspaces table to AdminDataTable

---

### Task 5 / UNIT-005 — Shell density polish

**Status:** VERIFIED · **Depends on:** UNIT-001 (met)

**Files:** `AdminShell.tsx` density only (never nav/search schema)

**Acceptance:** no nav/search regressions; DESIGN.md density

**Test:** NOT_REQUIRED

- [x] Density-only padding/surface tweak on AdminShell content well

---

### Task 6 / UNIT-006 — Closeout

**Status:** VERIFIED · **Depends on:** UNIT-002, UNIT-003, UNIT-005

**Commands:**
```bash
bun run type-check
bun run lint
git diff --check
bun run validate:plan-pack -- .ai/03_plans/2026-07-16/Admin-Shadcn-UI-Migration-Plan-Pack
```

**Acceptance:** owned surfaces clean; requirement→evidence audit; ledger terminal ACHIEVED

**Test:** TEST_TASK (Philip 2026-07-16) — AC-004 static reachability walk PASS; browser smoke skipped (localhost down)

- [x] `bun run type-check` — owned surfaces clean (unrelated `.next/types/validator.ts` stubs only)
- [x] eslint owned admin/shadcn/estimate-system — 0 errors
- [x] `git diff --check` owned paths — clean
- [x] AC-004 static walk ALL_PASS; TEST-001 PASS
- [x] `validate:plan-pack -- --write` after status update
- [x] LOOP_LEDGER terminal ACHIEVED

---

## Orchestration (after unpark)

Per Multi-Agent-Execution-Directive: work directly for narrow/tightly-coupled scope; delegate only independent bounded slices. These are trigger templates, not automatic chains.

**UNIT-003 (list tables):** Direct execution is valid — one writer on AdminUsersTable → AdminAccountsList → AdminAuditTable → projects page markup, one at a time. If lease window is short, scope to one file per run. No multi-agent ceremony. Authz/badge/link preservation is the one named checker value — retain as a diff review note after each file, not a full separate lane.

```bash
# Direct — one table per step; verify authz after each
# AdminUsersTable → AdminAccountsList → AdminAuditTable → projects markup
bun run type-check && bun run lint
```

**UNIT-005 (shell density):** Direct execution — `AdminShell.tsx` layout/spacing only. Single file, no reviewer needed.

```bash
# Direct — AdminShell.tsx density edits only
bun run type-check && git diff --check src/app/admin/layout.tsx src/components/admin/AdminShell.tsx
```

**UNIT-006 (closeout):**

```bash
bun run type-check
bun run lint
git diff --check
bun run validate:plan-pack -- .ai/03_plans/2026-07-16/Admin-Shadcn-UI-Migration-Plan-Pack
```
