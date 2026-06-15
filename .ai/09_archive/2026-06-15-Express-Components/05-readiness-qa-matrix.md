---
title: Express Components Readiness QA Matrix
type: test
date: 2026-06-15
---

# Express Components Readiness QA Matrix

## Claim To Prove

Express components can be authored as project-scoped estimate rows without a new DB shape for day-0 U1-U4. Project-specific conversion hardening, Project folder projection, and promotion have explicit fast-follow gates and cannot silently widen the first ship slice.

## Scenario Matrix

| ID | Scenario | Evidence Required |
| --- | --- | --- |
| Q1 | Add row creates express row | Vitest asserts insert payload, focused name field, metadata, and no blank placeholder classification |
| Q2 | Inline name edit | Vitest asserts local edit, commit on blur/Enter, optimistic tree patch, server action payload |
| Q3 | Inline description edit | Vitest asserts long description truncates clean state and persists full value |
| Q4 | Inline unit edit | Vitest asserts unit display updates in quantity cell and material card |
| Q5 | Inline unit cost edit | Vitest asserts subtotal and total recalculate before and after server reconciliation |
| Q6 | Optional image URL/source | Unit/browser test asserts image set/clear path and fallback behavior; file upload is separately gated by storage policy work |
| Q7 | Save failure | Vitest asserts failed state, visible recovery, and no silent data loss |
| Q8 | Duplicate linked rows | Regression test asserts both instances show make-project-specific action |
| Q9 | Detach first duplicate | Regression test asserts first shows badge and second remains eligible |
| Q10 | Express row in Project folder | Component-library test asserts project-aware Components shows Project node with express row |
| Q11 | Detached row in Project folder | Component-library test asserts detached row appears with project-specific label |
| Q12 | Blank excluded | Component-library test asserts legacy blank placeholder rows do not appear |
| Q13 | Promote express to library | Action/RPC test asserts library component and price option are created once and row relinks to the new library item |
| Q14 | Project-source/template reuse | SQL/action test asserts the project-source subtree copy RPC and estimate-template copy RPC create fresh row ids and fresh `metadata.expressComponent.id` UUIDs while preserving express kind/provenance metadata; this is a required implementation change because current RPCs preserve metadata verbatim |
| Q15 | History/audit | Test asserts express create/edit events do not render as blank-row audit labels |
| Q16 | Proposal/export totals | Existing export tests cover totals after express unit cost/misc/quantity changes |
| Q17 | Fast edit before insert success | Vitest asserts edits are buffered until persisted row revision is known, then committed in order |
| Q18 | Insert failure recovery | Vitest asserts draft row shows Retry/Delete and retry reuses row id or correlation |
| Q19 | JSON merge preservation | Action test asserts express edit preserves unrelated metadata and source snapshot keys |
| Q20 | Workspace-only Components route | Component-library test asserts no project rows are fetched or shown without explicit project context |
| Q21 | Promotion retry | Action/RPC test asserts retry after partial success uses provenance/idempotency and does not create duplicates |
| Q22 | Active-editor virtualization fallback | >=75-row test/smoke asserts virtualization is disabled while `activeExpressEditorCount >= 1` or the one-in-flight-editor constraint is enforced, active content is not hidden by `content-visibility`/96px intrinsic sizing, no overlap occurs, and virtualization restores after editors close |
| Q23 | Keyboard caret policy | DOM test asserts express text fields do not use the grid handler; ArrowLeft/Right/Home/End stay in the caret and ArrowUp/Down follow doc 09 |
| Q24 | Focus lifecycle | DOM test asserts `pendingFocusRowId` targets `data-express-field="name"` on insert and focus after commit/Escape/fail/retry follows doc 09 |
| Q25 | Contrast and visual tokens | Static or browser check asserts load-bearing express text, Project-specific badges, Express/Project badges, placeholders, helper text, and field values are `#5D5D5D` or stronger where required, active values `#3D3D3D`, app-scale type, zero letter spacing, and `rounded-xs` surfaces |
| Q26 | Mobile/touch/narrow viewport | Browser/touch smoke asserts narrow viewport editing, tappable recovery actions, on-screen-keyboard resize, and no active-row overlap |
| Q27 | Viewer/read-only block | UI and direct server-action tests assert viewers cannot author/edit express rows through insert, update, or replace; the test must fail if those actions omit `assertCanEditEstimate` or equivalent RPC edit checks |
| Q28 | Promotion permission boundary | UI and server/RPC tests assert promotion follows the current library-write policy exactly (`is_workspace_editor` parity unless superseded) plus estimate edit permission; project/read-only viewers cannot promote |
| Q29 | Two-client insert visibility | Integration/manual test asserts optimistic draft stays local until persistence; because row data is not realtime-synced today, peer visibility is eventual/manual refetch unless a new row-sync workstream is explicitly added |
| Q30 | Two-client stale edit conflict | Test asserts stale `expected_row_revision` produces the documented recovery UX and does not lose unrelated fields |
| Q31 | Feature flag off | Test asserts Add row reverts to legacy blank behavior while persisted express rows render readable fallback cards |
| Q32 | U2 history migration | SQL harness asserts legacy blank predicate produces `row_blank_added`, express predicate produces `row_added` or chosen express event, with up/down/verify SQL |
| Q33 | U7 promotion RPC | SQL/action harness asserts atomic create+relink, row lock, one default price option, folder target, idempotent retry, and no orphan on failure |
| Q34 | Metadata read path | Repository/type tests assert `metadata.expressComponent` is selected, mapped, typed, and survives project-source copy |
| Q35 | Revert/replace/move surfaces | DOM/unit tests assert `clearRowComponent`, `moveRowComponent`, and `applyEditableValuesToLibraryItem` do not silently destroy express data except when clear intentionally reverts to a legacy blank |
| Q36 | AI read-context/activity | Test asserts express insert is not summarized as "Blank row added" in activity composer or AI read context |
| Q37 | Proposal/charts grouping | Export/charts tests assert express row totals, section/division/category/supplier placement, and consolidation behavior are intentional |
| Q38 | Static docs gate | Script/checklist asserts docs 07-12 exist, frontmatter is valid, internal links resolve, Mermaid blocks parse, no missing R/U/AE/Q/RSK traceability cells remain, and stale file references are acknowledged |
| Q39 | Exact Add row assertion migration | `estimate-sheet-library-insert.test.tsx:~247` now asserts express insert payload/editor focus instead of manual placeholder; `estimate-sheet-cost-inputs.test.tsx:220` asserts keyboard Add row creates an express editor; `estimate-sheet-cost-inputs.test.tsx:230` or successor preserves legacy persisted blank placeholder rendering |
| Q40 | R8 delete/select regression | DOM/unit tests assert express rows can be selected, multi-selected where supported, deleted through the normal row delete path, and do not break existing action-rail focus/selection styling |
| Q41 | Projection authz negative | Component-library/action tests assert unauthorized project ids and workspace-only routes return no Project projection rows and cannot infer project-local express rows |
| Q42 | Published express image snapshot | Publication/proposal test publishes an estimate containing an express row with an image URL and asserts the snapshot row carries `source_snapshot.imageUrl` without clobbering other source snapshot keys |
| Q43 | U5 repro or non-repro artifact | Test/evidence gate asserts U5 remains verification plus normalization hardening unless `evidence/u5-duplicate-instance-repro-note.md` contains the real-project duplicate capture or a real-project non-reproduction record |
| Q44 | AI package-builder metadata preservation | Unit/action test asserts `src/lib/ai/package-builder/apply.ts` replacement of an express row server-merges or blocks wholesale metadata writes so `metadata.expressComponent` survives |
| Q45 | Concurrent insert sort order | SQL/action test asserts two same-node express inserts allocate distinct `sort_order` values inside the RPC or retry the second insert with the same correlation id without duplicate drafts |
| Q46 | Promotion RPC grant and folder boundary | SQL/action tests assert SECURITY DEFINER grants/search_path are correct, target folder must belong to target workspace, callers lacking current library-write permission are rejected, current policy parity is documented, and required default price-option fields are populated |
| Q47 | Draft abandon/navigation | Browser/unit test asserts unsaved drafts prompt or delete only local draft state on navigation/tab switch and never send a partial update before persisted row revision exists |
| Q48 | Static/provider evidence gate | Checklist/script asserts doc frontmatter/links/traceability pass and U7 provider proof captures helper definitions, policy names, function grants, folder workspace binding, and negative permission cases before promotion coding |
| Q49 | Express text render isolation | Perf test modeled on `estimate-sheet-render-relief.test.tsx` asserts typing in one express text field re-renders only that row/minimal owner shell, not the full row tree |
| Q50 | Replace/move round-trip identity | DOM/action test replaces or moves an express row through the server replace path, reloads/refetches, and asserts `metadata.expressComponent` and required source snapshot keys survive or the operation is explicitly blocked |
| Q51 | Copy rekey collision guard | SQL/action test copies the same express row into two targets and asserts row ids and `metadata.expressComponent.id` values are all distinct |
| Q52 | No-realtime honesty | Two-client test or documented manual proof asserts that without a row-sync workstream, peers do not rely on live row propagation for correctness; stale-revision integrity still works through `expected_row_revision` |
| Q53 | Source-less edited row leak | SQL/repository test uses the captured legacy row shape to prove a source-less row with edited material is classified deliberately and does not leak into Project projection as an express row |
| Q54 | Observability sink | Unit/static check asserts express events call the pinned telemetry sink or structured log prefix in doc 12 for insert/save/conflict/virtualization outcomes |
| Q55 | 300-500 row fallback stress | Spike/browser smoke exercises active express editing on a 300-500 row estimate or records an approved bounded-window alternative before implementation depends on all-row mounting |
| Q56 | UltraQA adversarial pass | UltraQA/report covers viewer bypass, replace/move clobber after reload, copy rekey collision, no-realtime peer visibility, stale revision recovery, flag-off persisted render, 300-500 row virtualization stress, and source-less renamed-row projection leak |

