# Blast Radius And Integration Map

This feature touches the highest-traffic workshop surfaces, so implementers must
coordinate file ownership before editing. This document is the conflict-control
contract for parallel agents.

## Graph And Repo Evidence

Local code-intelligence evidence from the planning audit:

| Evidence | Result | Planning consequence |
| --- | --- | --- |
| Architecture overview | High coupling between workshop estimate and Vitest coverage clusters. | Test changes must be paired with implementation units, not left to the end. |
| Impact radius for planned files | High risk, broad two-hop impact, truncated at 500 impacted nodes. | Use phased integration and targeted tests at every unit boundary. |
| Large functions | `EstimateSheetContent`, `EstimateRightSidebarBase`, `AddComponentModal`, and `EstimateSheetTree` are all very large. | Avoid broad refactors; assign one owner per high-conflict file at a time. |
| Hub nodes | `EstimateRightSidebarBase` and `EstimateSheetContent` have the largest local degree. | Treat these as integration points, not parallel free-for-all files. |

## High-Conflict Files

| File or area | Risk | Owner rule | Integration order |
| --- | --- | --- | --- |
| `src/components/workshop/EstimateSheetContent.tsx` | Highest conflict and largest behavior surface. | One integration owner at a time. Other lanes submit notes/tests or narrow helper changes. | U1/U2 shell first, U3 cache/recovery second, U6 mobile/a11y after behavior is stable. |
| `src/components/workshop/component-library/index.tsx` | Sidebar source taxonomy and insert behavior converge here. | UX/source lane owns source labels; cache lane may edit only loader/invalidation with coordination. | U2 before U3; U6 copy/focus after U2. |
| `src/components/workshop/estimate-sheet/rows/cells.tsx` | Drag/drop and source labels share cell rendering. | UX/source lane owns labels and replace affordances. | U1 before U6. |
| `src/lib/component-library/query-keys.ts` | Small but shared by all cache tests. | Cache lane owns changes; no ad hoc arrays in consumers. | U3 before any mutation invalidation change. |
| `src/lib/estimates/actions.ts` | Server-authoritative insert/replace and source snapshot. | DB/action lane owns source snapshot and target/revision checks. | U1/U3 before source snapshot expansion. |
| `src/lib/component-library/actions.ts` | Cost/attachment validation and payload normalization. | Governance lane owns cost states; attachment lane owns attachment lifecycle. | U4 before U5 when attachment approval depends on cost state. |
| `src/app/api/component-library/attachments/route.ts` | Upload/delete security boundary. | Attachment/security lane owns; no broad route rewrite. | U5 after storage contract in `09` is applied. |
| `src/lib/component-library/library-telemetry.ts` | Privacy-sensitive event sanitizer. | QA/security lane owns. | U7 after U1-U6 event names stabilize. |

## Safe Parallel Slices

| Lane | Can edit | Cannot edit without lead lock | Required handoff |
| --- | --- | --- | --- |
| UX/source | Labels, compare UI, state copy, DOM a11y tests. | Server actions, schema, telemetry sanitizer. | State/copy changes cross-linked to QA IDs. |
| Cache/target | Query keys, invalidation tests, stale target checks. | Source labels or cost governance UI. | Cache invalidation matrix row updated in `11`. |
| DB/action | Source snapshot, RPC call boundaries, action tests. | Sidebar visual composition. | Migration/RPC gate updated in `10`. |
| Governance | Cost refresh queue, accepted-cost state, cost tests. | Attachment route or public snapshot code. | Accepted-cost semantics stay aligned with `10`. |
| Attachment | Attachment lifecycle UI/actions/API tests. | Cost acceptance or estimate replace logic. | Storage/exposure proof updated in `09`. |
| QA/evidence | Evidence ledger, telemetry tests, redaction tests. | Product behavior without unit owner agreement. | Evidence row added in `12`. |

## File Lock Protocol

Before editing a high-conflict file, the implementing agent records the lock in
`FILE_LOCKS.md` and mirrors completion proof in the evidence ledger:

| Field | Required value |
| --- | --- |
| File | Exact path. |
| Owner | Lane and agent. |
| Purpose | U-ID and QA IDs. |
| Expected diff shape | UI, test, action, schema, or docs. |
| Release condition | Test/evidence row proving the claim. |
| Unlock condition | Diff merged, reverted, or abandoned with notes. |

Only one owner edits `EstimateSheetContent.tsx` at a time. If a second lane needs
that file, it prepares tests or helper changes first and waits for the lock to
clear.

The initial planning audit leaves `FILE_LOCKS.md` with no active app-source
locks. Implementation agents must update it before touching source files.

## Integration Checkpoints

| Checkpoint | Units | Required proof before next checkpoint |
| --- | --- | --- |
| IC-0 Reality refresh | Pre-work | `rg` anchors refreshed; dirty files identified; baseline reconciliation recorded; file-lock ledger updated. |
| IC-1 Reuse safety shell | U1, U2 | Compare dialog and source taxonomy tests pass; no silent stale replace. |
| IC-2 Target/cache reliability | U3 | Workspace switch, stale target, row revision, and cache shape tests pass. |
| IC-3 Governance durability | U4, U5 | DB preflight captured; migration decision rows closed; accepted-cost and attachment lifecycle tests pass. |
| IC-4 Recovery and a11y | U6 | Focus, retry, visible error, mobile-interruption, and numeric validation tests pass. |
| IC-5 Evidence/release | U7 | Telemetry sanitizer, public redaction, and evidence ledger pass. |

## Rollback And Disable Strategy

| Change type | Preferred rollback | Data rule |
| --- | --- | --- |
| Compare-before-replace UI | Disable the compare trigger and fall back to existing insert/replace action only if safety tests are updated to show the old behavior is intentional. | Do not delete source snapshots. |
| Sidebar source taxonomy | Revert labels/sections or feature-gate the new tab behavior. | Do not merge cache shapes. |
| Cache invalidation | Revert to previous key factory usage; never introduce unscoped consumer keys. | No data migration. |
| Accepted-cost governance | Hide the new UI path if schema/action proof fails. | Preserve review rows/fields; fix forward if migration landed. |
| Attachment approval | Disable approve/supersede UI while preserving uploaded files and audit rows. | Never bulk-delete persisted approved files during rollback. |
| Telemetry | Drop fields/events by sanitizer. | Privacy fail-closed: omit data rather than emitting raw fields. |
