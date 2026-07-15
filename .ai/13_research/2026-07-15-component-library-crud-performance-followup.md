# Component Library CRUD, bulk-operation, and performance follow-up

**Date:** 2026-07-15

**Surface:** `/workshop/library/components`

**Source policy:** Primary sources only: Cloudflare D1 documentation, React and TanStack documentation, W3C/WAI standards guidance, and IBM Carbon's first-party enterprise design guidance.

## Executive decision

Keep the new image-led catalogue, but finish it as an operator workbench rather than adding more visual weight:

1. Make every page/tree `Add …` affordance use the existing compact estimate-toolbar control and the same orange treatment. The visible control can be small, but its pointer target must remain at least 24 by 24 CSS pixels (or meet the spacing exception). The repo already has the correct 24 px shared control in `ToolbarIconButton`; the Components page currently overrides it with `min-h-11`, which is the inconsistency to remove. [WCAG 2.5.8 Target Size](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum), [`toolbar-icon-button.tsx`](../../src/components/ui/toolbar-icon-button.tsx), [`ComponentLibraryManager.tsx`](../../src/components/workshop/component-library-manager/ComponentLibraryManager.tsx)
2. Treat create, update, archive, restore, folder mutations, and bulk mutations as one integrity programme. A client preview is useful UX, but the authoritative recheck, mutation, and receipt must share one D1 transaction whenever the operation is meant to be atomic. D1 documents that `batch()` statements execute sequentially as a transaction and the whole sequence is rolled back if one statement fails. [D1 `batch()`](https://developers.cloudflare.com/d1/worker-api/d1-database/#batch)
3. Fix the hosted-D1 bulk limit before calling 500-item selection production-ready. D1 currently allows **100 bound parameters per query**. Several current archive/delete queries accept 500 IDs and put every ID plus workspace/timestamps into one `IN (...)` statement, so a large valid UI selection can exceed the platform limit. Retain a 500-item user job if desired, but split each SQL statement into parameter-safe chunks inside the transactional/job contract. [D1 limits](https://developers.cloudflare.com/d1/platform/limits/)
4. Keep 50-row cursor paging and dense-view virtualization. Do not add card virtualization merely because the catalogue may eventually be large: paging limits data access, while virtualization only limits mounted UI. Measure mounted-card render/scroll cost first; if it is material, TanStack Virtual supports multi-lane layouts and stable item keys. [TanStack Virtualizer](https://tanstack.com/virtual/latest/docs/api/virtualizer), [TanStack React Virtual](https://tanstack.com/virtual/latest/docs/framework/react/react-virtual)
5. Complete CRUD truth before adding more catalogue features: archive needs a browse/restore path, folder drag operations need a non-drag alternative, and server-side permanent purge must remain unreachable from ordinary editor UI until its downstream-row policy and authorization are deliberately governed. [WCAG 3.3.4 Error Prevention](https://www.w3.org/WAI/WCAG22/Understanding/error-prevention-legal-financial-data), [WCAG 2.5.7 Dragging Movements](https://www.w3.org/WAI/WCAG22/Understanding/dragging-movements.html)

## Current repo baseline and implications

| Surface | Current evidence | Follow-up implication |
| --- | --- | --- |
| Add component | The Components toolbar uses a visible orange action with `min-h-11`; the shared estimate-toolbar Add control is 24 px and already defines the light-orange `ADD_BUTTON_CLASSNAME`. | Remove the page-specific large override and reuse the shared compact Add treatment. Keep `Add component`, `Add folder`, and `Add group` as verb+noun accessible names even if the visible label is hidden in compact toolbars. |
| Catalogue browse | The page uses a flat semantic list/card grid, 50-row snapshot cursor pages, a stable `(created_at, id)` identity, and a partial browse index migration. | Preserve this baseline. Apply and verify the index with `EXPLAIN QUERY PLAN`, then record D1 rows read/latency; do not infer hosted performance from DOM tests. |
| Dense browse | Dense mode already uses TanStack Virtual with persistent component IDs as keys. | Keep it. Only tune threshold, row estimate, and overscan from profiling evidence. |
| Search/facets | Search and facet evaluation still operate on loaded pages and explicitly say “loaded components.” | Correct copy is good containment, but enterprise search remains incomplete until the query, facets, sort, counts, and cursor are server-owned and URL-backed. |
| Create | Create has a mutation receipt, request fingerprint, workspace duplicate preflight, and a duplicate guard inside the atomic batch. | Preserve these safeguards. Move the hard quota decision into the write transaction if the cap must be strict; the current pre-batch `COUNT(*)` is a soft race boundary. |
| Update | Component revisions and linked-row effects are guarded in an atomic batch. | Preserve the expected-revision contract and verify the affected-row count before reporting success. D1 exposes `meta.changes` for this purpose. |
| Archive | The server re-previews and compares a preview hash, then performs a later standalone update. Archived rows are excluded from the normal catalogue and no restore path is exposed. | Close the remaining recheck-to-write window by placing the authoritative state guard and mutation together. Add Archived + Restore before describing archive as reversible. |
| Permanent delete | The ordinary Components UI no longer exposes purge, but server actions still delete linked estimate/template rows and component records. | Keep purge unreachable for editors. If restored later, require admin authorization, affected-object detail, confirmation, durable receipt, and a defined recovery/retention policy. |
| Folder CRUD | Folder create/rename/delete and drag/drop movement exist; Add folder is currently discoverable through a folder action menu. | Add the compact orange Add folder/group affordance where the user expects it. Provide `Move to…` and reorder controls as a click/tap alternative to drag. |
| Bulk scope | UI and server normalize at most 500 explicit IDs and use stale-preview hashes. | Fix D1 parameter chunking first. Then keep the exact-ID preview, name hidden selections, and report requested/eligible/blocked/changed counts from authoritative results. |

## Primary-source findings translated into product requirements

### 1. Compact orange Add controls

- WAI requires button semantics, an accessible name, `Enter`/`Space` activation, and logical focus movement when a dialog opens or closes. A compact icon-only Add control is therefore valid when it remains a real button with `aria-label="Add component"` / `Add folder` / `Add group`, visible focus, and correct dialog focus return. [WAI Button Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/button/), [WAI Dialog Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/)
- WCAG 2.5.8 sets a 24-by-24 CSS-pixel minimum target unless a documented exception applies. The shared repo control is already 24 px; “small” should mean compact visual density, not a smaller hit target. [WCAG 2.5.8](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum)
- Orange text, icon, border, focus, and selected-state indicators still need contrast: normal text needs 4.5:1, and visual information needed to identify a control/state needs 3:1 against adjacent colors. [WCAG 1.4.3](https://www.w3.org/TR/WCAG22/#contrast-minimum), [WCAG 1.4.11](https://www.w3.org/WAI/WCAG22/understanding/non-text-contrast.html)
- Carbon's enterprise button guidance says variants and sizes should be implemented consistently, warns against mixing sizes in a button group, and recommends one visually dominant action per surface. For this page, use one compact orange Add component action in the catalogue toolbar and the same compact orange family for context-local Add folder/group actions; keep other utilities neutral. [Carbon Button usage](https://carbondesignsystem.com/components/button/usage/)

### 2. CRUD integrity

- Use bound prepared statements for all user-controlled values. Cloudflare explicitly recommends `bind()` both for reuse and SQL-injection protection. [D1 prepared statements](https://developers.cloudflare.com/d1/worker-api/prepared-statements/)
- Use schema constraints for true invariants. D1 documents unique indexes for uniqueness and foreign keys for referential integrity/preventing invalid deletes. Application preflight messages improve UX, but they are not a substitute for a database invariant when duplicates are forbidden rather than merely discouraged. [D1 indexes](https://developers.cloudflare.com/d1/best-practices/use-indexes/), [D1 foreign keys](https://developers.cloudflare.com/d1/sql-api/foreign-keys/)
- Use one transactional `batch()` for coupled guards and writes. D1 guarantees sequential execution and whole-sequence rollback on failure. This is the correct boundary for expected-revision guards, duplicate guards, archive-state guards, linked-row synchronization, and mutation-receipt insertion. [D1 `batch()`](https://developers.cloudflare.com/d1/worker-api/d1-database/#batch)
- Validate the mutation result. D1 returns `meta.changes`, `rows_read`, `rows_written`, duration, retry attempts, and primary/region information. A successful transport response with an unexpected changed-row count must become a conflict or partial-result state, not a generic success toast. [D1 return objects](https://developers.cloudflare.com/d1/worker-api/return-object/)
- User-controllable data deletion must be reversible, checked, or confirmed under WCAG 3.3.4. Archive + restore is the preferred everyday lifecycle; permanent purge needs explicit confirmation and governance. [WCAG 3.3.4](https://www.w3.org/WAI/WCAG22/Understanding/error-prevention-legal-financial-data)
- Dynamic success, error, “N selected,” “50 more loaded,” and job-progress messages that do not take focus must be programmatically exposed as status messages. [WCAG 4.1.3](https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html)

### 3. Bulk operations

- Carbon's enterprise data-table model enters a distinct batch-action mode after selection, presents actions in a persistent toolbar, provides a clear exit, and disables single-row actions while batch mode is active. This maps cleanly to both the card and dense projections because selection belongs to the query, not to the visual layout. [Carbon Data table usage](https://carbondesignsystem.com/components/data-table/usage/)
- Maintain three distinct counts: `selected explicit IDs`, `selected but hidden by the current loaded/filter view`, and `total matching the server query`. Never label “Select visible” as “Select all.”
- Freeze exact explicit IDs for the current implementation. A future query-wide operation should send a server query fingerprint plus exclusions, not thousands of IDs.
- **Hosted D1 constraint:** each SQL statement may bind at most 100 parameters. Chunk ID statements based on the statement's full parameter count, not a fixed “100 IDs”: e.g. a query with `workspace_id` can carry at most 99 IDs, while an archive update with three timestamps plus workspace can carry at most 96. [D1 limits](https://developers.cloudflare.com/d1/platform/limits/)
- Keep chunks in one `batch()` only while the statement count remains within the plan's Worker-invocation query limit. D1 documents 1,000 queries per invocation on Workers Paid and 50 on Free, and each database processes queries one at a time; long statements reduce throughput. Larger imports or bulk jobs therefore need bounded job chunks and durable per-chunk receipts. [D1 limits](https://developers.cloudflare.com/d1/platform/limits/)
- A spreadsheet import should remain a staged application job: upload, parse/map, validate without writes, preview create/update/skip/error counts, then publish idempotent chunks with row receipts. Cloudflare's own D1 import guidance requires splitting oversized insert statements, and the platform limits SQL statements to 100 KB and 100 bound parameters. Do not expose `wrangler d1 execute` as the user import path. [D1 import/export](https://developers.cloudflare.com/d1/best-practices/import-export-data/), [D1 limits](https://developers.cloudflare.com/d1/platform/limits/)

### 4. Large-list performance and Cloudflare

- The prepared partial index matches the current active browse predicate and `(workspace_id, created_at DESC, id ASC)` order. After applying it, run `PRAGMA optimize`, verify `EXPLAIN QUERY PLAN` reports the intended index, and inspect `rows_read`; Cloudflare explicitly recommends all three practices. [D1 indexes](https://developers.cloudflare.com/d1/best-practices/use-indexes/)
- Record `rows_read`, response bytes, query latency, and query count for browse, detail, facets, and bulk preview. D1 exposes these in per-query metadata and 31-day analytics; `wrangler d1 insights` is explicitly experimental, so dashboards/metadata should be the stable proof surface. [D1 metrics and analytics](https://developers.cloudflare.com/d1/observability/metrics-analytics/)
- Keep list payloads slim and hydrate versions, history, attachments, and usage on inspector demand. The repo already follows this for 50-row browse pages by setting `includeDetailGraph: false`.
- React recommends stable database IDs as list keys; unstable/index keys can recreate DOM and lose input when items are inserted, deleted, or reordered. The dense virtualizer already uses component IDs and the card list should keep the same invariant. [React Rendering Lists](https://react.dev/learn/rendering-lists)
- `useDeferredValue` can keep search typing responsive while an expensive loaded-result render catches up, but React explicitly says it does not prevent network requests. Server search still needs its own debounced/cancelled request contract and a stale-results indicator. [React `useDeferredValue`](https://react.dev/reference/react/useDeferredValue)
- TanStack Virtual supports multiple lanes, measurement, overscan, and persistent item keys. Add card-grid virtualization only after profiling shows mounted cards are the bottleneck; use the existing bounded server page regardless. [TanStack Virtualizer](https://tanstack.com/virtual/latest/docs/api/virtualizer)
- D1 read replication is a later latency lever, not a default fix. It only serves reads from replicas when the Sessions API is used. If enabled, carry bookmarks across the user's mutation/read sequence to preserve sequential consistency and read-your-own-writes. [D1 read replication](https://developers.cloudflare.com/d1/best-practices/read-replication/)

### 5. Interaction and accessibility integrity

- Keep the visual card layout as a semantic list of independently focusable controls. Do not add `role="grid"` unless the complete composite-widget focus model (one tab stop plus arrow/Home/End navigation) is implemented. [WAI Grid Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/grid/)
- Every keyboard-operable control needs a visible focus indicator. This includes card hit areas, selection checkboxes, compact Add buttons, folder action menus, view toggles, and bulk actions. [WCAG 2.4.7](https://www.w3.org/WAI/WCAG22/Understanding/focus-visible)
- Folder/component drag movement needs a click/tap alternative such as `Move to folder…` plus `Move up` / `Move down`; keyboard support alone does not satisfy WCAG's single-pointer requirement. [WCAG 2.5.7](https://www.w3.org/WAI/WCAG22/Understanding/dragging-movements.html)
- Create/edit validation must identify the field and describe the error in text; a red border alone is insufficient. [WCAG 3.3.1](https://www.w3.org/WAI/WCAG22/Understanding/error-identification)

## Prioritized implementation and verification matrix

| Priority | Capability | Required implementation | Decisive proof |
| --- | --- | --- | --- |
| P0 | 500-item bulk execution | Parameter-aware ID chunking; one atomic batch when within query limits, otherwise an idempotent durable job with per-chunk receipts. | Hosted-compatible D1 contract test at 99, 100, 101, and 500 IDs; no statement exceeds 100 bindings; requested/changed counts reconcile. |
| P0 | Archive integrity | Authoritative state recheck + update + receipt in one transaction; exact changed-row validation. | Concurrent archive/change scenario cannot report false success and cannot mutate outside preview scope. |
| P0 | Purge containment | Keep server purge unreachable from editor UI; define admin-only policy before restoration. | Viewer/editor action inventory contains no purge; direct call is authorization-denied; downstream estimate/template snapshots are preserved by the chosen policy. |
| P1 | Add button consistency | Replace `min-h-11` page override with shared compact orange Add treatment; add the same affordance for folder/group creation. | Visual/source comparison with estimate right-rail Add; 24 px minimum target; accessible names; Enter/Space; modal focus return. |
| P1 | Archive lifecycle | Archived view, restore action, actor/time/reason, and truthful retention copy. | Archive removes from Active; Archived finds it; Restore returns it without changing existing estimate/template rows. |
| P1 | Folder CRUD parity | Add/rename/delete/move/reorder with click/tap and keyboard paths; confirmation names reparenting behavior. | Matrix covers root/nested folder, component move, reorder, refresh persistence, denied viewer, failure rollback. |
| P1 | Workspace-complete query | Server owns search, facets, sort, counts, and cursor; URL is canonical. | A component outside the first page is found by search/filter/deep link; reload/back-forward preserve query; counts are complete. |
| P1 | D1 browse proof | Apply cursor index; optimize; verify plan and rows read. | `EXPLAIN QUERY PLAN` uses the partial index; rows read stays proportional to page size at large fixture sizes. |
| P1 | Status and recovery | Programmatic loading/success/error/selection announcements; retry preserves query, selection, and form draft. | Keyboard/screen-reader QA for load, create, edit conflict, archive, folder save, and retry. |
| P2 | Card virtualization | Only if profiling shows material mounted-card cost after paging. Use TanStack lanes, stable ID keys, measured sizes, and focus-preserving scroll. | Profiling shows improvement at the agreed loaded-card budget without broken focus, deep-link scroll, or resize behavior. |
| P2 | Spreadsheet mass addition | Staged template/upload/map/validate/preview/publish/history workflow with idempotent external keys and downloadable row errors. | Duplicate upload/retry creates no duplicates; mixed-validity file produces explicit per-row outcomes; large file stays within D1 statement/query limits. |
| P2 | Read replication | Enable only after regional latency evidence; use Sessions API bookmarks. | Sequential read-after-write remains correct and D1 metadata shows replica/primary routing and measured latency benefit. |

## Minimum CRUD/function QA inventory

The page should not be called CRUD-complete until each row below has evidence in both card and dense projections where applicable.

| Domain | Paths that need proof |
| --- | --- |
| Browse | first page; load next; retry; empty library; no match; unloaded deep link; image failure fallback; card/dense parity. |
| Query | search; each facet; combined facets; sort; clear; URL reload/back-forward; workspace-complete count. |
| Component create | valid create; invalid fields; duplicate warning; Create anyway; idempotent retry; quota boundary; unauthorized user. |
| Component read | inspector detail; history/attachments/usage lazy load; not found; archived; forbidden; transient failure and retry. |
| Component update | valid edit; stale revision; linked-impact change; duplicate identity; image/variant/pricing update; local draft preservation on failure. |
| Duplicate | expected copied fields; intentionally omitted attachments; duplicate detection; retry receipt. |
| Archive/restore | single; bulk; stale preview; concurrent mutation; linked rows unchanged; Archived browse; restore; unauthorized user. |
| Folder CRUD | root/nested add; rename; delete/reparent; move component; move/reorder folder; non-drag alternative; persistence after reload; failed-write rollback. |
| Selection/bulk | individual; Ctrl/Cmd; visible selection; hidden selections; 500 cap; clear; 99/100/101/500-ID hosted-D1 boundaries; action toolbar entry/exit. |
| Permissions | viewer sees no mutation dead ends; editor can create/edit/organize/archive; purge remains admin-only/unexposed. |
| Accessibility | compact Add target/name/keyboard; visible focus; dialog focus trap/return; status announcements; contrast; validation text; card list semantics. |
| Performance | browse query plan/rows read; detail lazy hydration; search responsiveness; mounted DOM count; image request/failure behavior; no unbounded load path. |

## Source index

- [Cloudflare D1 Database API: `batch()` and Sessions](https://developers.cloudflare.com/d1/worker-api/d1-database/)
- [Cloudflare D1 limits](https://developers.cloudflare.com/d1/platform/limits/)
- [Cloudflare D1 index guidance](https://developers.cloudflare.com/d1/best-practices/use-indexes/)
- [Cloudflare D1 return objects](https://developers.cloudflare.com/d1/worker-api/return-object/)
- [Cloudflare D1 prepared statements](https://developers.cloudflare.com/d1/worker-api/prepared-statements/)
- [Cloudflare D1 metrics and analytics](https://developers.cloudflare.com/d1/observability/metrics-analytics/)
- [Cloudflare D1 read replication](https://developers.cloudflare.com/d1/best-practices/read-replication/)
- [Cloudflare D1 import/export](https://developers.cloudflare.com/d1/best-practices/import-export-data/)
- [React `useDeferredValue`](https://react.dev/reference/react/useDeferredValue)
- [React Rendering Lists](https://react.dev/learn/rendering-lists)
- [TanStack Virtualizer API](https://tanstack.com/virtual/latest/docs/api/virtualizer)
- [WAI Button Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/button/)
- [WAI Dialog Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/)
- [WAI Grid Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/grid/)
- [WCAG 2.5.8 Target Size](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum)
- [WCAG 2.5.7 Dragging Movements](https://www.w3.org/WAI/WCAG22/Understanding/dragging-movements.html)
- [WCAG 3.3.4 Error Prevention](https://www.w3.org/WAI/WCAG22/Understanding/error-prevention-legal-financial-data)
- [WCAG 4.1.3 Status Messages](https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html)
- [IBM Carbon Button usage](https://carbondesignsystem.com/components/button/usage/)
- [IBM Carbon Data table usage](https://carbondesignsystem.com/components/data-table/usage/)
