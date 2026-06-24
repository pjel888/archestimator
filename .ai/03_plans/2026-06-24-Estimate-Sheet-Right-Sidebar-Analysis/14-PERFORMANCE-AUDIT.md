# 14 — Performance Audit

## Bundle/loading analysis

### Dynamic import
- The sidebar (`component-library/index.tsx`) is dynamically imported with `ssr: false` — its chunk loads only on the client after hydration. The `AddComponentModal` is a nested dynamic import within the sidebar.
- **Fallback**: `ComponentLibrarySidebarFallback` renders skeletons during chunk load.

### Lite dataset (U18/U19)
- `loadProjectComponentLibraryLite` skips the unbounded audit-graph tables (versions, price history, state history, attachments) when `includeDetailGraph: false`.
- Cost-determining queries (price options + cost entries) are ALWAYS loaded so the lite cost is byte-identical to the full dataset.
- **Savings**: for a workspace with 1,000 components × 5 variants × 3 cost entries × 2 attachments, the lite path skips ~10,000 rows of audit/attachment data.

### Item limit
- `SIDEBAR_COMPONENT_LIBRARY_DEFAULT_LIMIT = 50` items
- `SIDEBAR_COMPONENT_LIBRARY_MAX_LIMIT = 100`
- The sidebar loads at most 100 most-recently-updated non-archived items

## Render profiling

### Giant reducer (F-13)
The `EstimateRightSidebarBase` component uses a single `useReducer` with ~40 fields. Every `fieldChanged` action creates a shallow clone of the entire state object. With ~60 `useCallback` setters, each causing a reducer dispatch, the render fan-out is broad.

**Impact**: typing in the search input dispatches `fieldChanged` for `searchQuery`, which clones the entire sidebar state. All memoized selectors (`useMemo` for tree building, filtering, etc.) re-run because their inputs change (the state object identity changes).

**Mitigation**: `useDeferredValue` wraps the search query so the actual filtering is deferred. But the state clone still happens synchronously on every keystroke.

### Tree rendering
- Virtualization: `WORKSHOP_TREE_VIRTUALIZATION` enabled by default (min 150 rows). Uses `@tanstack/react-virtual`.
- Row memoization: `DefaultTreeRow` and `TreeFlatRow` are `memo`'d.
- **Template totals precomputation**: `TemplatesTree.tsx:238-258` precomputes `templateTotals`, `categoryTotals`, and `templateNodeTotals` maps once per filtered-template change, avoiding recursive total computation on every render. ✅

## Algorithmic complexity

### Tree builders
- `buildLibraryTreeWithComponentRows`: O(n) for folder mode, O(n × suppliers) for supplier mode, O(n × brands) for brand mode.
- `buildSupplierTree`/`buildBrandTree`: for each supplier/brand, filters ALL items. This is O(n × s) where s = supplier count. For 1,000 items × 100 suppliers = 100,000 comparisons. **Acceptable for sidebar limits (50-100 items)**.

### Search
- `searchComponents` (`helpers.ts:121-144`): O(n) per query, with per-item field normalization. Not indexed — relies on the item limit (50-100) to stay fast.
- `filterTree` (`helpers.ts:28-37`): recursive tree prune, O(nodes).

### Project-source search (server)
- Two bounded ILIKE pre-filters (U5/PERF-1) reduce the materialization set from all estimates to only those with name matches.
- Materialization caps: 25 estimates, 75 tabs per estimate, 600 nodes, 1200 row items.
- **Worst case**: 25 estimates × 75 tabs × 600 nodes = expensive but bounded.

### Facet options
- `buildComponentFacetOptions` (`component-facet-filter-model.ts:106-147`): O(n) scan of all items to collect distinct suppliers, brands, lifecycles, confidence values. Runs on every dataset change.

### Bulk selection
- `toggleCascadeSelection`: traverses the selection node tree. O(nodes) per toggle.
- `pruneSelection`: O(selected ids × tree nodes) — runs in a `queueMicrotask` to avoid blocking render.
- `dedupeSelectedRoots`: O(selected ids × tree depth).

## Network payloads

### Library lite dataset
- 50-100 items, each with ~30 fields + nested price options (1-3 per item) + cost entries (1-3 per option).
- Estimated payload: 50 items × ~2KB each = ~100KB JSON.

### Template list
- Typically 5-50 templates, each with nodes + row items.
- Estimated payload: 20 templates × ~5KB each = ~100KB.

### Project source outline
- Per estimate: all tabs + node trees (capped at 600 nodes, 1200 row items).
- Estimated payload per estimate: ~50-200KB depending on tree depth.

### Search
- Bounded by materialization caps. Worst case: ~500KB for a broad query matching many estimates.

## Image performance

### Thumbnails
- `LibraryItemThumbnail` (`LibraryTree.tsx:271-296`): renders `next/image` with `fill`, `sizes="24px"`, `unoptimized`, `loading="lazy"`.
- **`unoptimized`**: bypasses Next.js image optimization. Images are served at their original resolution. For Supabase storage images, this means full-resolution photos are downloaded for 24×24px thumbnails.
- **Performance impact**: significant for workspaces with many image-backed components. Each thumbnail request downloads the full image.
- **Recommendation**: generate thumbnail-sized variants at upload time (the upload route already creates a `thumbnailPath` — but the sidebar reads `imageUrl`, not `thumbnailPath`). **P2 performance risk.**

### Route image normalization
- `normalizeComponentImageRouteUrl` (`LibraryTree.tsx:244-259`): validates that image URLs match the `/api/component-library/images?path=…` pattern. Prevents path traversal. ✅
- Falls back to `normalizeEstimateRowImageUrl` for non-route URLs (Supabase storage URLs).

## Large-data benchmarks (projected)

| Dataset size | Library tab render | Templates tab render | Search latency |
| --- | --- | --- | --- |
| 50 items | <100ms | <100ms | <50ms |
| 100 items (max sidebar) | <200ms | <100ms | <100ms |
| 1,000 items (Components page) | N/A (sidebar capped at 100) | <200ms | <200ms |
| 10,000 items | N/A | <500ms | <500ms |

**Note**: the sidebar's item limit (100) prevents most large-data performance issues. The Components page (LibraryFolderTree) handles the full dataset with its own virtualization.

## Ranked optimizations

1. **P2**: Use `thumbnailPath` instead of `imageUrl` for sidebar thumbnails (saves bandwidth)
2. **P2**: Extract the giant reducer into tab-scoped hooks (reduces render fan-out)
3. **P3**: Add hover-prefetch dedup Set (prevents duplicate project-source fetches)
4. **P3**: Debounce facet option construction (only rebuild when popover opens)
