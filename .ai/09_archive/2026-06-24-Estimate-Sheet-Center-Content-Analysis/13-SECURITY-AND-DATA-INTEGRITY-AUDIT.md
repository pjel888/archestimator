# 13 — Security and Data-Integrity Audit

## Authentication / scoping

**Server-side:**
- `requireAuth` / `requireCurrentUserContext` at the top of every server action (`src/lib/estimates/actions.ts:1176, 1183, 1195`, etc.).
- `getCurrentWorkspaceProject(projectId)` (`workspace-repository.ts`) — RLS-scoped check that project belongs to caller's workspace.
- `assertCanEditEstimate(supabase, estimateId)` (l. 414-418) — RPC `can_edit_estimate` enforces estimate membership + write role.
- `assertCanEditProject(supabase, projectId)` (l. 423-427) — project-level write gate.
- `assertCanManageLibrary(supabase, workspaceId)` (`component-library/actions.ts:205-216`) — workspace editor/admin gate.
- `assertCanManageLibraryFolders` (l. 187-199) — same.
- `assertCanPublishEstimateTemplateFromEstimate(supabase, estimateId)` (l. 232-239).

**RLS:** Every user-data table has RLS policies (per README — "RLS on every user-data table"). The center sheet touches: `estimates`, `estimate_nodes`, `estimate_row_items`, `estimate_tabs`, `estimate_sheet_events`, `cost_library_items`, `library_folders`, `estimate_templates`, `estimate_template_nodes`, `estimate_template_row_items`, `cost_library_item_versions`.

## Drag payload validation (the security concern)

**Raw `JSON.parse` without try/catch on library-item MIME:**
1. `src/components/workshop/estimate-sheet/rows/drop-zones.tsx:117` — `onInsertLibraryItem(nodeId, JSON.parse(payload) as EstimateRowItem)`.
2. `src/components/workshop/estimate-sheet/rows/row-table.tsx:654` — `const libraryItem = JSON.parse(payload) as EstimateRowItem;`.
3. `src/components/workshop/estimate-sheet/rows/cells.tsx:429` — `onReplace(JSON.parse(payload) as EstimateRowItem);`.

**Risk:** A malformed payload (e.g. `"{"`) throws `SyntaxError` inside the drop handler. The browser's drag-and-drop event dispatch catches this differently per browser; in Chromium the throw bubbles to `window.onerror` and the drop is silently aborted. In Firefox the behavior may differ.

**Cross-scope injection risk (LOW):** The payload's `EstimateRowItem` fields (material, supplier, sourceLibraryItemId, itemCost, etc.) flow into:
- React's JSX as text content — escaped by default. **No XSS.**
- Server action `insertEstimateRowItemFromLibrary` — re-validated server-side, sourceLibraryItemId must be a UUID (`isUuid` check in `getSourceLibraryItemId`, actions.ts:874-877), sourceLibraryItemId is cross-referenced against the workspace's library via `assertCurrentLibrarySourceForEstimateCommit`.
- A tampered `itemCost` could attempt to set a price; the server's `assertCurrentLibrarySourceForEstimateCommit` re-reads the actual `cost_library_items.unit_cost`, so tampering at the drag-payload layer does not affect the persisted cost.

**However:** A malicious payload with `id` set to another row's id could attempt to overwrite that row via the replace path. The replace RPC's `expected_row_revision` would 409 in most cases, but a fresh row could be hijacked.

**Recommendation:** Introduce `readLibraryItemDragPayload(rawString): EstimateRowItem | null` with try/catch + shape validation (must have `id: string`, `material: string`, `source: 'project'|'supplier'|'library'`, `itemCost: number`, `quantity: number`, etc.). Reject payloads that don't match. Apply to all three call sites. Tag malformed-payload attempts via `recordLibraryEvent("xss_attempt", ...)`.

## Cross-project / cross-workspace sources

`insertProjectSourceIntoEstimate` (`reusable-sources/actions.ts:382-451`):
- Re-reads source estimate under the RLS-scoped user client (l. 404-410). If RLS denies access, returns "This project source is no longer available."
- Re-reads source node if `nodeId` provided (l. 412-421).
- Calls `insert_estimate_subtree_into_estimate_with_history` RPC, which re-checks `can_edit` on the target and `can_access` on the source.
- **GOOD** — re-validation at insert time, no trust in cached preview.

## Source URL / image URL validation

`normalizeEstimateRowImageUrl` (`src/lib/estimates/image-url.ts:3-5`) → `normalizePublicationImageUrl` (publication module).
`sanitizeEstimateRowSourceSnapshot` (l. 7-15) — strips null imageUrls.

These sanitize for display, but the URLs are still rendered as CSS `background-image: url(...)` (cells.tsx:114). A `javascript:` URL would NOT execute via `url()` (browsers block this), and `data:` URLs are similarly inert in CSS background-image. **LOW RISK.**

## Stored XSS

React's JSX escapes all text by default. No `dangerouslySetInnerHTML` in the center sheet. **No XSS risk from untrusted names/descriptions.**

## Idempotency

`mutationId` (UUID) attached to every row mutation. Server's `estimate_sheet_events.correlation_id` provides replay-safe dedup. Project-source insert has a deterministic correlation id per source unit (`reusable-sources/actions.ts:369-380`).

## Partial transactions

- **Single-row operations** (insert/update/replace/delete/detach/promote): each is one RPC = one transaction. Atomic.
- **Template insert** (single/batch/node): one RPC each, atomic.
- **Project-source insert**: one RPC, atomic.
- **Move component (ESC-P0-01)**: TWO independent RPCs. NOT atomic.
- **Bulk delete (ESC-P1-03)**: N independent RPCs. NOT atomic.

## History correctness

`estimate_sheet_events` is written inside the same RPC transaction as the row mutation. So a partial failure rolls back the history event too. **GOOD.**

## Read-only UX gaps

`canEditEstimate` is enforced server-side; the client gates only tab-strip actions (ESC-P1-07). Every row-level mutation reaches the server before being rejected.

## Orphan rows / duplicate rows

- **Orphan risk (ESC-P0-01 partial failure):** target replace succeeds + source clear fails → source row still has the component in the DB. Visually, the rollback restores the source row's component. **DB has the moved component on BOTH rows.**
- **Duplicate risk (ESC-P0-01 inverse):** target fails + source succeeds → component cleared from source, target unchanged. Visually, target rollback restores the original target. **DB has the component on NEITHER row's intended state.**
- **Orphan from express draft deletion:** If `deleteExpressDraft` runs while the server's insert is still in flight, the server may succeed after the local tree was rolled back. The optimistic row id is removed from the tree; the server's success arrives and `patchEstimateRowItemInTree` silently no-ops (row id not found). **DB has the row, UI does not.** (P2 finding.)

## Findings surfaced here

- **ESC-P0-01** (move non-atomic) — creates orphan/duplicate risk.
- **ESC-P1-07** (read-only UX) — server-enforced but client-misleading.
- **Raw `JSON.parse` on library-item MIME** — should be promoted to a P1/P2 security finding (added below).

## Additional finding (promoted from this audit)

### ESC-P2-26 — Raw JSON.parse on library-item drag MIME in three call sites

- **Severity:** P2 (defense-in-depth; no observed exploit but malformed input throws).
- **Evidence:** `drop-zones.tsx:117`, `row-table.tsx:654`, `cells.tsx:429`.
- **Fix:** Introduce `readLibraryItemDragPayload(raw)` with try/catch + shape check; share across the three sites.
- **Complexity:** S.
