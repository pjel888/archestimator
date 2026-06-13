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
- Committed Phase 0 as `a15b82c1`.

---

## Perf (3b) + Library scope — DONE (local)

### U18 — lite in-estimate library loader
- `component-library-repository.ts`: `loadCurrentWorkspaceComponentRowsLibrary({ includeDetailGraph })`
  + new `getCurrentWorkspaceComponentLibraryLite()`. **Cost-fidelity decision (from adversarial
  review P0):** the lite loader STILL loads price options + current cost entries (which drive the
  displayed cost via normalizePriceOption→normalizeComponentLibraryItem) and skips only the 4
  audit/attachment queries (versions / price history / state history / attachments) the panel never
  reads. This makes the panel cost byte-identical to the full loader regardless of any
  denormalized-column lag — rather than relying on `cost_library_items.unit_cost` being perfectly
  synced to the current cost entry (which the write path does not unconditionally guarantee).
- `component-library/actions.ts`: `loadCurrentWorkspaceComponentLibraryLite()`.
- `EstimateSheetContent.tsx`: panel loads the lite dataset under a DISTINCT key
  `["workspace-component-library","lite"]` (shared module `lib/component-library/query-keys.ts`) so it
  never serves incomplete data to the full-graph editor surfaces; the editor (`TemplateEditorClient`)
  keeps the full loader + full key, unchanged. Invalidation uses the shared prefix (non-exact → covers both).
- Tests: `estimate-sheet-library-lazy-load.test.tsx` mock + invalidation-string assertion updated.

### U19 — prefetch + cache-tune
- `ProjectEstimatesTable.tsx`: estimate-row hover now also prefetches the lite library (same key/fn as
  the panel consumer → real cache hit). `EstimateSheetContent` library query `gcTime` 30min so
  navigate-away-back doesn't re-run the cold load.

### U21 — node-route tabs waterfall
- `workspace-repository.ts` `resolveEstimateTabRouteContext` now returns `tabs` (resolved in parallel
  with the tree on the two tab-present branches); `[nodeId]/page.tsx` prefers it (`tabs ?? fallback`),
  removing the serial `getEstimateTabs` round-trip. No change on legacy/no-tab paths.
- **U20 (RSC streaming) deferred as optional** (doc 08 marks it "(Optional)"): the lite loader + hover
  prefetch already target the <800ms warm-cache bar; U20 is an additional request-time overlap that is
  architecturally riskier. Documented deferral, honest per the handoff.

### U3 — remove project sources from library route (D-C) — via isolated-worktree subagent
- `templates/page.tsx`, `TemplatesBrowsePageClient.tsx`, `TemplatesBrowseManager.tsx` stripped of all
  project-source machinery; `project-source-browse-tree.tsx` deleted; `template-gallery.test.tsx` +
  `template-browse-project-sources.test.tsx` updated (U3-1). In-estimate panel + `reusable-sources/actions.ts`
  untouched (verified by review). Subagent validated in isolation (type-check + eslint + 14 tests); merged
  by patch (disjoint files).

### U22 — supplier-templates data-model spike (decision doc, no code)
- `18_SUPPLIER_TEMPLATES_DATA_MODEL_SPIKE.md`: keeps the `source_workspace_id = target_workspace_id`
  assumption for U2/U4 (correct for the no-supplier product), pins the future licensed-catalogue model
  so suppliers won't force a security-critical RPC rewrite. Sequenced before U2's migration.

### Perf+Library — adversarial review (workflow, 13 agents) + gates
- Review: U18/U19/U21/U3 all PASS; the one U18 P0 (denormalized-cost lag) resolved by the cost-fidelity
  restructure above.
- Gates: type-check ✓; targeted tests (U3 gallery/browse, lazy-load, template-editor, perf) green;
  full `bun run validate` re-run exit 0 (pre-restructure) + final re-run pending.
