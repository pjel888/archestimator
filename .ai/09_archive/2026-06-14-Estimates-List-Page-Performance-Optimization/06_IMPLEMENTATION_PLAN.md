# Estimates List Page — Performance & Quality Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Per repo CLAUDE.md, run `gitnexus_impact` / code-review-graph impact analysis before editing any symbol named below, and `gitnexus_detect_changes` before each commit.

**Goal:** Make `/workshop/projects/[projectId]/estimates` feel instant for navigation and CRUD, and remove the per-row data/security scaling cliff — without changing what the page does.

**Architecture:** Three layered fixes, sequenced by felt-impact × risk. (P0) Introduce a client estimates store to enable optimistic CRUD and eliminate the global blur overlay on in-place mutations; fix the mismatched skeleton. (P1) Stop the layout from blocking the shell and remove redundant auth/workspace round-trips. (P2) Replace the all-rows JS aggregation with one Postgres RPC, project explicit columns, and add RLS initplan caching. (P3) Hardening: list-route `error.tsx`, workshop security headers, edit-authZ on sheet actions.

**Tech Stack:** Next.js App Router (RSC + server actions), React 19, Zustand, TanStack Query, Supabase/Postgres (RLS), TypeScript. Tests: vitest (jsdom) via `bun run test:dom`, Playwright via `bun run test:e2e`, bun unit via `bun test tests/unit`. Node: nvm v25.8.0.

**Before you start:** this plan now has a mandatory P-1 entry gate for P0.
Do not start P0 optimistic UI work until the P-1 exit state is captured:
P-1.1 through P-1.3 are green, and P-1.4 has intentionally inverted the stale
refresh tests with the expected red output recorded. P-1.4 is failure-first test
work, not a green implementation gate; P0 is responsible for turning those
inverted tests green. Then capture the baseline per
`05_MEASUREMENT_METHODOLOGY.md` and commit it to `metrics/`. No task is "done"
until its acceptance-table row (`05`) is captured before-and-after.

---

## File structure (what gets created / modified)

**Create:**
- `src/lib/estimates/project-estimate-list-row.ts` — canonical client/server DTO for estimate-list rows
- `src/lib/perf/server-timing.ts` — dev-only `traced()` round-trip instrumentation (measurement scaffolding)
- `src/components/workshop/WebVitalsProbe.tsx` — dev-gated Web Vitals logger
- `src/stores/project-estimates-store.ts` — client store holding the estimates list (the optimistic-UI unlock)
- `src/components/workshop/ProjectEstimatesListSkeleton.tsx` — table-shaped skeleton matching the page
- `src/app/workshop/projects/[projectId]/estimates/error.tsx` — list-route error boundary
- `supabase/migrations/<ts>_project_estimate_list_summaries_rpc.sql` — aggregation RPC
- `supabase/migrations/<ts>_rls_initplan_auth_uid.sql` — `(select auth.uid())` rewrite of estimate-access helpers
- Tests: `tests/vitest/project-estimates-store.test.ts`, `tests/vitest/project-estimate-list-summaries-parity.test.ts`, `e2e/estimates-crud-latency.spec.ts`, `scripts/prove-estimate-list-summaries-postgres.mjs`

**Modify:**
- `src/lib/estimates/actions.ts` — make create/duplicate/update/regenerate return canonical list-row payloads for reconciliation
- `src/lib/repositories/workspace-repository.ts` — map selected DB rows/RPC summaries into the canonical DTO
- `src/components/workshop/ProjectEstimatesClient.tsx` — consume store, optimistic create
- `src/components/workshop/ProjectEstimatesTable.tsx` — optimistic rename/notes/budget/duplicate/delete; drop `router.refresh()` calls; remove reset-widths refresh
- `src/hooks/use-navigation-router.ts` — add overlay-free `silentRefresh`
- `src/app/workshop/projects/[projectId]/estimates/loading.tsx` — use the new skeleton
- `src/app/workshop/projects/[projectId]/layout.tsx` — stream summaries behind Suspense
- `src/lib/repositories/workspace-repository.ts` — `cache()` `ensureDefaultWorkspace`; explicit columns; pass project into summary fns; swap to RPC
- `next.config.ts` — workshop security headers
- `src/lib/estimates/actions.ts` — `assertCanEditEstimate` in sheet actions

---

# PHASE P-1 — Mandatory P0 entry gate. Do this before P0.

Independent review found the original draft optimized the UI before freezing the
client/server row contract. That can fabricate rows from partial action returns,
erase pending optimistic rows on a prop reseed, or keep leaking full
`Tables<"estimates">` fields into the client. P-1 fixes that first.

### Task P-1.1: Extract canonical `ProjectEstimateListRow` DTO

**Files:**
- Create: `src/lib/estimates/project-estimate-list-row.ts`
- Modify: `src/components/workshop/ProjectEstimatesTable.tsx`
- Modify: `src/components/workshop/ProjectEstimatesClient.tsx`
- Test: `tests/vitest/project-estimate-list-row-contract.test.ts`

- [ ] **Step 1: Write the failing contract test** — assert the exported row
  type/module does not import `Tables<"estimates">`, does not include
  `metadata`, `created_by`, `workspace_id`, or `assumptions`, and includes only
  list-rendered/reconciliation fields: `id`, `project_id`, `name`,
  `sheet_code`, `currency_code`, `notes`, `project_budget`, `created_at`,
  `updated_at`, `firstNodeId`, `nodeCount`, `rowItemCount`,
  `totalProjectCost`, plus optional client-only pending/error metadata.
- [ ] **Step 2: Run → fail** — current table row type is
  `Tables<"estimates"> & { ... }` in `ProjectEstimatesTable.tsx`.
- [ ] **Step 3: Implement the DTO** and update table/client imports to use it.
  Keep the current behavior otherwise unchanged.
- [ ] **Step 4: Run → pass**:
  `bun run test:dom -- project-estimate-list-row-contract project-estimates-client-create project-estimates-table-inline-edit`.

