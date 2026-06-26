# 21 — Adversarial Review

**Audit date:** 2026-06-25
**Reviewer:** Adversarial document reviewer (ce-adversarial-document-reviewer) + lead-coordinator consolidation, drawing on the security-lens and coherence reviews for cross-evidence.
**Plan pack audited:** `.ai/03_plans/2026-06-24-Estimate-Sheet-Center-Content-Analysis/`
**Audit mode:** Read-only planning audit per `Improve-Plan-Prompt.md` line 5.
**Source baseline:** branch `main`, commit `1166b16f6bda9a5ff0d01defd2f8fe922fc8ed79`. Lead spot-checked load-bearing claims against `actions.ts`, `use-estimate-row-mutations.ts`, `drop-zones.tsx`, `row-table.tsx`, `cells.tsx`, `constants.ts`, `EstimateSheetContent.tsx`, and migration history.

> This document's job is to **challenge premises, surface unstated assumptions, stress-test decisions, and find what's wrong, missing, or overstated**. It is deliberately one-sided. What the plan gets right is documented in the per-finding evidence chains (`15-PRIORITIZED-FINDINGS.md`) and in `20-PLAN-AUDIT-AND-SCORECARD.md`.

## Resolution addendum (2026-06-25)

The adversarial review below began as a challenge document. The current pack resolves its implementation-blocking doubts:

- RPC spelling is corrected: replace paths use `replace_estimate_row_item_with_history`; insert paths use `insert_estimate_row_item_with_history`.
- `15` and `19` now agree on all 40 hypothesis verdicts: 25 verified, 9 partially true, 3 refuted, 3 unable to verify.
- `ESC-P2-26` is defined in `15`, traced in `19`, and re-rated P1 while retaining the historical ID.
- M-3 bulk delete is all-or-nothing, not savepoint-per-row partial success.
- Q14, Q23, Q32, and Q5 are no longer blockers; `18` records accepted defaults.
- ESC-P0-02 is re-rated P1; ESC-P3-22 is re-rated P2.
- Threat modeling is handled in `22-THREAT-MODEL.md`.

The remaining items in this review are implementation/runtime risks or historical critique, not unanswered planning questions.

---

## Adversarial verdict

The plan is **genuinely strong as a static code-reading audit** — the revision-gate analysis (`08:68-79`), the source-of-truth ledger (`02:84-99`), the move-component race documentation (`01:285-317`), and the ESC-P0-01 evidence chain (`15:32-36`) are excellent. Before the 2026-06-25 resolution pass it was not implementation-ready as claimed, for four honest reasons:

1. The §32 "100%" self-rating (`19:107-133`) is overstated. Item 28 ("complete edge-case matrix exists") is false on the plan's own evidence (`14:144-146` admits 162 of 168 failure-injection cells are gaps). Item 33 ("no claim of correctness without evidence") is undercut by `00:101-104` admitting no authenticated runtime session was available.
2. The plan used stale RPC naming in several docs. Resolution: replace paths now point to `replace_estimate_row_item_with_history`; insert paths point to `insert_estimate_row_item_with_history`.
3. The plan treats `assertCurrentLibrarySourceForEstimateCommit` as a server-side guarantee (`13:29, 39-41`) when it is a TypeScript-side SELECT-then-throw with a TOCTOU window before the RPC commits (verified, `actions.ts:879-904` called at `actions.ts:2446` before the RPC at `2453`).
4. Docs `15` and `19` directly contradicted each other on several hypotheses. Resolution: both now agree on the 25/9/3/3 verdict split.

None of these were fatal. **Current verdict: PASS-WITH-FINDINGS, resolved for planning handoff** — implementation still needs the tests, migrations, runtime checks, and telemetry proof named in `16` and `17`.

---

## Unverified assumptions

