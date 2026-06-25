# 20 — Plan Audit and Scorecard

**Audit date:** 2026-06-25
**Auditor:** Lead coordinator synthesizing 6 parallel specialist reviews (ce-product-lens-reviewer, ce-coherence-reviewer, ce-design-lens-reviewer, ce-architecture-strategist, ce-security-lens-reviewer, ce-adversarial-document-reviewer) plus lead-scored dimensions.
**Plan pack audited:** `.ai/03_plans/2026-06-24-Estimate-Sheet-Center-Content-Analysis/` (22 docs after resolution pass).
**Audit mode:** Read-only planning audit per `Improve-Plan-Prompt.md` line 5. No application code, tests, migrations, infrastructure, or production assets were modified.
**Source baseline:** branch `main`, commit `1166b16f6bda9a5ff0d01defd2f8fe922fc8ed79` (per `00-README.md:4`). All specialist claims cite file:line; lead spot-checked load-bearing claims against `actions.ts`, `use-estimate-row-mutations.ts`, `drop-zones.tsx`, `row-table.tsx`, `cells.tsx`, `constants.ts`, `EstimateSheetContent.tsx`, and the migration history.

---

## Resolution status (2026-06-25)

This scorecard began as a read-only critique. The current pack now resolves the questions and blockers it raised:

- **C1 resolved:** stale `_with_library` RPC references were corrected to the actual history RPCs where appropriate; insert paths use `insert_estimate_row_item_with_history`, replace paths use `replace_estimate_row_item_with_history`, and row updates/deletes use their `_with_history` functions.
- **C2 resolved:** `15` and `19` now agree on 40 hypothesis verdicts: 25 verified, 9 partially true, 3 refuted, 3 unable to verify.
- **C3 resolved:** `ESC-P2-26` is defined in `15`, traced in `19`, and re-rated to P1 while retaining its historical ID.
- **C4 resolved:** M-3 bulk delete is all-or-nothing; no savepoint-per-row partial-delete contract.
- **C5 resolved:** the completion checklist is calibrated; no 100/100/100 claim remains.
- **RD-1..RD-11 resolved:** see §"Resolved decisions" below and `18-OPEN-QUESTIONS-AND-DECISION-LEDGER.md`.

Remaining gaps are implementation/runtime evidence gaps, not unanswered planning decisions.

## Document inventory (22 docs)

| # | Document | Purpose | Authority |
|---|----------|---------|-----------|
| 00 | `00-README.md` | Executive summary, health ratings, P0/P1/P2/P3 counts, artifact index | Authoritative for pack-level framing |
| 01 | `01-SCOPE-AND-SYSTEM-MAP.md` | Branch/commit, file inventory, component hierarchy, query/MIME/event maps, Mermaid diagrams | Authoritative for system shape |
| 02 | `02-ROW-DOMAIN-AND-SOURCE-OF-TRUTH.md` | EstimateRow model, library/project flavors, link states, source-of-truth ledger, persistence truth table | Authoritative for data flow |
| 03 | `03-COMPLETE-BEHAVIOR-INVENTORY.md` | Every pointer/keyboard/event-triggered behavior | Reference for other audits |
| 04 | `04-ROW-CRUD-AUDIT.md` | Per-operation CRUD flow (insert/read/update/replace/clear/delete/bulk/move/detach/promote) | Authoritative for CRUD paths |
| 05 | `05-DRAG-DROP-AND-INSERTION-AUDIT.md` | Source × target matrix, MIME contracts, dragCount, autoscroll, spring-loading | Authoritative for drag/drop |
| 06 | `06-EDITING-MATH-AND-TOTALS-AUDIT.md` | Numeric input, formulas, totals parity, proposal-export rounding | Authoritative for math |
| 07 | `07-TABS-SELECTION-SEARCH-AND-DISPLAY-AUDIT.md` | Tab lifecycle, selection, search, facets, group/sort, truncation/error/loading states | Authoritative for display |
| 08 | `08-STATE-CONCURRENCY-AND-ROLLBACK-AUDIT.md` | State machine, mutation queues, revisions, rollback paths, partial-failure scenarios | Authoritative for concurrency |
| 09 | `09-NETWORK-CACHE-AND-PERSISTENCE-AUDIT.md` | Every query, every mutation, query keys, cache reconciliation, idempotency | Authoritative for cache/RPC layer |
| 10 | `10-UX-UI-ACCESSIBILITY-AUDIT.md` | Layout, typography, destructive-action clarity, keyboard, SR, virtualized semantics, reduced motion | Authoritative for UX/a11y surface |
| 11 | `11-PERFORMANCE-AUDIT.md` | Render path, memo effectiveness, virtualization, perf estimates | Authoritative for perf reasoning |
| 12 | `12-ACTIVITY-DETAILS-EXPORT-AND-COLLABORATION-AUDIT.md` | Row details, activity history, proposal preview/export, cursors, conflict comms | Authoritative for modals + collab |
| 13 | `13-SECURITY-AND-DATA-INTEGRITY-AUDIT.md` | Authz, RLS, scoping, payload validation, idempotency, partial transactions, orphan/duplicate risks | Authoritative for security |
| 14 | `14-EDGE-CASE-AND-TEST-MATRIX.md` | 35 state-transition combos, 168-cell failure-injection matrix, non-default-tab/virtualization/keyboard/large-data test gaps | Authoritative for test coverage gaps |
| 15 | `15-PRIORITIZED-FINDINGS.md` | 28 findings (1 P0, 9 P1, 9 P2, 9 P3) with evidence + recommendations; 40 audit hypotheses appendix | Authoritative for findings |
| 16 | `16-IMPLEMENTATION-PLAN.md` | 9-phase plan, 28 milestones, every task with DoD | Authoritative for execution |
| 17 | `17-VALIDATION-PLAN.md` | Type/lint/unit/integration/E2E/a11y/perf validation matrix | Authoritative for verification |
| 18 | `18-OPEN-QUESTIONS-AND-DECISION-LEDGER.md` | 37 product decisions with accepted defaults and zero blockers | Authoritative for decisions |
| 19 | `19-TRACEABILITY-MATRIX.md` | Finding → decision → task → file → test → evidence | Authoritative for traceability |
| 20 | `20-PLAN-AUDIT-AND-SCORECARD.md` | Scorecard, resolved blocker ledger, revision status | Historical audit + resolution ledger |
| 21 | `21-ADVERSARIAL-REVIEW.md` | Adversarial critique with resolution addendum | Historical challenge + resolved status |
| 22 | `22-THREAT-MODEL.md` | Center-sheet assets, actors, trust boundaries, controls, residual risks | Authoritative for threat-model scope |

