# Component Library production audit — action and path matrix

**Surface:** `/workshop/library/components`

**Audit date:** 2026-07-15

**Evidence:** current source plus [browse](./01-current-components-page.png), [no results](./02-search-no-results.png), [filters](./03-filter-panel.png), [details](./04-component-details.png), and [add component](./05-add-component-modal.png) screenshots.

## Implementation update

The first production-core pass is now implemented. The original audit findings remain below as the point-in-time discovery record; this update supersedes them only where noted.

**Resolved or contained in this pass:**

- Replaced the nested branch-card presentation with a flat responsive catalogue grid while preserving folder, supplier, and brand scope in the navigation tree and card breadcrumbs.
- Replaced the 24-row/load-all path with deterministic 50-row cursor pages, a frozen first-page snapshot, immutable `created_at` ordering, exact active totals, explicit loaded-slice messaging, retry, and `Load 50 more`. Concurrent inserts no longer leak into or displace a continuation, and ordinary component edits cannot move a row across the cursor.
- Made direct `?component=<id>` links fetch the requested component before deciding not-found, and preserve transient failures for retry.
- Fixed current broken `/api/` image rendering and added a stable image fallback in both catalogue cards and the inspector.
- Added explicit empty-library and no-match recovery states.
- Made component selection terminology action-neutral and enforced the 500-ID cap in selection state; unchecked catalogue controls disable at the cap and every visibly selected ID remains actionable.
- Removed permanent component deletion from this page's visible action surface while retaining archive. The destructive server capability still requires a separate governance decision before any future UI is restored.
- Removed the false archive-restoration promise until an Archived view and restore workflow exist.
- Added a workspace-complete server duplicate preflight and an atomic recheck immediately before create, including an explicit `Create anyway` intent.
- Kept exact totals coherent after create/archive cache patches, including across later snapshot pages, and made incoming browse pricing authoritative while preserving detail-only variant attachments and history.
- Made the Components-page Add action use the canonical orange treatment and removed the duplicate outer Add control; compact Library tabs now render as a stable three-column tablist.

**Fresh visual evidence:** [improved browse](./06-improved-components-page.png), [improved details](./07-improved-component-details.png), [improved no-results recovery](./08-improved-no-results.png), [improved add component](./09-improved-add-component.png), and [compact catalogue](./10-improved-components-compact.png).

**Still required for the full enterprise programme:** workspace-complete server search/facets/saved views, query-wide selection, Archived plus restore, discoverable draft management, complete CSV/XLSX export, staged XLSX import with dry-run mapping and row receipts, stronger RBAC/audit/offline/telemetry contracts, and governed purge semantics. Card virtualization is intentionally deferred: bounded cursor pages plus the existing dense-view virtualization remove the immediate unbounded-render risk, and catalogue-card virtualization should follow measured render/scroll telemetry rather than be introduced speculatively.

## Production verdict

**Hold production release for the P0 items below.** The route has a credible browse/edit foundation—route skeleton and error boundary, folder/supplier/brand navigation, card and dense views, an inspector, editor/admin guards, typed destructive confirmations, idempotent create, and optimistic edit-conflict checks—but three current paths can mislead users or destroy/restrict business data.

| Priority | Finding | Required production outcome |
| --- | --- | --- |
| **P0** | Permanent component deletion currently deletes every linked estimate row and template row. Editors and admins share the same mutation permission. | Prefer deleting only the library source while preserving downstream row snapshots and detaching linkage. If cascade deletion is an intentional product rule, make it admin-only, show affected objects—not counts alone—and provide a recovery/export receipt before execution. |
| **P0** | Archive copy says the component can be restored, but archived records are excluded from every component loader and no restore action exists. | Add an Archived view plus restore path, or remove the recovery promise and treat archive as a governed retention state. Existing estimates must remain unchanged. |
| **P0** | The initial route contains only 24 recent components. Search, filters, deep links, duplicate detection, and bulk selection operate on the loaded client subset until “Load all” is chosen. A valid deep link outside that subset is silently treated as not found. | Make correctness-dependent operations workspace-complete: server-side search/facets/counts/deep-link lookup and duplicate checks, or automatically fetch the complete relevant scope before returning a result or permitting a bulk mutation. |
| **P1** | “Save to drafts” persists a draft, but the audited surface exposes no Drafts list or resume/delete path. | Ship resumable draft management or remove the save promise. A saved draft must be findable, attributable, resumable, and discardable. |
| **P1** | Empty/no-result and recovery states are incomplete. The no-result screenshot is a blank catalogue; detail hydration can fail silently; usage failure has no retry; cached refetch errors are not surfaced; no offline state is modeled. | Add explicit empty/no-match/error/offline/stale states with one clear recovery action and preserve unsaved modal work. |

