# Component Library: Enterprise UX and High-Scale Performance Research

**Date:** 2026-07-15  
**Target:** `/workshop/library/components`  
**Research standard:** Current first-party product guidance, official framework/platform documentation, and web standards only  
**Decision:** Build an operator-first catalogue workbench with an image-led compact grid and bounded server pagination. Preserve the existing dense/virtualized projection. Treat workspace-complete query state, governed lifecycle recovery, and staged imports as follow-on work with explicit evidence gates; do not model the page as an infinite consumer storefront.

## Reconciled now / next / defer decision

This decision reconciles the external research with the current source audit and action-path matrix. It is the implementation authority for the production-core pass.

### Now — smallest coherent production core

1. Fix card and inspector media immediately: authenticated same-origin `/api/...` sources bypass Next image optimization, failed loads render a deterministic fallback, media geometry stays fixed, and responsive `sizes` match the actual card width.
2. Flatten the centre catalogue into one responsive ecommerce-style operator grid while preserving folder context on each card and preserving the existing dense/virtualized mode.
3. Standardize visible Component-page Add actions on the orange brand button and hide manager-only entry points when permission is absent.
4. Add explicit first-use empty and no-match states with Clear search, Clear filters, and a manager-only Add action.
5. Replace the unbounded Load all path with a bounded 50-item server page/load-more contract. Resolve `?component=` directly by ID so deep links are not limited to the first page. Label search and facets honestly as loaded-result controls until the server query contract exists. Keep bulk mutations explicitly ID-scoped with a frozen server preview; never present them as “all matching.” Make create/duplicate checking workspace-complete on the server before accepting a write rather than trusting the loaded page.
6. Correct checkbox naming, card hit areas, focus treatment, and minimum target sizing without introducing a pseudo-ARIA grid.
7. Contain destructive lifecycle risk: do not expose editor-level permanent purge, and remove restoration promises until an archived view/restore path and governed purge role exist.
8. Verify these changes with focused static checks and live browser QA.

### Next — correctness and enterprise operating depth

- Move search, filters, sort, counts, and cursor into one workspace-complete URL-backed server query.
- Add query-scoped selection/export, an archived view with restore, admin-only governed purge, and draft recovery.
- Add D1 query telemetry and verify high-frequency query plans before introducing more scale machinery.

### Defer — evidence-gated expansion

- Stage CSV/XLSX import only when launch onboarding or migration demand is confirmed; use the durable validation/publish contract in this report when that gate is met.
- Migrate media ingestion/delivery to Cloudflare Images or versioned R2 variants only after the immediate authenticated-image bug is fixed and media telemetry justifies the platform work.
- Saved views, card virtualization, and D1 read replication remain telemetry-gated. The existing dense-mode virtualization is retained, not rebuilt.

## Executive recommendation

The production direction should combine two proven patterns:

1. **Marketplace-speed recognition:** compact, consistent thumbnails and immediately scannable identity, unit, cost, supplier, and freshness.
2. **Enterprise catalogue control:** persistent search/filter/sort state, the existing dense alternative, query-scoped bulk actions, evidence-gated import jobs with downloadable row-level errors, and a fast list-to-detail workflow.

Shopify's administrator-facing index pattern explicitly combines search, filtering, sorting, row selection, pagination, and bulk actions. Akeneo's current product grid adds configurable columns, category navigation, saved views, selection across the result set, a persistent selection toolbar, mass actions, and 100-row pages. SAP's list-report guidance similarly treats search/filter/sort and list-to-object navigation as the core of large-set operational work. These are a closer fit for Archestimator than a consumer shopping feed. [Shopify Index Table](https://shopify.dev/docs/api/app-home/patterns/compositions/index-table), [Shopify product-list filtering](https://help.shopify.com/en/manual/products/searching-filtering), [Akeneo Advanced Product Grid](https://help.akeneo.com/serenity-get-familiar-with-the-product-grid), [SAP Fiori list report](https://www.sap.com/design-system/fiori-design-web/v1-145/page-types/floorplans/list-report-floorplan-sap-fiori-element/usage)