**Duplicate/obsolete docs:** none.
**Contradictory docs:** none known after the 2026-06-25 resolution pass.
**Authoritative when information conflicts:** docs `15` (findings), `16` (implementation contracts), `18` (decisions), `19` (traceability), and `22` (threat model) take precedence over historical critique text in `20`/`21`.

---

## Initial scoring

Per the `Improve-Plan-Prompt.md` rubric, three axes scored 1–100: **Strategy**, **Document Quality**, **Implementation Readiness**. Each axis has six sub-axes. The six specialist reviewers each owned a lane; the lead scored the axis-level rollup using their evidence plus the lead's own read.

### Axis 1 — Strategy (lead + ce-product-lens-reviewer)

| Sub-axis | Score | Evidence |
|----------|-------|----------|
| Clear objective + user value | 85 | `00:11-19` ties findings to "production-hardened" status; `15:19-108` shows P0s corrupt the estimate, directly violating the brand promise at `README.md:15` ("Your numbers hold up"). Objective is implicit (close findings); no explicit user-outcome statement. |
| Business alignment | 75 | Phase 1 protects proposer-side integrity; `15:230-254` (read-only UX) protects the dual-sided approver wedge (`README.md:225-227`). Resolution pass adds a relationship map to the `2026-06-19-Launch-Readiness-Audit` blockers in `00`. |
| Scope discipline | 70 | Phase 1 is tight (`16:5-91`); `00:91-93` cleanly excludes left/right sidebars. Phase 8 decomposition (`16:160-174`, XL, 5-8 eng-days) and Phase 9 M-25 column-width sync (`16:178-180`, XL, new table) are pre-launch gold-plating for a product with zero users. |
| Prioritization | 80 | P0/P1 ranking sound; `15:476-487` "ten most consequential" defensible. ESC-P1-06 severity depends on unknown typical row count for the PH/SEA market (`15:206`). |
| Tradeoff quality | 75 | Per-finding alternatives good (`15:47-49, 99-101, 141`); revision-gate reuse is the right lazy path. Resolution pass articulates the pack-level tradeoff: ship Phase 0/1 for first users, keep Phase 8 post-launch, defer account-wide column preferences until after 1k users. |
| Success metrics | 55 | Initial audit found only task-level DoDs. Resolution pass adds `18` success signals and Phase 0 telemetry; actual telemetry sink proof remains an implementation gate. |
| **Strategy axis (simple average)** | **73** | |