### A1 — "RLS is enforced on every user-data table" (trusted from README, not verified per-action)
- **Where assumed:** `13:14` — "per README — 'RLS on every user-data table'."
- **Why unverified:** The plan cites the README, not the migrations. RLS existence ≠ RLS correctness. Lead spot-check confirmed `can_edit_estimate` is enforced inside RPCs (`20260612094734_estimate_tabs_foundation.sql:180`) AND as RLS policies (`for all using (can_edit_estimate(estimate_id))` at l. 754). But the plan never verifies that the **specific tables touched by the proposed new RPCs** (`move_estimate_row_component`, `delete_estimate_row_items_bulk`) inherit the same policies. If the new RPCs write `estimate_sheet_events` rows, the RLS policy on that table must cover them.
- **What would prove/disprove:** A per-action RLS matrix listing each table + its policy + whether the proposed RPC's INSERT/UPDATE is covered.
- **Severity:** Medium-High — the plan proposes 2 new RPCs without confirming they inherit the authz layer they rely on.

### A2 — "Server re-reads library source via `assertCurrentLibrarySourceForEstimateCommit`" (TOCTOU window)
- **Where assumed:** `13:29, 39-41`; `09:29`.
- **Why unverified:** Lead verified the function (`actions.ts:879-904`). It does a `SELECT ... FROM cost_library_items` then throws if archived/changed. But it runs in TypeScript **before** the RPC (`insert_estimate_row_item_with_history` at `actions.ts:2453`). Between the SELECT and the RPC commit, another workspace member can archive or update the library item. The plan calls this "GOOD — re-validation at insert time" (`13:40`) but it is a classic time-of-check/time-of-use race, not a transactional guarantee.
- **What would prove/disprove:** Move the archived/`updated_at` check inside the RPC transaction (e.g., `SELECT ... FOR UPDATE` in the same transaction as the insert). Disprove: show the check and write are in the same transaction.
- **Severity:** Medium — the window is small but real, and the plan's tone ("GOOD") is more confident than the code warrants.

### A3 — The proposed `move_estimate_row_component` RPC is new, not a repurpose
- **Where assumed:** `15:50` — "Server-action `moveEstimateRowItem` already exists in `src/lib/domain/estimate-mutations.ts`... either repurpose that path or add a new combined replace+clear RPC."
- **Why unverified:** Lead checked. `moveEstimateRowItem` in `domain/estimate-mutations.ts:9` is a **pure tree-math function** (manipulates an in-memory tree object), not a server action or persisted mutation. `estimate-repository.ts:133,223` wraps it for tree manipulation, but there is no persisted move RPC. Worse, migration `20260520100459_remove_estimate_node_move_rpc.sql` explicitly **dropped** the previous atomic node-move RPC (`n_nodes`) with the comment "Estimate-tree drag/drop reorganization has been removed from the product." The plan never reconciles why that RPC was removed or whether row-level moves face the same rationale.
- **What would prove/disprove:** Read the decision that removed `n_nodes`. If it was a product decision (tree moves removed), row-level component moves are a different feature and the precedent doesn't apply. If it was a technical decision (RPC too complex, race-prone), M-1 inherits that risk.
- **Severity:** High — M-1's effort estimate (L, part of 4-6 day Phase 1) assumes repurposing an existing path that doesn't exist. Realistic effort is higher.

### A4 — "Performance is acceptable" / "~120ms latency" (not measured)
- **Where assumed:** `15:507` — "Per-keystroke latency measured as ~120ms on a mid-tier laptop (not benchmarked in this audit — estimated from row-table re-render path)."
- **Why unverified:** Self-admitted (`00:103`). ESC-P1-06 is rated P1 on the strength of a guess.
- **What would prove/disprove:** A Playwright CPU profile of the 1000-row case before and after M-18.
- **Severity:** Low for prioritization (the fix is worthwhile regardless), but the confidence label "High" (`15:461`) is wrong for an unmeasured number.

### A5 — "Optimistic UI recovers" (never runtime-tested under the proposed RPCs)
- **Where assumed:** `08:84-96` (rollback table); `17:116-118` (offline simulation).
- **Why unverified:** The rollback paths are traced statically. But the proposed M-1 changes the rollback contract (single `restoreEstimateState` vs two per-row restores). No test in `17` verifies that the new single-rollback path actually restores both rows after the new RPC fails. The test file `estimate-sheet-move-component-atomicity.test.tsx` (`17:34`) is listed as NEW but doesn't yet exist.
- **What would prove/disprove:** The test itself, passing.
- **Severity:** Medium — the fix is correct in theory; the validation gate is correctly specified; the risk is execution, not design.