## Targeted Test Commands

Start with focused Vitest runs:

```bash
bun test tests/vitest/estimate-sheet-library-insert.test.tsx
bun test tests/vitest/estimate-sheet-cost-inputs.test.tsx
bun test tests/vitest/component-library-manager.test.tsx
bun test tests/vitest/library-folder-tree-selection.test.tsx
bun test tests/vitest/reusable-sources-actions.test.ts
```

Broaden only after shared row update or database behavior changes:

```bash
bun run type-check
bun run lint
bun run validate
```

## Browser Smoke

Run browser proof after implementation because the feature is user-visible:

- Desktop workshop estimate route: add row, edit name/unit/cost/description, verify no overlap.
- Virtualized workshop estimate route with >=75 rows: activate an express editor in the middle of the list, verify virtualization disables while editing, active content remains visible, and no overlap/scroll jump occurs.
- Narrow desktop/sidebar width: long name and description truncate or wrap safely.
- Touch/narrow viewport: edit name/description/unit/cost, open and close the on-screen keyboard, tap recovery actions, verify no hover-only control blocks completion.
- Components tab: Project folder visible and selectable.
- Workspace-only Components: no Project folder or project row fetch without project context.
- Unauthorized project context: Project folder request for an inaccessible project id returns no project rows and no leaked labels.
- Keyboard path: Add row, type name, Tab to unit cost, Enter/blur commit, Escape revert.
- Drag/drop path: replace an express row with a library component, then clear it.
- Row actions path: select, multi-select if supported, and delete an express row without breaking existing action rail or row focus behavior.
- Publication path: publish an estimate with an express image URL and inspect the published snapshot for `source_snapshot.imageUrl`.
- Promotion cache path: promote an express row while estimate and library surfaces are open; verify active estimate row query, workspace component-library lite/full datasets, active library route datasets, and Project projection refresh without stale Express-only state.
- Adversarial Day-0 path: attempt direct server-action viewer writes, replace/move an express row then reload, copy an express row twice from project-source/template context, verify peer visibility does not rely on nonexistent realtime row sync, force stale revision recovery, toggle the flag off after rows exist, stress 300-500 rows, and exercise the source-less edited-row projection edge case.