The accessible first-party Shopee and Lazada seller material is most useful for the **catalogue-ingestion workflow**, not as evidence for copying their public storefront UI. Both use a template-led batch flow with upload, processing, result/error review, correction, and re-upload. The Shopee guide is a first-party Seller Education Hub document; the available Lazada SEA guide is older, so it should be treated as workflow continuity rather than a current visual specification. [Shopee Mass Upload User Guide](https://cdngarenanow-a.akamaihd.net/shopee/seller/seller_cms/e8420f9b3f575f9d9ed24e16256aa271/Mass%20Upload%20User%20Guide%20%28New%20UI%29%20MY.pdf), [Lazada SEA bulk product upload guide](https://img-ovs.alicdn.com/other//common/90224e281e3548ccb306dfe4c11b2714)

## What the current audit surface implies

The repository audit screenshots show useful foundations: an image-led component grid, search, a filter panel, per-card checkboxes, a details drawer, and an add-component modal. The principal production gaps visible in those captures are:

- Cards spend too much area on empty image space relative to operational data.
- Missing/broken media dominates the visual hierarchy instead of degrading gracefully.
- Checkboxes do not yet communicate a complete page-selection versus all-results selection model.
- Search and filters do not visibly expose durable URL/query state, result count, applied-filter chips, or a clear reset path.
- The add flow is already complex enough that import, validation, and detailed edit work should not be forced into one oversized modal.

This report treats those observations as the local baseline and uses external evidence only to choose the production contract.

## Evidence synthesis

### 1. The page is a catalogue workbench, not a storefront

Operational catalogues optimize for repeated scanning, comparison, correction, and batch maintenance. Shopify's index-table composition is explicitly designed for merchants managing many objects, while Akeneo's grid emphasizes configurable columns, mass selection, category hierarchy, views, and role-aware actions. SAP separates large-set discovery in the list report from deeper work on an object page or a responsive list-detail layout. [Shopify Index Table](https://shopify.dev/docs/api/app-home/patterns/compositions/index-table), [Akeneo Advanced Product Grid](https://help.akeneo.com/serenity-get-familiar-with-the-product-grid), [SAP Fiori list report](https://www.sap.com/design-system/fiori-design-web/v1-145/page-types/floorplans/list-report-floorplan-sap-fiori-element/usage), [SAP flexible column layout](https://www.sap.com/design-system/fiori-design-web/v1-145/page-types/page-layouts/flexible-column-layout/usage)

**Archestimator implication:** keep a compact card grid as the default because material images accelerate recognition, but treat it as one projection of a queryable catalogue. Preserve the existing dense, virtualized table/list projection for price auditing, supplier maintenance, and large-batch review. Both projections must continue sharing the same query, selection, and mutation model.

The default card should consistently expose:

- component image or deterministic fallback;
- component name and variant count;
- category/folder and lifecycle state;
- unit cost and unit of measure;
- supplier/brand when present;
- price/source freshness or last-updated signal;
- selection checkbox and a small overflow menu.

The drawer remains appropriate for quick inspection and light edits. Complex creation or edits should move to a dedicated object surface: SAP recommends modal creation only when the form is short and otherwise routes work to an object page. [SAP table toolbar guidance](https://www.sap.com/design-system/fiori-design-web/v1-145/discover/frameworks/sap-fiori-elements/tables-and-lists/tables-toolbar), [SAP object page](https://www.sap.com/design-system/fiori-design-web/v1-145/page-types/floorplans/object-page/usage)

### 2. Search, filter, sort, views, and pagination are one state model

Shopify keeps sorting, filters, filter chips, saved views, and pagination together on the product-list surface; Akeneo similarly combines text search, category navigation, filters, column configuration, sorting, saved views, and selection. These controls should therefore be treated as a single query model, not independent client-only widgets. [Shopify product-list filtering](https://help.shopify.com/en/manual/products/searching-filtering), [Akeneo Advanced Product Grid](https://help.akeneo.com/serenity-get-familiar-with-the-product-grid)

For the Next.js App Router, the page's `searchParams` should drive server-side fetching when the data depends on the URL, while `useSearchParams` is the client hook for reading and updating the visible control state. React's `useDeferredValue` can keep the input responsive while a slower results tree catches up; `startTransition` can mark non-input state updates as non-blocking, but React explicitly says transitions must not control the text input itself. [Next.js `useSearchParams`](https://nextjs.org/docs/app/api-reference/functions/use-search-params), [React `useDeferredValue`](https://react.dev/reference/react/useDeferredValue), [React `startTransition`](https://react.dev/reference/react/startTransition)

**Recommended URL contract:**

```text
/workshop/library/components
  ?q=
  &category=
  &folder=
  &supplier=
  &brand=
  &lifecycle=
  &freshness=
  &sort=name.asc
  &view=grid
  &cursor=
```

This provides reload, back/forward, shareable internal links, and a stable basis for saved views. That recommendation is also consistent with browser-platform guidance: History API entries are URL-addressable, and Chrome's Navigation API guidance explicitly places state that must be shareable in the URL rather than only in opaque history state. Applied filters should be visible as removable chips, with result count and clear-all adjacent to the controls. Saved views can be deferred until the core URL contract is stable. [MDN `History.pushState()`](https://developer.mozilla.org/en-US/docs/Web/API/History/pushState), [Chrome Navigation API](https://developer.chrome.com/docs/web-platform/navigation-api)

### 3. Server pagination is foundational; virtualization is optional

Shopify's product list displays 50 products per page, while Akeneo's current advanced grid supports 100 rows per page. Both enterprise surfaces retain explicit pagination instead of treating an unbounded browser DOM as the data-access layer. [Shopify product-list filtering](https://help.shopify.com/en/manual/products/searching-filtering), [Akeneo March 2026 product-grid update](https://help.akeneo.com/2026/march-20256-serenity-updates)

SQLite's official row-value documentation uses scrolling windows as the canonical reason to prefer keyset pagination: `LIMIT ... OFFSET ...` must still process skipped rows, so its cost rises with the offset, whereas a composite row comparison such as `(sort_value, id) > (?, ?)` can seek through a matching index. SQLite's query planner also documents how multi-column indexes can satisfy constrained lookups and ordering. [SQLite row values](https://www.sqlite.org/rowvalue.html), [SQLite query planner](https://www.sqlite.org/queryplanner.html)

Cloudflare D1 recommends indexes for columns used in predicates and sorting, validates them with `EXPLAIN QUERY PLAN`, and notes that multi-column indexes depend on leftmost-prefix order. D1 also charges and reports rows read, which makes full scans both a latency and consumption concern. [D1 index best practices](https://developers.cloudflare.com/d1/best-practices/use-indexes/), [D1 pricing](https://developers.cloudflare.com/d1/platform/pricing/)

**Archestimator implication:** begin with a 50-item server page for the card grid and a stable cursor containing the active sort value plus a unique tiebreaker ID. Do not fetch the whole library and paginate in React. Build indexes around the actual tenant/library boundary plus the most common filter-and-sort paths, then verify each production query with `EXPLAIN QUERY PLAN` and D1 rows-read metrics.

Virtualization solves browser rendering cost, not database access. TanStack Virtual supports estimated sizes, overscan, dynamic measurement, and multi-lane grids. Its current React documentation also exposes `useFlushSync: false` to avoid React 19 `flushSync` warnings. This is valuable only after telemetry shows that already-loaded rows or cards cause a meaningful render/scroll problem. [TanStack Virtualizer API](https://tanstack.com/virtual/latest/docs/api/virtualizer), [TanStack React Virtual](https://tanstack.com/virtual/latest/docs/framework/react/react-virtual)

If continuous loading is later introduced, TanStack Query's infinite-query API supports cursors and `maxPages` to keep retained browser memory bounded. Pagination should still remain the server contract underneath it. [TanStack Query infinite queries](https://tanstack.com/query/latest/docs/framework/react/guides/infinite-queries)

### 4. Selection must name its scope

Shopify supports selecting the current page and then expanding the selection to all products matching the current filter. Akeneo similarly distinguishes selected products from all products in the result set, and exposes mass actions from a persistent selection toolbar. [Shopify bulk actions](https://help.shopify.com/en/manual/shopify-admin/productivity-tools/bulk-actions), [Akeneo Advanced Product Grid](https://help.akeneo.com/serenity-get-familiar-with-the-product-grid)

**Recommended selection contract:**

```text
selectionMode: "explicit" | "query"
selectedIds: Set<ComponentId>
excludedIds: Set<ComponentId>
queryFingerprint: string | null
```

- `explicit` means exactly the checked IDs.
- `query` means every component matching the captured query, minus `excludedIds`.
- The header checkbox covers the visible page and supports checked, unchecked, and mixed states.
- After a full page is selected, the toolbar offers “Select all N matching components.”
- Destructive actions repeat the exact scope in the confirmation copy.
- The server re-evaluates authorization and the query when executing the bulk operation; it must not trust a client-reported count.

This avoids sending thousands of IDs to the browser or relying on selections that disappear when the next page loads. D1's current limit of 100 bind parameters per query is another reason not to implement “select all” as one enormous `IN (...)` list. [D1 limits](https://developers.cloudflare.com/d1/platform/limits/)

The initial bulk actions should be limited to high-value catalogue maintenance: move folder/category, archive or restore, export, set supplier/brand, and guarded delete. Bulk price edits need extra care because Shopify's own inventory guidance warns that some absolute bulk changes lack a per-change audit trail; Archestimator should preserve actor, timestamp, source, and before/after values for financially meaningful edits. [Shopify bulk inventory editing](https://help.shopify.com/en/manual/products/inventory/adjusting-inventory/bulk-editing-inventory)

### 5. CSV/XLSX import is a staged job, not a modal submit

Current Akeneo import guidance supports CSV/XLSX profiles, create/update modes, background execution, row skipping, hierarchy ordering, and permissions. Its process tracker produces a downloadable XLSX error report containing the row, column, and failure reason. Microsoft Dataverse likewise separates parsing, mapping/transformation, and upload into asynchronous stages and records stage-specific failures; its maker flow includes sheet selection, mapping, key selection for update/upsert, a review summary, background processing, and downloadable logs. Oracle Product Hub uses a similar map-to-interface-table flow with review, exported error rows, correction, re-upload, and resubmission. [Akeneo importing data](https://help.akeneo.com/import-export-data/import-your-data), [Akeneo process tracker](https://help.akeneo.com/import-export-data/12-serenity-follow-your-jobs-execution), [Microsoft Dataverse data import](https://learn.microsoft.com/en-us/power-apps/developer/data-platform/run-data-import), [Microsoft Excel/CSV import](https://learn.microsoft.com/en-us/power-apps/maker/data-platform/data-platform-import-export), [Oracle Product Hub import maps](https://docs.oracle.com/en/cloud/saas/supply-chain-and-manufacturing/25c/faipr/overview-of-import-maps.html)

Amazon's Feeds API reinforces two important status semantics: asynchronous batches should not be fragmented into many tiny feeds, and a technically completed job can still contain row/item errors. The UI therefore needs `completed_with_errors`, not only a green “completed” state. [Amazon Feeds API best practices](https://developer-docs.amazon.com/sp-api/lang-US/docs/feeds-api-best-practices), [Amazon `getFeeds`](https://developer-docs.amazon.com/sp-api/reference/getfeeds)

**Recommended Archestimator import state machine:**

```text
uploaded
  -> parsed
  -> mapped
  -> validating
  -> ready_to_publish
  -> publishing
  -> completed | completed_with_errors | failed
  -> rolled_back (when an eligible completed import is explicitly undone)
```

The operator flow should be:

1. Download an Archestimator CSV or XLSX template with canonical field names, examples, allowed values, and an external key column.
2. Upload a file and select a sheet when needed.
3. Map source columns to component, variant, pricing, supplier, category/folder, and image-reference fields.
4. Run a no-write validation pass.
5. Preview counts for create, update, unchanged, skipped, warning, and error rows.
6. Download the complete row-level error file.
7. Publish valid rows only after the operator explicitly commits the job.
8. Show durable progress/history and permit corrected-row re-upload.

The job should retain input hash, actor, import mode, source filename, source row number, normalized external key, mapping version, validation messages, and final component/variant IDs. A duplicate upload can then be recognized, and a retry can be made idempotent rather than creating duplicate catalogue records.

For file safety, OWASP recommends an extension allowlist, independent type/signature checks rather than trusting the supplied MIME type, generated storage names, size limits, authorization, storage away from the public web root, and malware/sandbox checks where available. R2 presigned URLs are temporary, operation-specific bearer tokens and can constrain the expected `Content-Type`; they should be short-lived and generated only for the target object key. [OWASP File Upload Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html), [R2 presigned URLs](https://developers.cloudflare.com/r2/api/s3/presigned-urls/)

### 6. “Cancel” and “rollback” are different contracts

Akeneo explicitly notes that stopping an active job does not revert changes already applied. D1's `batch()` reduces round trips and executes its statements as a transaction, rolling back the batch if a statement fails. However, D1 also has per-query time and bind limits, and a single database processes queries serially; large write sets should therefore be chunked and cannot be assumed to fit one unlimited transaction. [Akeneo process tracker](https://help.akeneo.com/import-export-data/12-serenity-follow-your-jobs-execution), [D1 Workers Binding API](https://developers.cloudflare.com/d1/worker-api/d1-database/), [D1 limits](https://developers.cloudflare.com/d1/platform/limits/)

**Archestimator implication:**

- Before publish, “cancel” can safely discard the staged job because no catalogue rows have changed.
- During publish, “stop after current chunk” may halt future writes, but the UI must not call this a rollback.
- Each publish chunk should be an atomic D1 batch.
- Every written record should carry `import_job_id` and a before/after audit payload sufficient for an application-level inverse operation.
- “Undo import” should be available only while the affected records have not been superseded by later edits; otherwise show a conflict report and require a new corrective import.

D1 Time Travel restores an entire database to a prior point, so it is a disaster-recovery tool, not a safe per-import undo mechanism in a shared application database. That conclusion is an architectural inference from the scope of the official restore operation. [D1 Time Travel](https://developers.cloudflare.com/d1/reference/time-travel/)

### 7. Images need a complete ingestion, delivery, and fallback contract

Next.js Image uses intrinsic width/height to reserve aspect ratio and avoid layout shift, uses native lazy loading by default, supports blur placeholders and `onError`, and relies on the `sizes` prop to prevent the browser from assuming a responsive image occupies the full viewport. Next.js 16 deprecates the old `priority` flag in favor of `preload`, which should be reserved for true above-the-fold/LCP cases rather than an entire thumbnail grid. [Next.js Image](https://nextjs.org/docs/app/api-reference/components/image)

Cloudflare Images can transform and deliver images stored in R2. Responsive delivery can use `srcset` or width-aware transforms, while transformed variants are cached; because each unique option combination is independently cached and counted, an application should use a small named set of variants rather than arbitrary per-card transform strings. [Cloudflare Images](https://developers.cloudflare.com/images/), [responsive images](https://developers.cloudflare.com/images/optimization/make-responsive-images/), [image transformations](https://developers.cloudflare.com/images/optimization/transformations/overview/)

R2 only receives Cloudflare CDN caching through a custom domain; the development `r2.dev` endpoint is rate-limited and is not intended for production. R2 also documents a cache-consistency edge: a cached 404 can remain visible after an upload, and an overwrite can continue serving an older cached asset until its TTL expires or it is purged. [R2 public buckets](https://developers.cloudflare.com/r2/buckets/public-buckets/), [R2 and Cache](https://developers.cloudflare.com/cache/interaction-cloudflare-products/r2/), [R2 consistency](https://developers.cloudflare.com/r2/reference/consistency/)

**Immediate Archestimator repair:** the audited failure is narrower than a media-platform migration. Authenticated same-origin `/api/...` thumbnails are being routed through Next's server-side image optimizer, where the browser session is not available. The production-core pass should mark those sources unoptimized, add deterministic `onError` fallback state in both card and inspector, preserve a fixed aspect ratio, and supply accurate `sizes`. This repairs today's broken-image path without changing storage topology.

**Longer-term media contract, gated by telemetry and onboarding need:**

- Upload directly to a one-time Cloudflare Images URL or a short-lived, object-scoped R2 presigned URL so large binaries do not traverse the catalogue action route. Cloudflare's direct-creator upload URL does not expose the account API token; R2 documents direct browser uploads with presigned URLs. [Images direct creator upload](https://developers.cloudflare.com/images/storage/upload-images/direct-creator-upload/), [R2 object uploads](https://developers.cloudflare.com/r2/objects/upload-objects/)
- Use immutable, versioned object keys such as `components/{componentId}/{assetId}-{contentHash}`; write the new reference rather than overwriting a stable key.
- Generate only a small preset family, for example thumbnail, card, detail, and original.
- Render a fixed aspect-ratio box, explicit `sizes`, native lazy loading, and a lightweight placeholder.
- On load failure, replace the broken media with a deterministic category glyph or neutral material placeholder and preserve the text identity of the component.
- Use meaningful concise `alt` text only when the image adds information; use empty alternative text when the adjacent component name makes the thumbnail redundant. WAI's image guidance bases the alternative on purpose, not filename. [WAI Images decision tree](https://www.w3.org/WAI/tutorials/images/decision-tree/), [WAI Images tutorial](https://www.w3.org/WAI/tutorials/images/)

For bulk media migration, Cloudflare documents a batch Images API intended for high-volume operations; ordinary interactive creation should remain direct-upload and job-backed. [Cloudflare Images upload methods](https://developers.cloudflare.com/images/storage/upload-images/methods/)

### 8. Accessibility should stay native unless a true ARIA grid is implemented

The WAI-ARIA grid pattern is a composite widget: it puts only one descendant in the page tab sequence and requires the application to manage focus and arrow-key navigation. A CSS card grid with `role="grid"` but without that keyboard model is therefore worse than a semantic list with native controls. For a dense table projection, WAI recommends native HTML table elements when the content is not a composite interactive grid. [WAI ARIA Grid pattern](https://www.w3.org/WAI/ARIA/apg/patterns/grid/), [WAI Table pattern](https://www.w3.org/WAI/ARIA/apg/patterns/table/)

**Recommended accessibility contract:**

- Card view: semantic list/list-item structure, an article or link for each component, and a native checkbox with a clear accessible name.
- Select-all: native checkbox with checked/unchecked/indeterminate visual and programmatic state; ARIA's checkbox pattern defines `mixed` for tri-state behavior. [WAI Checkbox pattern](https://www.w3.org/WAI/ARIA/apg/patterns/checkbox/)
- Table view: native table headers; put a button inside sortable headers and apply `aria-sort` only to the active sorted column. [WAI sortable table example](https://www.w3.org/WAI/ARIA/apg/patterns/table/examples/sortable-table/)
- Keyboard: every card action, filter, sort control, menu, and selection action works without pointer input and has a visible focus indicator. [WCAG focus visible](https://www.w3.org/WAI/WCAG22/Understanding/focus-visible.html)
- Targets: controls meet the WCAG 2.2 24-by-24 CSS-pixel minimum or its spacing exception. [WCAG target size minimum](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html)
- Status: search result counts, import progress, validation completion, and bulk-action outcomes are exposed as programmatic status messages without unexpectedly moving focus. [WCAG 2.2 status messages](https://www.w3.org/TR/WCAG22/#status-messages)

### 9. Cache public media aggressively; do not shared-cache private catalogue data

Cloudflare's default cache behavior does not cache responses marked `private`, `no-store`, `no-cache`, or `max-age=0`, and does not normally cache responses with `Set-Cookie`. Its response headers expose `CF-Cache-Status` and `Age` for verification. [Cloudflare default cache behavior](https://developers.cloudflare.com/cache/concepts/default-cache-behavior/), [Cloudflare cache responses](https://developers.cloudflare.com/cache/concepts/cache-responses/)

**Archestimator implication:** authenticated component HTML/JSON and mutation-sensitive import responses should not be forced into a shared edge cache. Browser/client query caching can be short-lived and explicitly invalidated after mutations. Publicly safe, immutable image variants should use long-lived caching on an R2 custom domain or Cloudflare Images. This keeps the authorization boundary simple while allowing the expensive binary assets to achieve high cache hit rates.

### 10. Instrument before adding high-scale machinery

D1 analytics exposes query duration and rows read/written, and Cloudflare recommends these metrics to understand query behavior. Read replication can reduce latency and increase read throughput, but it requires the Sessions API to obtain sequential consistency; `first-primary` is the documented option when the first query must observe the latest primary state. [D1 metrics and analytics](https://developers.cloudflare.com/d1/observability/metrics-analytics/), [D1 read replication](https://developers.cloudflare.com/d1/best-practices/read-replication/)

The first production telemetry should capture:

- catalogue query duration, rows read, returned rows, active filters, and sort;
- page payload size and time to first usable results;
- thumbnail bytes, load failures, and cache status;
- client render/interaction latency for filter and selection changes;
- import stage durations, row counts, warnings/errors, and publish chunk duration;
- bulk-action scope, affected count, and failure/conflict count.

Virtualization, exact live facet counts, D1 read replication, and broader cache layers should be enabled only when those measurements identify a real bottleneck. Read-after-write catalogue views would need an explicit D1 Sessions strategy before replication is enabled.

## Load-bearing recommendations and phase

| # | Recommendation | Phase | Why it is load-bearing |
|---|---|---|---|
| 1 | Make the page an operator catalogue workbench: compact image-led grid, quick details drawer, and the preserved existing dense/virtualized projection. | **Immediate** | Prevents a consumer-storefront layout from becoming the data and interaction architecture. |
| 2 | Standardize each card on image/fallback, name, variant count, category/lifecycle, cost + unit, supplier/brand, freshness, checkbox, and overflow action. | **Immediate** | Creates a stable scan hierarchy and removes empty-image dominance. |
| 3 | Put search, filters, sort, view, and cursor in URL-backed server query state; show result count, applied chips, and clear-all. | **Next** | Makes navigation durable and workspace-complete after the bounded browse contract lands. |
| 4 | Use server-side keyset pagination from the first production pass, starting at 50 cards, with stable composite cursors and query-specific D1 indexes. | **Immediate** | Avoids full-library client loads, deep `OFFSET`, and unbounded rows-read growth. |
| 5 | Implement explicit page versus all-matching selection with a sticky toolbar, query fingerprint, excluded IDs, server-side authorization, and exact destructive scope copy. | **Next** | Makes bulk operations correct at thousands of records without giant ID payloads after workspace-complete query state exists. |
| 6 | Build CSV/XLSX import as a durable staged job: template, upload, map, no-write validate, preview, publish, downloadable row errors, and retry. | **Deferred pending confirmed onboarding need** | Prevents partial invisible corruption and gives operators a repair loop when bulk onboarding becomes a demonstrated launch requirement. |
| 7 | Give every import an immutable provenance/audit record and atomic publish chunks; distinguish cancel, stop, and undo. Add conflict-aware inverse rollback after the publish ledger exists. | **Deferred with import** | D1 batch rollback covers a chunk, not an unlimited multi-chunk job or later user edits. |
| 8 | First repair authenticated `/api/...` rendering and deterministic fallbacks; later complete direct upload, immutable keys, and transform presets when justified. | **Immediate repair; deferred platform migration** | Fixes the visible failure now without turning a rendering bug into a storage migration. |
| 9 | Keep card view as semantic native content; implement tri-state selection, visible focus, minimum targets, live status, and native sortable-table semantics. | **Immediate** | Avoids an inaccessible pseudo-grid and makes bulk/import feedback perceivable. |
| 10 | Keep authenticated catalogue data out of shared CDN cache; later cache only immutable, publicly safe image variants after a governed public-media path exists. | **Immediate private-cache safety; deferred public-media caching** | Preserves authorization correctness without prematurely changing media exposure. |
| 11 | Instrument D1 rows-read/duration, payload/render cost, and media failures after the bounded browse contract is stable. Add saved views, card virtualization, or D1 read replication only when measurements justify them. | **Next instrumentation; deferred optimization** | Stops premature complexity and gives each later scale mechanism an evidence threshold. |

## Immediate production-core improvement slice

The authoritative smallest coherent slice is the eight-item **Now** list above: immediate image repair; flat responsive grid with folder context; preservation of existing dense virtualization; orange and permission-correct Add actions; recoverable empty/no-match states; bounded 50-item load-more plus direct-ID resolution; accessible card/selection mechanics; lifecycle safety containment; workspace-complete create/duplicate validation; and explicitly ID-scoped destructive previews.

It intentionally does not introduce a full URL query architecture, query-wide selection, import schema/jobs, a media-platform migration, saved views, virtualized cards, D1 replicas, or sophisticated faceted counts. Those are valuable only after their prerequisite correctness contract or evidence gate is met.

## Deferred enhancements and their evidence gates

### Dense table and saved views

Preserve the dense table and its existing virtualization now. Improve it through the same server query and selection contract later; do not schedule a replacement. Add saved views only when repeated operator workflows justify persisted configurations. [Akeneo Advanced Product Grid](https://help.akeneo.com/serenity-get-familiar-with-the-product-grid), [Shopify product-list filtering](https://help.shopify.com/en/manual/products/searching-filtering)

### Virtualization or continuous loading

Add card virtualization or continuous loading only when measured render/scroll cost remains material after server pagination, card compaction, image sizing, and bounded query-cache pages. Retain and tune the existing dense-table virtualization first; a variable-height, multi-lane image grid has higher measurement and keyboard complexity. Keep the cursor API as the source of truth and bound retained pages with TanStack Query. [TanStack Virtualizer API](https://tanstack.com/virtual/latest/docs/api/virtualizer), [TanStack Query infinite queries](https://tanstack.com/query/latest/docs/framework/react/guides/infinite-queries)

### Read replicas

Add when D1 telemetry demonstrates geographically distributed read latency or primary read throughput as a real constraint. Use Sessions API bookmarks for sequential consistency and primary-first reads after mutations. [D1 read replication](https://developers.cloudflare.com/d1/best-practices/read-replication/)

### Conflict-aware full import undo

Add after the import ledger records before/after values and the current revision of every touched record. Undo should reject or isolate rows superseded by a later edit instead of overwriting newer work. D1 Time Travel remains disaster recovery, not this workflow. [D1 Time Travel](https://developers.cloudflare.com/d1/reference/time-travel/)

## Acceptance evidence for the improvement slice

The immediate slice can be considered complete when the following focused evidence exists. It does **not** by itself clear the action matrix's production hold; workspace-complete query/filter/counts, export, archive recovery, and draft recovery remain release blockers until implemented or their promises are removed.

- For the immediate slice, reload and browser back/forward preserve direct `?component=` links beyond the first page; workspace-complete search/filter/sort URL state is a Next-phase acceptance contract.
- The bounded default browse query returns at most one page plus a lookahead row; high-frequency filtered/sorted query-plan proof belongs to the Next workspace-complete query contract.
- Immediate selection is explicitly page/loaded-result scoped and cannot exceed the server bulk-action limit; query-wide selection is a Next-phase acceptance contract.
- When the import evidence gate is met, import validation performs no component writes; publish produces a durable receipt and complete row-level error export.
- When import ships, a failed D1 publish chunk rolls back that chunk; stopping a multi-chunk job reports already-applied rows truthfully, and retries do not silently duplicate components.
- Missing, corrupt, and newly uploaded images retain card geometry and show deterministic fallbacks without broken-image chrome.
- Keyboard-only users can search, filter, sort, select, invoke available actions, and inspect details; result and mutation status changes are announced. Import keyboard coverage applies only when the deferred import gate is met.
- Private catalogue responses are not shared-cache hits; immutable public image-variant cache proof belongs to the deferred media-platform contract.
- Card virtualization and read replication remain absent unless telemetry demonstrates the need; existing dense virtualization remains intact.

## Primary-source index

### Catalogue and enterprise workflow

- [Shopify Index Table composition](https://shopify.dev/docs/api/app-home/patterns/compositions/index-table)
- [Shopify product-list search, filter, sort, views, and pagination](https://help.shopify.com/en/manual/products/searching-filtering)
- [Shopify bulk actions](https://help.shopify.com/en/manual/shopify-admin/productivity-tools/bulk-actions)
- [Shopify bulk inventory editing](https://help.shopify.com/en/manual/products/inventory/adjusting-inventory/bulk-editing-inventory)
- [Akeneo Advanced Product Grid](https://help.akeneo.com/serenity-get-familiar-with-the-product-grid)
- [Akeneo March 2026 grid update](https://help.akeneo.com/2026/march-20256-serenity-updates)
- [Akeneo quick export](https://help.akeneo.com/en_US/import-export-data/13-serenity-quick-export-your-products)
- [SAP Fiori list report](https://www.sap.com/design-system/fiori-design-web/v1-145/page-types/floorplans/list-report-floorplan-sap-fiori-element/usage)
- [SAP flexible column layout](https://www.sap.com/design-system/fiori-design-web/v1-145/page-types/page-layouts/flexible-column-layout/usage)
- [SAP object page](https://www.sap.com/design-system/fiori-design-web/v1-145/page-types/floorplans/object-page/usage)
- [Shopee Mass Upload User Guide](https://cdngarenanow-a.akamaihd.net/shopee/seller/seller_cms/e8420f9b3f575f9d9ed24e16256aa271/Mass%20Upload%20User%20Guide%20%28New%20UI%29%20MY.pdf)
- [Lazada SEA bulk product upload guide](https://img-ovs.alicdn.com/other//common/90224e281e3548ccb306dfe4c11b2714)

### Import and upload safety

- [Akeneo importing data](https://help.akeneo.com/import-export-data/import-your-data)
- [Akeneo process tracker](https://help.akeneo.com/import-export-data/12-serenity-follow-your-jobs-execution)
- [Microsoft Dataverse data import](https://learn.microsoft.com/en-us/power-apps/developer/data-platform/run-data-import)
- [Microsoft Excel/CSV import](https://learn.microsoft.com/en-us/power-apps/maker/data-platform/data-platform-import-export)
- [Oracle Product Hub import maps](https://docs.oracle.com/en/cloud/saas/supply-chain-and-manufacturing/25c/faipr/overview-of-import-maps.html)
- [Amazon Feeds API best practices](https://developer-docs.amazon.com/sp-api/lang-US/docs/feeds-api-best-practices)
- [OWASP File Upload Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html)

### React, Next.js, and large result sets

- [Next.js Image](https://nextjs.org/docs/app/api-reference/components/image)
- [Next.js `useSearchParams`](https://nextjs.org/docs/app/api-reference/functions/use-search-params)
- [React `useDeferredValue`](https://react.dev/reference/react/useDeferredValue)
- [React `startTransition`](https://react.dev/reference/react/startTransition)
- [TanStack Virtualizer API](https://tanstack.com/virtual/latest/docs/api/virtualizer)
- [TanStack React Virtual](https://tanstack.com/virtual/latest/docs/framework/react/react-virtual)
- [TanStack Query infinite queries](https://tanstack.com/query/latest/docs/framework/react/guides/infinite-queries)
- [SQLite row values](https://www.sqlite.org/rowvalue.html)
- [SQLite query planner](https://www.sqlite.org/queryplanner.html)

### Cloudflare D1, R2, Images, and Cache

- [D1 index best practices](https://developers.cloudflare.com/d1/best-practices/use-indexes/)
- [D1 limits](https://developers.cloudflare.com/d1/platform/limits/)
- [D1 Workers Binding API](https://developers.cloudflare.com/d1/worker-api/d1-database/)
- [D1 metrics and analytics](https://developers.cloudflare.com/d1/observability/metrics-analytics/)
- [D1 read replication](https://developers.cloudflare.com/d1/best-practices/read-replication/)
- [D1 Time Travel](https://developers.cloudflare.com/d1/reference/time-travel/)
- [R2 presigned URLs](https://developers.cloudflare.com/r2/api/s3/presigned-urls/)
- [R2 public buckets](https://developers.cloudflare.com/r2/buckets/public-buckets/)
- [R2 consistency](https://developers.cloudflare.com/r2/reference/consistency/)
- [Cloudflare Images](https://developers.cloudflare.com/images/)
- [Cloudflare Images responsive delivery](https://developers.cloudflare.com/images/optimization/make-responsive-images/)
- [Cloudflare default cache behavior](https://developers.cloudflare.com/cache/concepts/default-cache-behavior/)

### Accessibility standards

- [WAI ARIA Grid pattern](https://www.w3.org/WAI/ARIA/apg/patterns/grid/)
- [WAI Table pattern](https://www.w3.org/WAI/ARIA/apg/patterns/table/)
- [WAI Checkbox pattern](https://www.w3.org/WAI/ARIA/apg/patterns/checkbox/)
- [WAI sortable table example](https://www.w3.org/WAI/ARIA/apg/patterns/table/examples/sortable-table/)
- [WCAG 2.2 status messages](https://www.w3.org/TR/WCAG22/#status-messages)
- [WCAG focus visible](https://www.w3.org/WAI/WCAG22/Understanding/focus-visible.html)
- [WCAG target size minimum](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html)
- [WAI Images decision tree](https://www.w3.org/WAI/tutorials/images/decision-tree/)

## Research limits

- This is a research recommendation, not a claim that every cited product exposes the same implementation internals.
- Shopee and Lazada evidence is intentionally limited to accessible first-party seller-upload material. The Lazada document is older and is not used as a current UI specification.
- Starting at 50 cards per page is an Archestimator design choice informed by Shopify's 50-item admin page and Akeneo's 100-row dense grid; it should be tuned using the telemetry proposed above.
- Recommendations about query fingerprints, inverse import ledgers, immutable image-key shape, and exact phase boundaries are implementation inferences derived from the cited platform constraints.
