# 15 — Review Checklist

**Date:** 2026-06-12 · For a reviewer (human or agent) deciding whether implementation can start.
**Pass criterion per item:** the referenced document answers it with repo-specific evidence (paths/names), not generic advice. **Overall pass:** every section ≥ its threshold below and zero unresolved ☐ in sections 1, 2, 6.

## 1. Architecture readiness (threshold: all ✓)

- [x] Target hierarchy + five-term vocabulary defined (Estimate / Tab / Template / Project-derived source / Excel worksheet tab) — [02](02_TARGET_ARCHITECTURE.md) §1–2
- [x] Storage model decided with options compared and rejection rationale (A vs B vs C) — [03](03_DATABASE_MIGRATION_PLAN.md) §2
- [x] All four required diagrams present (ownership, read path, write/insertion, export) — [02](02_TARGET_ARCHITECTURE.md) §3–5
- [x] Compatibility strategy covers URLs, wrappers, DB names, export links, Ask Flip regex — [02](02_TARGET_ARCHITECTURE.md) §9
- [x] Uncertainty classified (verified / assumption / deferred / product decision / provider proof) — markers throughout 02–08; consolidated in [12](12_OPEN_QUESTIONS_AND_DECISIONS.md)

## 2. Database/migration readiness (threshold: all ✓)

- [x] DDL shape for `estimate_tabs` + node column + composite FK + partial-unique default — [03](03_DATABASE_MIGRATION_PLAN.md) §3
- [x] Constraint swap plan for the two deferrable unique-sort constraints, with rollback notes — [03](03_DATABASE_MIGRATION_PLAN.md) §3, §12
- [x] Backfill SQL + proofs P1–P5 (exactly-one-default-tab, full attachment, no cross-boundary) — [03](03_DATABASE_MIGRATION_PLAN.md) §7
- [x] `validate_estimate_node_tree`, reorder, create-node, template-insert RPC evolution specified — [03](03_DATABASE_MIGRATION_PLAN.md) §8
- [x] Dormant snapshot/version RPC handling documented (guard, v3 shape, restore-of-v2 rule) — [03](03_DATABASE_MIGRATION_PLAN.md) §8–9
- [x] Local test channel defined without Docker (ephemeral-Postgres harness) + linked-apply boundary stated — [03](03_DATABASE_MIGRATION_PLAN.md) §11, §13
- [x] Type-regeneration command + known stale-types caveat — [03](03_DATABASE_MIGRATION_PLAN.md) §14

## 3. UI/UX readiness (threshold: ≥ 9/10)

- [x] Tab strip placement decided with alternatives rejected — [05](05_ESTIMATE_TABS_UI_UX_PLAN.md) §1
- [x] Full tab lifecycle (create/rename/duplicate/reorder/archive/delete incl. last-tab + default re-point rules) — §3
- [x] Selection/expansion behavior on switch + URL continuity — §4
- [x] Empty-tab state with actions and drop target — §5
- [x] Cross-tab drag decision explicit (rejected v1, workarounds named) — §6
- [x] Interaction states: dirty, presence/cursors, pending mutations, active drag, failed load — §7
- [x] Keyboard/a11y path for **every** drag action + tablist semantics + focus management — §8
- [x] Component ownership: reuse-vs-extend table — §9
- [x] **UX copy table old→new with file:line cites, incl. DELETE-phrase atomic pair and sheet_code relabel** — §10
- [x] Responsive/loading/error + design-system constraints (12px/SF Pro/radius-xs/Phosphor) — §12–13

## 4. Templates panel readiness (threshold: ≥ 8/9)

- [x] Discriminated union extends (not replaces) `TemplatesTreeDatum` — [06](06_TEMPLATES_PANEL_UNIFICATION_PLAN.md) §3
- [x] One recommended nav structure picked — §4
- [x] Search/filter across both sections specified — §5
- [x] Projects section defaults to all readable workspace projects, with "Current project only" only as an optional narrowing filter — §5
- [x] Preview dock fields + live-source staleness representation without copying — §6
- [x] Insert path: new mime + single new RPC mirroring the template RPC, with provenance stamps — §7
- [x] Permission-safe read path traced to existing access logic before queries proposed — §8
- [x] Action matrix divergence (custom vs project-derived; absent not disabled) — §9
- [x] Route-browse vs sidebar parity/differences + editor exclusion + bulk mixed selection — §10, §12
- [x] Duplicate/stale/deleted-source handling — §11

## 5. Export readiness (threshold: all ✓)