### Axis 2 — Document Quality (lead + ce-coherence-reviewer)

| Sub-axis | Score | Evidence |
|----------|-------|----------|
| Accuracy | 70 | Initial audit found stale RPC spelling in several docs. Resolution pass corrected replace paths to `replace_estimate_row_item_with_history` and insert paths to `insert_estimate_row_item_with_history` per `actions.ts:2453` and `actions.ts:2527`. |
| Clarity | 75 | Prose is clear; diagrams (Mermaid in `01`, `02`, `08`) communicate well. Phase 4 in `16:116-118` is empty (placeholder redirect). |
| Completeness | 78 | Strong on coverage of existing code paths. Resolution pass answers success metrics, mobile/touch scope, peso/i18n, WCAG target, and beta telemetry as planning defaults. Remaining gaps are runtime/provider proof and implementation tests. |
| Internal consistency | 55 | Initial audit found 6 H-table contradictions and a self-miscount in `15`. Resolution pass reconciles the H-table to 25 verified / 9 partially true / 3 refuted / 3 unable. |
| Traceability | 68 | Initial audit found `ESC-P2-26` referenced but undefined and several P2 rows without named test files. Resolution pass defines/traces `ESC-P2-26`; remaining named-test gaps are P2 implementation cleanup. |
| Decision rationale | 72 | `18` gives every Q1-Q36 a recommended default. Q9, Q10, Q12, Q21, and Q22 are explicitly accepted-but-deferred backlog decisions, not Phase 1 blockers. |
| Lack of ambiguity | 60 | Initial audit found H-table verdict contradictions, a dangling `ESC-P2-26`, and function-name drift. Resolution pass closes those blockers and corrects the stale RPC names found during review. |
| **Document quality axis (simple average)** | **68** | |

### Axis 3 — Implementation Readiness (lead + ce-architecture-strategist + ce-security-lens-reviewer + ce-design-lens-reviewer)

| Sub-axis | Score | Evidence |
|----------|-------|----------|
| Technical specificity | 80 | Resolution pass specifies `p_target_replacement_item` as the fully constructed target item and M-3 as all-or-nothing. Remaining implementation-level specifics: correlation-id dedup semantics and rollout/rollback mechanics. |
| Architecture coverage | 82 | Server-action layer, RPC layer, RLS, query keys, MIME contracts all mapped. `row_moved` is now resolved as a text event with activity-history consumer work; remaining gaps are backward-compat audit of existing `moveEstimateRowItem` callers and rollout details. |
| Dependencies | 75 | `09` maps queries and mutations; `19` traces findings → tasks → files. Missing: dependency on `20260520100459_remove_estimate_node_move_rpc.sql` precedent (a previously-removed atomic move RPC, never reconciled). Missing: feature-flag/rollback plan for M-1/M-3. |
| Acceptance criteria | 70 | Phase 1 DoDs are objective (`16:28-34`). M-4 DoD is "Code + test." (l. 77) — terse, not objective on its own; `19:18` rescues it. Several P2 findings have no named test (`ESC-P2-08, ESC-P2-11, ESC-P2-12, ESC-P2-13`). |
| Testability | 65 | `14` shows 162 of 168 failure-injection cells are gaps (`14:144-146`). `17` specifies new tests but no CI integration for RLS-enabled RPC tests; no perf baseline for M-18's `<100ms` claim. |
| Migration and rollout planning | 60 | Standing DB mandate (AGENTS.md) allows fast iteration. Missing: rollback plan if M-1 RPC has a defect (cannot fall back to two-replace path without re-introducing P0-01). Missing: zero-downtime cutover analysis. |
| Security and operational readiness | 65 | Server-side authz (`requireAuth`, `assertCanEditEstimate`, RLS, `assertCurrentLibrarySourceForEstimateCommit`) genuinely strong. Resolution pass adds `22-THREAT-MODEL.md` and promotes H39 to ESC-P1-09/M-6b. Remaining implementation gaps: M-1/M-3 DoS bounds, per-row authz inside loops, and telemetry-provider proof. |
| **Implementation readiness axis (simple average)** | **71** | |

### Overall weighted score

| Axis | Weight | Score | Weighted |
|------|--------|-------|----------|
| Strategy | 0.30 | 73 | 21.9 |
| Document Quality | 0.30 | 68 | 20.4 |
| Implementation Readiness | 0.40 | 71 | 28.4 |
| **Overall** | **1.00** | — | **70.7 → 71** |

