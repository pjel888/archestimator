# 09 — Test and Validation Plan

**Date:** 2026-06-12 · Grounding: [01_CURRENT_STATE_AUDIT.md](01_CURRENT_STATE_AUDIT.md) §15; phases: [10_IMPLEMENTATION_PHASES.md](10_IMPLEMENTATION_PHASES.md).
**Baseline caveat (verified):** `bun run validate` is **not currently clean** — documented pre-existing failures at base `8f6f116` (21 vitest DOM, 1 bun unit re-verified live at `tests/unit/reset-baseline.test.ts:54`, 3 ESLint errors; `.ai/10_state/current-state.md:60-68`). Every phase gate below means "no NEW failures vs the recorded baseline", and Phase 0 records that baseline explicitly.

---

## 1. Test infrastructure facts (what new tests plug into)

- `tests/unit/` → `bun test tests/unit`; `tests/vitest/` → jsdom, serial (`--maxWorkers=1`, `fileParallelism: false` in `vitest.config.ts`) — **do not parallelize** (race-heavy optimistic suites); `e2e/` → Playwright, chromium, port 3020, most specs env-flag-gated.
- Conventions to follow: `vi.hoisted` server-action mocks + `deferred<T>()` optimistic races (`tests/vitest/estimate-sheet-tree-dnd.test.tsx:12-42`); chainable Supabase query fakes (`estimate-node-reorder-action.test.ts:1-87`); migration-text contract tests (`component-library-templates-schema.test.ts:29` pattern); ephemeral-Postgres RLS proof (`scripts/prove-notification-rls-postgres.mjs` — Homebrew Postgres 16, no Docker).

## 2. New unit tests (bun/vitest pure)

