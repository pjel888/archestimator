---
title: Express Components Plan Pack
type: docs
date: 2026-06-15
---

# Express Components Plan Pack

This pack plans the Express Components feature for estimate rows. It is a planning, audit, design, research, and readiness handoff only. No application source, migration, or Supabase provider state was changed.

## Primary Decision

Express components should begin as authored project estimate rows in `estimate_row_items`, not as a new persisted component table. The existing row shape already owns project scope, editable row cost fields, source snapshots, `link_state`, `row_revision`, history RPCs, and project/estimate RLS. A row can later be promoted to a workspace-wide component through the existing `cost_library_items` and `cost_library_item_price_options` RPC surface.

The only reason to introduce a new database shape is a future product requirement for reusable project-local components that are shared across multiple estimate rows without becoming workspace library components. That is a different product concept than the requested inline express row.

Day-0 implementation is deliberately narrower than the full pack: U1-U4 plus the minimum U9 rollout, permission, stale-revision, cursor-suppression, and migration gates. U5 is verification/normalization unless a real duplicate-instance bug is captured. U6 Project folder projection and U7 library promotion are fast-follow slices, not part of the first express authoring ship unless a new scope decision approves them.

## Files

- `00-scope-and-premise-decision.md` records the day-0 cut, inline-vs-modal spike gate, and table-versus-metadata identity decision.
- `IMPLEMENTATION_GOAL.md` is the copy-pasteable AI entrypoint for implementing this pack through durable goals, parallel work lanes, and UltraQA.
- `01-current-state-audit.md` records the current Add row, material-cell, project-specific, Components tab, and live Supabase state.
- `02-data-model-and-supabase-research.md` compares persistence alternatives and records Supabase docs/provider evidence.
- `03-ux-interaction-design.md` defines the inline editing, project folder, keyboard, and visual behavior.
- `04-implementation-plan.md` is the main implementation handoff with requirements, KTDs, units, and acceptance examples.
- `05-readiness-qa-matrix.md` is the adversarial readiness and verification matrix.
- `06-review-and-risk-register.md` captures review findings, risk decisions, and residual gaps.
- `07-rpc-and-row-patch-contract.md` pins the insert/update/unlink/promotion RPC contract, field key map, JSON merge rule, and migration ledger.
- `08-traceability-matrix.md` maps every requirement, implementation unit, acceptance example, QA scenario, and risk bidirectionally.
- `09-virtualization-keyboard-focus-and-state-spec.md` resolves fixed-height virtualization, keyboard, focus, state, copy, contrast, and mobile/touch behavior.
- `10-edge-cases-and-failure-modes.md` converts major failure modes into deterministic behavior, data invariants, and tests.
- `11-concurrency-and-permissions-spec.md` covers realtime multi-client behavior, stale-revision recovery, cursor anchoring, and role/permission gates.
- `12-rollout-migration-and-observability-runbook.md` defines feature flags, rollback, migration sequencing, provider scope, observability, and static docs checks.
- `evidence/subagent-summaries.md` preserves the parallel audit conclusions used by the pack.
- `evidence/live-supabase-evidence.md` records the read-only live database evidence.
- `evidence/u5-duplicate-instance-repro-note.md` records the U5 duplicate-instance proof boundary and the required real-project capture before implementation.
- `evidence/inline-vs-modal-spike-result.md` must be created by the U4 spike owner before inline editor coding proceeds.

## Glossary And Canonical Vocabulary

Line numbers in this pack were captured against the live tree on 2026-06-15 and are indicative. Implementers must re-grep symbols before editing.

| Concept | Canonical meaning |
| --- | --- |
| Express row | An estimate row with explicit express identity, authored from `Add row`, project-scoped, and not linked to a library component until promotion. |
| Day-0 express MVP | U1-U4 plus minimum U9 gates: read/classification, insert lifecycle, update widening, inline editor after spike, flag/rollback/permission/stale/cursor/migration readiness. |
| Legacy blank placeholder | The old Add-row placeholder: material label `Drag or add a component here`, `manual-row-placeholder` tag, zero cost, and placeholder render. It remains readable but is excluded from Project projection. |
| Detached/project-specific row | A row that began linked to a library component and was later unlinked through `unlink_estimate_row_item_from_library_with_history`; `link_state = "detached"`. |
| Linked overridden row | A library-backed row with local edits; it may show the make-project-specific action but is excluded from the Project folder until product explicitly includes it. |
| `source` | Derived in app mapping from `source_library_item_id`; it is not a DB column and cannot distinguish express, detached, and blank rows by itself. |
| Cost field names | UI/domain often uses `itemCost`; RPC patch key is `unitCost`; DB column is `unit_cost`. `miscCost` maps to `misc_cost`; `contingencyPercentage` maps to `contingency_percentage`. |
| JSON merge rule | Routine field edits omit `metadata` and `sourceSnapshot`, preserving both. Operations that intentionally mutate them must server-merge complete objects before sending the top-level key. |
| Migration posture | U3 app-layer update widening needs no migration. U2 history reclassification needs an insert-RPC migration. U7 atomic promotion uses a new promotion RPC migration. |
| Express metadata id | Row-lifetime UUIDv4 identity only. It is stable within one row, must be rekeyed by the implementation on project-source/template copy, and is not reusable project-catalog identity. Current copy RPCs do not do this yet. |

## Stop Condition

This plan is ready when a follow-on implementer can build U1-U4 without making a new express table by default, every third-pass audit P1/P2 finding has an owning requirement/unit/QA row, docs 07-12 exist, the U5 icon bug is reproduced against a real project or explicitly reframed as normalization hardening in the required evidence note, virtualization/keyboard/focus/concurrency/permission/rollback contracts are explicit, migration boundaries are honest, U6/U7 are marked as fast-follow unless reapproved, the inline-vs-modal spike has a recorded owner/evidence artifact, and the only remaining product fork is deliberate: whether project-local reusable components are needed beyond estimate-row projection.