**Initial verdict:** **PASS-WITH-FINDINGS.** The resolution pass closes the planning-doc blockers. Current status: Phase 0/1 is implementation-ready as a plan, with runtime validation still required during implementation.

---

## Specialist verdicts at a glance

| Specialist lane | Agent | Score | Verdict |
|---|---|---|---|
| Strategy + business alignment | ce-product-lens-reviewer | 78/100 | PASS-WITH-FINDINGS |
| Coherence + traceability + requirements | ce-coherence-reviewer | 68/100 | PASS-WITH-FINDINGS |
| UX + a11y + design lens | ce-design-lens-reviewer | 62/100 | PASS-WITH-FINDINGS |
| Architecture + integration boundaries | ce-architecture-strategist | 80/100 | PASS-WITH-FINDINGS |
| Security + data integrity + threat model | ce-security-lens-reviewer | 74/100 | PASS-WITH-FINDINGS |
| Adversarial + missing assumptions | ce-adversarial-document-reviewer | (qualitative) | PASS-WITH-FINDINGS |
| Lead coordination synthesis | this doc | 71/100 | PASS-WITH-FINDINGS |

**Consensus:** all six reviewers independently reached PASS-WITH-FINDINGS before this resolution pass. The bounded consistency, contract, design, and threat-model gaps are now documented as resolved planning decisions or implementation tasks.

## Resolved critical blockers

A "blocker" here means: an issue that would cause an implementer to make a wrong decision if they followed the plan as written. All blockers below are closed as planning-doc blockers.

1. **C1 — RPC names. Resolved.** Replace paths use `replace_estimate_row_item_with_history`; insert paths use `insert_estimate_row_item_with_history`.
2. **C2 — Hypothesis contradictions. Resolved.** `15` and `19` now agree on 25 verified, 9 partially true, 3 refuted, 3 unable to verify.
3. **C3 — `ESC-P2-26`. Resolved.** Defined in `15`, traced in `19`, implemented by M-6, severity P1.
4. **C4 — M-3 transaction semantic. Resolved.** All-or-nothing RPC; any failed row aborts all deletes.
5. **C5 — Overstated checklist. Resolved.** Checklist remains calibrated with named runtime/test residuals, not 100/100/100.

---

## Major gaps (per specialist lane)

### Strategy (ce-product-lens-reviewer)

- **MG-S1** Resolved: `00-README.md` now maps center-sheet findings to the `2026-06-19-Launch-Readiness-Audit` blocker list.
- **MG-S2** Phase 8 decomposition (XL, 5-8 eng-days) is pre-launch maintainability investment with no user value. Fix: relabel as "Post-launch" in `16`; do not block launch on it.
- **MG-S3** Phase 9 M-25 (per-account column-width sync, XL, new `user_preferences` table) is gold-plating for a product with zero users. Fix: state explicitly "post-1k-users" in `16`.
- **MG-S4** Resolved: `18` now has success signals, and M-0T adds Phase 0 telemetry.
- **MG-S5** ESC-P1-07 (read-only UX) is load-bearing for the approver-side wedge but treated as one-of-five P1s. Fix: call out strategically in `00-README.md` executive summary.

### Coherence (ce-coherence-reviewer)

- **MG-C1** Resolved: hypothesis verdicts reconciled.
- **MG-C2** Resolved: ESC-P2-26 defined and traced.
- **MG-C3** Resolved: `15` summary recounts to 25/9/3/3.
- **MG-C4** Resolved: Phase 1 prose no longer says "two highest-impact P1s."
- **MG-C5** Resolved: M-5 cross-reference points to Phase 1.
- **MG-C6** Resolved: Q9, Q10, Q12, Q21, and Q22 are explicitly accepted-but-deferred backlog defaults in `18`, not hidden Phase 1 blockers.

### UX/A11y/Design (ce-design-lens-reviewer)

- **MG-U1** Partial-failure UX is described as a defect, not designed. Bulk-delete (P1-03), move-component (P0-01) partial states have no copy, no state enumeration, no recovery UI.
- **MG-U2** Accessibility gaps in `10:110-119` (`aria-rowindex`, `aria-colindex`, `scope="col"`, per-row `aria-live`, `role="alert"`) sit in audit notes — never promoted to formal findings in `15`.
- **MG-U3** Resolved: Q34 pins WCAG 2.2 AA for the center-sheet first-user path.
- **MG-U4** No virtualized-table SR testing commitment (H30 UNABLE TO VERIFY at runtime; `10:155` flags "probable P1 a11y gap (no test in CI)" but no commitment).
- **MG-U5** Resolved: Q33 sets a read-only mobile fallback under 768px for v1.
- **MG-U6** Per-row save chip (P1-04) states not enumerated (idle/saving/saved/failed/conflict; copy ≤12 chars; aria-live politeness; placement).
- **MG-U7** Trust-gate modal copy unspecified for 4 states (warn/block × target-ok/target-deleted/source-stale).

