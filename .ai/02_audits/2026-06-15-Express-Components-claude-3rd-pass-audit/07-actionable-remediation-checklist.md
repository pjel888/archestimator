---
title: Actionable Remediation Checklist — Pass 3
type: docs
date: 2026-06-15
auditor: Claude (Opus 4.8, 1M context)
purpose: The work queue. Each finding → exact doc/section/code + fix + verification. Written for the codebase AI that will improve the pack. Apply Stage 1 before building the affected unit.
---

# Actionable Remediation Checklist — Pass 3

The pass-2 findings are all applied; this list is the **delta** the 3rd pass surfaced. None
changes the architecture. Most are doc corrections; DB-N1, BR-N1, BR-N2, PERF-N1 also imply
code/test work in the affected unit.

---

## Stage 1 — Day-0 P1s (resolve before building the affected unit)

- [ ] **DB-N1 · code + doc 11 + doc 04 (R14/AE10/U9).** Add `assertCanEditEstimate` to
      `insertEstimateRowItemFromLibrary` (`actions.ts:2493`), `updateEstimateRowItem` (`:2561`),
      `replaceEstimateRowItemWithLibrary` (`:2586`) — they don't gate today while 7 sibling actions
      do. Reword R14/AE10/doc 11 to stop implying the RPC enforces edit permission. Add a U9 test:
      a viewer's express write is rejected server-side. *(Pre-existing gap the feature inherits.)*
- [ ] **BR-N1 · doc 04 U8 + doc 07 + doc 10 + code.** Add `replaceEstimateRowItemWithLibrary` +
      `getEstimateRowMetadata` (`actions.ts:768`) + `replace_estimate_row_item_with_history` +
      `getValidatedEstimateRow` SELECT widening to U8. Require move/replace of an express row to
      carry-or-merge `expressComponent` or block it. Add a doc-10 row for the **server** replace
      path; add a round-trip-reload QA assertion. (Converge with the AI `apply.ts` mitigation.)
- [ ] **BR-N2 · doc 04 U8 + doc 07 + doc 00 + code/migration.** Decide how `expressComponent.id`
      is rekeyed on copy: (a) `jsonb_set` in `insert_estimate_subtree_into_estimate_with_history`
      (`20260613134852`) **and** the template copy RPC (`20260612094734:950`), (b) a post-copy step,
      or (c) drop the id (doc-05 hedge). Until chosen, correct KTD2/U8/doc 07:89/Q14 to stop
      asserting rekey-on-copy as existing behavior. Add both copy RPCs to U8's mutator surfaces.
- [ ] **SEC-N2 · doc 11 (Realtime Model).** Rewrite to state row data is **not** realtime-synced
      today (cursor/presence only; staleTime 5min; `refetchType:'none'`). Scope doc 11 to
      optimistic-lock integrity + cursor suppression + manual-refetch eventual visibility, and defer
      true realtime row propagation (or add a `postgres_changes`/broadcast-on-insert workstream to
      U9 with RLS/replica-identity work) if near-real-time peer visibility is actually required.
- [ ] **PERF-N1 · doc 03 (perf) + doc 09 + test.** Mandate express editor text state lives inside
      the per-row `EditableRowValue` (`editable-row-model.ts:44`) so the existing comparator
      (`row-table.tsx:81-84`) keeps keystroke fan-out row-local; forbid a parallel top-level draft
      map. Require a render-probe test (mirror `estimate-sheet-render-relief.test.tsx`) for an
      express **text** field.
- [ ] **DM-N1 · doc 02 + doc 07 + doc 10 + evidence.** Before U2, capture the 29 source-less rows'
      `material/tags/category/unit_cost/image` into `evidence/live-supabase-evidence.md`. Add an
      edge case + Q for "abandoned source-less row with edited material" (Project-folder inclusion +
      history). Reconcile or explicitly document the SQL-vs-client blank-predicate divergence
      (new-insert-only).
- [ ] **CO-N1 · doc 08.** Add a "Day-0 / fast-follow" column or annotation to the Unit + Requirement
      tables (U1–U4 + U9-subset = day-0; U5/U6/U7 = fast-follow gated by doc 00); note R6/R7/U6/U7 in
      "Remaining Product Fork."
- [ ] **STRAT-N1 · doc 03 (+ doc 00 cross-ref).** Add a thin "Quick-add modal fallback" section
      (fields, focus order, keyboard commit/cancel, U2/U3 interaction) so both spike branches are
      buildable. (Note: the spike-fail probability is lower than the finder implied — the V3 fallback
      eased the inline bar — but the fail branch must still be designed.)