### Task P-1.2: Canonical action reconciliation payloads

**Files:**
- Modify: `src/lib/estimates/actions.ts`
- Modify: `src/lib/repositories/workspace-repository.ts`
- Test: `tests/vitest/project-estimate-list-action-payload.test.ts`

- [ ] **Step 1: Write failing tests** — `createEstimateSheetDraft`,
  `duplicateEstimateSheet`, `updateEstimateDetails`, and
  `regenerateEstimateSheetCode` must return a canonical `ProjectEstimateListRow`
  or `{ row: ProjectEstimateListRow }` payload. The test must fail against the
  current create return shape `{ estimateId, areaNodeId, sheetCode }`.
- [ ] **Step 2: Add a mapper** that builds `ProjectEstimateListRow` from a
  selected estimates row plus aggregate summary. For create and duplicate,
  compute known summary fields from the mutation result (`firstNodeId`, initial
  node/row counts, total). For update/regenerate, reuse the returned canonical
  estimate record and preserve unchanged summary fields from the client row
  unless the action changed them.
- [ ] **Step 3: Do not fabricate server-canonical fields in the client.** The
  client may create temp placeholders, but successful reconciliation must use
  the action's canonical row payload.
- [ ] **Step 4: Run → pass**:
  `bun run test:dom -- project-estimate-list-action-payload`.

### Task P-1.3: Optimistic-store conflict policy and cutover gate

**Files:**
- Create: `src/stores/project-estimates-store.ts`
- Test: `tests/vitest/project-estimates-store.test.ts`
- Optional temporary gate: a local adapter/switch in `ProjectEstimatesClient.tsx`

- [ ] **Step 1: Expand the store tests before implementation** to cover:
  action rejection rollback, external prop reseed while a temp row is pending,
  concurrent rename + duplicate, duplicate double-submit, search-active create,
  delete rollback, and canonical server row differing from optimistic draft.
- [ ] **Step 2: Implement pending mutation metadata** keyed by temp id/action id.
  `reseed(rows)` may update settled rows but must not erase pending optimistic
  rows until their action resolves or fails.
- [ ] **Step 3: Add a reversible cutover gate** so the P0 optimistic path can be
  reverted without touching P1/P2. This can be a tiny local adapter or boolean
  constant removed after P0 final QA. It must not become a permanent product
  feature flag.
- [ ] **Step 4: Add phase rollback notes** to the commit body or evidence log:
  how to revert P0 without reverting DB migrations, and how to keep the old
  refresh path alive if the optimistic gate is disabled.

### Task P-1.4: Invert stale refresh-preserving tests

**Files:**
- Modify: `tests/vitest/project-estimates-client-create.test.tsx`
- Modify: `tests/vitest/project-estimates-table-inline-edit.test.tsx`

- [ ] **Step 1: Change tests that currently expect refresh** to fail until no
  overlay/no refresh is true:
  - `project-estimates-client-create.test.tsx:84,104`
  - `project-estimates-table-inline-edit.test.tsx:159,193,213,265`
- [ ] **Step 2: Add assertions that `show("refresh")`/`router.refresh()` is not
  called for create, inline name/notes/budget, duplicate, auto-code, delete, and
  reset widths.
- [ ] **Step 3: Capture the expected red output.** These tests must fail before
  P0 code changes and pass after P0. Completion for P-1.4 means the tests are
  inverted and intentionally red against the current implementation, with the
  red output captured in the P-1 evidence log. P0 owns the green implementation.

---

# PHASE P0 — Felt latency (UX). Ships first; highest perceived win, lowest risk.

> **Owner decision required before P0** (see `07_DECISIONS_AND_OPEN_QUESTIONS.md` Q1): confirm the optimistic-store approach over alternatives. Default = proceed.

### Task P0-0: Measurement scaffolding + baseline capture

**Files:**
- Create: `src/lib/perf/server-timing.ts`
- Create: `src/components/workshop/WebVitalsProbe.tsx`
- Create: `metrics/` baseline artifacts (committed)

- [ ] **Step 1: Create the server timing helper**

```ts
// src/lib/perf/server-timing.ts
const ENABLED = process.env.PERF_TRACE === "1";

export async function traced<T>(label: string, fn: () => Promise<T>): Promise<T> {
  if (!ENABLED) return fn();
  const start = performance.now();
  try {
    return await fn();
  } finally {
    console.log(`[perf] ${label} ${(performance.now() - start).toFixed(1)}ms`);
  }
}
```

- [ ] **Step 2: Create the Web Vitals probe**

```tsx
// src/components/workshop/WebVitalsProbe.tsx
"use client";
import { useReportWebVitals } from "next/web-vitals";

export function WebVitalsProbe() {
  useReportWebVitals((m) => {
    if (process.env.NEXT_PUBLIC_PERF_TRACE !== "1") return;
    console.log(`[vitals] ${m.name} ${Math.round(m.value)} (${m.id})`);
  });
  return null;
}
```

- [ ] **Step 3: Wrap the `listProjectEstimates` + layout summary awaits in `traced(...)`** (temporary), mount `WebVitalsProbe` in `WorkshopPageShell`. Reference `05` §1/§3 for exact wrap sites.

- [ ] **Step 4: Capture baseline.** Run `PERF_TRACE=1 bun run dev`, load the page through the user's Chrome session, and record per `05`: round-trip count (`grep -c '^\[perf\]'`), server think time, TTFB/FCP/LCP/INP/CLS, a HAR, and the create→visible stopwatch. Save under `metrics/baseline-*`.

Expected: round-trip count ≈ 22–28; overlay visible ≥250 ms on every CRUD op.

- [ ] **Step 5: Commit**

```bash
git add src/lib/perf/server-timing.ts src/components/workshop/WebVitalsProbe.tsx metrics/
git commit -m "chore(perf): add measurement scaffolding and capture estimates-list baseline"
```