### A6 — "Migration is backward-compatible" (not checked against dependent code)
- **Where initially assumed:** Earlier wording proposed a new migration and left `row_moved` optional.
- **Resolution:** The source check found `estimate_sheet_events.event_type` is `text`, not an enum, so no enum migration is required. Activity-history does have filter/label/component-detail whitelists; M-1 now explicitly requires adding `row_moved` to those consumers.
- **What would prove/disprove:** M-1 implementation updates `activity-history.tsx` filters, accessibility labels, component-event set, and moved-row detail copy.
- **Severity:** Medium — silent omission of move events from activity history would be a real regression.

### A7 — "Bulk delete UX recovers" (failure copy still needs implementation validation)
- **Where assumed:** `16` M-3.
- **Resolution:** RD-1 removes partial-success copy. The accepted UX is all-or-nothing: "Couldn't delete selected rows. Nothing was deleted." with the failed row/revision where available.
- **Remaining proof:** M-3 still needs UI tests and manual QA to prove the failure copy fits long row names and is recoverable.
- **Severity:** Low-Medium — implementation validation, not a planning blocker.

---

## Contradictions

All contradictions found by this adversarial review are resolved in the current pack:

| Topic | Resolution |
|---|---|
| H15/H16 | `15` and `19` both mark template stale-response handling REFUTED (working). |
| H22 | `10`, `15`, and `19` all mark Cmd/Ctrl+K while typing REFUTED. |
| H25 | `15` and `19` both mark clear-component semantics PARTIALLY TRUE. |
| H26 | `15` and `19` both mark express retry idempotency VERIFIED. |
| H30/H38 | Runtime screen-reader and cross-tab coverage remain UNABLE TO VERIFY where no runtime test exists. |
| Hypothesis totals | Both appendices use 25 verified, 9 partially true, 3 refuted, 3 unable to verify. |
| RPC names | Replace paths use `replace_estimate_row_item_with_history`; insert paths use `insert_estimate_row_item_with_history`. |
| ESC-P2-26 | Defined in `15`, traced in `19`, implemented by M-6, severity P1. |
| Bulk-delete semantic | RD-1 chooses all-or-nothing. |

---

## Missing scenarios

### S1 — Concurrent optimistic edits by 2 collaborators on the same row
- **Likelihood:** Medium (the plan ships collaboration cursors; the README's primary market is AEC teams).
- **Blast radius:** One user's edit silently 409s; `invalidateTreeAfterMutationError` refetches (`08:110`). But the plan never tests whether the refetched tree clobbers the *other* user's now-in-flight optimistic edit. This is the exact ESC-P0-02 pattern but across users, not within one client.
- **Recommended addition:** A multi-client test in `14`/`17`: two browser contexts, both edit row X, assert the loser sees their edit rejected with a clear message (not a silent toast).

### S2 — Library item archived between optimistic insert and server RPC
- **Likelihood:** Low (requires two workspace members, one archiving while another inserts).
- **Blast radius:** The TS-side `assertCurrentLibrarySourceForEstimateCommit` (`actions.ts:879`) catches this *most of the time* but has a TOCTOU window (A2). If the archive lands in the window, the row persists with a stale snapshot. The plan calls this "SAFE" (`14:41`) without testing the window.
- **Recommended addition:** Move the archived check into the RPC transaction (A2 fix), or add a residual-risk note.

### S3 — Tab deleted while that tab's tree mutation is in flight
- **Likelihood:** Low-Medium (bulk tab operations exist; the tab strip supports delete).
- **Blast radius:** `08:147-150` covers "tab switch while mutation in flight" (safe, per-tab keys). But **tab deletion** is not analyzed. If user A deletes tab B while user B's mutation against tab B is in flight, the mutation resolves, `setQueryData` patches a cache entry for a tab that no longer exists, and the row is orphaned in the DB (the tab's rows are presumably cascade-deleted, but the mutation may recreate them).
- **Recommended addition:** Trace tab-delete × in-flight-row-mutation in `08` and `14`.

