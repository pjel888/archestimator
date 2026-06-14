# PERF-1 — Lazy-load template node trees (slim the "lite" library load)

**Last updated:** 2026-06-14
**Status:** Deferred — verified UNSAFE to do naively; needs a lazy-load layer first.
**Severity:** High value (biggest cold-open cost) · **Effort:** Large · **Risk:** Medium

## Problem

The collapsed templates list only needs each template's **name + category + total**, but the panel's lazy loader fetches **every node and every row of every template in the workspace** and assembles fully nested `EstimateTreeNode[]` per template — on first panel open.

- `getCurrentWorkspaceComponentLibraryLite` calls the same `loadCurrentWorkspaceEstimateTemplates` as the full editor — `src/lib/repositories/component-library-repository.ts:732-777`.
- It runs two unbounded queries (`estimate_template_nodes` + `estimate_template_row_items` `.in("template_id", templateIds)`) and `buildEstimateTemplatesFromRows` (`:449-508`) nests them with totals.
- Cost scales with total workspace template volume; it's the dominant "slow to open the panel" factor as templates grow.

## Why it was deferred (the trap)

Naively returning `nodes: []` until expand **breaks the app**, because these read `template.nodes` *synchronously*:

- **Drag-insert** — `cloneTemplateNodesForEstimate(template.nodes)` and `findEstimateNode(template.nodes, …)` in `EstimateSheetContent.tsx` (insert/area-wrap handlers). With empty nodes the optimistic insert adds nothing.
- **Totals** — `summarizeEstimateTemplate(template)` / `computeTemplateNodeTotal` (now precomputed in `TemplatesTree.tsx`, but still walk `template.nodes`).
- **Tree rendering** — `buildTemplateCategoryTreeNodes` uses `template.nodes.length`/`.map` (`TemplatesTree.tsx`).
- **Preview / gallery** — `TemplatePreviewDock`, `TemplateGallery`.

None of these have a "nodes not loaded yet" fallback.

## Approach (phased, safe)

1. **Add a metadata-only query** alongside the existing one: select `id, name, category, sort_order, updated_at` and a server-computed `total` + `node_count` (so the list + category totals render without the full tree). Keep the full per-template loader for on-demand use.
2. **Add a `useTemplateNodesById(templateId)` fetch-on-demand hook** (TanStack Query, keyed per template, `staleTime` ~5 min) that returns the full `EstimateTreeNode[]`.
3. **Trigger the fetch** on the three moments that need nodes: template **expand**, **drag start** (`onTemplateDragStart` — prefetch so the drop has nodes), and **preview open**. Show a skeleton row while loading.
4. **Guard the insert path:** if a drag/click fires before nodes resolve, await the per-template fetch in the handler before cloning (the insert handlers are already async).
5. **Only after the on-demand path is solid,** switch `getCurrentWorkspaceComponentLibraryLite` to the metadata-only query (templates carry `nodes: []`).

## Risk / mitigation

- Highest-risk file is `EstimateSheetContent.tsx` insert handlers — they must not clone empty nodes. Mitigation: await the per-template node fetch inside the handler when `nodes` is empty; keep the optimistic update after nodes resolve.
- Drag-and-drop has no async hook in the drop handler — prefetch on drag *start* so nodes are resident by drop.

## Acceptance criteria

- First panel open issues **no** `estimate_template_nodes`/`estimate_template_row_items` query (only metadata + total).
- Expand / drag / preview each lazy-load exactly one template's nodes once (cached after).
- Drag-insert, click-insert, area-wrap, totals, preview, and gallery all still work (existing tests green; add a test that drag-insert works when nodes were initially unloaded).
- Cold-open payload size and query count drop measurably (capture before/after).

## References

- Audit finding PERF-1 (data/caching audit) and its adversarial verification ("UNSAFE as proposed; defer").
- `src/lib/repositories/component-library-repository.ts`, `src/lib/component-library/actions.ts`, `src/components/workshop/component-library/tree/TemplatesTree.tsx`, `src/components/workshop/EstimateSheetContent.tsx`.