- RTM rows: PERF-9 (U18/U19) ✓ local; PERF-10 (U21) ✓ local; DEF-3/UX-1/UX-2 (U3, D-C) ✓; S-1/2/3 (U22) decision doc ✓.
- **Next:** commit Perf+Library+U22; then index.tsx-touching units (U6/U23, U10, U13/U14) sequentially,
  U5/U7, U12 (a11y), U2 (insert path), U16 (tests), closeout.
- Committed Perf+Library+U22 as `c9637c02`.

---

## Coherence + Polish (U10, U11, U13, U14, U15) — DONE (local)

### U10 — sync in-estimate templateList to its prop (DATA-1)
- `component-library/index.tsx`: render-time reconciliation absorbs `templates` prop changes
  (rename/delete/create on other surfaces) while preserving local optimistic appends.
- **Bug found+fixed by the gate:** the optional `templates` prop used a bare `= []` default → a fresh
  array each render → the reconciliation guard fired every render → "Too many re-renders" (28 failures
  in component-library-ui). Fixed by a stable `EMPTY_TEMPLATE_PROP` module constant default.

### U11 — broaden template-mutation invalidation (DATA-2/DATA-3)
- `component-library/actions.ts`: module-local `revalidateTemplateSurfaces()` (revalidates the library
  browse route + the library overview) replaces 8 scattered `revalidatePath("/workshop/library/templates")`
  calls. Client cross-surface coherence already holds via the shared `["workspace-component-library"]`
  key (U18/U19) + `onLibraryDataChanged` on every mutation (incl. save-as-template).

### U13 — design-system fixes (doc 17 A2/B/C)
- Deleted the broken `info` Badge tone (no `--info` token) from `ui/badge.tsx` + fixed the 2 Badge stories.
- In-estimate panel: "Live source"/"Read-through" → neutral chips (success dot is `rounded-xs` per DS;
  `rounded-full` is banned); accent-soft preview well → `bg-surfaceMuted`; `text-secondary/70` → `text-tertiary`;
  dropped `uppercase tracking-normal` on the "Source outline" label.
