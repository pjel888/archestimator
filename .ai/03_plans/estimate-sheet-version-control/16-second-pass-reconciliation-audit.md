# 16 Second-Pass Reconciliation Audit

**Date:** 2026-05-24
**Scope:** Documentation reconciliation after the Activity-only pivot.
**Result:** The current source/tests support Activity-only UX; stale plan docs now carry historical-context warnings and dormant-artifact policy.

## Findings

### Code And Test Evidence

- `tests/vitest/estimate-sheet-version-control-ui.test.tsx` asserts the sheet header opens `Activity`.
- The same UI test asserts no sheet `Versions` tab, no `Create version`, no `Compare`, and no restore button in the sheet activity dialog.
- `tests/vitest/estimate-sheet-version-control-actions.test.ts` asserts app actions do not expose `createEstimateSheetVersion` or `restoreEstimateSheetVersionAsCopy`.
- `src/components/workshop/EstimateSheetContent.tsx` contains row details `Version History` and sheet `Activity` text.

### Documentation Drift Before This Pass

- `.ai/10_state/current-state.md` described the local sheet header as `Versions` and mentioned `Compare -> restore-as-copy confirmation` as active.
- `09-implementation-closeout.md` treated `Versions`, `Compare`, and restore confirmation smoke as current evidence.
- `02`, `03`, `05`, `06`, `07`, and `13` described the pre-pivot named-version architecture deeply enough that future agents could mistake it for current scope.

### Reconciliation Changes

- Updated `.ai/10_state/current-state.md` to state the current Activity-only UX and row details Version History contract.
- Added historical-context notices to `02`, `03`, `05`, `06`, `07`, and `13`.
- Rewrote `09-implementation-closeout.md` around supported Activity UX, dormant artifacts, and the linked-remote testing exception.
- Added `15-dormant-artifact-policy.md` to make keep/do-not-expose rules explicit.
- Added this audit as the second-pass record.

## Third-Pass Audit Disposition

| Finding | Disposition | Evidence / Next Step |
| --- | --- | --- |
| `renameEstimateNode` does not write history | Closed in code after audit | Follow-up migration/action work routes rename through `rename_estimate_node_with_history`; live DB proof remains blocked by local Supabase availability. |
| `createEstimateNode` has no `node_created` event | Closed in code after audit | Follow-up migration/action work routes create through `create_estimate_node_with_history`; live DB proof remains blocked by local Supabase availability. |
| Template insertion event coverage | Partially confirmed | Server action calls `insert_estimate_template_into_estimate_with_history`, schema tests assert `template_inserted` and wrapper `eventId`; live/event-read proof still needs local/throwaway DB. |
| Chart aggregation historical-table regression | Confirmed by focused static test | Repository reads `estimate_row_items`; focused tests assert it avoids `estimate_sheet_events` / `estimate_sheet_versions`. |
| Pagination beyond first 50 | Closed after audit | `fetchEstimateSheetVersionControl` supports sheet, row, and node cursors; UI exposes Load more for each scope. |
| Actor display | Closed after audit | Audit cards render visible profile display names, safe profile-email labels, `Unknown user`, or `System/backfill`. |
| Correlation grouping | Closed after audit | Repeated `correlation_id` values render as page-local related-event groups. |
| Measurement gates | Partially closed after audit | Payload/snapshot and retention metrics recorded on 2026-05-25; scalar latency remains blocked without a mutation harness. |
| Linked-remote QA artifacts | Decided after audit | The `V2` / `QA checkpoint` row is accepted as dormant residue; cleanup is destructive and out of current scope. |
| Proposal export label drift | Rule and guard added | Proposal export reads mutable estimate metadata; focused tests guard against dormant `estimate_sheet_versions` reads. |

## Dormant Artifact Inventory

The following are applied but dormant:

- `estimate_sheet_versions`;
- create named version RPCs;
- restore-as-copy RPCs;
- baseline version rows;
- compare-ready snapshot fields;
- generated Supabase types for those tables/RPCs.

