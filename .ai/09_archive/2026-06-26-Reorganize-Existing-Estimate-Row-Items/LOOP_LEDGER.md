# Loop Ledger

## DISCOVER

Inputs:

- User request for row drag handle above hover selection control.
- User clarification that same-branch row reordering must be supported.
- Planning prompt and attached planning instructions.
- AGENTS.md and project `.ai` operating rules.
- Targeted code audit across estimate sheet content, row table, branch rendering, tree external drops, row handlers, mutations, actions, schema, and tests.

Evidence:

- Existing row reorder grip was intentionally removed because row reorder was not implemented.
- Existing `moveRows` is component movement, not row relocation.
- Tree external drop already uses event handoff for template/source insertion.
- Database order is stored in `estimate_row_items.node_id` and `sort_order`.

## PLAN

Chosen architecture:

- Dedicated row MIME type and row event.
- Content-layer row handler owns movement.
- Tree forwards row drop events only.
- Pure helper computes final tree and affected row updates.
- Server action and RPC persist final order atomically.
- Same-branch reorder uses explicit target index.

Rejected shortcuts:

- Cosmetic icon.
- Reusing component move.
- Delete plus insert.
- Tree-owned row mutation.
- Direct repository upsert.

## EXECUTE

Planning artifacts created in:

`.ai/03_plans/2026-06-26-Reorganize-Existing-Estimate-Row-Items`

No product code, tests, migrations, or generated files were edited.

## VERIFY

Planning-phase verification evidence:

- Required files exist, including `README.md`, `00` through `19`, and `LOOP_LEDGER.md`.
- `git diff --check -- .ai/03_plans/2026-06-26-Reorganize-Existing-Estimate-Row-Items` passes after the audit-correction pass.
- Marker search has no actionable unresolved-work markers in the plan folder.
- Direct Markdown file checks found 22 expected documents, no missing or extra Markdown documents, no trailing whitespace, and final newlines present.
- Stale-contract scans found no remaining stale menu, coarse-pointer, optional browser-proof, placeholder, or plural move API wording.
- Same-branch reorder is referenced across requirements, architecture, data, tests, traceability, and readiness.
- Multi-agent audit lanes reviewed product strategy, UX/a11y, coherence, security, feasibility, and adversarial readiness.
- Final independent verifier and adversarial document reviewer both returned `PASS` after the audit-correction pass.

Implementation verification remains defined in `12_TEST_AND_VALIDATION_STRATEGY.md`.

## RECORD

Durable planning record is the plan folder itself. The plan records source audit, decisions, alternatives, risk, rollout, and traceability.

## DECIDE

Next implementation step:

1. Start implementation with pure helper tests and persistence tests.
2. Add the visible handle only after real move/reorder semantics are wired or feature-guarded.
3. Keep the MVP single-row and disabled during multiple selection.