### Architecture (ce-architecture-strategist)

- **MG-A1** M-1 RPC contract omits the constructed-target-item shape. Server will drop the target's preserved quantity/adjustment unless the contract specifies `p_target_replacement_item` is the fully-constructed `EstimateRowItem` post-`applyEditableValuesToLibraryItem`.
- **MG-A2** M-1 revision-conflict semantics under-specified. Two revisions; if only one mismatches, does the whole move abort? Atomicity demands both-must-match-or-409; plan must say so.
- **MG-A3** M-4 trust-gate DoD only requires target-existence check; the source-freshness re-check (second half of ESC-P1-05) is "optional" and dropped.
- **MG-A4** M-5 read-only gating file list omits the drag source `handleComponentDragStart` (`cells.tsx:432-436`). Read-only users can still initiate drags that fail at drop.
- **MG-A5** Phase 8 decomposition (M-21..M-24) lacks a behavior-locking pre-step. `04` §9.12-9.13 admits no tests for promote/detach/move/bulk — a refactor without characterization tests is a gamble.
- **MG-A6** No backward-compat audit of existing `moveEstimateRowItem` repository callers (`use-estimate-query.ts:173-189`) before M-1 potentially repurposes it.
- **MG-A7** Resolved for planning: Q37/M-0R require a rollout guard or explicit rollback checklist before external launch.
- **MG-A8** Resolved: `row_moved` is a new text `event_type`; no enum migration is required, and M-1 names activity-history consumer updates.
- **MG-A9** Performance claims in M-18/M-19 lack measurement gates. "<100ms keystroke latency" is a hypothesis, not a guarantee; per-keystroke `estimateNodeTotals` recompute (`11:46-50`) dominates the cost more than the virtualization cliff M-18 addresses.

### Security (ce-security-lens-reviewer)

- **MG-SE1** Resolved: `22-THREAT-MODEL.md` now defines assets, actors, trust boundaries, threats, controls, and verification hooks.
- **MG-SE2** Resolved in planning: `archestimator:add-library-item` custom-event listener risk is promoted to ESC-P1-09 with M-6b validation/rejection telemetry.
- **MG-SE3** M-1/M-3 new RPCs lack DoS bounds (array length cap, statement timeout).
- **MG-SE4** M-1/M-3 new RPCs lack per-row authz re-check inside the loop.
- **MG-SE5** M-6 DoD omits audit-event plumbing. `13:32` recommends `recordLibraryEvent("xss_attempt", ...)` but M-6 DoD (`16:94-96`) does not include it.
- **MG-SE6** `assertCurrentLibrarySourceForEstimateCommit` TOCTOU window. Plan calls the check "GOOD" (`13:39-41`) but the SELECT runs in TypeScript (`actions.ts:879-904`) before the RPC commits — a classic time-of-check/time-of-use race window.

### Adversarial (ce-adversarial-document-reviewer)

- **MG-X1** `assertCurrentLibrarySourceForEstimateCommit` is in the TS action wrapper, not in the Postgres RPC. Plan's "server re-reads library source" framing is misleading.
- **MG-X2** The previous atomic move RPC (`n_nodes`) was explicitly REMOVED in `20260520100459_remove_estimate_node_move_rpc.sql` with the comment "Estimate-tree drag/drop reorganization has been removed from the product." Plan never reconciles why or whether row-level moves face the same rationale.
- **MG-X3** Resolved for planning: ESC-P3-22 is re-rated P2 and Phase 0 requires a beta telemetry sink; Sentry/provider proof remains implementation evidence.
- **MG-X4** Resolved: Q35 sets the peso/i18n default for the PH market without broad i18n scope creep.
- **MG-X5** Resolved: Q33 sets a mobile/touch v1 scope with read-only fallback.
- **MG-X6** No Storybook coverage analysis for the center-sheet components.
- **MG-X7** Validation plan: "Manual QA per release with product-owner sign-off" (`17:169-171`) has no checklist, no script, no acceptance criteria document.
- **MG-X8** Resolved: Q23 now explicitly defers `user_preferences` table/account sync until after 1k users; no Phase 1 schema blocker.
- **MG-X9** Resolved: Q14 now accepts an engineering-owned default picker UX for M-9.
- **MG-X10** ESC-P0-02 is arguably P1, not P0. Plan's own impact assessment (`15:70-71`) says "Persistence impact: MEDIUM — the DB is correct (the in-flight edit lands); the UI lies." A UI-only divergence that self-heals is P1 by the plan's own rubric.