- [x] Three behavior options compared; Option C picked with single-tab byte-shape fast path — [07](07_XLSX_EXPORT_TABS_PLAN.md) §2–3
- [x] Sanitizer rules complete (chars, 31, dedupe, reserved, apostrophe-escaping in formulas) — §4
- [x] Route/API additive (`?tab=`), filename rule, 413 semantics — §5
- [x] Fixed-worksheet disposition table (Bid Form/Summary/Terms/Breakdown) — §7
- [x] Preview/export model alignment + test strategy incl. unmodified single-tab assertions — §6, §9
- [x] Large-estimate stance with benchmark + escape hatch — §8

## 6. Security/RLS readiness (threshold: all ✓)

- [x] Current model traced incl. the history-RPC workspace-only asymmetry — [08](08_ACCESS_SECURITY_RLS_PLAN.md) §1
- [x] Tab-level access explicitly deferred with rationale — §2
- [x] `estimate_tabs` policies specified — §3
- [x] New RPCs adopt `can_edit_estimate`; hardening ride-along flagged to owner — §4
- [x] Insert gate ordering (source read → target edit → same workspace) + forged-payload defense — §5
- [x] Read + write permission matrices incl. anonymous/pending/shared-link rows — §6
- [x] Denial scenarios 1–9 enumerated and mapped to tests — §7
- [x] No new service-role surface; `profile_role_hardening_audit` advisory documented as out-of-scope — §9–10

## 7. Test readiness (threshold: all ✓)

- [x] Baseline-not-green caveat recorded and gates defined as "no NEW failures" — [09](09_TEST_AND_VALIDATION_PLAN.md) §0
- [x] Every prompt-required test category present with proposed file paths (unit/action/DOM/RLS/e2e/perf/a11y) — §2–7
- [x] Required Playwright scenarios 1–8 listed — §6
- [x] Exact validation commands match `package.json` (validate/type-check/lint/lint:design-system/lint:design/test/test:dom/build/launch:verify-hosted-export + targeted specs) — §9
- [x] Phase-by-phase matrix + named existing tests likely to change (incl. source-contract landmines) — §8, §10
- [x] Migration validation SQL + RLS denial + ExcelJS inspection + manual QA enumerated — §4–5, §11

## 8. Rollback/readiness (threshold: all ✓)

- [x] Per-phase rollback plans — [10](10_IMPLEMENTATION_PHASES.md) every phase
- [x] DB rollback notes pre/post NOT-NULL flip and constraint swap — [03](03_DATABASE_MIGRATION_PLAN.md) §12
- [x] Phase ordering keeps each slice invisible until consumed; first slice justified — [10](10_IMPLEMENTATION_PHASES.md) rationale; [14](14_IMPLEMENTATION_HANDOFF.md) §4
- [x] Provider/manual proof boundaries labeled — [14](14_IMPLEMENTATION_HANDOFF.md) §8

## 9. Stale-claim checklist (threshold: all ✓)

- [x] Prompt seed claims verified or **refuted with evidence** (notably: version RPCs are dormant, not "currently called") — [01](01_CURRENT_STATE_AUDIT.md) §12 and per-section seed verifications
- [x] Prior plan packs used as history only; stale items named (TemplateLibraryManager gone; insertion-handoff gap resolved) — [01](01_CURRENT_STATE_AUDIT.md) §15
- [x] Dead code identified rather than planned-around (`estimate-ui-store.ts`, `useEstimateQuery`, `useMoveEstimateRowItem`, direct-upsert `moveEstimateRowItem`) — [01](01_CURRENT_STATE_AUDIT.md) §8–9
- [x] Reviewer spot-check: pick 5 random file:line citations across docs and confirm against live code (the repo moves fast; this pack is dated 2026-06-12 @ `4289baff`)

## 10. Explicit pass/fail criteria

**PASS (implementation may start)** when: sections 1, 2, 6 fully ✓; sections 3–5, 7–9 at thresholds; the two product-decision items (Q-1 marketing copy, Q-2 default-tab name) either answered or accepted at their defaults; and the reviewer's §9 spot-check finds no broken citations.
**FAIL** if: any §2 or §6 item is unanswered; any seed-claim refutation turns out wrong on spot-check; or the copy table / keep-list conflict on any string.

**Reviewer result (2026-06-12): PASS after repair.** Independent review findings were applied before this checklist was marked: restricted-estimate access matrix corrected; pending-invite citation fixed; decision IDs normalized; insert RPC mode resolved as SECURITY DEFINER with explicit checks; performance budgets added; Projects-section default clarified to all readable workspace projects; release gate D-15 added; cleanup gate defined; traceability matrix narrowed for deferred rows. A fresh implementation kickoff must still rerun the §9 citation spot-check against the then-current branch because line numbers drift.

## Evidence Used

This checklist indexes documents 01–14 of this pack; thresholds and the spot-check protocol are this pack's own quality bar (prompt §Document Quality Bar + §Phase E).
