# 08 Implementation Readiness Gate

**Status:** Historical pre-pivot gate, superseded after the Activity-only reconciliation.
**Current gate:** Use `17-activity-expansion-roadmap.md` for future implementation work.

## Why This Gate Changed

The original checklist below was written for named sheet versions, compare, and restore-as-copy. The current product decision is Activity-only: sheet `Activity` plus row details `Version History`. Named-version schema/RPC artifacts remain dormant DB compatibility residue.

Do not use this file as an active pre-code checklist for new work. Use it as a historical disposition record and then start from `17-activity-expansion-roadmap.md`.

## Post-Pivot Gate Disposition

| Gate Area | Status | Disposition |
| --- | --- | --- |
| Product scope | Satisfied after pivot | Activity-only estimate history is accepted; full proposal package issuance remains out of scope. |
| Restore-as-copy | Dormant / not current | DB artifacts exist, but app UI/actions are absent and must stay absent until a future proposal/export snapshot plan revives them. |
| Event log plus named snapshots | Split | Append-only `estimate_sheet_events` is active; `estimate_sheet_versions` is dormant. |
| Row history first slice | Satisfied | Row details `Version History` is current supported UX. |
| One event per committed edit | Satisfied in strategy | Row scalar mutations use history RPCs and mutation/correlation ids. Measurement evidence remains open. |
| `V1`/`V2` export labels | Superseded | Current proposal export is mutable-current-estimate output. `versionLabel` metadata is not named snapshot or issued proposal evidence. |
| Row history entry point | Satisfied | Row details open from current row actions; no row grid growth is allowed without a separate visual pass. |
| Shared inspector pattern | Satisfied | Active for sheet Activity and row Version History. |
| Compare-current-only | Dormant / not current | Compare UI is absent and should remain absent. |
| Restore confirmation | Dormant / not current | Restore-as-copy UI is absent and should remain absent. |
| Git status / dirty files | Required per task | Must be rerun before any future edit because the worktree is active and dirty. |
| Impact analysis | Required per code task | Must be rerun before editing `createEstimateNode`, `renameEstimateNode`, `reorderEstimateTreeNodes`, `deleteEstimateNode`, `EstimateSheetContent`, or `fetchEstimateSheetVersionControl`. |
| Supabase RPC boundaries | Partially satisfied | Row, reorder, template, metadata, delete, create, and rename wrappers exist. Create/rename still need live DB proof once a local/throwaway harness is available. |
| Actor attribution | Satisfied locally | Actor labels resolve through visible profiles with `User <short-id>` / `System/backfill` fallbacks. |
| Correlation/idempotency | Satisfied locally | RPC/idempotency strategy exists; repeated `correlation_id` values render as page-local related-event groups. |
| Event pagination | Satisfied locally | Sheet, row, and node Activity use cursor pagination and Load more. |
| Measurement gates | Partially satisfied | Payload/snapshot and retention metrics are recorded; scalar latency benchmark remains blocked without a mutation harness. |
| Chart regression | Satisfied | Code reads `estimate_row_items`; focused tests prevent history table usage. |
| Template insertion event | Partially satisfied | Server action calls `insert_estimate_template_into_estimate_with_history`; schema contains `template_inserted`; live/event-row proof remains missing. |
| Live DB atomicity proof | Open | Historical linked-remote probes must not be repeated; use local Supabase or approved throwaway DB. |
| E2E/browser smoke | Satisfied locally | Protected-route smoke for sheet Activity, row Version History, and node Activity passed on 2026-05-25 using a temporary dev-auth local server; screenshots are under `.omx/artifacts/visual-ralph/estimate-sheet-version-control/20260525-current-activity/`. |

## Active Readiness Gate For Next Work

Before implementing the next Activity expansion slice:

- [x] Read `README.md`, `09-implementation-closeout.md`, `15-dormant-artifact-policy.md`, `16-second-pass-reconciliation-audit.md`, and `17-activity-expansion-roadmap.md`.
- [ ] Verify live `git status --short --branch` and inspect overlapping dirty files.
- [ ] Rerun impact analysis for the exact symbols/files to edit.
- [x] Evidence, measurement-read, node activity, pagination, actor display, and grouping slices have local-safe implementation evidence as of 2026-05-25.
- [x] Keep named-version, compare, and restore-as-copy UI/actions dormant.
- [ ] Use local Supabase or an approved throwaway DB for destructive/concurrency testing.
- [ ] Preserve current spreadsheet behavior: no row-grid growth, no save-pill layout shift, and no interference with blur/Enter commits.
- [x] Run focused Vitest for touched behavior before full validation.
- [x] Run `git diff --check`.
- [x] Update `17-activity-expansion-roadmap.md` with actual evidence after the slice.

## Original Gate Status

The original pre-pivot checklist is intentionally not retained as active checkboxes because many entries are now wrong for the product direction. Its durable decisions were either implemented, made dormant, or moved to `17-activity-expansion-roadmap.md`.

If named sheet versions are revived later, create a new proposal/export snapshot readiness gate instead of reusing this one wholesale.