| Test | File (proposed) | Scenarios |
|---|---|---|
| Tree building by tab | `tests/vitest/estimate-tab-tree.test.ts` | nodes of two tabs never co-mingle; per-tab root ordering; orphan-promotion stays within a tab; legacy single-tab estimates build identically to today's `buildEstimateTree` output |
| Row totals across tabs | `tests/vitest/estimate-tab-totals.test.ts` | per-tab totals; estimate-level total = Σ tabs; contingency/discount math unchanged per row (reuse fixtures from `estimate-row-tree-patch.test.ts`) |
| Tab backfill helpers | inside `estimate-tabs-schema.test.ts` + proof-harness SQL (§6) | P1–P5 proof queries from [03](03_DATABASE_MIGRATION_PLAN.md) §7 expressed as asserts |
| Project-source conversion | `tests/vitest/reusable-source-conversion.test.ts` | estimate subtree → insert payload mapping; whole-tab = root-group set; save-as-template naming conflict suffix; provenance metadata stamps |
| Drag payload parsing | extend `tests/vitest/component-library-ui.test.tsx` + new `reusable-source-drag.test.ts` | `readProjectSourceDragPayload` happy/malformed/wrong-mime; template payloads unaffected; mixed-payload drop routing |
| Worksheet-tab name sanitization | `tests/vitest/proposal-worksheet-name.test.ts` | invalid chars `[]:*?/\`, 31-char truncation, dedupe ` (2)` determinism by sort_order, reserved names (`History`, `Summary`, …), apostrophe escaping for `'name'!H1` refs, empty→`Tab`, unicode NFKD parity with filename builder |

## 3. Repository/server-action and DOM tests

- **Server actions** (pattern: `estimate-node-reorder-action.test.ts`): `tests/vitest/estimate-tab-actions.test.ts` — create/rename/reorder/duplicate/archive/delete tab actions: payload validation, RPC params (incl. `correlation_id`), last-tab delete refusal, default re-pointing, cross-estimate rejection, no-revalidate contract; root node create requires `estimateTabId`; reorder rejects cross-tab parents.
- **Insert action**: `tests/vitest/project-source-insert-action.test.ts` — happy path RPC boundary; viewer-on-target rejection; unreadable-source rejection; cross-workspace rejection; deleted-source typed error; area-target wrap-group parity with the template flow (`estimate-template-drop-zones.test.tsx` precedent).
- **DOM — tab switching**: `tests/vitest/estimate-tab-strip.test.tsx` — strip renders from `tabs` query; switch restores per-tab selection/expansion; URL replaceState to new tab's node; create/rename inline/delete confirm; keyboard tablist (arrows/Home/End, Cmd+Shift+arrows reorder); focus fallback on delete; empty-tab state actions; spring-loaded switch on dragover.
- **DOM — templates panel sources**: `tests/vitest/reusable-sources-panel.test.tsx` — two sections render; lazy expand fires per-level actions; search across both; preview dock live metadata fields; context-menu divergence (no rename/delete on project sources); save-as-template modal handoff; bulk add across mixed types.
- **Existing suites to extend, not fork:** `estimate-sheet-cost-inputs` / `estimate-sheet-library-insert` (rows inside the active tab), `estimate-sheet-tree-dnd` (within-tab unchanged + cross-tab drop rejection toast), `template-gallery.test.tsx` (picker gains Tab select), `estimate-sheet-version-control-ui` (tab scope + `tab_*` event rendering).

## 4. RLS / SQL validation

- **New harness** `scripts/prove-estimate-tabs-postgres.mjs` (clone of `prove-notification-rls-postgres.mjs`): applies dependency migrations + M1; seeds 2 users × 2 estimates (one restricted via `estimate_sheet_access_settings.inherit_project_access=false`); asserts: tab select allow/deny, tab write deny for viewer, P1–P5 backfill proofs, denial scenarios 1–9 from [08](08_ACCESS_SECURITY_RLS_PLAN.md) §7. Wire as `prove:estimate-tabs-rls` script.
- **Migration-text contract** `tests/vitest/estimate-tabs-schema.test.ts`: RLS enables, policy names, composite FK, partial unique default index, constraint-swap statements, guard comment for dormant snapshot RPCs (03 §8).
- Migration validation queries (P1–P5) additionally documented for the linked-apply runbook (manual, separately authorized — **provider proof, not local proof**).

## 5. Export tests

Per [07](07_XLSX_EXPORT_TABS_PLAN.md) §9: sanitizer unit tests; single-tab byte-shape regression (existing `proposal-workbook.test.ts` assertions must pass **unmodified** for single-tab fixtures); multi-tab workbook (order/names/per-tab formulas/Summary cross-refs/Source Breakdown Tab column/no hidden sheets/frozen panes per sheet); route `?tab=` happy/404/archived + filename slug; round-trip `ExcelJS.load` re-assertions; preview/export model alignment via shared fixtures; benchmark re-run with 5-tab fixture (`scripts/benchmark-proposal-workbook.ts` extension).

## 6. Playwright (e2e) — required scenarios

New spec `e2e/estimate-tabs.spec.ts` (env-gated like `estimate-tree-dnd.spec.ts`, service-role seeded fixtures):
1. create tab · 2. rename tab · 3. duplicate tab · 4. reorder tabs · 5. switch tabs and verify **separate trees persist** (reload included) · 6. drag custom template into a tab · 7. drag project-derived source into a tab · 8. export XLSX with multiple tabs (download + `workbook.eachSheet` worksheet-name asserts, pattern `workshop-project-specific-unlink-smoke.spec.ts:315-332`).

Project-derived source scenario 7 must use a different readable project from the active editor project: open Project A, verify the Templates right sidebar's Projects section lists readable Project B/C sources by default, drag a whole tab/group/area from Project B into Project A, and verify the copied target tree has fresh IDs. A separate narrowing-control test verifies the optional "Current project only" filter hides Project B/C only after the user enables it.
Existing specs needing updates when copy/structure changes land: `workshop-template-insert-smoke` (estimate route + single sheet locator), `workshop-project-specific-unlink-smoke` (export scrape), `workshop-library-demo-smoke` (aria "Component sheet"→"Component table" family), `shared-link-receiver` (`text=Sheets` click → "Estimates"), `teamspace-collaboration` (copy), `route-transition-performance` (estimate-route prefetch unchanged — verify no regression), `ask-flip-package-builder-live` (root alias targeting under tabs).

## 7. Performance and accessibility tests

- **Perf:** existing zero-re-render suites must stay green with the strip mounted (`tests/vitest/perf/estimate-sheet-render-relief.test.tsx`, `…render-baseline`, `…cursor-isolation`) — the tab container must not add re-render paths. Add a "switching tabs does not re-render the previous tab's row tables" case with the same pass condition as the current relief suite: non-active row tables render 0 times during edits and 0 times after switching away. Tab switch budget: at most one `tabs` read (if stale) + one `tabTree` read; no whole-estimate row fetch.
- **Reusable-source scale:** DOM/server-action fixture = 20 projects × 5 estimates × 3 tabs. Initial render lists all readable projects by default, performs one project-list call, zero outline calls, and zero row-detail calls. Expanding one project performs one estimate-list call; expanding one estimate performs one outline call; preview/insert is the first path allowed to fetch row detail. `getReusableEstimateOutline` p95 must be under 500 ms in the local harness or the release must add pagination/search-first before beta exposure.
- **XLSX export scale:** benchmark keeps the current single-tab fixture within 10% of its baseline and adds a 5-tab × 500-row fixture under 1.5 s local build time with buffer under 10 MB. Failure triggers the streaming writer escape hatch before multi-tab export ships.
- **Accessibility:** tablist keyboard semantics (§3 strip test); non-drag insertion path for every drag action (context menu + bulk add + picker — asserted in §3 panel test); live-region announcements; focus management on tab delete; Storybook a11y addon coverage for the new strip/empty-state stories (`@storybook/addon-a11y` already installed, `package.json:77`).

## 8. Targeted test matrix by implementation phase

| Phase ([10](10_IMPLEMENTATION_PHASES.md)) | Gates (beyond "no new failures vs baseline") |
|---|---|
| 0 audit/terminology | record baseline failure list; no code — no tests |
| 1 DB foundation | `estimate-tabs-schema.test.ts`; `prove:estimate-tabs-rls`; P1–P5 proofs; type regen + `bun run type-check` |
| 2 repo/domain | tab actions + loaders unit/action tests; legacy-wrapper equivalence test (wrapper output ≡ old loader on single-tab fixtures); characterization suites untouched-green |
| 3 editor UI | `estimate-tab-strip.test.tsx`; extended dnd/cost-input suites; perf suites green; e2e 1–5 |
| 4 rebrand | copy-table-driven test updates batched with copy (source-contract tests **will** break — update in the same commit; 84 contract files audit, 01 §15); e2e label updates |
| 5 templates panel | panel DOM tests; insert action tests; denial scenarios; e2e 6–7 |
| 6 export | §5 suite; e2e 8; benchmark |
| 7 hardening | full matrix re-run; RLS harness; manual QA list (05 §14); hosted export smoke |
| 8 cleanup | shim-deletion grep gates (04 §12); rename batches with contract-test updates |

## 9. Final validation commands (exact, from `package.json:5-46`)

```
bun run validate          # = type-check && lint && lint:design-system && lint:design && test && test:dom
bun run type-check
bun run lint
bun run lint:design-system
bun run lint:design
bun run test
bun run test:dom
bun run build
bun run launch:verify-hosted-export      # hosted smoke — provider proof, runs only with env + authorization
bunx playwright test e2e/estimate-tabs.spec.ts e2e/workshop-template-insert-smoke.spec.ts e2e/workshop-project-specific-unlink-smoke.spec.ts   # targeted specs for changed areas (flag-gated; see §6)
node scripts/prove-estimate-tabs-postgres.mjs   # new RLS/backfill proof (Phase 1+)
```

`bun run validate` is the canonical aggregate (verified `package.json:42`). Design-system gate applies to all new UI (`scripts/enforce-app-design-system.mjs`: ≤12px explicit sizes, regular/medium weights, `rounded-xs`, zero tracking, regular Phosphor icons — 05 §13).

## 10. Existing tests likely to need updates (named)

- **Copy-coupled (Phase 4):** `estimate-sheet-tree-dom` ("Sheets" tab), `estimate-sheet-cost-inputs` ("Sheet controls" family), `project-publication-header.test.tsx` ("Estimate sheets to include"), `teamspace-collaboration-header.test.tsx`, `project-publication-page.test.tsx` (OG copy), `activity-copy-regression.test.ts`, `mass-deletion-ui-contract.test.ts` (**DELETE SHEET phrase — atomic with `bulk-action.ts` tokens**), share suites asserting "Sheets".
- **Structure-coupled (Phases 3/6):** perf suites (provider nesting), `proposal-workbook`/`proposal-export-route-workbook` (multi-tab additions; single-tab assertions stay), `estimate-sheet-version-control-ui` (tab scope), `template-gallery` (picker tab select).
- **Source-contract landmines:** 84 readFileSync-style tests break on renames even with behavior preserved — schedule renames only in Phase 8 batches with their test updates (01 §15).

## 11. Manual/browser QA

The 10-scenario list in [05](05_ESTIMATE_TABS_UI_UX_PLAN.md) §14 (desktop + 375px) plus: ExcelJS workbook inspection in a real spreadsheet app (07 §9); hosted export link from an old bookmark; invite deep link into a tabbed estimate; share-page rendering of a v1.1 (pre-tab) snapshot and a v1.2 snapshot side by side. Workshop-browser caveats from project memory: verify via the user's Chrome session; background tabs suspend the workshop (avoid background-tab automation); fresh worktrees need `.env.local` copied.

## Evidence Used

- `package.json:5-46` (exact script names); `vitest.config.ts`; `playwright.config.ts`
- `tests/vitest/estimate-sheet-tree-dnd.test.tsx`, `estimate-node-reorder-action.test.ts`, `component-library-templates-schema.test.ts`, `proposal-workbook.test.ts`, `estimate-sheet-version-control-ui.test.tsx`, `tests/vitest/perf/*`
- `e2e/estimate-tree-dnd.spec.ts`, `workshop-project-specific-unlink-smoke.spec.ts:315-332`, `shared-link-receiver.spec.ts`, `workshop-library-demo-smoke.spec.ts:53-105`
- `scripts/prove-notification-rls-postgres.mjs`; `scripts/enforce-app-design-system.mjs`; `scripts/benchmark-proposal-workbook.ts`; `scripts/verify-hosted-export-route.ts`
- `.ai/10_state/current-state.md:60-68` (baseline failures); `tests/unit/reset-baseline.test.ts:54` (re-verified live)