## Actors and jobs to be done

| Actor | Primary jobs | Current authority | Production need |
| --- | --- | --- | --- |
| **Viewer / estimator** | Find a trusted component; compare cost, unit, supplier, freshness, lifecycle, and usage; copy an ID; follow a shared deep link. | Browse and inspect. Mutation actions are server-denied. | Stable complete search, truthful deep links, read-only empty/error states, and no editor-only entry points. |
| **Editor / cost manager** | Create and revise components and variants; keep pricing provenance current; organize folders; duplicate; archive; perform scoped bulk work. | Viewer abilities plus all component/folder mutations, archive, and permanent delete. | Safe dependency-aware edits, visible conflict recovery, resumable drafts, and bulk scope that cannot change invisibly. |
| **Workspace admin / library owner** | Set governance; recover archived work; import/export; approve high-risk deletion; audit actors and impacts. | Same component-management gate as editor. | Separate destructive/admin permissions, retention/recovery controls, audit log, and portability. |
| **Ops / support / auditor** | Diagnose failed or stale mutations; reconcile usage; prove who changed what; recover data; monitor long-running jobs and quotas. | Sparse route telemetry and stored component history; no operations surface. | Correlation IDs/receipts, actor/time/change reason, affected-object trails, retry/replay-safe jobs, and health/export tools. |

## Entry points and action paths

`Now` means required for a trustworthy first production release. `Later` means valuable expansion after the safe core is complete.