Do not drop these without explicit destructive-cleanup scope. Do not expose them without a future proposal/export snapshot plan.

## Visual Artifact Staleness

The `.omx/artifacts/visual-ralph/estimate-sheet-version-control/` screenshots that show `Versions`, `Compare`, and restore confirmation are historical. They are not approved current UI references after the Activity-only pivot.

Future visual QA must capture fresh post-pivot references:

- sheet Activity open;
- row details Version History open;
- no sheet `Versions` tab;
- no `Compare` button;
- no restore confirmation.

## Measurement Gaps

The previous closeout did not record all measurement gates needed for a later activity expansion. The 2026-05-25 pass closed the read-only payload/snapshot portion:

- event count `20`;
- P95 row context `520.6` bytes;
- P95 old snapshot `1430.2` bytes;
- P95 new snapshot `1549.05` bytes;
- P95 largest event component `1549.05` bytes;
- max largest event component `1626` bytes;
- P95 dormant version snapshot `23694.5` bytes;
- max dormant version snapshot `24078` bytes;
- retention RPC showed workspace event bytes `75283`, workspace version bytes `308096`, max estimate event count `16`, threshold flags clear.

Still open:

- no scalar edit latency benchmark comparing current blur save against post-change RPC-backed save;
- no live runtime proof for node create/rename/template/rollback/concurrency on a reproducible local or throwaway database.

Carry these gates into any future activity expansion:

- P95 scalar events <= 2 KB;
- P95 replacement/delete events <= 8 KB;
- event payloads above 32 KB fail readiness pending review;
- representative 200-row snapshot <= 2 MB, with design review above 5 MB;
- scalar edit median latency must not regress more than 25% without documented acceptance.

## Blast Radius Notes

The prior broad implementation surface was high blast radius, with code-review graph reporting 468 impacted nodes across 97 files when code, migrations, and UI were considered together. Future work should split documentation, schema/RPC, row activity UI, node activity UI, and performance measurement into separate slices.

Before code edits for a future expansion, rerun impact analysis for:

- `createEstimateNode`;
- `renameEstimateNode`;
- `reorderEstimateTreeNodes`;
- `deleteEstimateNode`;
- `EstimateSheetContent`;
- the `fetchEstimateSheetVersionControl` activity fetch path.

## Activity Expansion Plan

Plan a separate `estimate-activity-history-expansion` slice for Sheet Folders, Group Nodes, and Area Nodes. The durable roadmap is now `17-activity-expansion-roadmap.md`.

Use synchronous RPC-owned append-only `estimate_sheet_events` as the v1 source of truth. Do not add Redis, listeners, or async queue infrastructure for canonical audit writes.

Required expansion work:

- preserve `nodeId` filtering in `fetchEstimateSheetVersionControl`;
- preserve direct-node events and optional descendant events for Group Nodes;
- keep default limits bounded and paginated;
- add canonical node events for `node_created`, `node_renamed`, `node_reordered`, and richer `node_deleted_with_children` context;
- keep `createEstimateNode` and `renameEstimateNode` history-aware and prove them against local Supabase or an approved throwaway DB before claiming live mutation completeness;
- reuse the current inspector and `AuditEventCard` language for sheet Activity, row Version History, and node Activity;
- preserve tree-row spacing and height consistency across estimate, library, and template trees.

## Tests To Preserve Or Add Later

- Keep tests that assert no sheet `Versions` tab or `Compare` button.
- Update doc-consistency assertions if present.
- Preserve node Activity action/UI tests added in the future expansion slice.
- Run focused Vitest before full `bun run validate` for code changes.

## Stop Condition

This reconciliation pass is complete. Future work should start from `18-current-activity-contract.md` and `19-local-safe-completion-audit.md`, not from this historical audit, unless reviewing how stale named-version claims were corrected.
