# U0A Decision Receipts — 2026-06-11

Branch: perf/path-to-estimate-sheet @ 626d44a. Gates from plan docs 16 + 17.

---

## 1. Blast Radius Receipts

### U1 — EstimateSheetContent.tsx (render relief)

- **Graph commands**: `get_impact_radius(changed_files=[EstimateSheetContent.tsx])` → risk **HIGH**, 666 impacted nodes, 25 files. `query_graph(importers_of)` returned an empty node list (graph keyword coverage imperfect, as plan doc 12 warned) → manual fallback used.
- **Manual fallback (`rg`)**: production importer of `EstimateSheetContent` is only `src/components/workshop/EstimateWorkspaceClient.tsx`; 9 vitest suites exercise it directly.
- **Callers/consumers**: estimate page route → `EstimateWorkspaceClient` → `EstimateSheetContent`; re-exports component-library helpers consumed elsewhere (re-export block at top of file must not change).
- **Key pre-edit facts recorded**:
  - `projectTotal` (line ~3572) is a bare per-render reduce.
  - All 9 row-table callbacks are identity-unstable per keystroke (`updateRowItem`, `replaceRowItem`, `clearRowComponent`, `requestProjectSpecific`, `moveRowComponent`, `deleteRowItem` are plain functions; `insertLibraryItem`/template inserts depend on `editableRows`+`estimateTree`; `markRowDirty` is a plain function inside `useSaveState`).
  - Naive `React.memo` is therefore useless (props always differ) or dangerous (excluding callbacks risks stale closures). Safe design: ref-pattern stable wrappers + slice-aware comparator.
- **Verification mapped**: 9 vitest suites above + new render-baseline harness + render-count probe.
- **HIGH-risk acknowledgment**: characterization-first discipline applied; one boundary per commit.

### U2 — workspace-repository.ts (column selection)

- Manual tracing planned per function before edit (graph names unreliable for this file); repository return-shape consumers checked via TypeScript compiler (`bun run type-check`) which fails on missing fields — no `as any` permitted.

### U4 — estimate page / EstimateWorkspaceClient / component-library

- Importers: `[nodeId]/page.tsx` → `EstimateWorkspaceClient` → `EstimateRightSidebar` (component-library/index.tsx). Tests: component-library-ui.test.tsx (DIRTY — do not edit; new tests in separate file), estimate-sheet-library-insert.test.tsx.

### U6 — layout.tsx / landing

- `react-complex-tree/lib/style-modern.css` + `lenis/dist/lenis.css` imported globally in `src/app/layout.tsx:5-6`. Consumers: workshop trees (react-complex-tree CSS), landing Lenis scrolling. Verification: app-css-regressions.test.ts, landing render, workshop tree styling QA.

---

## 2. Redis / Remote-Cache Decision Receipt

**Decision: DO NOT ADD. (Default upheld.)**

- No measured shared-cache pressure exists (no runtime baseline shows repeated cross-request backend pressure on shared non-secret data).
- Estimate sheet/tree data: protected, user-specific, RLS-guarded, `private, no-cache, no-store` route semantics — classified **protected/user-specific** → remote cache prohibited by matrix.
- Component library data: lazy load + TanStack/client cache is the matrix-mandated first step (U4); no evidence first-open latency exceeds budget after lazy load.
- Estimate-list totals: matrix requires Postgres aggregate proof before any distributed cache; DB access unavailable this run.
- No Redis/Upstash/KV dependency exists in package.json (verified in static snapshot).

## 3. Image Decision Receipt

**Inventory** (static snapshot):
- Inline `backgroundImage`: `EstimateSheetContent.tsx`, `ProjectTeamspaceHeader.tsx`, `component-library/ComponentCard.tsx`, `component-library/index.tsx`.
- `next/image` `priority`: `src/components/landing/HeroSection.tsx:248`.
- `next.config.ts` has Supabase `remotePatterns` for public component images + sharp installed.

**Decisions:**
- Component thumbnail `backgroundImage` → `next/image` migration: **DEFERRED this run.** Matrix requires before/after transferred-bytes network proof; authenticated browser network capture is BLOCKED (see environment-status.md). A rewrite without network proof would be exactly the "image rewrite false positive" doc 12 warns about.
- Landing hero `priority` → `preload`: **APPROVED for U6** if the hero is the single LCP candidate (it is the only above-fold `next/image` with priority on `/`); Next 16 local docs deprecate `priority`. Layout/accessibility must be unchanged.
- No new preloads for non-LCP images.

## 4. Package / Config Decision Receipt

- **No new dependencies approved.** `@tanstack/react-virtual` remains NOT approved (no post-Sprint-0-2 DOM-bottleneck proof yet; U10 gate).
- **No `optimizePackageImports` additions** without `ANALYZE=true bun run build` before/after evidence; not attempted this run unless bundle evidence is captured.
- **No cache handler / provider package** (cost + secret review not authorized).
- U3 SQL/RPC migration: writing a local migration file is permitted, but applying to any database is BLOCKED this run (no local DB, no hosted authority). Default: keep JS aggregation; defer SQL move with evidence.
