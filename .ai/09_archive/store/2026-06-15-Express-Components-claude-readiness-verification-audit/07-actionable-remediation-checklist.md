---
title: Actionable Remediation Checklist
type: docs
date: 2026-06-15
auditor: Claude (Opus 4.8, 1M context)
purpose: The execution queue. Each finding → exact plan doc + section to edit, the change, and the verification. Written for the codebase AI that will improve the plan pack. Apply in order; none changes the architecture.
---

# Actionable Remediation Checklist

**How to use:** work top-down. Stage 0 is a decision (human). Stages 1–2 are doc edits the
codebase AI can make directly against `.ai/03_plans/2026-06-15-Express-Components/`. Stage 3 is
verification. Finding IDs (`V1…V14`) and evidence live in `01-ground-truth-reverification-and-new-defects.md`.

---

## Stage 0 — Strategic decision (do this FIRST; blocks scoping) · owner: product

- [ ] **S0.1 — Decide day-0 scope.** Recommended: day-0 = **U1–U4 + U9's flag/rollback/permission
      subset**; U5, U6, U7 become fast-follows (matches doc 12 ship-slice order). Record the cut.
- [ ] **S0.2 — Spike inline-vs-modal (≤1 day).** Build an active express editor in a ≥75-row
      virtualized list. If it fights the grid (V3 predicts it will), switch authoring to a
      quick-add modal — this deletes RSK7 and RSK10. Record the result.
- [ ] **S0.3 — Decide table-now vs strip-the-hedge.** If cross-row/cross-estimate reuse is on the
      ~2-quarter roadmap → add `project_components` now and project from it. If not → delete the
      `metadata.expressComponent.id` "forward-compatibility hedge." Don't keep both.
- [ ] **S0.4 — Write the decision record** `00-scope-and-premise-decision.md` in the plan pack
      capturing S0.1–S0.3. (This is the only new document the pack needs.)

> Rationale and full argument: `05-strategy-scope-and-premise-challenge.md`.

---

## Stage 1 — P1 doc corrections (before building the affected unit)

- [x] **V1 · RETRACTED — no action.** A suspected `contingencyPercentage` RPC drop was a verifier
      mistake (it read the superseded `20260524033151` RPC). The live RPC
      `20260524050746…sql:505/392/84` persists contingency; doc 07's Field Key Map is correct.
- [ ] **V2 · doc 04 U8 + doc 10.** Add the AI package-builder **write** path (`ai/package-builder/apply.ts`)
      to the blast radius; add edge case: "AI replacement targeting an express row must server-merge
      `metadata` or skip express rows." Add a QA row. Evidence: `apply.ts:469-590,852,1272`.
- [ ] **V3 · doc 09 (§Virtualization).** Promote the **disable-virtualization-while-an-editor-is-open**
      fallback to the **primary day-0 path**; keep dynamic `measureElement` as a follow-up that must
      first remove `content-visibility:auto`/`contain-intrinsic-size` from rows and reconcile the
      `scrollMargin`/`translateY` math. Evidence: `row-table.tsx:185,421,598`.
- [ ] **V4 · doc 07 (§Promotion Contract) + doc 11.** Add the four promotion under-specs:
      (a) the RPC must call `is_workspace_editor`/`is_workspace_admin` explicitly (membership is the
      only existing gate — `20260523120957…sql:318-325`); (b) **pin the exact gate function** (note
      `is_workspace_editor` includes plain `member`); (c) the default price option must populate
      `label`, `currency` (default `'PHP'`), `workspace_id`, `item_id` (`…sql:40-62`); (d) add the
      `revoke from public/anon; grant to authenticated` step and bind folder/editor checks to the
      **folder's** workspace.
- [ ] **V5 · doc 10 + U2.** Add a `sort_order` concurrency edge case: compute `sort_order` inside the
      RPC under the estimate lock, or retry on the deferred `unique(node_id, sort_order)` violation.
      Evidence: `actions.ts:2514-2524`; core `20260518090000…sql:117`.
- [ ] **V6 · doc 02 (§Recommended Shape) + doc 07 (§Insert Contract).** Define the express id rule:
      **client-generated UUIDv4 at template creation, rekeyed on project-source copy.** Reword Q14/Q34
      so the express *kind* survives copy while the *id* is rekeyed. (If S0.3 = strip-the-hedge, delete
      the id instead.)