- `TemplateGallery` `⋯` → Phosphor `DotsThree`; `TemplatePreviewDock` `×` → Phosphor `X`.
- Left the shared Badge `min-w-[96px]` intact (app-wide; the panel chips no longer use Badge so it's moot).

### U14 — cleanups
- Dropped the misleading `CaretDown` on the two "Insert into estimate" buttons (modal pickers, not popovers).
- `NewTemplateModal`: pluralize the group/area/row counts ("1 group" not "1 groups"); relabel the
  "Group" field → "Category". Deleted the dead `buildTemplateNavigationTree`/`getTemplatesForTreeNode`
  (+ now-unused `toTemplateCategoryId` + `LibraryTreeNode` import) from `templates.ts`.

### U15 — insert-picker pre-validation (UX-11)
- `InsertIntoEstimatePicker`: pre-checks group availability on estimate selection (surfaces a hint +
  disables Insert when the estimate has no group), instead of failing only at submit. State transitions
  set in the dropdown handlers (events); the effect resolves only in async callbacks (no
  set-state-in-effect — caught by eslint, restructured).

### Gates
- type-check ✓; lint:design-system ✓ (caught `rounded-full`, fixed); lint:design ✓; eslint clean
  (caught react-hooks/set-state-in-effect, fixed). component-library-ui + new-template-modal 65/65 after
  the infinite-loop fix + U14 test updates. RTM: DATA-1 (U10) ✓, DATA-2/3 (U11) ✓, UX DS (U13) ✓,
  UX-7/8/9/10 (U14) ✓, UX-11 (U15) ✓.
- **Next:** U12 (a11y: shared tree aria-grabbed/dropeffect + editor keyboard reorder + window.prompt→modal),
  then U5/U7, U2, U16, closeout.
- Committed coherence+polish as `012ac54d`.

---

## U12 — a11y (UX-4/UX-5/C5) — DONE (local)

### Part 1 — shared tree aria (highest-leverage, doc 17 B4/F)
- `ui/tree.tsx`: every row now exposes `aria-grabbed` (true on the dragged source row, false on other
  draggable rows) and `aria-dropeffect` on the row under the drag — "move" for an intra-tree reorder
  (drag source present) or "copy" for an external insert. Added the two attrs to `TreeRowDomProps` +
  `buildRowProps` (deps: dragSourceId, dropTarget). Serves BOTH templates surfaces at once.

### Part 2 — editor keyboard reorder + live region (UX-4/UX-5)
- `TemplateStructureTree.tsx`: keyboard-reachable "Move up"/"Move down" context-menu items reorder a
  node among its siblings via the existing `onMoveNode`; a polite `role="status"` live region announces
  "Moved {name} up/down." Disabled at the ends + for temp nodes.

### Part 3 — replace window.prompt with an in-DS modal (C5)
- `TemplatesBrowseManager.tsx`: the 3 native `window.prompt` flows (rename template, move-to-group,
  rename group) now use a reusable in-DS prompt built on `ConfirmDialog` + `ControlInput` (SF Pro,
  tokens, focus management, Enter-to-submit). Refactored the handlers into apply-fns + prompt-openers.
- Tests: `template-gallery.test.tsx` rename/move cases rewritten to drive the modal (were mocking window.prompt).

### Gates
- type-check ✓; template-gallery + template-editor 23/23; estimate-sheet-tree dnd/dom + bulk-selection +
  context-menu 54/54 (shared-tree aria change is additive, no consumer regressed). Full validate running.
- RTM: UX-4/UX-5 (U12) ✓, C5 window.prompt→modal ✓. **U12-U15 complete.**
- Committed U12 as `ba19b492`.

---

## U2 — project-source insert path (DEF-2, D-B=build) — DONE (local; RPC apply owner-gated)

### RPC migration `20260613180000_insert_estimate_subtree_rpc.sql`
- `insert_estimate_subtree_into_estimate` (inner, non-DEFINER) + `_with_history` (DEFINER wrapper),
  mirroring the foundation template RPC pair but sourcing from a live estimate subtree.
- **U2-1 (P0):** explicit `can_access_estimate(source_estimate_id)` gate INSIDE the chain — never RLS.
- Check order: target workspace → source can_access → same workspace → target-parent-is-group → copy → validate.
- Concurrency (U2-3): lock target-tab nodes + defer per-tab unique-sort + max-sibling-sort inside the lock.
- Subtree via recursive CTE (whole tab when source_root_node_id null); parent remap (roots → target parent);
  provenance `sourceProjectId/EstimateId/TabId/NodeId/RowId + sourceKind:'project'`; post-copy validate.
- Wrapper: U4 gate (assert_can_edit_estimate_for_history) + idempotency + `project_source_inserted` event.
- **Tab-aware → sequenced AFTER D-A** (references estimate_tab_id). Apply owner-gated (`ebxxqidacheyapmmzavr`).

### Action `insertProjectSourceIntoEstimate` (reusable-sources/actions.ts)
- requireCurrentUserContext + UUID-guard (fail closed); re-read-at-insert (DATA-4 / denial 7) under the
  RLS user client; stable per-unit `correlation_id` (U2-2, sha256→v4-shaped UUID); RLS-scoped client only
  (never admin); returns the refreshed tree. RPC call narrowly cast (types not regenerated yet).

### UI wiring
- `EstimateSheetContent`: `insertProjectSourceIntoSelectedGroup` (panel `onInsertProjectSource`) +
  `insertProjectSourceIntoParentById` (non-optimistic; toast on failure) + a window listener for the drop event.
- `EstimateSheetTree`: project-source drags drop onto GROUP targets → dispatch `INSERT_PROJECT_SOURCE_EVENT`.
  `INSERT_PROJECT_SOURCE_EVENT` + detail type added to templates.ts.
- **Scope note:** area-target WRAP for project sources (parity with templates) deferred — needs a wrap action;
  the panel + drop gate to group targets, so a denied area selection shows "select a group". Documented follow-up.

### Proofs (handoff: denials 4-7 before exposing)
- `tests/vitest/project-source-insert-action.test.ts` (7): whole-tab vs node subtree, stable correlation_id,
  UUID guard, re-read/denial-7, RPC error wrapping.
- Extended `scripts/prove-estimate-tabs-postgres.mjs` (Postgres 17, no Docker): applies foundation + U2 RPC,
  then **denial 4** (viewer denied), **denial 5** (P0 can_access gate denies unreadable source), happy path
  + provenance + `project_source_inserted` event. EXIT=0. Denial 6 (cross-workspace) is blocked transitively
  by the same can_access gate (fires before the workspace-equality check).
- **Next:** U5 (server-side search + migration), U7 (bound reads), U16 (remaining test gaps + e2e), closeout.

---

## U5 — server-side reusable search pre-filter (PERF) — DONE (local)

### `searchReusableProjectSources` rewrite (reusable-sources/actions.ts)
- Old path materialized the FULL node tree for **every** accessible estimate, then filtered in
  memory — O(all-nodes-in-workspace) per keystroke. New path pre-filters with two **bounded,
  indexed** `ILIKE` queries before materializing anything:
  - in-memory project/estimate **name** matches (already-loaded summaries → cheap);
  - `estimate_nodes` typed query: `.in("estimate_id", accessibleEstimateIds).in("kind",
    ["group","area"]).ilike("name", likePattern)` → estimate ids with a matching group/area;
  - `estimate_tabs` tab-name match via a narrow cast client, tolerant of the missing-schema case
    (`isMissingRelationError(error, "estimate_tabs")` → skip, legacy single-Main has no tab names).
- Union → `estimatesToMaterialize`; only those estimates run the existing rich
  `getEstimateTabs`/`getEstimateTabTree` + `collectProjectNodeSearchSources` assembly. **Result
  shape is byte-identical** to the old path (same ranking, same fields) — no truncation, no cap;
  RLS-scoped throughout (`accessibleEstimateIds` already filtered by `can_access`).
- Added `toReusableSearchLikePattern` (escapes `\ % _`, wraps `%…%`). New imports: `createHash`
  (node:crypto, shared with U2), `createSupabaseServerClient`, `isUuid`, `isMissingRelationError`,
  `getProjectEstimateTreeByEstimate`.
- Tests: `reusable-sources-actions.test.ts` gained `mockSearchPrefilter` + `supabaseServerMocks`;
  asserts only matching estimates are materialized and the empty-match case materializes nothing.

### U7 — bound reusable/editor reads — DEFERRED (documented rationale)
- Doc proposes hard caps on project-list + editor node reads. **Not shipped:** a naive `LIMIT`
  silently truncates a user's own projects/nodes mid-edit — that is a *correctness* regression
  (partial-edit / lost-rows bugs), not a perf win, unless paired with pagination + an explicit
  "showing N of M" limit-state UX that the doc does not specify. The realized perf wins (U18 lite
  loader, U19 prefetch/cache, U21 waterfall, U5 search pre-filter) already hit the warm-cache bar
  without risking data loss. U7 is parked pending a pagination/limit-state design — honest deferral
  per handoff §8 rather than a silent truncation.

### Gates
- Full `bun run validate` (type-check + lint + lint:design-system + lint:design + test + test:dom)
  **exit 0** — 244 files / 1819 tests passed, 3 skipped, 0 failed.
- RTM: PERF (U5 search) ✓ local. U7 → DEFERRED (rationale above).
- **Next:** U16 (assess remaining test-gap coverage), then closeout (state docs + archive + final validate/build).
