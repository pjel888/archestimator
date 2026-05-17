# Execution Ledger

**Purpose:** Chronological record of Archestimator implementation slices, validation gates, decisions, and handoff notes for future sessions and agents.

## Current active thread

- **Date:** 2026-05-17
- **Branch:** `docs/mvp-screen-architecture`
- **Goal:** Continue production workspace hardening and Cost Library Management v1.
- **Status:** Cost Library Management v1 implemented; full gates/review pending
- **Validation target:** `bun run validate && bun run build && bun run test:e2e`

## Ledger entries

### 2026-05-17 — Cost Library Management v1

**Status:** Implemented; local gates passing

**Type:** local-first library management + workspace UI + tests

**What changed:**

- Added `confidence` metadata to cost-library items while preserving pricing date/source/waste defaults.
- Added `upsertCostLibraryItem` so create/edit stays behind local repository mutation boundaries and does not mutate estimate rows already copied from library items.
- Added `saveCostLibraryItemAction` for persisted local runtime JSON updates.
- Expanded the workspace library tab into a management surface for creating/editing item name, category, type, unit, material/labor defaults, pricing date, source note, confidence, and waste percent.
- Preserved existing add-to-estimate, selected-row fallback insertion, and drag-to-grid workflows.
- Added unit and DOM coverage for library create/update behavior.

**Verification:**

- `bun run validate` — passed: type-check, lint, 32 unit tests, 10 DOM/Vitest tests.
- `bun run build` — passed.
- `bun run test:e2e` — passed: 7 Playwright tests.

**Follow-ups:**

- Add library import/export and bulk pricing update workflows.
- Continue visual QA and density tuning for the right-side library management panel.

### 2026-05-17 — Floor/room/area hierarchy and proposal detail slice

**Status:** Implemented; local gates passing

**Type:** production data model + selected-row inspector + proposal detail + keyboard UX

**What changed:**

- Added explicit `floors` and `spaces` arrays to the local-first estimate schema while keeping `sections` as the working grouping bridge.
- Added optional `spaceId` on estimate line items so production rows can reference a real floor/room/area location separately from proposal/BOQ grouping.
- Seed data now includes Ground Floor/Project-wide floor records and room/area space records; existing sample rows reference those spaces.
- New projects now initialize with a default floor and space for future location-aware rows.
- Selected-row inspector now exposes a location selector and location path, alongside proposal section, scope, quantity/rate, reset, and delete.
- Proposal preview and issued proposal snapshots now include detail rows with line totals and frozen floor/room/area references; `/proposals/[proposalId]` renders those detail rows under "Scope detail by location".
- Production Glide grid now listens to `onGridSelectionChange` so keyboard selection can update the selected-row inspector, reducing the prior keyboard-selection risk.

**Verification:**

- `bun run validate` — passed: type-check, lint, 30 unit tests, 9 DOM/Vitest tests.
- `bun run build` — passed.
- `bun run test:e2e` — passed: 7 Playwright tests.

**Follow-ups:**

- Add row move/copy operations between spaces and preserve proposal-section mapping behavior.
- Continue visual QA on the production Glide workspace and issued proposal print route.

### 2026-05-17 — PR #7 Codex remediation and selected-row grid controls

**Status:** Implemented; local gates passing

**Type:** PR review remediation + production grid-side controls + accessibility

**What changed:**

- Checked PR #7 formal and inline Codex comments with `gh`; found three actionable items.
- Removed `next-env.d.ts` from `.gitignore` so fresh checkouts keep Next ambient declarations before `tsc --noEmit`.
- Hardened `applyEstimateGridEdit` so library-backed grid edits use `detectLinkStateAfterEdit` and pricing/name/unit edits surface as `linked-overridden`.
- Clamped numeric Glide edits for quantity, unit cost, and waste percent to nonnegative values before they reach local persistence/schema validation.
- Moved proposal-section assignment, scope editing, quantity/rate edits, reset, and delete into a keyboard-accessible selected-row inspector tied to the production Glide grid.
- Removed the old full accessible row table from the production workspace surface.
- Updated unit, DOM, and Playwright coverage for the new selected-row controls.

**Verification:**

