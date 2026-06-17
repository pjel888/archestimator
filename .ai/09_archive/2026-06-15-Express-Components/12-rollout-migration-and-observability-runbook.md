---
title: Express Components Rollout Migration And Observability Runbook
type: docs
date: 2026-06-15
---

# Rollout Migration And Observability Runbook

## Feature Flags

Use an express authoring flag before changing default Add row behavior.

Required behavior:

- flag on: Add row creates express row
- flag off: Add row creates legacy blank placeholder
- persisted express rows still render readable project-row fallback when flag is off
- promotion action can be separately disabled
- Project folder projection can be separately disabled

Suggested flags:

- `NEXT_PUBLIC_EXPRESS_COMPONENTS_ENABLED`
- `EXPRESS_COMPONENT_PROMOTION_ENABLED`
- `EXPRESS_COMPONENT_PROJECT_FOLDER_ENABLED`

## Ship Slices

1. Read-path and helpers: metadata mapping, express/blank classifiers, legacy blank tests.
2. Insert lifecycle behind flag: express template, insert return reconciliation, draft recovery.
3. Update/editor: widened app patch, keyboard/focus/state, day-0 virtualization-disable fallback.
4. History migration: row_blank classification predicate.
5. Day-0 concurrency/permission gates: sort-order allocation/retry, draft cursor suppression, stale-revision recovery, viewer/editor mutation blocks on insert/update/replace, rollback fallback.
6. Browser/mobile/realtime proof for U1-U4.
7. Fast-follow Project folder projection if reapproved.
8. Fast-follow promotion RPC and UI if reapproved.

Production gate: the history-classification migration plus express authoring flag must be deployed before production express inserts are enabled. Do not enable the authoring flag against the old source-null `row_blank_added` predicate.

## Migration Ledger

| Migration | Required before | Verify | Rollback |
| --- | --- | --- | --- |
| Narrow `row_blank_added` predicate in insert RPC | Express inserts use production activity | SQL harness: blank -> `row_blank_added`, express -> `row_added`/chosen event | Restore previous RPC body; no data rewrite |
| `promote_express_row_to_library_component` RPC | Promotion UI enabled | SQL/action harness: atomic create+relink+idempotency+permission | Drop/revert RPC; disable promotion flag |
| Storage policies | Only if file upload is added | Storage upload/update/select policy tests | Disable upload; preserve URL-only image path |

Provider scope remains Archestimator Supabase project `ebxxqidacheyapmmzavr`. Do not touch archestimator or unrelated projects.

## Existing Data

Live evidence shows 29 legacy source-less `unlinked` rows and two source-less rows with another link state. Rollout must:

- keep legacy blanks rendering as placeholders
- keep existing `row_blank_added` events unchanged
- exclude true blanks from Project folder
- defensively handle source-less non-unlinked rows without crashing
- avoid retroactive event rewrites unless a separate migration plan is approved

## Rollback

If the feature is rolled back by flag:

- new Add row returns to blank placeholder
- existing express rows render as normal project/manual rows with material, unit, unit cost, misc, quantity, and source snapshot image
- editor affordances may be hidden, but data remains visible
- Project folder and promotion actions can be disabled independently

If a code deploy is reverted:

- metadata is ignored by old code but row-level material/cost fields remain readable
- insert-history migration remains forward-compatible because `row_added` is already an existing event
- promotion RPC can remain unused or be reverted separately

## Observability

Owner: the Express Components implementation owner wires these through a concrete express telemetry sink before claiming release readiness.

Day-0 sink: add a small `express-components-telemetry` module following the `realtime-telemetry.ts` `setSink/report` test seam pattern, or, if that is rejected during implementation, use structured app logs with the exact prefix `[express-components]` and record test-session counts in the implementation evidence log. The implementation evidence log must name the selected module or prefix.

Minimum call sites:

- insert attempt/success/failure/retry in the Add row mutation path
- draft delete/abandon in the draft recovery path
- save attempt/success/failure and stale-revision conflict in U3/U4
- virtualization editor open/close/overlap detection in row-table/editor state
- promotion attempt/success/failure/duplicate guard in U7 if promotion is implemented

Track or log these event names or exact equivalents:

- `express_insert_attempt`
- `express_insert_success`
- `express_insert_failure`
- `express_insert_retry`
- `express_draft_deleted`
- `express_save_attempt`
- `express_save_success`
- `express_save_failure`
- `express_stale_revision_conflict`
- `express_promotion_attempt`
- `express_promotion_success`
- `express_promotion_failure`
- `express_promotion_duplicate_guard`
- `express_projection_query`
- `express_virtualization_editor_open`
- `express_virtualization_editor_close`
- `express_virtualization_overlap_detected`

Alert thresholds for beta:

- insert failure rate above 5% over a test session
- repeated stale conflicts on same row
- any promotion duplicate detected
- projection query exceeding existing Components route latency budget by a visible margin

## Static Documentation Gate

Before implementation starts, run or manually verify:

- docs 07-12 exist
- frontmatter present on every plan doc
- internal links and file references resolve or are marked indicative
- Mermaid blocks parse where used
- traceability matrix has no uncovered R/U/AE/Q/RSK rows
- migration ledger names every DB change
- audit remediation checklist has each P0/P1/P2 item mapped to a doc section
- active third-pass audit path is linked and every `DB-N*`/`BR-N*`/`UX-N*`/`CO-N*`/`SEC-N*`/`STRAT-N*`/`PERF-N*`/`DM-N*`/`OB-N*` item is mapped in doc 08
- SQL/provider evidence for promotion fast-follow is collected before U7 coding: current helper definitions, library write policies, function grants, target-folder workspace binding checks, and negative viewer/member/editor cases
- UltraQA or equivalent adversarial report exists before day-0 ready-to-implement claim, covering viewer bypass, replace/move clobber after reload, copy rekey collision, no-realtime peer visibility, stale revision recovery, flag-off persisted express render, 300-500 row virtualization stress, and source-less renamed-row projection leak

## Audit Archive Policy

Older audit folders were archived after static documentation gates passed and an independent verifier confirmed the plan pack absorbed those documented findings. The active third-pass audit remains unarchived input until this remediation pass verifies every finding in doc 08 and the static gate.

- Active third-pass audit: `.ai/02_audits/2026-06-15-Express-Components-claude-3rd-pass-audit/`
- Archived readiness audit: `.ai/09_archive/store/2026-06-15-Express-Components-claude-readiness-verification-audit/`
- Earlier deep audit: `.ai/09_archive/store/2026-06-15-Express-Components-claude-deep-audit/`
- Active implementation source: `.ai/03_plans/2026-06-15-Express-Components/`
- Evidence log: `.ai/05_logs/2026-06-15-express-components-plan-remediation.md`
- Verification boundary: docs-only. Provider behavior, browser behavior, implementation behavior, and a real U5 production capture remain implementation-phase evidence gates.
