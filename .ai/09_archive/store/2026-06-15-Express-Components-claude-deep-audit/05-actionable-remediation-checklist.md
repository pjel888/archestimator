---
title: Express Components — Actionable Remediation Checklist
type: feat
date: 2026-06-15
auditor: Claude (Opus 4.8, 1M context)
purpose: A prioritized, codebase-AI-actionable to-do list to bring the plan pack to ship-ready. Work P0 → P2.
audience: the codebase AI that will improve the plan docs (and later implement the feature)
---

# Remediation Checklist

Each item: **what to change**, **where (plan doc + code evidence)**, **done-when**. Items marked
🟥 are derived from verified-critical findings, 🟧 from verified-high, 🟨 from medium.

---

## P0 — Correct the plan before it can be trusted to build from

- [ ] 🟥 **Rewrite KTD7 / U3 JSON-merge premise.** State that the update RPC preserves
  `metadata`/`source_snapshot` when the patch omits the key; server-merge is required ONLY when
  mutating those blobs (promotion relink, express-metadata edits). *(doc 02/04; RPC body in
  `evidence/live-supabase-verification.md §4`)* **Done when** KTD7 no longer claims wholesale
  replacement and U3 lists the precise merge rule + the `getValidatedEstimateRow` SELECT widening
  (`actions.ts:691`).

- [ ] 🟥 **State that U3 needs NO migration** (update RPC already accepts all express fields) but
  that **U2 history reclassification and any atomic U7 promotion DO need migrations.** Replace the
  blanket "no migration by default" headline with a precise migration ledger. *(doc 04, doc 05)*

- [ ] 🟥 **Reframe KTD6/U6 projectId as net-new plumbing, not a guard.** Add
  `app/workshop/library/components/page.tsx` to U6; pick the mechanism (query param vs
  project-scoped entrypoint vs estimate-side `component-library/index.tsx:608` which already has
  `projectId`). **Done when** U6 names the surface and the plumbing path. *(C2)*

- [ ] 🟥 **Reproduce the icon bug before specifying U5.** Capture both duplicate instances'
  `source_library_item_id`/`link_state` against a REAL project. If it can't reproduce with
  DB-backed components, reframe U5 as normalization hardening and fix KTD5 wording. Add the repro as
  the first (failing) test. *(doc 01, doc 04; `EstimateSheetContent.tsx:352/2552`, `cells.tsx:79-82`,
  `estimate-tree-data.ts:155`)* — **prerequisite for U5.**

- [ ] 🟥 **Resolve the arrow-nav-vs-caret conflict with a concrete keyboard policy.** Express text
  fields must not use `handleEstimateCellKeyDown`; specify per-key behavior. *(doc 03 → new doc 09;
  `cells.tsx:45-73`, `row-table.tsx:254/310/345`)* (C3)

- [ ] 🟥 **Make a virtualization decision** (port `measureElement` from `tree.tsx:1281` / cap ≤96px /
  disable-on-active) and add a **≥75-row** overlap repro to QA. *(doc 03 → new doc 09; `row-table.tsx:421/594/417`)* (C1)

- [ ] 🟧 **Add the metadata read-path work.** Extend `ESTIMATE_ROW_ITEM_SELECT`
  (`estimate-repository.ts:45`), `toEstimateRowItem`, and the `EstimateRowItem` type
  (`types.ts:81`) to carry `metadata`/`expressComponent` — OR adopt `tags`-based express identity
  (cheapest, already passed through `workspace-repository.ts:1650`). **Done when** U1/U3 states which
  mechanism and lists these files. *(C4)*

- [ ] 🟧 **Specify promotion atomicity + idempotency concretely.** Choose: a new
  `promote_express_row_to_library_component` SECURITY DEFINER RPC (atomic, a migration) OR a
  deterministic-id + pre-written correlation-id saga with `INSERT ... ON CONFLICT (id) DO NOTHING`.
  Add folder target + name-required + relink metadata-merge. *(doc 02/04 U7;
  `evidence/live-supabase-verification.md §6`)* (C5)

- [ ] 🟧 **Add the insert-return + draft-recovery details to U2.** (1) Read `data` and return
  `readHistoryRowResult(data)` in `insertEstimateRowItemFromLibrary` (`actions.ts:2530/2558`);
  (2) widen the insert return type; (3) add an insert `onSuccess` that `setQueryData`s
  `rowRevision`/id (mirror `detachMutation onSuccess`); (4) replace insert `onError` rollback with a
  keep-draft path and surface a stable `mutationId`. *(C1-table; `use-estimate-row-mutations.ts:142/147/156`)*