- `bun run validate` — passed: type-check, lint, 29 unit tests, 6 DOM/Vitest tests.
- `bun run build` — passed.
- `bun run test:e2e` — passed: 7 Playwright tests.

**Follow-ups:**

- Add explicit floor/room/area hierarchy objects beyond the current `sections` bridge.
- Improve proposal package detail mode with space/location references.
- Consider richer Glide custom cells after the selected-row side-panel workflow is stable.

### 2026-05-17 — Production library-to-Glide insertion slice

**Status:** Implemented; full gates/review passing

**Type:** production grid interaction + accessibility fallback + E2E

**What changed:**

- Added dnd-kit production drag handles to cost-library cards for library-to-Glide grid insertion.
- Added stable production `DndContext` id to avoid dnd-kit hydration id drift.
- Added visible drop indicator and visible-row offset tracking around the production Glide grid.
- Reused `insertLibraryItemAtGridRow` so production insertion stays behind the shared estimate-grid adapter.
- Preserved click-to-add into the selected working section.
- Added an accessible selected-library-item fallback: users can choose a specific library item, set a target grid row, and insert that intended item without drag gestures.
- Updated E2E coverage to verify production tray visibility, selected-item fallback insertion, section-aware mapping, live totals, and all existing route flows.

**Verification:**

- `bun run validate && bun run build && lsof -ti tcp:3020 | xargs -r kill; bun run test:e2e` — passed: type-check, lint, 27 unit tests, 6 DOM tests, production build, 7 Playwright E2E tests.
- Independent review initially failed the first-item-only fallback and weak integration assertion; remediation added selected-item fallback and stronger E2E verification.
- Independent re-review: PASS.

**Follow-ups:**

- Move proposal-section assignment and row actions from the accessible table into grid-side controls/custom cells without losing keyboard accessibility.
- Consider adding true keyboard drag semantics if drag remains a first-class production path.

### 2026-05-17 — Production Glide workspace surface slice

**Status:** Implemented; full gates/review passing

**Type:** production UI migration + code intelligence + tests

**What changed:**

- Installed/verified the requested code-intelligence tools: ChunkHound, GitNexus, and CodeGraph.
- Ran ChunkHound indexing/search, GitNexus repository analysis, and CodeGraph export at the start of the migration slice and again after substantive changes.
- Added `.ai/03_plans/production-glide-workspace-migration-slice.md`.
- Added `src/components/production-estimate-glide-grid.tsx`, a client-only Glide Data Grid production sheet backed by `src/lib/estimate-grid/adapter.ts`.
- Updated `src/components/estimate-workspace.tsx` to dynamically render the production Glide sheet with `ssr: false`, while preserving the accessible row-level proposal-section mapping/actions below the grid during the incremental migration.
- Updated E2E coverage to assert the production Glide grid and migration banner are present on the project page.
- Updated Vitest setup with `ResizeObserver` and canvas mocks required by Glide under jsdom.
- Added `.gitignore` coverage for generated `.ai/14_code_intelligence/` artifacts.

**Verification:**

- `bun run validate && bun run build && lsof -ti tcp:3020 | xargs -r kill; bun run test:e2e` — passed: type-check, lint, 27 unit tests, 6 DOM tests, production build, 7 Playwright E2E tests.
- Independent review — PASS. Reviewer checked SSR safety, runtime/build risk, proposal-section mapping preservation, and E2E robustness.
- GitNexus warnings for missing YAML parser were resolved by installing `tree-sitter-yaml`; follow-up GitNexus indexing passed without parser warnings.

**Follow-ups:**

- Continue migrating proposal-section/action controls into first-class grid side panels/custom cells.
- Add production dnd-kit library insertion onto the Glide sheet using the existing adapter insertion target.
- Check PR comments/CI after push.

### 2026-05-17 — All-routes feature coverage and Glide hardening

**Status:** Implemented; full gates/review passing

**Type:** test coverage + production mapping hardening + spike migration support

**What changed:**

- Expanded Playwright route coverage from a narrow home/project smoke test to all current app routes: `/`, `/projects/[projectId]`, `/proposals/[proposalId]`, `/spikes/estimate-grid`, and unknown project 404.
- Added E2E coverage for key MVP features: section selection, blank row insertion, cost-library insertion, section-aware proposal mapping, live total recalculation, proposal issue, revision duplication, and spike fallback insertion.
- Reset local runtime JSON from seed before each E2E test to prevent local-first test pollution.
- Hardened workspace row creation so selected working section drives default proposal-section assignment for both blank rows and library rows.
- Hardened Glide spike scroll/drop support by tracking visible row offset.