| Action / entry | Happy path and state transition | Current behavior | Required now | Later |
| --- | --- | --- | --- | --- |
| **Open Components** from Library tab or direct URL | Route loading → partial/complete ready → browse | Accessible route skeleton and route-level retry boundary exist. Initial data is the 24 most recently updated active components. | Keep skeleton/error boundary; clearly label partial data and complete the dataset automatically when an action needs complete truth. | Persist personalized columns, density, and saved views across devices. |
| **Scope by folder, supplier, or brand** from the left tree | All → selected node → scoped result set; collapse/expand and move/reorder save status | Tree modes, search, folder CRUD, cascade folder selection, and drag/drop are present for managers. Deleting a folder reparents children and leaves its components unassigned. | State that folder deletion does not delete components; show destination/impact in the confirmation. Preserve selected scope through refresh. | Bulk move components, merge folders/suppliers/brands, governed taxonomy ownership. |
| **Search / filter / sort / switch cards-dense** | Query/facets/sort → result count → inspect or clear | Search covers name, supplier, brand, category, unit, description, source/date, and path. Facets cover lifecycle, freshness, supplier, and brand. No-match rendering is blank. Search/facets only see loaded rows. | Show “No components match” with query/facet summary, Clear search, Clear filters, and Add component for managers. Make counts and results complete and keep one canonical search shortcut. | Saved filters/views and organization-wide health queues. |
| **Inspect a card / dense row / `?component=<id>`** | Selected → detail loading → inspector ready → close/back restores focus | Inspector shows cost, supplier/brand, price history, lifecycle/version, and usage. Detail hydration failure is silent; usage failure has no retry. Valid unloaded deep links are stripped as “not found.” | Fetch the requested ID directly before deciding not-found/forbidden; distinguish deleted, archived, forbidden, and transient failure; add retry and copy-ID feedback. | Backlinks to affected estimates/templates and comparison with another component/version. |
| **Add component** from table or `?add=component` | Clean form → dirty → validated → submitting → saved → new component inspector | Manager-only table action; global Library header exposes Add to viewers, who get an inline denial. Create is idempotent. Required fields, images, variants, activity, provenance, uploads, and “create anyway” duplicate warning exist. | Permission-match every entry point. Make Variants a named, visible step/count; reveal hidden-section validation errors. Run duplicate checks against the whole workspace. | Templates/presets for common component types and guided vendor lookup. |
| **Close an unsaved add** | Dirty → keep editing / discard / save draft / submit | Protective close dialog exists and blocks close during uploads. Persisted drafts have no discoverable resume path. | Add My Drafts with owner, saved time, resume, discard, and expiry state; otherwise remove “Save to drafts.” Preserve the in-memory draft across offline/retry events. | Collaborative drafts and handoff/approval. |
| **Edit from inspector** | Detail loading → edit ready → submitting → saved new revision and linked-instance sync, or conflict | Server checks component revision and linked-row impact fingerprint. The modal currently renders a conflict as error text instructing refresh. | Offer Review latest / Reload latest / Copy my changes; never discard the user’s draft. Before save, summarize linked estimates/templates and variant replacements. | Field-level diff/merge and approval workflow for sensitive pricing. |
| **Duplicate from inspector** | Source → duplicating → saved copy → new inspector | Copy is created; attachments are intentionally omitted and the sheet reports that omission. | Preview what will and will not copy, use a deterministic “Copy” name, and run complete-workspace duplicate detection. | Choose fields/variants/attachments to copy. |
| **Select and bulk act** from cards, dense rows, or tree | None → selected set → preview → typed phrase → executing → receipt | Checkbox, Ctrl/Cmd-click, dense-row Space, Select visible, Clear, Archive, and Delete exist; server caps a request at 500. Selection labels say “for archive” even though delete is also available. Toolbar counts only selected visible rows. | Label selection generically, show `selected / hidden by filters / total`, freeze an explicit ID set in preview, and clear/retain selection predictably when scope changes. | Shift-range selection, select all matching server results, bulk move/edit/lifecycle/pricing review. |
| **Archive** from inspector or bulk toolbar | Active → preview → typed phrase → archived → restore or retain | Archive hides the component and preserves linked rows, but archived records cannot be browsed or restored despite confirmation copy promising restoration. | Add Archived scope, restore, actor/time/reason, and retention policy. Default destructive workflows to archive. | Scheduled retention review and approval-based purge. |
| **Delete permanently** from inspector or bulk toolbar | Active/archived → dependency preview → typed phrase → deleting → receipt/recovery window | Preview shows aggregate estimate/template row counts; execution atomically deletes the component, linked estimate rows, linked template rows, and marks uploads removed. | Resolve the P0 deletion policy. Recommended: preserve downstream snapshots and detach linkage. Restrict true purge to admin, list affected objects, require reason, create audit receipt, and offer a recovery window where feasible. | Retention-policy purge jobs and legal hold. |
| **Import catalogue** | Upload → map columns → validate/dedupe dry run → review → execute job → row-level receipt | No catalogue-level import path was found in the audited route/modules; spreadsheet files are only supported as component attachments. | **Conditional:** promote to Now only if first-user onboarding depends on legacy catalogue migration. Then require admin-only dry run, schema/version, duplicate resolution, row-level errors, idempotency, and no partial silent success. | Reusable mappings, scheduled supplier feeds, and API ingestion. |
| **Export catalogue** | Choose all/filtered/selected → define fields/variants/history → generate → download receipt | No catalogue-level export path was found. | Ship CSV/XLSX export for all, filtered, and selected components with stable IDs, variants, lifecycle, supplier/brand, cost, pricing source/date, and generated-at scope. This is the minimum portability/recovery path before destructive administration. | Version/history export, scheduled snapshots, and API/webhook delivery. |

## State coverage matrix

| State | Current evidence | Production-now contract |
| --- | --- | --- |
| **First load** | Route skeleton and dynamic-manager skeleton announce loading. | Skeleton must match the actual three-panel layout and leave no interactive stale controls enabled. |
| **Background load / partial data** | “Showing 24+ / Load all” may appear; partial seed does not refetch on mount. | Show freshness and completeness together; auto-complete for search, deep link, duplicate, export, and bulk scopes. |
| **Empty library** | Catalogue render collapses to blank when there are no cards. | Explain the empty workspace. Manager CTA: Add component or Import. Viewer CTA: contact a workspace editor. |
| **No search/filter matches** | Screenshot shows a blank centre panel; only a small count remains in the chrome. | Name the active query/facets and offer Clear search / Clear filters. Do not imply “zero” while only a partial dataset was searched. |
| **Route error** | Route-level error boundary offers recovery. | Keep; use a support-safe error reference, never raw sensitive details. |
| **Query/detail error** | Cached query error is not consumed; detail hydration catch is silent; usage says unavailable without retry. | Preserve the last good data, mark it stale, show Retry, and distinguish permission/not-found/network. |
| **Offline** | No explicit online/offline state was found. | Disable server-only commit with “You’re offline,” retain the form and selection locally, and retry only after user intent or safe idempotent reconnection. |
| **Stale edit / conflict** | Revision and linked-impact guards prevent blind overwrite; modal shows the thrown message. | Preserve local changes and provide compare/reload/copy paths. Announce which dependency changed when safe. |
| **Stale destructive preview** | Preview hash prevents execution after scope changes. | Keep; refresh the preview in place and require reconfirmation without losing the intended ID set. |
| **Unauthorized** | Server fails closed for viewer mutations; global Add remains visible. | Hide unavailable actions or render them disabled with role explanation; never navigate a viewer into a dead-end mutation path. |
| **Success** | Inline polite status reports save/archive/delete/move results. | Add durable receipt for high-risk/bulk actions and keep transient success near the initiating control. |