- [ ] 🟧 **Add the history-classification migration task to U2** with the exact predicate
  (`material = BLANK_ESTIMATE_ROW_COMPONENT_LABEL` OR `metadata.tags ? 'manual-row-placeholder'`),
  and reconcile the SQL "blank" definition with client `isBlankEstimateRowItem`. *(`...050746:422`,
  `activity-history.tsx:120-134`)*

- [ ] 🟧 **Add the revert-to-blank surfaces to U2/U8 blast radius**: `clearRowComponent`
  (`EstimateSheetContent.tsx:2065`), `moveRowComponent` (`:2093`), `applyEditableValuesToLibraryItem`
  (`:398`). Decide Clear/Move semantics for express rows and ensure the reverted template classifies
  as blank (excluded from the projection). *(doc 02 of this audit)*

- [ ] 🟧 **Fix `itemCost` → `unitCost`** (and document the full key map) wherever U3/doc 02 name patch
  fields. *(`actions.ts:100/2563`)*

---

## P1 — Add the missing documents and the two new concern areas

- [ ] 🟧 Author **`07-rpc-and-row-patch-contract.md`** (outline in `04-gaps...md §1`).
- [ ] 🟧 Author **`08-traceability-matrix.md`** (R×U×AE×Q grid; fill R8/R9/U8 holes).
- [ ] 🟧 Author **`09-virtualization-keyboard-focus-and-state-spec.md`** (folds C1/C3 + focus + 14-state machine + microcopy + i18n).
- [ ] 🟧 Author **`10-edge-cases-and-failure-modes.md`** (insert race, stale-revision two-tab, large text, image 404, promotion partial failure, legacy rows).
- [ ] 🟥 Author **`11-concurrency-and-permissions-spec.md`** — realtime multi-client behavior of in-flight express rows + viewer-block + promotion privilege boundary (`is_workspace_editor`). **The single largest uncovered area.**
- [ ] 🟧 Author **`12-rollout-migration-and-observability-runbook.md`** — kill-switch, migration ledger, forward-only handling of the **29 existing legacy rows**, observability metrics.
- [ ] 🟨 Append a **Glossary** to `INDEX.md` and a **bug-repro note** to evidence.

---

## P1 — Test & QA corrections

- [ ] 🟧 Enumerate the exact assertion changes for `estimate-sheet-cost-inputs.test.tsx:220/230` and
  `estimate-sheet-library-insert.test.tsx:~247` (blank-slot → express-editor), and add a
  **"legacy persisted blank row still renders as placeholder"** test that must stay green.
- [ ] 🟧 Add QA rows for: **R8 regression** (move/clear/delete/select/keyboard/virtualization on
  express rows), **JSON-merge preservation** (Q19 — assert unrelated metadata survives),
  **promotion idempotency/retry** (Q21), **projection authz negative test**, **≥75-row virtualization
  overlap**, and **two-tab concurrent edit**.
- [ ] 🟨 Add a QA case: publish an estimate with an express row that has an image; assert the snapshot
  row carries `source_snapshot.imageUrl`. *(keeps the verified-correct U4 rule honest)*

---

## P2 — Polish

- [ ] 🟨 Set the **contrast floor**: load-bearing express text at `#5D5D5D`+ (never `#7F7F7F`/`@60%`).
- [ ] 🟨 Decide **`discipline`/`designation`/`categoryNodeId`** defaults for the express template and
  the proposal/dashboard bucketing implications. *(`build-proposal-export-model.ts:130`,
  `project-dashboard-repository.ts:170-173`)*
- [ ] 🟨 Decide **mobile/touch** support level for day-0 (or explicitly descope with rationale).
- [ ] 🟨 Add the **cache fan-out** list after promotion (estimate-sheet row query + workspace library
  lite/rows query + library routes).
- [ ] 🟨 Note **analytics/telemetry** intent for express authoring/promotion, and whether the
  `row_blank_added` fix corrects historical counts or is forward-only.

---

## Definition of "ready to build"

The pack is ready when: every P0 box is checked; docs 07–12 exist; the U5 bug is reproduced (or
U5 reframed); the traceability matrix has no uncovered R/U; and the migration ledger + kill-switch
are explicit. At that point readiness moves from **62 → ~85+** and implementation can start slice
by slice behind the kill-switch.