- [ ] **V7 · doc 11.** State that stale-revision conflict detection + recovery UX is **net-new** (no
      app code recognizes `estimate_sheet_row_revision_conflict` today —
      `use-estimate-row-mutations.ts:147-151,257-264`). Either scope it into U9 explicitly or defer
      realtime-conflict UX out of day-0.

---

## Stage 2 — P2 doc corrections (the cleanup pass)

- [ ] **V8 · doc 04.** Delete the duplicated stray bullet at line 140 (contradicts line 131/132).
- [ ] **V9 · doc 09 (§Accessibility And Contrast).** Floor all express placeholders/labels/field text
      at `#5D5D5D`; restrict `#7F7F7F` to non-text decoration. (`#7F7F7F` ≈ 3.5:1 fails AA.)
- [ ] **V10 · doc 08.** Map orphaned QA rows: Q14/Q15/Q16/Q37 → R8 (+R16); Q42 → R7 (+R8). Map RSK6
      to U4/R1 or mark deferred.
- [ ] **V11 · doc 04 U1.** Re-point the metadata read-path edits to `estimate-repository.ts`
      (`ESTIMATE_ROW_ITEM_SELECT:45`, mapper `:71-92`), domain type (`estimate-tree.ts:25`), UI type
      (`estimates/types.ts:81`). Reduce the workspace-repository change to "read `expressComponent`
      from already-selected metadata" (SELECT is already correct, `:1541`). Cite the
      `isPersistedPlaceholder` predicate (`activity-history.tsx:122-127`) the express helper must defeat.
- [ ] **V12 · doc 10.** Reword the move/replace invariant: express fields survive via object spread of
      the moved row; `applyEditableValuesToLibraryItem` (`EstimateSheetContent.tsx:398-416`) does not
      touch material/description/unit/unitCost — don't drop them when widening it.
- [ ] **V13 · doc 11.** Replace "draft has no server row id to broadcast" with "actively suppress
      broadcasting/anchoring the express row id until a `persisted` flag is set" (the optimistic id is
      client-generated and equals the persisted id — `EstimateSheetContent.tsx:353`; `actions.ts:2528`;
      `:838`).
- [ ] **V14 · doc 12 + doc 11.** (a) Assign a telemetry owner + concrete event names; (b) add
      draft-abandon-on-navigation/tab-switch behavior to doc 11; (c) note the static-docs gate is
      manual and assign an owner; (d) assert the rollout-order rule (U2 migration + flag precede express
      inserts hitting prod classification).

---

## Stage 3 — Verification gates (before claiming the plan is "ready")

- [ ] **G1 — Re-run the static docs gate** (doc 12 §Static Documentation Gate / Q38): frontmatter,
      internal links, Mermaid parse, traceability has no orphan R/U/AE/Q/RSK (re-check after V10).
- [ ] **G2 — DB proof harness** (map to Q32/Q33): U2 reclassification predicate; U7 atomic
      create+relink, idempotency by correlation_id, viewer/member-without-editor rejection, and
      folder-in-other-workspace rejection. SQL skeletons in `02-supabase-db-rpc-and-permissions.md §6`.
- [ ] **G3 — Inline-vs-modal spike result** recorded (S0.2) and the virtualization decision (V3)
      reflects it.
- [ ] **G4 — Confirm every P1 (V2–V7) has landed** in its named doc and the affected unit references it.

---

## Priority summary

| Stage | Items | Gate |
|---|---|---|
| 0 — Decision | S0.1–S0.4 | Blocks day-0 scoping; human decision |
| 1 — P1 doc fixes | V2–V7 (V1 retracted) | Before building the affected unit |
| 2 — P2 doc fixes | V8–V14 | The cleanup pass |
| 3 — Verification | G1–G4 | Before declaring "ready to implement" |

**After Stages 0–2, the U1–U4 day-0 core moves from ~84 to ship-ready, and the full bundle from
~76 to ~88.** The architecture does not change at any step — every item is a correction, a
specification, or a decision, not a redesign.