## Keyboard and accessibility

| Current strength | Production-now repair |
| --- | --- |
| Library tabs implement Arrow keys, Home, and End. Dense rows support Enter to inspect and Space to select. Inspector Escape and focus return are implemented. Native inputs and focus-visible styling are used broadly. | Resolve the two active Ctrl/Cmd+K listeners (global Library search and component-table search) into one deterministic command or explicit scopes. |
| Filters use fieldsets, labels, applied-filter chips, and live counts. | Add Arrow/Home/End roving focus plus `id`/`aria-controls`/`aria-labelledby` relationships to Component/Activity modal tabs. |
| Inspector and mutation statuses use named regions/live output. | Change checkbox names from “Select … for archive” to “Select …” because the same selection enables permanent delete. Announce selected, hidden, and total counts. |
| Cards expose image and name buttons to inspect. | Make the apparent card hit area match the actual hit area; card whitespace currently looks clickable but is not a control. |
| Compact inspector remains available as a fixed bottom dock. | Guarantee focus entry/return and unobscured underlying controls; if it is intended to be modal on small screens, use dialog semantics and focus containment. |
| Screenshots show many 8–10 px labels and 24 px icon controls. | Raise essential labels, destructive copy, and frequent pointer targets to the product accessibility baseline; keep low-density metadata secondary, not illegible. |

## Enterprise admin and operations requirements

| Capability | Now | Later |
| --- | --- | --- |
| **RBAC** | Viewer read; editor create/edit/organize/archive; admin restore/import/export/permanent purge and policy. Enforce at both UI and server boundaries. | Custom roles and field-level permissions. |
| **Auditability** | Actor, timestamp, reason, before/after revision, affected component/variant IDs, downstream impact, and correlation/receipt ID for every bulk/destructive mutation. | Approval chains, signed exports, and SIEM delivery. |
| **Retention/recovery** | Archived browser, restore, purge policy, and explicit behavior for linked estimate/template snapshots and uploads. | Legal holds and scheduled retention automation. |
| **Data portability** | Complete filtered/selected/all export; documented schema and generated-at scope. | Scheduled exports, APIs, and external storage destinations. |
| **Bulk operations** | Stable server-side scope, dry-run preview, max-size explanation, progress, cancellation before commit where possible, idempotency, and downloadable row-level result. | Background queues for very large catalogues and resumable jobs. |
| **Data governance** | Workspace-wide duplicate check, supplier/brand/category ownership, pricing-date/source requirements, and visible quota errors before submission. | Merge tools, canonical supplier feeds, multi-currency policy, and stewardship dashboards. |
| **Supportability** | Surface stale/offline/error classes and support-safe correlation IDs; expose retry without asking users to repeat destructive intent. | Admin health console and automated anomaly alerts. |

## Production-now release gate

1. Decide and implement the permanent-delete contract; prevent accidental downstream estimate/template loss.
2. Make archive genuinely reversible and browseable, or remove the restoration claim.
3. Make search, facet counts, deep links, duplicate checks, export, and bulk selection workspace-complete.
4. Make saved drafts resumable or remove the save-to-drafts action.
5. Add explicit empty/no-match/query-error/offline/detail-error recovery states.
6. Align every entry point with viewer/editor/admin permissions; separate admin purge from editor management.
7. Resolve shortcut/tab/selection accessibility gaps and make destructive scope unambiguous.
8. Ship a complete export path; gate import on confirmed onboarding need and require dry-run validation if promoted to Now.

## Source evidence map