---

## Minor gaps (selected)

- **mG-1** `15:56` says "4 new test files" but body names 2.
- **mG-2** `complexity:` (lowercase) in P0-02..P1-07 finding bodies vs `Complexity:` (capitalized) elsewhere — format drift.
- **mG-3** `Med-High` / `Medium-High` confidence label (`15:181, 459`) is not one of the three defined confidence levels (High/Medium/Low).
- **mG-4** Function-name drift: `insertLibraryItem` (`15:531`) vs `commitLibraryItemInsert` (`15:191`, `19:58`).
- **mG-5** M-4 DoD (`16:77`) "Code + test." is terse; `19:18` expands but the two docs disagree on DoD granularity for the same task.
- **mG-6** Phase 4 in `16:116-118` is an empty placeholder.
- **mG-7** Resolved: ESC-P2-11 has named local-storage validation coverage in `19`.
- **mG-8** Cursor `displayName` broadcast is PII-adjacent; not analyzed for minimum-data principle.
- **mG-9** `sourceUrl` href-render path not analyzed for `javascript:` URL XSS vector.
- **mG-10** ESC-P3-22 (telemetry `console.warn` in prod) is under-rated for a beta feature without observability.

---

## Contradictions found

(Consolidated from the coherence and adversarial reviewers; all rows below were resolved in the 2026-06-25 pass.)

| # | Topic | Doc A says | Doc B says | Resolution |
|---|-------|------------|------------|------------|
| C1 | RPC names | Stale `_with_library` names existed in older rows | Current docs use `replace_estimate_row_item_with_history` / `insert_estimate_row_item_with_history` correctly | Resolved |
| C2 | H15 verdict | Previously split | REFUTED (working) in `15` and `19` | Resolved |
| C2 | H16 verdict | Previously split | REFUTED (working) in `15` and `19` | Resolved |
| C2 | H22 verdict | Previously split | REFUTED in `15` and `19` | Resolved |
| C2 | H25 verdict | Previously split | PARTIALLY TRUE in `15` and `19` | Resolved |
| C2 | H26 verdict | Previously split | VERIFIED in `15` and `19` | Resolved |
| C2 | H38 verdict | Previously split | UNABLE TO VERIFY at runtime in `15` and `19` | Resolved |
| C3 | ESC-P2-26 | Previously dangling | Defined in `15`, traced in `19`, M-6 in `16` | Resolved |
| C7 | P1 count | Previously stale prose | Counts now P0=1, P1=9, P2=9, P3=9 | Resolved |
| C8 | M-5 location | Previously stale prose | M-5 is Phase 1 | Resolved |
| C9 | Bulk-delete TX | Previously conflicted between single transaction and partial-result response | RD-1 picks all-or-nothing; M-3 reflects it | Resolved |

---

## Resolved decisions

Decisions that previously blocked or shaped implementation:

1. **RD-1 — M-3 transaction semantic:** **all-or-nothing.** One failed row aborts the whole bulk delete; drop `deletedIds/failedIds` partial-success response shape.
2. **RD-2 — `row_moved` event type:** **use a new `row_moved` text event.** `estimate_sheet_events.event_type` is `text`, not an enum, so no enum migration is needed. Activity history must add filters/labels/detail rendering.
3. **RD-3 — ESC-P0-02 severity:** **downgrade to P1** while retaining historical ID. It is a serious visible-state race, not structural persisted corruption.
4. **RD-4 — Phase 8 launch status:** **post-launch only.** Decomposition is behavior-locking maintainability work and must not block first users.
5. **RD-5 — Q14 picker UX:** **engineering-owned default accepted.** Use command-palette-style picker with search, roving keyboard nav, Enter/Esc behavior, and target-row copy.
6. **RD-6 — Q23 persistence scope:** **no `user_preferences` table before 1k users.** Keep local per-estimate + last-used fallback for beta; revisit account sync later.
7. **RD-7 — Mobile scope:** **read-only fallback under 768px.** Editing, drag/drop, bulk selection, and resizing are disabled for v1 mobile.
8. **RD-8 — Accessibility target:** **WCAG 2.2 AA** for the center-sheet first-user path.
9. **RD-9 — Telemetry:** **add Phase 0 telemetry** before Phase 1 ships.
10. **RD-10 — Threat model:** **create `22-THREAT-MODEL.md`.**
11. **RD-11 — Feature flag / rollback guard:** **require an external-launch rollout guard or rollback checklist.** Prefer an existing config/env flag for beta express editing; if the implementation cannot isolate the path cleanly, document rollback steps for M-1/M-3 instead of inventing a broad feature-flag framework.