**Verification:**

- `bun run validate && bun run build && lsof -ti tcp:3020 | xargs -r kill; bun run test:e2e` — passed: type-check, lint, 27 unit tests, 6 DOM tests, production build, 7 Playwright E2E tests.
- Independent re-review — PASS after visible drop indicator was changed to use `visibleDropRow` while data mutation keeps the absolute row target.

**Follow-ups:**

- Commit/push and update PR with route/feature coverage evidence.
- Continue production Glide migration after this coverage baseline.

### 2026-05-17 — Production workspace proposal mapping slice

**Status:** Implemented; full validation and independent re-review passing

**Type:** production workspace + model safety + tests

**What changed:**

- Re-checked GitHub/Codex inline comments on PR #5/#6 before continuing.
- Resolved Codex default-mapping issue by allowing library-insert rows to receive `proposalSectionId` and mapping new grid/workspace rows to the default proposal section.
- Resolved Codex non-billable header issue by making grid-adapter section header totals exclude rows skipped by grand totals.
- Added row-level proposal-section selectors to the production workspace sheet.
- Added proposal panel warning for billable rows with no proposal-section mapping.
- Changed proposal preview summaries to use proposal sections instead of working space sections.
- Added unit and DOM coverage for default proposal mapping, remapping, and non-billable section totals.
- Created `.ai/03_plans/production-grid-proposal-mapping-slice.md`.

**Validation so far:**

- `bun run validate && bun run build && bun run test:e2e` — passed: type-check, lint, 26 unit tests, 5 DOM tests, production build, 4 Playwright E2E tests.
- Independent review initially requested one inclusion-rule fix; adapter now reuses `isLineIncludedInTotal`, coverage verifies `to-follow` stays included and `excluded` is zero.
- Independent re-review: PASS.

**Follow-ups:**

- Commit/push and update PR with evidence.
- Next implementation slice: full production Glide/dnd-kit workspace migration and production drag/drop insertion after mapping controls are stable.

### 2026-05-17 — Autopilot documentation and production model bridge

**Status:** Implemented; full validation and re-review passing

**Type:** docs + data model + tests

**What changed:**

- Checked GitHub PR inline comments from Codex on PR #5 and PR #6.
- Fixed the actionable PR #6 issue: editing the visible Unit cost cell now updates `materialUnitCost` when material cost is the field used by totals.
- Added unit coverage for material-backed unit cost edits.
- Added `proposalSections` to estimates as the BOQ/proposal consolidation axis.
- Added optional `proposalSectionId` to estimate line items.
- Updated proposal snapshot summaries to consolidate by `proposalSectionId`, keep legacy `sectionId` fallback for old data, and surface unmapped working rows as an explicit unassigned proposal summary instead of silently dropping totals.
- Updated seed data so working estimate sections represent spaces/areas while proposal sections represent client-facing BOQ/trade sections.
- Created this execution ledger.
- Refreshed `.ai/01_roadmap/README.md` for MVP continuity.

**Validation so far:**

- `bun run validate && bun run build && bun run test:e2e` — passed after review remediation: 24 unit, 4 Vitest DOM, 4 Playwright E2E.
- Independent review requested changes for unmapped proposal-section fallback, ambiguous snapshot identifiers, restored immutable snapshot coverage, and stale ledger status.
- Review remediation applied: unmapped working rows are visible as unassigned, proposal summaries now use `proposalSectionId` as the primary consolidated identifier, immutable snapshot coverage is restored, and ledger status is current.
- Independent re-review: PASS. Targeted reviewer tests passed: 14 pass, 0 fail.

**Follow-ups:**

- Commit and push this slice to the current PR branch or a stacked production-model branch.

**Risks / notes:**

- This is a bridge, not the final full space hierarchy. `sections` still acts as the working space/area collection until the next schema migration introduces explicit floor/room/area objects.
- Runtime local JSON may still contain older estimates. Mutation code includes fallback handling for missing `proposalSections`.