- Route seed and permission capability: [`LibraryComponentsRoute.tsx:9-42`](../../../src/components/workshop/library/LibraryComponentsRoute.tsx#L9)
- Partial cache/refetch behavior: [`LibraryPageClient.tsx:106-157`](../../../src/components/workshop/LibraryPageClient.tsx#L106)
- Search, partial-load, no-result render, and bulk toolbar: [`ComponentLibraryManager.tsx:1628-1957`](../../../src/components/workshop/component-library-manager/ComponentLibraryManager.tsx#L1628)
- Deep-link validation and detail hydration: [`ComponentLibraryManager.tsx:2352-2436`](../../../src/components/workshop/component-library-manager/ComponentLibraryManager.tsx#L2352)
- Global Add and search shortcut: [`LibraryTabsLayoutClient.tsx:129-180`](../../../src/components/workshop/library/LibraryTabsLayoutClient.tsx#L129)
- Create duplicate check and modal tabs: [`AddComponentModal.tsx:941-1012`](../../../src/components/workshop/component-library-manager/AddComponentModal.tsx#L941), [`AddComponentModal.tsx:1724-1789`](../../../src/components/workshop/component-library-manager/AddComponentModal.tsx#L1724)
- Unsaved-close and persisted draft path: [`AddComponentModal.tsx:1267-1388`](../../../src/components/workshop/component-library-manager/AddComponentModal.tsx#L1267), [`AddComponentModal.tsx:2556-2620`](../../../src/components/workshop/component-library-manager/AddComponentModal.tsx#L2556), [`actions.ts:2470-2506`](../../../src/lib/component-library/actions.ts#L2470)
- Revision and linked-impact conflict guards: [`actions.ts:1489-1565`](../../../src/lib/component-library/actions.ts#L1489)
- Archive promise versus archived-row exclusion: [`BulkDestructivePreviewModal.tsx:107-110`](../../../src/components/workshop/BulkDestructivePreviewModal.tsx#L107), [`component-library-repository.ts:389-443`](../../../src/lib/repositories/component-library-repository.ts#L389)
- Permanent-delete impact and execution: [`ComponentLibraryManager.tsx:2215-2223`](../../../src/components/workshop/component-library-manager/ComponentLibraryManager.tsx#L2215), [`actions.ts:2986-3124`](../../../src/lib/component-library/actions.ts#L2986)
- Workspace mutation permission: [`actions.ts:860-887`](../../../src/lib/component-library/actions.ts#L860)
- Inspector loading/error/keyboard behavior: [`ComponentInspectorDock.tsx:83-121`](../../../src/components/workshop/library/ComponentInspectorDock.tsx#L83), [`ComponentInspectorDock.tsx:255-335`](../../../src/components/workshop/library/ComponentInspectorDock.tsx#L255)
- Route loading and error states: [`loading.tsx:7-34`](../../../src/app/workshop/library/components/loading.tsx#L7), [`error.tsx:5-15`](../../../src/app/workshop/library/components/error.tsx#L5)

The implementation update above was completed after the initial audit capture. Product code changed and the production-core pass received targeted automated, static, and live-browser verification; the tables below remain the original discovery record unless the update explicitly marks an item resolved or contained.

## 2026-07-15 follow-up verification

The follow-up closed the remaining production-core review gaps without claiming completion of the broader enterprise programme.

| Path | Current verified behavior | Remaining boundary |
| --- | --- | --- |
| Add component | Exact small light-orange toolbar action, initial focus, focus return, truthful dirty-close confirmation, and proactive workspace duplicate warning while Name/Category/Supplier/Brand change. | Draft browser/resume and staged import are deferred. |
| Add folder | Exact small light-orange toolbar action; pointer-down/click close race removed; Name receives focus; Cancel returns focus. | Folder merge and governance remain later work. |
| Delete folder | Confirmation no longer infers “empty” from a partial component page. It states that assigned components remain and become unassigned; known child-folder impact remains precise. | A server-returned component impact count could be added if product value justifies the query. |
| Browse and inspect | Ecommerce-style grid, Dense mode, inspector, off-page deep links, stable broken-image fallback, and current pricing/provenance display are live. | Workspace-global query/facets/sort still require a server query contract. |
| Scale | 50-row cursor paging, 500-card Dense fallback, virtualized Dense rows, D1 bind chunking, and the active-browse cursor index contain the immediate thousands-of-components risk. | Card-grid virtualization should follow measured render/scroll evidence; hosted large-fixture proof is still absent. |
| Cloudflare images | Auth precedes R2 metadata/bytes and 304 decisions; responses use private revalidation; the first visible card image is eager and later images remain lazy. | Legacy project-private image references need an ownership backfill rather than relying indefinitely on runtime fallback. |
| Bulk safety | Selection caps at 500, archive preview is retained, permanent purge is removed from this page, and D1 500-ID bind-budget coverage passes. | Archived restore, admin purge governance, and query-wide selection remain deferred. |

Fresh receipts are recorded in [verification-matrix.md](./verification-matrix.md). The final implementation and estimate-sidebar reference were compared together at the same viewport: [Components](./12-final-components-followup.png) and [reference](./13-estimate-sidebar-add-reference.png).