## Stage 2 — Fast-follow P1 (resolve before promotion/U7 coding; also a now-fixable doc contradiction)

- [ ] **SEC-N1 (= DB-N3 = CO-N4) · doc 07:123 + doc 11:61-70 + doc 04:127 + doc 06 RSK12 + doc 05
      Q28/Q46.** Pick one promotion gate: `is_workspace_editor(folder_workspace_id)` for parity, OR
      `is_workspace_admin` with a documented "intentionally stricter" rationale. Remove the
      "use a stricter predicate" language (none exists). Fix the permission-matrix rows: the real
      library-write cut is **member-vs-viewer**, not editor-vs-member (a viewer can already create
      library items via the RPC today).

## Stage 3 — P2 cleanup (doc-correction pass)

- [ ] **DB-N2 · doc 07 + doc 10** — document the `replace` RPC wholesale-overwrite (converge with BR-N1).
- [ ] **BR-N3 · doc 04 U8** — add `read-tools.ts` read surface; decide express empty-material AI label.
- [ ] **UX-N1 · doc 09 + doc 03 + Q25** — floor the Project-specific/Express badge at `#5D5D5D`; retone `cells.tsx:277`.
- [ ] **UX-N2 · doc 09 + doc 10** — define virtualization-disable + focus for ≥1 (not "exactly one") editor.
- [ ] **CO-N2 · doc 08** — map Q35 → U8/U4, Q40 → U4/U8 in Unit Coverage.
- [ ] **CO-N3 · doc 08** — reciprocate R↔AE / R↔RSK links (or drop the over-claims).
- [ ] **CO-N5 · doc 02** — clarify `category` (string) vs `categoryNodeId` (FK).
- [ ] **SEC-N3 · doc 11 + U9** — specify the draft-broadcast suppression seam + a U9 test.
- [ ] **SEC-N4 · doc 07** — specify the promotion idempotency-key schema home + unique lookup.
- [ ] **STRAT-N2 · doc 00 + evidence** — name a spike owner; require `evidence/inline-vs-modal-spike-result.md`.
- [ ] **STRAT-N4 · doc 00** — acknowledge net-new conflict-recovery effort in day-0, or defer it.
- [ ] **OB-N1 · doc 12** — pin a concrete telemetry sink (mirror `realtime-telemetry.ts`) or named log prefix.
- [ ] **DM-N2 · doc 04 U1 + doc 07** — clarify `metadata.tags` (DB) vs `item.tags`; map metadata in `toEstimateRowItem`; add a round-trip test.
- [ ] **PERF-N2 · doc 09 + doc 00** — bound the worst-case non-virtual mount (windowed render or higher-row-count spike).

## Stage 4 — Verification gates (before declaring "ready")

- [ ] **G1** — re-run the static-docs gate (doc 12 / Q38) after the doc 08 edits (CO-N1/N2/N3).
- [ ] **G2** — confirm every Stage-1 P1 has landed in its named doc **and** the affected unit
      references it; for DB-N1/BR-N1/BR-N2/PERF-N1 confirm the code/test task is in the unit's Files+Tests.
- [ ] **G3** — confirm the day-0 cut is now legible in doc 08 (CO-N1) and that the modal fallback
      (STRAT-N1) + spike artifact (STRAT-N2) exist before U4 coding.
- [ ] **G4** — re-verify the plan-vs-code claims that were corrected actually match code now
      (viewer-block gate present; rekey owner assigned; realtime claim corrected).

---

## Priority summary

| Stage | Items | Gate |
|---|---|---|
| 1 — Day-0 P1s | DB-N1, BR-N1, BR-N2, SEC-N2, PERF-N1, DM-N1, CO-N1, STRAT-N1 | Before building the affected unit |
| 2 — Fast-follow P1 | SEC-N1 | Before U7; doc fix landable now |
| 3 — P2 cleanup | DB-N2, BR-N3, UX-N1/N2, CO-N2/N3/N5, SEC-N3/N4, STRAT-N2/N4, OB-N1, DM-N2, PERF-N2 | The cleanup pass |
| 4 — Verification | G1–G4 | Before "ready to implement" |

**After Stage 1–2, the day-0 slice moves from ~80 to ~89 and the overall from 84 to ~90.** The
architecture is unchanged at every step — every item is a correction, a specification, a decision,
or a small authorization/identity code gate, not a redesign.
