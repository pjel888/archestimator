# Templates Audit & Improvement — Implementation Ledger

**Branch:** `claude/2026-06-13-Templates-Audit-And-Improvement-Plan` ·
**Worktree:** `.claude/worktrees/goofy-dubinsky-6a8080` ·
**Plan:** `.ai/03_plans/2026-06-13-Templates-Audit-And-Improvement-Plan/`

Definition of green: **zero NEW test failures** vs the documented baseline
(`.ai/10_state/known-issues.md` — pre-existing open items are Codex history-exposure
findings + native-spreadsheet proof; no pre-existing test failures). Baseline
`bun run type-check` = exit 0 at start.

**Toolchain note:** the worktree shell defaults to Node v14 (nvm). Vitest 4 + rolldown
need Node ≥20.12; runs use `PATH=/Users/philiplewis/.nvm/versions/node/v25.8.0/bin:$PATH`.

**Provider boundary (owner-gated — NOT executed by this agent):** `supabase db push`,
type regen, deploy, hosted-export verify — only against project `ebxxqidacheyapmmzavr`,
only with explicit owner authorization. New RPC migrations are authored locally and
their **apply** is deferred to the owner runbook; app-layer guards ship immediately.

---

## Phase 0 — Stabilize (local)

### U1 — reusable-outline missing-schema fallback (read-only-safe)
- **Iteration 1 — DONE (local).**
- Changes (worktree):
  - `src/lib/repositories/workspace-repository.ts`: added `LEGACY_MAIN_TAB_ID` +
    `syntheticMainTab()` + `buildLegacyTabTree()`; gave `getEstimateTabs` an opt-in
    `{ allowLegacyFallback }` 3rd arg (catches `isEstimateTabsSchemaMissing` → synthetic
    Main, else throw — default off so the 6 tab-CRUD mutation callers are unchanged,
    U1-RO); `getEstimateTabTree` gains `allowLegacyFallback` (legacy-main short-circuit
    + schema-missing → legacy, options forwarded, U1-2/U1-4). **`getDefaultEstimateTab`
    untouched (U1-1).** Mixed-state guard: fallback gated strictly on schema-missing (U1-3).
  - `src/lib/reusable-sources/actions.ts`: `getReusableEstimateOutline` +
    `searchReusableProjectSources` opt in (U1-6).
  - `src/app/api/projects/[projectId]/estimates/[estimateId]/export/proposal.xlsx/route.ts`:
    GET `getEstimateTabs(..., { allowLegacyFallback: true })` — fixes the export 500 (U1-5);
    synthetic single tab routes through the already-safe `getProjectEstimateTreeByEstimate`.
  - `tests/vitest/reusable-sources-actions.test.ts`: updated 4 call-arg assertions for the
    new opt-in; added a fallback-assembly test (synthetic "Main" outline assembles, no throw).
- **Design deviation (documented):** doc 12 sketched an *unconditional* fallback in
  `getEstimateTabs` + guarding the 6 mutation callers. Implemented as an **opt-in flag**
  instead — same observable outcome (only read callers fall back; mutations never see a
  synthetic tab) with strictly smaller blast radius (0 mutation-action files touched).
- Gates: `bun run test:dom tests/vitest/reusable-sources-actions.test.ts
  tests/vitest/workspace-repository-estimate-tree.test.ts` → **16 passed, exit 0**.
  Full type-check/validate deferred to the Phase-0 exit gate (after U1b+U4).
- RTM: DEF-1 (P0) outline 500 → fallback landed (app-layer). UX-6 partial (U1b next).
- Note: process correction — initial edits accidentally hit the main checkout; relocated
  to the worktree via patch, main restored clean.

### U1b — user-safe error surface (toast) — DONE (local)
- `component-library/index.tsx`: added `toUserSourceError(scope)` (fixed friendly strings);
  all 4 project-source catch sites (dataset / search / estimates / outline) now
  `console.error(raw)` + `toast({ tone:"error", message })` via existing `useToast()`;
  removed the 4 error-state vars + their resets and the inline error banners (no layout
  shift). Loading banners kept (U23 converts to skeleton-in-place later). Type-check + lint clean.

### U4 — harden insert RPC + app assertion — DONE (local; RPC apply owner-gated)
- `estimates/actions.ts`: `assertCanEditEstimate` at the top of `insertEstimateTemplateIntoEstimate`,
  `wrapEstimateAreaAndInsertTemplate` (before pre-insert mutations, U4-2), **and**
  `insertEstimateTemplateNodeIntoEstimate` (review-found unguarded direct-call path — see below).
- New migration `supabase/migrations/20260613170000_harden_template_insert_can_edit.sql`:
  defines `assert_can_edit_estimate_for_history` + `create or replace`s the LIVE no-tab RPC
  body swapping ONLY the gate line (U4-4). Apply is **owner-gated** (provider mutation,
  `ebxxqidacheyapmmzavr` only). Foundation already uses the same gate → D-A preserves the fix.
- Tests: `estimate-node-reorder-action.test.ts` updated to mock `can_edit_estimate` + expect
  2 ordered RPCs (U4-1); added viewer-denied tests for insert + wrap + node-insert.

### Phase 0 — adversarial review (workflow, 18 agents) + fixes
- Review confirmed 2 defects (both fixed):
  - **P1** `insertEstimateTemplateNodeIntoEstimate` was unguarded and is called directly from
    `EstimateSheetContent.tsx:1425` → viewer could write nodes/rows. Added `assertCanEditEstimate`.
  - **P2** export `buildSingleTabResponse` didn't pass `allowLegacyFallback` → explicit
    `?tab=legacy-main` would 500 under missing schema (U1-5). Added the flag.
- U1-RO, U1-1, U1-2/3, U4-2, U4-4, U1b all verified correct by the review.

### Phase 0 gates
- `bun run type-check` ✓ · `bun run lint` ✓ · `bun run lint:design-system` ✓ · `bun run lint:design` ✓ · `bun run test` (bun unit) ✓.
- `bun run test:dom`: full re-run **243 files / 1811 tests passed, 0 failed** (exit 0). The first
  run had 1 flaky 15s timeout on `component-library-ui.test.tsx` (jsdom navigation warning); it
  passes in isolation (60/60) and on full re-run → pre-existing flake, not a regression.
- Targeted: reusable-sources (16), reorder (27 incl. 3 new denial tests), package-builder (12),
  lazy-load (6), perf (10) — all green.
- RTM rows flipped: DEF-1 (P0) ✓, UX-6 (U1b) ✓, SEC-1/DEF-4 (U4 app-layer) ✓ (RPC apply pending owner).
- **Owner-gated remaining for this slice:** apply `20260613170000_harden_template_insert_can_edit.sql`
  to `ebxxqidacheyapmmzavr` + RLS-harness denial proof (U16 extends the prove script).
- **Next:** commit Phase 0; then Perf (U18/U19/U21) + Library scope (U3, subagent).