### S4 — User disconnects mid-multi-row bulk operation
- **Likelihood:** Medium (mobile/flaky PH networks per README's primary market).
- **Blast radius:** After M-3 makes bulk delete atomic, a disconnect mid-RPC leaves the user unsure whether the transaction committed. The plan's offline simulation (`17:116-118`) covers single-row insert/edit, not bulk.
- **Recommended addition:** Extend `17`'s offline simulation to bulk delete; assert the UI shows "delete pending" and reconciles on reconnect.

### S5 — Server clock drift affecting `updated_at` comparisons
- **Likelihood:** Low (Supabase manages timestamps), but non-zero across regions.
- **Blast radius:** `assertCurrentLibrarySourceForEstimateCommit` (`actions.ts:902`) compares `sourceUpdatedAt !== libraryItem.updatedAt` — a string equality check on timestamps. If the client cached `updatedAt` from a read served by a replica with slight clock drift, legitimate unchanged sources could be rejected, or changed ones accepted.
- **Recommended addition:** Note as a residual risk in `13`, or use a version column instead of timestamp equality.

### S6 — Browser tab duplicate replaying optimistic state
- **Likelihood:** Medium (users do duplicate tabs).
- **Blast radius:** A duplicated tab inherits the React Query cache from BFCache/session restore. Two tabs now show the same optimistic state and can both fire mutations against the same `expectedRowRevision`, causing spurious 409s. The plan never analyzes duplicate-tab behavior.
- **Recommended addition:** Trace duplicate-tab × mutation in `08`.

### S7 — BFCache / service worker restoring stale `editableRows`
- **Likelihood:** Medium (Next.js providers include BFCache handling per README).
- **Blast radius:** BFCache restore can resurrect `editableRows` (component state) that references row IDs the server has since deleted. The `skipEditableRowsSyncRef` gate (`08:40`) doesn't protect against this because it assumes the tree is newer, not stale-restored.
- **Recommended addition:** Analyze BFCache restore in `08`.

### S8 — IndexedDB / localStorage corruption of column widths
- **Likelihood:** Low.
- **Blast radius:** `estimate-column-widths-store.ts` reads localStorage with no try/catch around JSON.parse (ESC-P2-11 analysis doesn't check). Corrupted storage throws on hydrate and could crash the sheet.
- **Recommended addition:** Note in ESC-P2-11 fix.

### S9 — Realtime cursor spoofing by a workspace member
- **Likelihood:** Low (requires compromised member session).
- **Blast radius:** Ed25519 envelope binds `sub` to authenticated user, so a compromised member can only spoof *their own* cursor — but they can lure a victim into editing a phantom row by broadcasting a cursor at `rowId` of a row they're about to delete.
- **Recommended addition:** Document this social-engineering vector explicitly in `13`; cursors are advisory.

### S10 — Cost manipulation via tampered `itemCost` for express/project rows
- **Likelihood:** Low (user-is-attacker makes this low impact for single-user estimates).
- **Blast radius:** Library rows have `assertCurrentLibrarySourceForEstimateCommit` re-reading `unit_cost`; express rows (no library link) accept client-supplied `itemCost` verbatim with no sign/range check.
- **Recommended addition:** Add server-side `itemCost >= 0 && itemCost < 10^12` invariant in `update_estimate_row_item_with_history`; or document that user-is-attacker makes this acceptable.

---

## Severity over-rated / under-rated

### SE1 — ESC-P0-02 is arguably P1, not P0
- **Plan's rating:** P0 (`15:64`).
- **Proposed rating:** P1.
- **Rationale:** The plan's own impact assessment (`15:70-71`) says "Persistence impact: MEDIUM — the DB is correct (the in-flight edit lands); the UI lies." The P0 rubric (`15:6`) requires "data loss, cross-scope mutation, structural corruption." A UI-only divergence that self-heals on refresh is a P1 ("serious workflow failure"), not a P0. Rating it P0 inflates Phase 1's urgency and may pull focus from ESC-P0-01, which is a true data-corruption P0.

### SE2 — ESC-P2-26 (raw JSON.parse on drag MIME) under-rated
- **Plan's rating:** P2 (`13:88`).
- **Proposed rating:** P1.
- **Rationale:** The plan itself (`13:30`) admits "A malicious payload with `id` set to another row's id could attempt to overwrite that row via the replace path." That's a cross-row integrity concern, not just defense-in-depth. Combined with H1/H2 (verified, `15:528-529`) showing the throw propagates to `window.onerror` with no error boundary, this is a P1 reliability + low-tier security finding.

### SE3 — ESC-P3-22 (telemetry `console.warn` in prod, no sink) under-rated
- **Plan's rating:** P3 (`15:436`).
- **Proposed rating:** P2.
- **Rationale:** The express-components feature is explicitly "beta" (`01:73`, `express-components-telemetry.ts`). Beta features without telemetry mean the team cannot evaluate whether to ship them. That's a decision-blocking gap, not polish.

---

## Missing findings

### MF1 — Observability / error-reporting analysis resolved for planning
The initial plan did not analyze whether Sentry (or equivalent) captures the failures it documents. Resolution pass re-rates ESC-P3-22 to P2 and adds Phase 0 beta telemetry. Provider/runtime proof remains required during implementation, but this is no longer an unanswered plan question.

### MF2 — Feature-flag / rollout-guard coverage resolved for planning
Resolved: Q37 and M-0R require a lightweight rollout guard or rollback checklist before external launch. The default is not to build a broad feature-flag framework, but the beta express-components path and M-1/M-3 RPC rollout must have an operational escape hatch.

### MF3 — i18n / peso formatting for the PH market
Resolved: Q35 sets the PH peso/i18n default. It keeps existing money-format utilities, validates centavo/decimal handling in tests before changing money inputs, and rejects broad i18n scope for this phase.

### MF4 — Mobile / touch readiness explicitly scoped
Resolved: Q33 sets read-only mobile fallback under 768px for v1. Mobile editing/touch drag is a separate roadmap item, not a hidden first-user requirement.

### MF5 — Storybook coverage gap
The plan inventories 60+ Storybook components (per `.ai/README`) but never checks whether stories exist for `EstimateSheetContent`, `EstimateRowItemsTable`, `EstimateMaterialCell`, or the trust-gate modal. If no stories exist, the visual-regression plan (`17:100-105`) starts from scratch. One finding: "Audit whether stories exist for the center-sheet components; if not, add before Phase 5 visual changes."

### MF6 — Telemetry to verify the fixes actually help users
Resolved in planning: Phase 0 telemetry now measures whether the fixes work. After M-10 (per-row save chips), it should show whether users see failures they previously missed. After M-3, `bulk_delete_atomic_failure` and retry telemetry should show whether users recover from all-or-nothing failures.

### MF7 — `archestimator:add-library-item` custom-event listener unvalidated (H39)
Resolved in planning: H39 is promoted to ESC-P1-09 and M-6b covers a shared custom-event detail validator plus rejection telemetry.

### MF8 — Accessibility gaps not promoted to findings
Resolved: promoted to `ESC-P1-08` in `15` and traced to M-10/M-15/M-16/M-17 in `19`.

### MF9 — WCAG 2.2 AA conformance target not pinned
Resolved: Q34 pins WCAG 2.2 AA for the center-sheet first-user path.

---

## Implementation plan risks

### IR1 — RPC naming was stale; resolved
Replace paths now use `replace_estimate_row_item_with_history` (`actions.ts:2527`); insert paths use `insert_estimate_row_item_with_history` (`actions.ts:2453`). M-1 should model row replacement semantics on the replace RPC and insertion semantics on the insert RPC as appropriate.

### IR2 — M-1 effort estimate is optimistic given the precedent of the removed move RPC
M-1 is rated "L" and allocated part of "4-6 engineer-days" for Phase 1 (`16:195`). But (a) the "existing path to repurpose" doesn't exist (A3), (b) the previous atomic move RPC (`n_nodes`) was explicitly dropped (verified, `20260520100459`), and (c) the new RPC must coordinate two row updates + a history event in one transaction. Realistic: 3-4 days for M-1 alone, not 1-2.

### IR3 — M-3's transaction contract resolved
RD-1 chooses all-or-nothing. The RPC must validate all target rows/revisions first, then delete in one transaction; any failed row aborts all deletes.

### IR4 — Bulk-delete failure UX still needs implementation proof
The accepted UX is all-or-nothing copy, independent of M-10 per-row save chips. M-3 tests must prove the UI says nothing was deleted and names the failed row/revision where available.

### IR5 — `row_moved` consumer work identified
Source check found activity-history filters/labels/detail rendering that must be updated. M-1 now includes this as DoD.

### IR6 — No migration rollback / feature-flag plan for M-1 and M-3 RPCs
A defective RPC deploy cannot be rolled back without re-introducing the P0/P1 defect. The plan should specify shipping new RPCs behind a client-side flag with the old path as fallback until validated.

### IR7 — No backward-compat audit of existing `moveEstimateRowItem` callers
`use-estimate-query.ts:173-189` calls the repository `moveEstimateRowItem`. If M-1 changes that repository method's contract, those callers break. Plan does not audit them.

### IR8 — Phase 8 decomposition lacks behavior-locking pre-step
`04` §9.12-9.13 admits no characterization tests for promote/detach/move/bulk happy paths. A decomposition (M-21..M-24) without first writing those tests is a behavior-preservation gamble.

---

## Validation plan risks

### VR1 — "Manual QA per release with product-owner sign-off" is unscripted
`17:169-171`. No checklist, no script, no acceptance criteria document. This is the weakest gate in the plan and it gates the P0 fixes.

### VR2 — No CI integration for RLS-enabled RPC tests
`17:73-78` specifies migration tests "with RLS enabled" but local Supabase RLS can differ from production (especially around `auth.uid()` context). The plan doesn't specify running these tests against a CI Supabase instance with realistic auth.

### VR3 — Perf benchmark targets have no baseline
`17:140-145` specifies "Initial render < 1s, keystroke latency < 50ms." But no current baseline is measured (A4). Without a baseline, "improvement" is unprovable.

### VR4 — Cross-browser testing lists Firefox/Safari with no CI matrix
`17:156-160`. Firefox drag-and-drop behavior is specifically called out by ESC-P2-09 as browser-dependent, but there's no automated Firefox test.

### VR5 — No observability validation
The plan validates that fixes *work* but not that the team can *detect* if they break in production. No Sentry event validation, no log-grep for the new error codes.

---

## Open questions resolved by the decision pass

### OQ1 — Q23 (column widths)
Resolved: account sync is deferred until after 1k users. No `user_preferences` table is needed for Phase 1/beta.

### OQ2 — Q14 (keyboard replace/move)
Resolved: M-9 uses an engineering-owned command-palette-style picker default. Product polish is not a blocker.

### OQ3 — Q32 (focus management)
Resolved: defaults accepted under the WCAG 2.2 AA target. Implementation still needs keyboard/screen-reader verification.

### OQ4 — Q5 (move preserves target values)
Resolved: M-1 preserves target row values. Source-value row moves are a future separate feature, not a silent RPC contract change.

---

## Confidence calibration

### CC1 — ESC-P0-02 "Confidence: High" should be Medium
`15:65`. The reproduction (`15:82`) says "Observed (likely)." "Likely" is Medium-confidence language. High confidence requires observed reproduction; the plan reasons from the code path, which it admits (`00:101-104`).

### CC2 — ESC-P1-05 "Confidence: Med-High" is appropriate but the impact is overstated
`15:181`. Med-High is honest. But "Persistence impact: LOW... Data-integrity impact: LOW (no corruption) but HIGH (wrong insert location)" (l. 186-187) internally contradicts — if the wrong row gets the component, that's a data-integrity issue, not just UX.

### CC3 — ESC-P1-06 "Confidence: High" on an unmeasured number
`15:461, 507`. The ~120ms figure is self-admittedly estimated (A4). Confidence in the *existence* of the cliff is High (code path verified); confidence in the *severity* is Medium.

### CC4 — The §32 checklist "100%" claim is not calibrated
`19:107-133`. Item 28 ("complete edge-case matrix exists") is false per `14:144-146` (162/168 gaps). Item 33 ("no claim without evidence") is undercut by `00:101-104`. A calibrated rating would be ~90%, with the gaps explicitly named.

---

## Verdict

**PASS-WITH-FINDINGS, resolved for planning handoff.**

The plan is a strong static audit. The 2026-06-25 pass resolves the doc contradictions, RPC spelling, severity disputes, open decisions, telemetry task, and threat-model gap. Remaining items are implementation/runtime validation risks: TOCTOU hardening, new RPC tests, telemetry sink proof, missed-scenario tests, and manual accessibility/perf checks.

---

## Top 10 actions for the lead coordinator

1. **DONE — Reconcile docs `15` and `19`.** Final split: 25 verified, 9 partially true, 3 refuted, 3 unable to verify.

2. **DONE — Fix RPC spelling.** Replace paths use `replace_estimate_row_item_with_history`; insert paths use `insert_estimate_row_item_with_history`.

3. **DONE — Downgrade ESC-P0-02 to P1.** Historical ID retained.

4. **DONE — Specify M-3 transaction semantic.** All-or-nothing.

5. **Add a residual-risk note for the `assertCurrentLibrarySourceForEstimateCommit` TOCTOU window (A2)** instead of calling it "GOOD." Either accept the window and document it, or specify moving the check into the RPC. ~20 min. **Priority: Medium-High**.

6. **DONE — Audit whether `row_moved` is consumed by `activity-history.tsx` (IR5/A6).** The audit found filters, labels, and component-detail renderers to update; M-1 includes that work.

7. **Resolved as implementation-test backlog — missing scenarios S1 (multi-client same-row edit), S3 (tab-delete × in-flight mutation), S6 (duplicate tab).** Keep them in this adversarial review as explicit runtime/test gaps; they do not block planning handoff.

8. **DONE — Missing findings/decisions resolved.** Observability is ESC-P3-22 re-rated P2; mobile/WCAG/peso/save-chip/rollout-guard decisions are Q33-Q37; custom-event listener is ESC-P1-09; a11y package is ESC-P1-08.

9. **DONE — Re-rate ESC-P3-22 to P2** and add Phase 0 telemetry task.

10. **DONE — Resolve OQ1/OQ2 without blockers.** Q23 defers account DB sync; Q14 accepts an engineering-owned picker default.

---

## Acknowledged strengths (so this isn't one-sided)

- The move-component race Mermaid (`01:285-317`) is genuinely excellent — sequence diagrams that make the partial-failure window legible.
- The source-of-truth ledger (`02:84-99`) cleanly distinguishes 13 state owners with their lifetimes and persistence boundaries.
- The rollback-path table (`08:83-96`) traces every mutation to its restore strategy.
- The per-row queue analysis (`08:44-58`) correctly identifies why serialization within a row doesn't help across rows.
- The ESC-P0-01 evidence chain (`15:32-36`) cites 5 file:line anchors for a single defect — the kind of static analysis that catches real bugs before runtime.
- The revision-gate insight — contrasting `insertTemplateIntoParent` (gated) with `insertProjectSourceIntoParentById` (ungated) at `08:68-79` — is the plan's strongest contribution and surfaces the P0 cleanly.
- The optimistic-concurrency model (`08:110-111`, `13:53-55`) is correctly designed: server-enforced `expected_row_revision`, `mutationId` + `correlation_id` idempotency, deterministic correlation id for project-source.
- Realtime cursors use Ed25519 sender-bound envelopes (`realtime-identity.ts:14-22`) — non-trivial identity verification that most SaaS apps skip.
- The 37 Open Questions each have a recommended default that can ship or be explicitly deferred — the plan never stalls on "needs product input."

The adversarial findings above are about closing the gap between this strong analysis and the "100% implementation-ready" claim, not about rejecting the work.
