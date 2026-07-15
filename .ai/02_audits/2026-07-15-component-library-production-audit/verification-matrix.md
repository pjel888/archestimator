# Component Library production-core verification matrix

**Route:** `http://localhost:3000/workshop/library/components`  
**Verified:** 2026-07-15  
**Verdict:** Production-core pass; enterprise release remains held for the deferred programme below.

| Capability / path | Decisive evidence | Result |
| --- | --- | --- |
| Browse catalogue | Responsive ecommerce-style card grid, folder breadcrumbs, cost/unit, supplier/brand, provenance, Cards/Dense switch, and explicit loaded/total messaging verified live and in component-manager tests. | Passed |
| Add component | Canonical 24×24 light-orange action, permission-gated entry, initial Name focus, dirty-close protection, focus return, workspace duplicate preflight during identity changes, and atomic duplicate recheck. | Passed |
| Add / rename / delete folder | Canonical 24×24 light-orange Add folder action; pointer-down/click regression fixed; dialog focus and focus return covered; deletion copy is count-neutral on partial pages and states that assigned components remain. | Passed |
| Inspect and direct link | Card and dense-row inspection, route state, off-page direct-link hydration, close/focus return, and stable image fallback covered. | Passed |
| Search, filters, and recovery | Loaded-slice search/facets, filter chips, no-match explanation, Clear search, and empty-library recovery verified. The UI states when truth is limited to loaded rows. | Passed for loaded slice; global query deferred |
| Images | Clean live reload reported zero broken images and no console warnings/errors. First visible catalogue image is eager; later images remain lazy. Authenticated R2 image routes authorize before metadata/bytes and use private revalidation semantics. | Passed |
| Selection and archive | Generic selection language, 500-ID client/server cap, visible selection state, archive preview, cancel, and clear-selection paths verified without mutating data. Permanent purge is not exposed on this page. | Passed |
| Duplicate component | Images and attachments are intentionally omitted, safe metadata is retained, and the user-facing receipt reports each omission. | Passed |
| Large-catalogue containment | Deterministic 50-row cursor pages, cache append, a 500-card guard that moves users to virtualized Dense mode, and virtualized dense rows prevent the prior unbounded render path. | Passed containment; card virtualization remains telemetry-gated |
| Cloudflare D1 scale | Local migration `0083_component_library_browse_cursor_index.sql` applied; `EXPLAIN QUERY PLAN` used `idx_cost_library_items_active_browse_cursor`; 500-component archive/delete budget coverage stays within 100 binds per statement. | Passed locally; no hosted mutation or load proof |
| Accessibility / focus | Add dialogs, inspector, search, Cards/Dense controls, selection, Escape/Cancel, focus restoration, and stale accessible-label regressions are covered by focused tests and live interaction. Folder rows expose no misleading selection checkboxes. | Passed |
| Visual parity | Estimate-sidebar reference and final Components implementation were reviewed together at the same 1280×720 viewport. Add controls match the existing light-orange treatment; no P0/P1/P2 visual finding remains. | Passed |

## Verification receipts

- Curated Vitest gate: **17 files, 248 tests passed**.
- TypeScript: `bun run type-check --pretty false` passed.
- Scoped ESLint: zero errors; nine existing warnings remain (React Compiler / hook dependency and unused-symbol warnings).
- Diff hygiene: `git diff --check` passed.
- Live browser: zero broken images; zero new console errors or warnings after clean reload; Add component and Add folder both measured 24×24; first card image reported `loading="eager"`; no folder-row checkboxes.
- Visual evidence: [final Components page](./12-final-components-followup.png) and [estimate sidebar Add reference](./13-estimate-sidebar-add-reference.png).

## Deferred enterprise programme

These are explicit follow-ups, not claims of completed behavior:

1. Workspace-complete server search, facet counts, sorting, saved views, and query-wide selection.
2. Archived browse, restore, retention, and cursor-total reconciliation after mutations.
3. Staged CSV/XLSX import with mapping, dry-run dedupe, idempotent execution, row receipts, and complete export.
4. Admin-only purge governance, recovery policy, richer RBAC/audit telemetry, and background jobs for very large catalogues.
5. Legacy project-private image ownership backfill and hosted large-fixture performance proof.