---

### Task P0-1: Client estimates store (the optimistic-UI unlock)

**Files:**
- Create: `src/stores/project-estimates-store.ts`
- Test: `tests/vitest/project-estimates-store.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// tests/vitest/project-estimates-store.test.ts
import { describe, expect, it } from "vitest";
import { createProjectEstimatesStore } from "@/stores/project-estimates-store";
import type { ProjectEstimateListRow } from "@/lib/estimates/project-estimate-list-row";

const row = (id: string, name = "A"): ProjectEstimateListRow => ({
  id, project_id: "p", name, sheet_code: "EST-001",
  created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-01T00:00:00Z",
  currency_code: "PHP", notes: null, project_budget: null,
  firstNodeId: null, nodeCount: 0, rowItemCount: 0, totalProjectCost: 0,
});

describe("project-estimates-store", () => {
  it("seeds from server rows", () => {
    const s = createProjectEstimatesStore([row("1")]);
    expect(s.getState().estimates).toHaveLength(1);
  });
  it("reseeds settled rows when server data changes", () => {
    const s = createProjectEstimatesStore([row("1")]);
    s.getState().reseed([row("2")]);
    expect(s.getState().estimates.map((e) => e.id)).toEqual(["2"]);
  });
  it("does not erase a pending optimistic insert during external reseed", () => {
    const s = createProjectEstimatesStore([row("1")]);
    s.getState().insertOptimistic(row("temp-1", "Creating..."));
    s.getState().reseed([row("2")]);
    expect(s.getState().estimates.map((e) => e.id)).toEqual(["temp-1", "2"]);
  });
  it("optimistically inserts then reconciles by temp id", () => {
    const s = createProjectEstimatesStore([]);
    s.getState().insertOptimistic(row("temp-1", "Creating…"));
    expect(s.getState().estimates).toHaveLength(1);
    s.getState().reconcileInsert("temp-1", row("real-1", "EST-002 Estimate"));
    expect(s.getState().estimates.map((e) => e.id)).toEqual(["real-1"]);
  });
  it("rolls back a failed optimistic insert", () => {
    const s = createProjectEstimatesStore([]);
    s.getState().insertOptimistic(row("temp-1"));
    s.getState().rollbackInsert("temp-1");
    expect(s.getState().estimates).toHaveLength(0);
  });
  it("optimistically removes then rolls back on failure", () => {
    const s = createProjectEstimatesStore([row("1"), row("2")]);
    const restore = s.getState().removeOptimistic(["1"]);
    expect(s.getState().estimates.map((e) => e.id)).toEqual(["2"]);
    restore();
    expect(s.getState().estimates.map((e) => e.id).sort()).toEqual(["1", "2"]);
  });
  it("patches a field by id (rename/notes/budget)", () => {
    const s = createProjectEstimatesStore([row("1", "Old")]);
    s.getState().patch("1", { name: "New" });
    expect(s.getState().estimates[0].name).toBe("New");
  });
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `bun run test:dom -- project-estimates-store`
Expected: FAIL — `@/stores/project-estimates-store` not found.

- [ ] **Step 3: Implement the store**

```ts
// src/stores/project-estimates-store.ts
import { createStore } from "zustand/vanilla";
import type { ProjectEstimateListRow } from "@/lib/estimates/project-estimate-list-row";

export type { ProjectEstimateListRow };

type State = {
  estimates: ProjectEstimateListRow[];
  pendingInsertIds: Set<string>;
  reseed: (rows: ProjectEstimateListRow[]) => void;
  insertOptimistic: (row: ProjectEstimateListRow) => void;
  reconcileInsert: (tempId: string, row: ProjectEstimateListRow) => void;
  rollbackInsert: (tempId: string) => void;
  removeOptimistic: (ids: string[]) => () => void; // returns rollback
  patch: (id: string, patch: Partial<ProjectEstimateListRow>) => void;
};

export function createProjectEstimatesStore(initial: ProjectEstimateListRow[]) {
  return createStore<State>((set, get) => ({
    estimates: initial,
    pendingInsertIds: new Set(),
    reseed: (rows) =>
      set((s) => {
        const pendingRows = s.estimates.filter((e) => s.pendingInsertIds.has(e.id));
        return { estimates: [...pendingRows, ...rows] };
      }),
    insertOptimistic: (row) =>
      set((s) => ({
        estimates: [row, ...s.estimates],
        pendingInsertIds: new Set(s.pendingInsertIds).add(row.id),
      })),
    reconcileInsert: (tempId, row) =>
      set((s) => {
        const pendingInsertIds = new Set(s.pendingInsertIds);
        pendingInsertIds.delete(tempId);
        return {
          pendingInsertIds,
          estimates: s.estimates.map((e) => (e.id === tempId ? row : e)),
        };
      }),
    rollbackInsert: (tempId) =>
      set((s) => {
        const pendingInsertIds = new Set(s.pendingInsertIds);
        pendingInsertIds.delete(tempId);
        return {
          pendingInsertIds,
          estimates: s.estimates.filter((e) => e.id !== tempId),
        };
      }),
    removeOptimistic: (ids) => {
      const prev = get().estimates;
      set({ estimates: prev.filter((e) => !ids.includes(e.id)) });
      return () => set({ estimates: prev });
    },
    patch: (id, patch) =>
      set((s) => ({ estimates: s.estimates.map((e) => (e.id === id ? { ...e, ...patch } : e)) })),
  }));
}
```

This snippet is the minimum shape; P-1.3's full conflict matrix is the contract
for pending duplicate, delete, patch, and search-active behavior.

- [ ] **Step 4: Run tests to confirm pass**

Run: `bun run test:dom -- project-estimates-store`
Expected: PASS (7 tests plus the P-1.3 conflict-matrix tests).

- [ ] **Step 5: Commit**

```bash
git add src/stores/project-estimates-store.ts tests/vitest/project-estimates-store.test.ts
git commit -m "feat(estimates): add client estimates store for optimistic CRUD"
```

---

### Task P0-2: Add overlay-free `silentRefresh` to the navigation router

The overlay must stop firing on in-place mutations. After P0-3..P0-6 most refreshes are removed; for any reconciliation that still needs server data without navigation, use a refresh that does **not** call `show()`.

**Files:**
- Modify: `src/hooks/use-navigation-router.ts`
- Test: `tests/vitest/use-navigation-router.test.ts` (create)

- [ ] **Step 1: Write the failing test**

```ts
// tests/vitest/use-navigation-router.test.ts
import { describe, expect, it, vi } from "vitest";