## Database Readiness Gates

- No migration is required for U3's row update widening; the current update RPC already accepts richer row patches.
- U2 requires a migration to narrow insert activity classification. U7 requires a migration for the selected atomic promotion RPC. Neither migration creates a new express table.
- U2 also requires either in-RPC sibling `sort_order` allocation under lock or app-action retry after a deferred `(node_id, sort_order)` collision using the same insert correlation id.
- U7 cannot start until read-only provider evidence pins helper semantics, grants, policies, target-folder workspace binding, and negative member/editor/viewer cases.
- Because current RPC JSON fields preserve omitted keys and replace sent keys, server actions or RPCs must prove complete merge behavior only for operations that intentionally change `metadata` and `source_snapshot`.
- Because replace/move paths use a wholesale replace RPC, they must prove complete merge/carry behavior or block express replacement before release.
- Because project-source/template copy RPCs currently preserve metadata verbatim, they must prove fresh `metadata.expressComponent.id` generation before Q14/Q51 pass.
- If storage upload is implemented, verify bucket policies and RLS on `storage.objects`.
- Regenerate Supabase types only if migration/type surface changes.
- Keep all provider changes scoped to Archestimator project `ebxxqidacheyapmmzavr`.

## Release Risks

- Row virtualization is fixed-height today; without the selected day-0 disable-while-editing fallback, active express editors can overlap neighbors once the estimate has at least 75 rows.
- Disabling virtualization can mount every row on long estimates; implementation must either accept the measured 300-500 row cost with evidence or use a bounded non-virtual window around active editors.
- Updating material fields through the same queue as numeric fields may create stale revision conflicts if rapid edits are split into multiple RPCs.
- Project folder projection may be expensive or leaky if it scans workspace projects; start with explicit project context and project/estimate access checks.
- Promotion can create duplicate workspace library items if idempotency/provenance is not implemented before create.
- Legacy blank rows must remain readable after Add row changes.
- Realtime peers, read-only roles, feature-flag rollback, and existing legacy rows are release gates, not optional polish.