---

## Recommended revisions (priority-ordered)

### P0 — fix before plan is treated as a single source of truth

1. **DONE — RPC names reconciled.** Replace uses `replace_estimate_row_item_with_history`; insert uses `insert_estimate_row_item_with_history`. Closes C1.
2. **DONE — `15` and `19` reconciled.** Final hypothesis totals: 25 verified, 9 partially true, 3 refuted, 3 unable to verify. Closes C2.
3. **DONE — `ESC-P2-26` defined and traced.** It is severity P1, ID retained. Closes C3.
4. **DONE — M-3 semantic picked.** All-or-nothing bulk delete. Closes C4.
5. **DONE — checklist calibrated.** No 100/100/100 claim; residuals named. Closes C5.

### P1 — fix before Phase 1 implementation begins

6. **DONE — Launch-Readiness relationship mapped** in `00-README.md` for ESC-P0-01, ESC-P0-02, ESC-P1-03, ESC-P1-07.
7. **DONE — Tighten M-1 RPC contract** (`16`) — specify `p_target_replacement_item` is fully constructed, both revisions must match or atomic 409, return shape `{targetRow, sourceRow}`, `row_moved` decision (RD-2), and activity-history consumer work.
8. **Promote M-4 source-freshness re-check from optional to mandatory** in DoD (`16:77`).
9. **Add `cells.tsx:432-436` drag source** to M-5 file list (`16:82-87`).
10. **Promote a11y gaps from `10:110-119` audit notes to formal findings** in `15` (suggest ESC-P1-08 a11y package).
11. **Promote `archestimator:add-library-item` custom-event issue (H39) to ESC-P1-09** with M-6b fix task.
12. **Add DoS bounds + per-row authz + audit-event plumbing** to M-1/M-3/M-6 DoDs.
13. **DONE — Phase 0 telemetry task added** (instrument `row_moved`, `bulk_delete_atomic_failure`, `project_source_insert_revision_mismatch`, malformed-payload events).
14. **DONE — Phase 1 prose reconciled** in `00`, `15`, and `16`.
15. **DONE — `15` M-5 cross-reference** now points to Phase 1.

### P2 — fix during Phase 1 execution

16. **DONE — Success signals added** to `18` with KPIs tied to brand promise.
17. **DONE — Decision ledger expanded** with Q33 (mobile scope), Q34 (WCAG 2.2 AA pin), Q35 (peso/i18n), Q36 (per-row save chip state enumeration), and Q37 (rollout guard).
18. **Relabel Phase 8 as "Post-launch"** in `16`.
19. **Split M-26 (Undo pattern) out of Phase 9** into its own task; sequence after Phase 5.
20. **DONE — Pin reduced-motion default** through Q34 and M-17.
21. **Add Phase 8 behavior-locking pre-step** (characterization tests for promote/detach/move/bulk happy paths) before M-21.
22. **DONE — Re-rate ESC-P3-22** from P3 → P2 and tie it to Phase 0 telemetry.
23. **Add residual-risk note** for the `assertCurrentLibrarySourceForEstimateCommit` TOCTOU window in `13`.
24. **DONE — Reconcile Open Questions Q9, Q10, Q12, Q21, Q22** as accepted-but-deferred backlog defaults in `18`.
25. **DONE — Audit `row_moved` event consumer** (activity-history.tsx); M-1 now requires filters, labels, and component-detail rendering updates.

### P3 — post-launch polish

26. Fix `15:569-573` summary tally (mG-1, mG-3).
27. Normalize `complexity:` capitalization in `15` finding bodies.
28. Replace `Med-High`/`Medium-High` with defined labels.
29. Pick canonical function name (`commitLibraryItemInsert`) and use consistently.
30. Add M-4 expanded DoD from `19:18` back into `16:77`.
31. Remove empty Phase 4 redirect from `16`.
32. Add named test files for ESC-P2-08, ESC-P2-11, ESC-P2-12, ESC-P2-13 in `19`.
33. **DONE — Add center-sheet threat model** as `22-THREAT-MODEL.md`; cross-reference from `13` remains a future cleanup if needed.

---

## Before-and-after score comparison

| Dimension | Before (this audit) | After planned revisions (estimated) | Delta |
|---|---|---|---|
| Strategy | 73 | 81 | +8 |
| Document Quality | 68 | 86 | +18 |
| Implementation Readiness | 71 | 84 | +13 |
| **Overall weighted** | **71** | **84** | **+13** |