const refresh = vi.fn();
const show = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh, push: vi.fn(), replace: vi.fn() }) }));
vi.mock("@/stores/navigation-ui-store", () => ({ useNavigationUiStore: (sel: any) => sel({ show }) }));

import { renderHook } from "@testing-library/react";
import { useNavigationRouter } from "@/hooks/use-navigation-router";

describe("useNavigationRouter", () => {
  it("refresh() shows the overlay", () => {
    const { result } = renderHook(() => useNavigationRouter());
    result.current.refresh();
    expect(show).toHaveBeenCalledWith("refresh");
    expect(refresh).toHaveBeenCalled();
  });
  it("silentRefresh() refreshes WITHOUT showing the overlay", () => {
    show.mockClear(); refresh.mockClear();
    const { result } = renderHook(() => useNavigationRouter());
    result.current.silentRefresh();
    expect(show).not.toHaveBeenCalled();
    expect(refresh).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run → fail**

Run: `bun run test:dom -- use-navigation-router`
Expected: FAIL — `silentRefresh` is not a function.

- [ ] **Step 3: Implement**

Add to the returned object in `src/hooks/use-navigation-router.ts` (after the existing `refresh`):

```ts
    refresh: () => {
      show("refresh");
      return router.refresh();
    },
    silentRefresh: () => router.refresh(),
```

- [ ] **Step 4: Run → pass**

Run: `bun run test:dom -- use-navigation-router`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/hooks/use-navigation-router.ts tests/vitest/use-navigation-router.test.ts
git commit -m "feat(navigation): add overlay-free silentRefresh"
```

---

### Task P0-3: Optimistic create (no overlay, instant row)

**Files:**
- Modify: `src/components/workshop/ProjectEstimatesClient.tsx`
- Test: `tests/vitest/project-estimates-create-optimistic.test.tsx` (create)

- [ ] **Step 1: Write the failing test** — render `ProjectEstimatesClient`, mock `createEstimateSheetDraft` to resolve after a tick, click "Create Estimate", assert a placeholder "Creating…" row appears synchronously (before the promise resolves) and that the global overlay store's `show` is NOT called.

```tsx
// tests/vitest/project-estimates-create-optimistic.test.tsx
import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const show = vi.fn();
vi.mock("@/stores/navigation-ui-store", () => ({ useNavigationUiStore: (s: any) => s({ show }) }));
const createDraft = vi.fn().mockResolvedValue({
  row: {
    id: "real-1",
    project_id: "p",
    name: "EST-002 Estimate",
    sheet_code: "EST-002",
    currency_code: "PHP",
    notes: null,
    project_budget: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    firstNodeId: "node-1",
    nodeCount: 1,
    rowItemCount: 0,
    totalProjectCost: 0,
  },
});
vi.mock("@/lib/estimates/actions", () => ({ createEstimateSheetDraft: createDraft }));

import { ProjectEstimatesClient } from "@/components/workshop/ProjectEstimatesClient";

it("shows an optimistic row immediately and never triggers the overlay", async () => {
  render(<ProjectEstimatesClient projectId="p" projectName="Proj" estimates={[]} />);
  fireEvent.click(screen.getByRole("button", { name: /create estimate/i }));
  expect(screen.getByText(/creating/i)).toBeInTheDocument(); // optimistic placeholder, synchronous
  expect(show).not.toHaveBeenCalled();
  await waitFor(() => expect(createDraft).toHaveBeenCalledWith("p"));
});
```

- [ ] **Step 2: Run → fail** (`bun run test:dom -- create-optimistic`). Expected: FAIL — no synchronous placeholder; current code only updates after `router.refresh()`.

- [ ] **Step 3: Implement.** Replace the server-prop pass-through with the store. In `ProjectEstimatesClient.tsx`:
  - Create the store once: `const storeRef = useRef(createProjectEstimatesStore(estimates));`
  - Reseed when the server prop changes (covers external refreshes): `useEffect(() => storeRef.current.getState().reseed(estimates), [estimates]);`
  - Subscribe: `const liveEstimates = useStore(storeRef.current, (s) => s.estimates);` (from `zustand`)
  - Pass `liveEstimates` to filter + table instead of the prop.
  - In `handleCreateEstimateSheet`: build a temp placeholder row with a
    `crypto.randomUUID()` temp id, `insertOptimistic`, call the action, on
    success `reconcileInsert(tempId, actionResult.row)`, on failure
    `rollbackInsert(tempId)` + set error. **Do not call `router.refresh()`.**

  The action must return the canonical DTO from P-1.2. Do not build the
  reconciled row from `{ estimateId, sheetCode }` in the client.

- [ ] **Step 4: Run → pass** (`bun run test:dom -- create-optimistic`).

- [ ] **Step 5: Commit**

```bash
git add src/components/workshop/ProjectEstimatesClient.tsx tests/vitest/project-estimates-create-optimistic.test.tsx
git commit -m "feat(estimates): optimistic create via client store, no overlay"
```

---

### Task P0-4: Optimistic inline edits (rename / notes / budget / auto-code) — remove `router.refresh()`

**Files:**
- Modify: `src/components/workshop/ProjectEstimatesTable.tsx` (handlers at `:301-334`, `:415-450`, `:529-538`)
- Test: `tests/vitest/project-estimates-inline-edit.test.tsx` (create)

- [ ] **Step 1: Write the failing test** — render the table with one row, edit the name cell, blur to commit; assert the cell shows the new value, the overlay `show` was NOT called, and the action's returned `updatedEstimate` reconciles into the store (not via refresh).

- [ ] **Step 2: Run → fail** — current code calls `router.refresh()` at `:327`, so the test's `show`-not-called assertion fails.

- [ ] **Step 3: Implement** — in each `commitDraft`/`handleAutoGenerate`, after the action resolves with `updatedEstimate`, call `store.patch(id, { name | notes | project_budget | sheet_code })` from the returned row and **delete the `router.refresh()` call** (`:327`, `:443`, `:534`). The local `draft` already updates; reconcile from the server return value to keep server-canonical fields (e.g. normalized sheet_code).

- [ ] **Step 4: Run → pass.**

- [ ] **Step 5: Commit**

```bash
git add src/components/workshop/ProjectEstimatesTable.tsx tests/vitest/project-estimates-inline-edit.test.tsx
git commit -m "perf(estimates): optimistic inline edits, drop full re-render on commit"
```

---

### Task P0-5: Optimistic delete + duplicate; remove reset-widths refresh

**Files:**
- Modify: `src/components/workshop/ProjectEstimatesTable.tsx` (`:724-760` delete, `:203-217` duplicate, `:983-986` reset widths)
- Test: `tests/vitest/project-estimates-delete-duplicate.test.tsx` (create)

- [ ] **Step 1: Write the failing test** — delete: rows removed synchronously, restored on action rejection, overlay not shown. Duplicate: a `"<name> Copy"` placeholder appears immediately, reconciled on success. Reset widths: no overlay, no refresh.

- [ ] **Step 2: Run → fail.**

- [ ] **Step 3: Implement** —
  - Delete: replace the `router.refresh()` at `:753` with `const rollback = store.removeOptimistic(ids);` then on action failure call `rollback()`. Keep the existing TanStack cache/selection cleanup.
  - Duplicate: `insertOptimistic` a placeholder keyed by temp id, `reconcileInsert` from the action's returned estimate; on failure `rollbackInsert`. Remove `router.refresh()` at `:211`.
  - Reset widths (`:985`): delete the `router.refresh()` entirely — column sizing is client/localStorage state.

- [ ] **Step 4: Run → pass.**

- [ ] **Step 5: Commit**

```bash
git add src/components/workshop/ProjectEstimatesTable.tsx tests/vitest/project-estimates-delete-duplicate.test.tsx
git commit -m "perf(estimates): optimistic delete/duplicate; drop gratuitous reset-widths refresh"
```

---

### Task P0-6: Table-shaped loading skeleton (kill the wrong-shape flash)

**Files:**
- Create: `src/components/workshop/ProjectEstimatesListSkeleton.tsx`
- Modify: `src/app/workshop/projects/[projectId]/estimates/loading.tsx`
- Test: `tests/vitest/project-estimates-list-skeleton.test.tsx` (create)

- [ ] **Step 1: Write the failing test** — render the skeleton; assert it has the search-box + toolbar + a multi-row single-column table region and **no** right-rail/2-column grid (the mismatch we're removing). Assert `role="status"` and an accessible label.

- [ ] **Step 2: Run → fail** — file does not exist.

- [ ] **Step 3: Implement** the skeleton to mirror `ProjectEstimatesClient` structure: a full-width search input bar, a `HeaderIconToolbar`-height strip, and ~12 full-width table rows (match `ProjectEstimatesTable` row height and column header band). Reuse `@/components/ui/skeleton`. Then point `loading.tsx` at it:

```tsx
// src/app/workshop/projects/[projectId]/estimates/loading.tsx
import { ProjectEstimatesListSkeleton } from "@/components/workshop/ProjectEstimatesListSkeleton";
export default function Loading() {
  return <ProjectEstimatesListSkeleton />;
}
```

- [ ] **Step 4: Run → pass.** Visually verify in the user's Chrome that the skeleton no longer shows a sidebar/right-rail. Capture CLS (`05` §3): expect < 0.1.

- [ ] **Step 5: Commit**

```bash
git add src/components/workshop/ProjectEstimatesListSkeleton.tsx src/app/workshop/projects/[projectId]/estimates/loading.tsx tests/vitest/project-estimates-list-skeleton.test.tsx
git commit -m "fix(estimates): table-shaped loading skeleton matching the page"
```

---

### Task P0-7: E2E CRUD-latency measurement spec + P0 acceptance capture

**Files:**
- Create: `e2e/estimates-crud-latency.spec.ts`

- [ ] **Step 1: Write the spec** (from `05` §5): measure create→visible,
rename/notes/budget/auto-code→Saved, duplicate→visible, delete→removed, and
reset-widths→local-only; assert the overlay root does NOT appear during
in-place edits or reset widths. Initially a measurement spec (logs JSON),
promoted to assertions once thresholds hold.

- [ ] **Step 2: Run** `bun run test:e2e -- estimates-crud-latency` against the running dev server (user session). Record results into `metrics/p0-crud-latency.json`.

- [ ] **Step 3: Compare to baseline** (`05` acceptance table). Expected: create→visible < 400 ms; no overlay on inline edits; INP < 200 ms.

- [ ] **Step 4: Commit**

```bash
git add e2e/estimates-crud-latency.spec.ts metrics/p0-crud-latency.json
git commit -m "test(estimates): CRUD-latency e2e spec + P0 acceptance capture"
```

---

# PHASE P1 — TTFB / server waterfall. Reduces cold-load and refresh think time.

### Task P1-1: Cache `ensureDefaultWorkspace` (remove 2 redundant workspace lookups/render)

**Files:**
- Modify: `src/lib/repositories/workspace-repository.ts:725`
- Test: `tests/vitest/ensure-default-workspace-cache.test.ts` (create)

- [ ] **Step 1: Write the failing test** — mock `createSupabaseServerClient` to count `from("workspaces")` calls; invoke `getCurrentWorkspaceProject` + `getProjectCollaborationSummary` + `getProjectPublicationSummary` within one React `cache` scope (use `React.cache` test harness or call `ensureDefaultWorkspace` 3×); assert the workspaces query runs once.

> Note: React `cache()` dedupes per-request. The vitest unit may assert at the `ensureDefaultWorkspace` level (wrap and call thrice → 1 underlying query). Verify the real per-request behavior in the `05` round-trip capture (Step 4 below).

- [ ] **Step 2: Run → fail** — currently 3 workspace queries.

- [ ] **Step 3: Implement** — wrap the function declaration in `cache(...)` exactly as `getCurrentWorkspaceProject` is at `:1146`:

```ts
export const ensureDefaultWorkspace = cache(async function ensureDefaultWorkspace() {
  // …existing body unchanged…
});
```
Confirm `cache` is already imported (it is — used at `:1146`). Run `gitnexus_impact({target:"ensureDefaultWorkspace"})` first and report blast radius (many callers).

- [ ] **Step 4: Run → pass**, then re-capture round-trips per `05` §1. Expected: workspace query count per cold load drops by 2.

- [ ] **Step 5: Commit**

```bash
git add src/lib/repositories/workspace-repository.ts tests/vitest/ensure-default-workspace-cache.test.ts
git commit -m "perf(workspace): memoize ensureDefaultWorkspace per request"
```

---

### Task P1-2: Stream layout summaries so the shell + skeleton paint immediately

**Files:**
- Modify: `src/app/workshop/projects/[projectId]/layout.tsx`
- Create: `src/components/workshop/ProjectChromeAsync.tsx` (server component wrapping the awaited summaries)

> **Owner decision (Q2 in `07`):** acceptable for the publication/collaboration header chrome to pop in slightly after the shell? Default = yes (it is non-blocking chrome, not page content).

- [ ] **Step 1: Write a Playwright assertion** — on cold navigation, the estimates table skeleton is visible before the collaboration/publication header finishes (assert skeleton present while a header data-testid is still absent). Add to `e2e/estimates-crud-latency.spec.ts` or a new `e2e/estimates-shell-streaming.spec.ts`.

- [ ] **Step 2: Run → fail** — today the layout awaits before any paint.

- [ ] **Step 3: Implement** — move the `await getCurrentWorkspaceProject` (needed for `notFound`/title) to stay, but push the `Promise.all([collaboration, publication, sheets])` into a child server component rendered inside its own `<Suspense fallback={<HeaderChromeSkeleton/>}>`, so the shell + `{children}` (which already has its own Suspense → estimates skeleton) stream first. The header actions become:

```tsx
actions={
  <Suspense fallback={<ProjectHeaderChromeSkeleton />}>
    <ProjectChromeAsync projectId={projectId} liveProject={liveProject} />
  </Suspense>
}
```
`ProjectChromeAsync` does the `Promise.all` and renders `ProjectPublicationHeader` + `ProjectTeamspaceHeader`. This removes the collaboration/publication fan-out from the shell's critical path (`01` §f, F5).

- [ ] **Step 4: Run → pass**, re-capture TTFB/FCP per `05`. Expected: FCP no longer gated on collaboration/publication branch.

- [ ] **Step 5: Commit**

```bash
git add src/app/workshop/projects/[projectId]/layout.tsx src/components/workshop/ProjectChromeAsync.tsx e2e/estimates-shell-streaming.spec.ts
git commit -m "perf(project): stream header chrome so shell + table skeleton paint immediately"
```

---

### Task P1-3: Pass resolved project into summary fns (remove redundant `projects`/`workspace_members` re-queries)

**Files:**
- Modify: `src/lib/repositories/workspace-repository.ts` (`getProjectCollaborationSummary:1174`, `getProjectPublicationSummary:1329`)
- Test: extend `tests/vitest/ensure-default-workspace-cache.test.ts` or new `tests/vitest/summary-no-requery.test.ts`

- [ ] **Step 1: Write failing test** — call the summary fns with an already-resolved `project` arg; assert they do NOT re-query `projects`.

- [ ] **Step 2: Run → fail.**

- [ ] **Step 3: Implement** — add an optional `project?: Tables<"projects">` param to both summary fns; when provided, skip the internal `projects` select (`:1180`, `:1335`). The layout already resolves the project (`layout.tsx:24`) — thread it through `ProjectChromeAsync`. Run `gitnexus_impact` on both fns first (other callers must still work with the param omitted — keep it optional/backward-compatible).

- [ ] **Step 4: Run → pass**, re-capture round-trips. Expected: 2 fewer `projects` queries per render.

- [ ] **Step 5: Commit**

```bash
git add src/lib/repositories/workspace-repository.ts tests/vitest/summary-no-requery.test.ts
git commit -m "perf(workspace): reuse resolved project in collaboration/publication summaries"
```

### P1 rollback notes

P1 must remain independently revertible from P0 and P2:

- If `ensureDefaultWorkspace` caching regresses request scoping, revert only the
  `cache()` wrapper and its test. Leave P0 optimistic state intact.
- If streaming header chrome regresses layout or paint order, revert
  `ProjectChromeAsync` and the Suspense action slot only.
- If optional project arguments in the summary functions regress another caller,
  remove the optional arg call-site threading and keep the original summary
  signatures; callers with omitted args must remain backward-compatible during
  rollout.
- Record which of the three P1 slices shipped in the phase evidence log so a
  rollback can target the specific failing slice instead of reverting all P1
  changes.

---

# PHASE P2 — DB correctness, scaling, and the HIGH security over-fetch.

### Task P2-1: Aggregation RPC `project_estimate_list_summaries` + parity proof

**Files:**
- Create: `supabase/migrations/<ts>_project_estimate_list_summaries_rpc.sql` (DDL from `02` §C)
- Create: `scripts/prove-estimate-list-summaries-postgres.mjs` (mirror `scripts/prove-estimate-tabs-postgres.mjs`)
- Create: `tests/vitest/project-estimate-list-summaries-parity.test.ts`
- Modify: `src/lib/repositories/workspace-repository.ts:1438-1472`

- [ ] **Step 1: Write the parity test (golden value).** Build a fixture set of estimates/nodes/rows in JS, compute counts + totals with the **existing JS code path** (the formula at `:1461-1470`), then assert the SQL expression produces identical numbers. Implement the SQL-side computation in the prove-harness (`scripts/prove-estimate-list-summaries-postgres.mjs`) running the real migration against local PG17, comparing RPC output to the JS oracle for: zero-row estimate, contingency=0, contingency=null, misc-only, multi-estimate. **This is the gate before swapping the read path** (`02` §C first-node-parity warning).

- [ ] **Step 2: Run → fail** — RPC/migration doesn't exist.

- [ ] **Step 3: Implement** the migration from `02` §C and the prove-harness.
There are two acceptable implementation paths; choose one and make the choice
explicit in the commit evidence:
  - **Path A, default:** RPC owns `node_count`, `row_count`, and `total_cost`;
    `listProjectEstimates` keeps the existing narrow `estimate_nodes` query and
    `selectFirstEstimateNodeIds` JS oracle for `firstNodeId`.
  - **Path B:** RPC also returns `first_node_id`, but only with a recursive SQL
    implementation proven equivalent to `selectFirstEstimateNodeIds`.

  Do not use a flat `array_agg(sort_order)` shortcut for `first_node_id`. Add
  `"prove:estimate-list-summaries": "node scripts/prove-estimate-list-summaries-postgres.mjs"` to `package.json` scripts.

- [ ] **Step 4: Run** `bun run prove:estimate-list-summaries`. Expected: all
count/total parity cases PASS. If Path B is selected, `first_node_id` must also
match `selectFirstEstimateNodeIds` ordering.

- [ ] **Step 5: Swap the read path** — replace the row-item JS aggregation in
`listProjectEstimates` with `supabase.rpc("project_estimate_list_summaries", {
target_project_id: project.id })` for counts/totals. Under Path A, keep the
existing narrow nodes query only for `selectFirstEstimateNodeIds`; under Path B,
populate all four maps from RPC rows. Keep `getCurrentWorkspaceProject` + the
`estimates` select (now explicit columns from P2-2). Add a unit test asserting
the maps are built from the selected path.

- [ ] **Step 6: EXPLAIN before/after** at realistic volume (`05` §2/§6). Do
not rely on `scripts/seed-performance-test-data.ts`; it is manifest-only. Add a
real disposable DB fixture/prove harness or use owner-authorized hosted SQL
against a throwaway estimate, then record teardown. Record
`metrics/p2-explain-{before,after}.txt`. Expected: O(estimates) output rows,
fewer buffers, flat with row count.

- [ ] **Step 7: Commit**

```bash
git add supabase/migrations/*_project_estimate_list_summaries_rpc.sql scripts/prove-estimate-list-summaries-postgres.mjs tests/vitest/project-estimate-list-summaries-parity.test.ts src/lib/repositories/workspace-repository.ts package.json metrics/p2-explain-*.txt
git commit -m "perf(db): aggregate estimate-list summaries in one RPC, proven parity with JS"
```

> **Apply note:** per the standing pre-launch DB autonomy mandate, this migration may be applied to the hosted DB (`ebxxqidacheyapmmzavr`) via Supabase MCP once the prove-harness is green. Run `mcp__supabase__get_advisors` (security + performance) after applying.

---

### Task P2-2: `estimates.select("*")` → explicit safe columns (perf + HIGH infosec F9)

**Files:**
- Modify: `src/lib/repositories/workspace-repository.ts:1419-1421`
- Test: `tests/vitest/list-project-estimates-columns.test.ts` (create)

- [ ] **Step 1: Write the failing test** — mock the Supabase builder, call `listProjectEstimates`, assert the `estimates` select string equals the explicit safe list and does NOT include `metadata`, `created_by`, `assumptions`, `workspace_id`.

- [ ] **Step 2: Run → fail** — current select is `"*"`.

- [ ] **Step 3: Implement** — define `const ESTIMATE_LIST_COLUMNS = "id, project_id, name, sheet_code, currency_code, notes, project_budget, created_at, updated_at";` (mirror the `ESTIMATE_TREE_*_COLUMNS` pattern at `:1523`) and use it. Confirm the mapper builds `ProjectEstimateListRow` from this narrower shape; the build must catch any UI field that needs adding back.

- [ ] **Step 4: Run → pass**; `bun run type-check`. Re-capture RSC payload (`05` §4). Expected: smaller payload, no `created_by`/`metadata` in the response.

- [ ] **Step 5: Commit**

```bash
git add src/lib/repositories/workspace-repository.ts tests/vitest/list-project-estimates-columns.test.ts
git commit -m "fix(security,perf): project explicit estimate columns, stop shipping created_by/metadata to client"
```

---

### Task P2-3: RLS `(select auth.uid())` initplan caching (F10)

**Files:**
- Create: `supabase/migrations/<ts>_rls_initplan_auth_uid.sql`
- Test: extend `scripts/prove-estimate-tabs-postgres.mjs` pattern → `scripts/prove-rls-initplan-postgres.mjs` (timing + correctness)

> **Owner decision (Q3 in `07`):** changing `security definer` helper bodies is moderate-risk (touches the auth perimeter). Confirm before applying to hosted DB; default = ship migration + prove-harness, apply after advisors pass.

- [ ] **Step 1: Write the correctness proof** — the rewritten helpers must return identical access decisions. In the prove-harness, set `request.jwt.claims` for an owner, a collaborator, and a non-member; assert `can_access_estimate(id)` returns the same boolean before/after the rewrite for each.

- [ ] **Step 2: Run → fail** — migration not present.

- [ ] **Step 3: Implement** — `create or replace function` for `can_access_estimate`, `current_project_access_rank`, `is_workspace_member` with every bare `auth.uid()` replaced by `(select auth.uid())` (bodies otherwise byte-identical to the originals at `20260601151500:5-26`, `20260526142913:187-216`, core:176). Do NOT change signatures, `security definer`, or `search_path`.

- [ ] **Step 4: Run** the correctness proof (decisions identical) and the timing capture from `05` §2 (per-row tax before/after, executed as an authenticated role at realistic row volume). Record `metrics/p2-rls-timing.txt`.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/*_rls_initplan_auth_uid.sql scripts/prove-rls-initplan-postgres.mjs metrics/p2-rls-timing.txt
git commit -m "perf(rls): cache auth.uid() via initplan in estimate-access helpers"
```

---

# PHASE P3 — Hardening (defense-in-depth; ship independently).

### Task P3-1: List-route `error.tsx` (F13)

**Files:**
- Create: `src/app/workshop/projects/[projectId]/estimates/error.tsx`

- [ ] **Step 1: Write the failing test** (or e2e) — force `listProjectEstimates` to throw; assert a graceful `WorkshopRouteErrorState` renders (not a crash) and no raw PG text is shown.

- [ ] **Step 2: Run → fail** — no boundary.

- [ ] **Step 3: Implement** — mirror the existing `[nodeId]/error.tsx` / `charts/error.tsx`, rendering `WorkshopRouteErrorState` with a `reset` retry.

- [ ] **Step 4: Run → pass.**

- [ ] **Step 5: Commit**

```bash
git add src/app/workshop/projects/[projectId]/estimates/error.tsx
git commit -m "fix(estimates): add graceful error boundary to list route"
```

---

### Task P3-2: Workshop security headers (F14)

**Files:**
- Modify: `next.config.ts` (`headers()` at `:60-117`)
- Test: `tests/vitest/next-config-workshop-headers.test.ts` (assert the headers() output includes a `/workshop/:path*` entry with the expected keys)

- [ ] **Step 1: Write the failing test** — import the headers array, assert an entry for `/workshop/:path*` with `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, and a `Content-Security-Policy-Report-Only`.

- [ ] **Step 2: Run → fail.**

- [ ] **Step 3: Implement** — add the `/workshop/:path*` source reusing the share hardening header builder where possible. Start CSP **Report-Only** (measure violations via `05`/report endpoint before enforcing — workshop renders user content and dynamic chunks; an enforced CSP risks breakage).

- [ ] **Step 4: Run → pass**; load workshop in Chrome, confirm no functional breakage and headers present (Network → Headers).

- [ ] **Step 5: Commit**

```bash
git add next.config.ts tests/vitest/next-config-workshop-headers.test.ts
git commit -m "fix(security): add frame/nosniff + report-only CSP to /workshop"
```

---

### Task P3-3: Edit-authZ on sheet actions (F15)

**Files:**
- Modify: `src/lib/estimates/actions.ts` (`createEstimateSheetDraft:1440`, `duplicateEstimateSheet:1460`, sheet rename/update paths)
- Test: `tests/unit/...` or e2e asserting a viewer gets a clean "edit access denied" rather than a raw RLS error.

- [ ] **Step 1: Write the failing test** — simulate a read-only viewer calling `createEstimateSheetDraft`; assert it throws a clean app-level edit-denied error before the insert (currently it reaches the insert and fails with a raw RLS error).

- [ ] **Step 2: Run → fail.**

- [ ] **Step 3: Implement** — call the existing `assertCanEditEstimate`/`can_edit_estimate` (or a project-scoped `can_edit_project` check) at the top of each sheet mutation, mirroring template actions (`:2171,2233`). RLS still backstops; this gives clean denials and closes obs-4408. Run `gitnexus_impact` on each action first.

- [ ] **Step 4: Run → pass.**

- [ ] **Step 5: Commit**

```bash
git add src/lib/estimates/actions.ts tests/...
git commit -m "fix(security): enforce edit authorization in estimate sheet actions"
```

> **Deferred (out of MVP scope unless owner says otherwise):** F16 rate-limiting on create/duplicate — track as a follow-up; the insert-retry already prevents code collisions. Capture as `07` open item.

---

## Final validation & teardown

- [ ] Run the full gate: `bun run validate` (type-check + lint + design-system + unit + DOM).
- [ ] Run `bun run test:e2e -- estimates` (CRUD-latency + shell-streaming specs).
- [ ] Run the `09_TRACEABILITY_AND_QA_MATRIX.md` adversarial matrix, including
viewer denial, action rejection rollback, duplicate double-click, search-active
optimistic mutations, large-row aggregate, and blocked localStorage.
- [ ] Re-capture ALL `05` acceptance-table metrics into `metrics/after-*`; confirm every row meets threshold. Commit the metrics diff.
- [ ] Remove or dormant-gate the `traced()` wraps if they add noise (keep `server-timing.ts` behind `PERF_TRACE`).
- [ ] `gitnexus_detect_changes()` before the final push; confirm only expected symbols/flows changed.
- [ ] Land per the repo norm (memory: ff-push to origin/main; main worktree usually dirty — merge+validate then `git push origin HEAD:main`).

---

## Self-review (spec coverage)

Every finding F1–F16 maps to a task: F1/F3→P0-2,P0-4; F2→P0-1; F4→P0-6; F5→P1-2; F6→P1-1; F7→P1-3; F8→P2-1; F9→P2-2; F10→P2-3; F11→P0-3; F12→P0-4/5 (refresh removal also collapses the double-invalidation for in-place ops; sibling `/charts` revalidation retained where genuinely needed); F13→P3-1; F14→P3-2; F15→P3-3; F16→deferred (noted). Measurement (task 5) → P0-0 + per-task captures against `05` thresholds.