The estimated post-revision score assumes the P0 + P1 revisions above land. P2 revisions add another ~3-5 points but are not required for implementation handoff.

The plan **does not claim 100/100/100**. It still needs implementation/runtime evidence for: (a) closing failure-injection gaps (`14:144-146`), (b) running authenticated/runtime verification (`00:101-104`), and (c) proving the new Phase 0 telemetry reaches the selected production sink. Those are implementation gates, not unanswered planning questions.

---

## Traceability coverage

(Consolidated from the coherence reviewer.)

| Finding class | P0/P1/P2 rows in `19` complete? | Named test files? | Validation surface? | Objective DoD? |
|---|---|---|---|---|
| P0 (1 finding) | Yes | Yes | Yes (M-1 E2E) | Yes |
| P1 (9 findings) | Yes | Yes | Yes (varies: unit / unit+a11y / unit+E2E) | Mixed (M-4 weak in `16`; rescued by `19`) |
| P2 (9 findings) | Yes | **No** for ESC-P2-08, ESC-P2-11, ESC-P2-12, ESC-P2-13 | Mixed | Mixed |
| P3 (9 findings) | Summary only | n/a | n/a | n/a |
| **ESC-P2-26** | Defined in `15`, traced in `19`, severity P1 with historical ID retained | Yes | Unit + telemetry assertion | Yes |

**Traceability gaps still open:** add named tests for the 4 P2 findings above and expand M-4 DoD during Phase 1 execution. `ESC-P2-26` is no longer dangling.

---

## Final readiness determination

**The plan pack is implementation-ready for Phase 0/1 as a planning artifact.** C1-C5 and RD-1..RD-11 are resolved in the docs. Phase 2-7 can proceed in parallel with remaining implementation tasks. Phase 8 is explicitly post-launch and does not block first users. Phase 9 polish items can ship incrementally.

**The plan is still not a runtime proof.** Implementation must still provide tests, migrations, telemetry sink verification, and manual/runtime checks before product completion can be claimed.

**Estimated effort to close P0+P1 revisions:** 4-6 engineer-hours of doc edits. No code changes.

---

## Exact reasons for scores below 100

(Per `Improve-Plan-Prompt.md` line 232: "Do not claim perfect readiness unless the evidence supports it.")

These bullets preserve the initial score penalties. Items closed by the 2026-06-25 resolution pass are labeled so they are not mistaken for remaining blockers.

### Strategy (73/100, −27)

- −10 No product-level success metrics or telemetry plan (resolved in current pack with `18` success signals and M-0T; runtime sink proof remains).
- −6 Launch-Readiness blocker mapping gap (resolved in current pack).
- −5 Phase 8 decomposition and Phase 9 M-25 are premature for pre-launch.
- −4 ESC-P1-07 strategically underweighted for the approver-side wedge.
- −2 Pack-level tradeoff (ship Phase 1, defer rest) not articulated (resolved in current pack).

### Document Quality (68/100, −32)

- −12 Internal contradictions on 6 hypothesis verdicts between `15` and `19` (resolved in current pack).
- −6 ESC-P2-26 dangling reference + `15` self-miscount (resolved in current pack).
- −5 stale RPC spelling across 5 docs (resolved in current pack).
- −4 Open Questions accepted without implementation tasks (resolved in current pack as explicit backlog defaults).
- −3 P2 findings without named tests.
- −2 Function-name and label drift (`insertLibraryItem`/`commitLibraryItemInsert`, `Med-High`).

### Implementation Readiness (71/100, −29)

- −6 M-3 transaction semantic self-contradictory (resolved in current pack; runtime proof still required).
- −4 M-1 RPC contract ambiguity (target-item shape and atomicity resolved; correlation/rollout details remain implementation work).
- −4 Missing threat-model doc and H39 mapping (resolved in current pack).
- −3 Phase 8 lacks behavior-locking pre-step.
- −3 M-1/M-3 lack DoS bounds, per-row authz, audit-event plumbing.
- −3 Migration rollback / feature-flag plan gap (resolved in current pack as Q37/M-0R planning contract).
- −2 A11y gaps not promoted to findings.
- −2 Partial-failure UX undesigned for 5 of 12 journeys.
- −2 WCAG 2.2 AA conformance target gap (resolved in current pack as Q34).

**No axis can reach 100 without runtime verification, owner decisions, and post-implementation evidence that the planning docs cannot provide on their own.**
