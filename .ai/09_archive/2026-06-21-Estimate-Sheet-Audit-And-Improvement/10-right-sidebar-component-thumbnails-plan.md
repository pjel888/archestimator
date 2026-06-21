---
title: Right Sidebar Component Thumbnails Plan
date: 2026-06-21
status: implementation-handoff
execution: code
---

# Right Sidebar Component Thumbnails Implementation Plan

> **For agentic workers:** Recommended execution surface: use `superpowers:subagent-driven-development`, `superpowers:executing-plans`, or the repo's normal implementation workflow when helpful. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add square thumbnails to component-library rows in the estimate-sheet right sidebar without changing the canonical two-type component taxonomy or creating a large image-loading cost.

**Architecture:** Keep thumbnails as an opt-in presentational row concern inside `LibraryTree`, enabled by the estimate-sheet right sidebar and disabled by default for other `LibraryTree` consumers. Reuse the existing `EstimateRowItem.imageUrl` data already hydrated by the lite library path, but use a stricter row-thumbnail helper that does not call category fallback imagery.

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind v4, TanStack Query, shared `Tree` virtualization, Vitest DOM tests.

---

## Decision Summary

Add a compact square thumbnail to component leaves in the right-sidebar component library tree. The thumbnail should appear in this order when the sidebar enables thumbnail rendering:

1. Existing tree item icon.
2. New square thumbnail.
3. Component title, supplier, price, and add action.

Keep user-facing component types canonical:

- `Library Component`
- `Project Component`

Do not introduce a third visible type while adding thumbnails. Express, detached, projected, link-state, and source-snapshot labels stay internal implementation provenance.

`LibraryTree` is shared. The first implementation must make thumbnails opt-in,
for example with `showThumbnails={true}` from `EstimateRightSidebar`, so the
component-library manager and template-editor paths do not inherit this sidebar
polish feature unintentionally.

## Requirements

| ID | Requirement | Acceptance proof |
| --- | --- | --- |
| R1 | Component leaf rows render a square thumbnail immediately after the existing tree icon. | DOM test asserts icon, thumbnail, and title order in `LibraryTree`. |
| R2 | Folder/template/source rows do not render component thumbnails. | DOM test asserts no thumbnail node for folder rows. |
| R3 | Missing, invalid, disallowed, or failed image URLs render a fixed-size local placeholder. | DOM/unit tests cover missing URL, invalid/disallowed URLs, and `error` event fallback. |
| R4 | The row accessible name remains the component title, not duplicated thumbnail alt text. | Accessibility test asserts the `treeitem` name stays the title. |
| R5 | Drag, add, right-click, keyboard preview, and search behavior remain unchanged. | Existing component-library UI tests plus one drag payload regression pass. |
| R6 | Large libraries do not instantiate thumbnails for every component. | Virtualization test with 200+ items asserts thumbnail count is bounded by mounted rows. |
| R7 | Sidebar lazy-load behavior remains intact. | Existing lazy-load test still proves no initial server-render catalog fetch. |
| R8 | Thumbnail network cost stays bounded and avoids large fallback imagery. | Static/source test proves row helper uses `item.imageUrl` only and does not call `getComponentImageUrl`. |
| R9 | No database schema or route payload expansion is required unless a later spike proves `imageUrl` is missing from the lite loader. | Repository/source inspection remains clean; any payload change is limited to `thumbnail_path` string data. |
| R10 | Thumbnails are opt-in for the estimate-sheet sidebar, not a default `LibraryTree` contract. | Test or source assertion proves `showThumbnails` defaults false and the sidebar passes it explicitly. |

## Current Implementation Facts

- `EstimateSheetContent` lazy-loads the project component library only when the sidebar or command palette needs it: `src/components/workshop/EstimateSheetContent.tsx:1202`.
- The right-sidebar library renders through `EstimateRightSidebar` and `LibraryTree`: `src/components/workshop/component-library/index.tsx`, `src/components/workshop/component-library/tree/LibraryTree.tsx`.
- Component row content lives in `LibraryItemRowContent`: `src/components/workshop/component-library/tree/LibraryTree.tsx:111`.
- The shared tree owns icons, indentation, drag events, selection, and virtual row mounting: `src/components/ui/tree.tsx`.
- `LibraryTree` is not sidebar-exclusive; component-library management and template-editor surfaces can also render it. A sidebar thumbnail pass must therefore be opt-in at the `LibraryTree` boundary.
- Tree virtualization defaults to `minRows: 150`, `estimateRowHeight: 28`, `overscan: 8`, and `initialViewportHeight: 480`: `src/lib/workshop/virtualization-flags.ts`.
- `EstimateRowItem` already carries `imageUrl`: `src/lib/estimates/types.ts`.
- The component-library repository already maps `thumbnail_path` into `imageUrl`: `src/lib/repositories/component-library-repository.ts:155`, `src/lib/repositories/component-library-repository.ts:909`.
- `getComponentImageUrl(item)` can fall back to large category imagery. That is useful for card/preview surfaces, but it is not acceptable for a virtualized row list because missing thumbnails could trigger unnecessary remote image requests.

## Conflict Resolution From Parallel Review

The architecture lane recommended reusing the existing `imageUrl` data path and existing image fallback helper. The performance lane identified that the existing helper can fall back to large 600px category images, including external URLs, which would violate the row-list budget.

Final decision:

- Reuse the existing `EstimateRowItem.imageUrl` field and repository hydration.
- Do not add a new schema field in this pass.
- Do not call `getComponentImageUrl(item)` from the row-thumbnail implementation.
- Add a narrow row helper such as `getComponentRowThumbnailUrl(item)` that returns only safe, stored thumbnail URLs and otherwise renders a local placeholder.

## UX Contract

- Thumbnail size: 24px by 24px (`size-6`) for the first implementation.
- Shape: square with 4px or 6px radius, object-cover, stable background.
- Placement: inside `LibraryItemRowContent`, before the title/supplier column.
- Interaction: decorative only. The thumbnail must not be focusable, draggable independently, or announced separately by screen readers.
- Layout: preserve existing row density and current right-sidebar feel. Do not redesign the sidebar, cardize rows, or add marketing-style visual treatment.
- Fallback: use an icon/neutral placeholder inside the reserved square, not remote category photos.

Why 24px: current shared tree rows estimate 28px. A 24px thumbnail plus the row's existing small vertical padding fits the current row geometry and avoids changing global virtualization. If product later wants a 32px thumbnail, pass a sidebar-specific `estimateRowHeight` override to `Tree`; do not mutate `WORKSHOP_TREE_VIRTUALIZATION` globally unless every tree consumer is reviewed.

## Data And Loading Strategy

Use this source priority for row thumbnails:

1. `item.imageUrl` when it is a safe stored component thumbnail URL.
2. Local placeholder when `item.imageUrl` is missing, invalid, disallowed, or has failed during the current mounted session.

Allowed first-pass URL shapes:

- Same-origin relative image URLs used by component-library image routes.
- Supabase public storage URLs on the configured project host and under the
  public `component-images` storage path.
- Existing local `/api/component-library/images` style URLs if that is the normalized source emitted by the repository.

Blocked first-pass URL shapes:

- `javascript:`, `data:`, and malformed URLs.
- Category fallback URLs from `getComponentImageUrl`.
- External arbitrary supplier/tracking URLs unless a separate CSP, privacy, and performance decision allows them.
- Full-size image blobs, base64 payloads, or detail graphs in the lite library query.

Recommended image element attributes:

```tsx
<img
  src={thumbnailUrl}
  width={24}
  height={24}
  loading="lazy"
  decoding="async"
  fetchPriority="low"
  alt=""
  aria-hidden="true"
  data-component-library-row-thumbnail=""
/>
```

Reserve identical dimensions for image and placeholder so image load/error cannot change row height.

## Performance Budget

| Budget | Target |
| --- | --- |
| Initial estimate route render | 0 thumbnail image requests before sidebar library lazy query resolves |
| Sidebar open | Image candidates bounded by mounted component rows plus virtual overscan, not total catalog size |
| Typical 480px virtualized viewport | About 35 row candidates maximum at 28px row estimate and overscan 8, often fewer because folder rows have no thumbnails |
| Thumbnail encoded size | Prefer 48px to 64px physical assets; target <= 8 KB each, hard ceiling 15 KB |
| Decoded memory | 64px square RGBA is about 16 KB; 40 mounted images stay under 1 MB decoded |
| Fallback imagery | 0 category/Unsplash fallback requests from virtualized rows |
| Query payload | No binary/base64/full image detail expansion in `loadProjectComponentLibraryLite` |
| Browser proof | Required only if final CSS changes row height, focus rings, hover rails, or responsive clipping |

Native lazy loading is sufficient for the first implementation because virtualization already bounds mounted DOM. If scroll testing shows request bursts, add a tiny row-thumbnail load gate using the tree scroll element as the observer root before adding any global image queue.

## Blast Radius

| Surface | Intended change | Risk |
| --- | --- | --- |
| `src/components/workshop/component-library/tree/LibraryTree.tsx` | Add opt-in thumbnail rendering for component leaves only. | Main implementation surface; can affect drag row layout. |
| `src/components/workshop/component-library/tree/thumbnail.ts` or local helper | Add strict row-thumbnail URL policy. | Keep row-list URL rules separate from card/preview fallback behavior. |
| `src/components/workshop/component-library/helpers.ts` | No first-pass change. | This file owns broader card/search helpers and should not absorb row-list-only URL policy. |
| `src/components/ui/tree.tsx` | No first-pass change. | Shared tree geometry should stay stable. |
| `src/lib/workshop/virtualization-flags.ts` | No first-pass change with 24px thumbnail. | Changing global estimate height would affect all workshop tree consumers. |
| `src/lib/repositories/component-library-repository.ts` | No first-pass change if `imageUrl` is present in lite data. | Only touch if a test proves lite loader lacks thumbnail URLs. |
| `src/components/workshop/component-library/ComponentCard.tsx` | No change. | Existing card fallback imagery can stay card-only. |
| `src/components/workshop/component-library-manager/ComponentLibraryManager.tsx` | Reference safe-source patterns only. | Avoid duplicating large image logic into the tree. |
| `src/components/workshop/component-library-manager/LibraryFolderTree.tsx` | No first-pass thumbnail rollout. | Confirm default `LibraryTree` rendering remains text-only unless explicitly enabled. |
| `src/components/workshop/library/template-editor/TemplateEditorClient.tsx` | No first-pass thumbnail rollout. | Confirm embedded library tree behavior remains unchanged unless explicitly enabled later. |
| `tests/vitest/component-library-ui.test.tsx` | Add row order, fallback, accessibility, and drag regression tests. | Best focused DOM coverage home. |
| `tests/vitest/ui-tree.test.tsx` or new sidebar thumbnail test | Add virtual mounted-count guard. | Proves no all-list thumbnail instantiation. |
| `tests/vitest/estimate-sheet-library-lazy-load.test.tsx` | Keep/extend lazy-load guard. | Proves route payload and initial render stay lean. |

## Implementation Units

### U1. Lock Row Thumbnail Rendering Contract

Files:

- Modify: `tests/vitest/component-library-ui.test.tsx`

- [ ] **Step 1: Add a failing row-order test.**

Add a component item with `imageUrl: "/api/component-library/images?path=thumbs/door.webp"` to the existing library tree test fixture and render the tree with the sidebar thumbnail option enabled. Assert that the row contains `[data-component-library-row-thumbnail]` after the shared tree icon and before `[data-component-library-tree-label]`.

Expected assertion shape:

```tsx
const row = screen.getByRole("treeitem", { name: /door/i });
const thumb = within(row).getByTestId("component-library-row-thumbnail");
const label = row.querySelector("[data-component-library-tree-label]");

expect(label).not.toBeNull();
expect(thumb.compareDocumentPosition(label)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
```

`LibraryItemRowContent` is rendered after the shared tree icon by the `Tree`
shell, so this test should not add a tree-icon test id just to inspect the
generic tree internals. It is enough to prove the row-label slot starts with the
thumbnail before the title.

- [ ] **Step 2: Run the focused test and confirm it fails.**

```bash
bunx vitest run tests/vitest/component-library-ui.test.tsx --maxWorkers=1
```

Expected: fails because the thumbnail test cannot find `component-library-row-thumbnail`.

- [ ] **Step 3: Add an opt-in boundary test.**

Render `LibraryTree` without the sidebar thumbnail option and assert
`queryByTestId("component-library-row-thumbnail")` is absent. Then render the
same fixture with `showThumbnails` enabled and assert the thumbnail appears.

### U2. Add Strict Row Thumbnail Helper

Files:

- Modify: `src/components/workshop/component-library/tree/LibraryTree.tsx`
- Optional create: `src/components/workshop/component-library/tree/thumbnail.ts`

- [ ] **Step 1: Add helper logic that accepts stored thumbnail URLs only.**

Recommended local shape:

```tsx
const COMPONENT_IMAGE_STORAGE_PREFIX = "/storage/v1/object/public/component-images/";

function getConfiguredSupabaseHost(): string | null {
  const rawSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  if (!rawSupabaseUrl) {
    return null;
  }
  try {
    return new URL(rawSupabaseUrl).hostname;
  } catch {
    return null;
  }
}

const configuredSupabaseHost = getConfiguredSupabaseHost();

function getComponentRowThumbnailUrl(item: EstimateRowItem): string | null {
  const raw = typeof item.imageUrl === "string" ? item.imageUrl.trim() : "";
  if (!raw) {
    return null;
  }
  if (raw.startsWith("/") && !raw.startsWith("//")) {
    return raw;
  }
  try {
    const parsed = new URL(raw);
    if (parsed.protocol !== "https:") {
      return null;
    }
    if (!configuredSupabaseHost || parsed.hostname !== configuredSupabaseHost) {
      return null;
    }
    if (!parsed.pathname.startsWith(COMPONENT_IMAGE_STORAGE_PREFIX)) {
      return null;
    }
    if (parsed.search || parsed.hash) {
      return null;
    }
    return parsed.toString();
  } catch {
    return null;
  }
  return null;
}
```

Keep this stricter than `getComponentImageUrl(item)`. Do not introduce category fallback URLs into this helper, and do not accept arbitrary `*.supabase.co` URLs outside the configured project/storage path.

- [ ] **Step 2: Add a source guard test.**

Add a static test or focused unit test proving the row thumbnail path does not import or call `getComponentImageUrl`.

Expected command:

```bash
rg -n "getComponentImageUrl" src/components/workshop/component-library/tree/LibraryTree.tsx
```

Expected: no matches after implementation.

- [ ] **Step 3: Add URL policy tests.**

Cover all of these cases:

- allowed relative `/api/component-library/images?path=thumbs/door.webp`,
- allowed configured Supabase component-image storage URL,
- rejected unrelated Supabase project URL,
- rejected configured Supabase URL outside `component-images`,
- rejected arbitrary external `https://example.com/thumb.webp`,
- rejected protocol-relative `//example.com/thumb.webp`,
- rejected `javascript:` and `data:` URLs,
- rejected malformed URL strings.

### U3. Render The Decorative Thumbnail

Files:

- Modify: `src/components/workshop/component-library/tree/LibraryTree.tsx`

- [ ] **Step 1: Add a small thumbnail component.**

Recommended shape:

```tsx
function LibraryTree(...) {
  const failedThumbnailUrlsRef = useRef(new Set<string>());

  // Pass failedThumbnailUrlsRef to row rendering so failures are remembered only
  // for the current mounted tree/dataset.
}

function ComponentRowThumbnail({
  item,
  failedUrlsRef,
}: {
  item: EstimateRowItem;
  failedUrlsRef: React.MutableRefObject<Set<string>>;
}) {
  const thumbnailUrl = getComponentRowThumbnailUrl(item);
  const [failed, setFailed] = useState(() =>
    thumbnailUrl ? failedUrlsRef.current.has(thumbnailUrl) : false,
  );
  const visibleThumbnailUrl = failed ? null : thumbnailUrl;

  if (!visibleThumbnailUrl) {
    return (
      <span
        aria-hidden="true"
        data-component-library-row-thumbnail=""
        data-testid="component-library-row-thumbnail"
        data-thumbnail-state="placeholder"
        className="flex size-6 shrink-0 items-center justify-center rounded bg-muted text-muted-foreground"
      >
        <Package className="size-3" />
      </span>
    );
  }

  return (
    <img
      src={visibleThumbnailUrl}
      alt=""
      aria-hidden="true"
      width={24}
      height={24}
      loading="lazy"
      decoding="async"
      fetchPriority="low"
      data-component-library-row-thumbnail=""
      data-testid="component-library-row-thumbnail"
      data-thumbnail-state="image"
      className="size-6 shrink-0 rounded object-cover"
      onError={() => {
        failedUrlsRef.current.add(visibleThumbnailUrl);
        setFailed(true);
      }}
    />
  );
}
```

This component is intentionally decorative. It must not add a button, link, tooltip-only label, or independent drag handle.

- [ ] **Step 2: Insert it inside `LibraryItemRowContent` for component items.**

Place `<ComponentRowThumbnail item={item} failedUrlsRef={failedThumbnailUrlsRef} />` before the current label column and after the shared tree icon boundary created by `Tree`.

- [ ] **Step 3: Preserve truncation and price alignment.**

Keep the existing label column `min-w-0`, price column `shrink-0`, and add-action behavior. Do not widen the row enough to hide the add button.

### U4. Lock Fallback, Accessibility, And Drag Behavior

Files:

- Modify: `tests/vitest/component-library-ui.test.tsx`

- [ ] **Step 1: Add missing-image fallback test.**

Render a component without `imageUrl`. Assert the thumbnail node exists with `data-thumbnail-state="placeholder"`.

- [ ] **Step 2: Add broken-image fallback test.**

Render a component with an allowed but broken thumbnail URL. Fire the image `error` event and assert state swaps to placeholder without removing the row.

- [ ] **Step 3: Add accessibility test.**

Assert the row is still found by component title and the image has `alt=""` plus `aria-hidden="true"`.

- [ ] **Step 4: Add drag payload regression.**

Start dragging a thumbnail-backed row and assert the payload still uses `application/x-archestimator-library-item` and the same plain-text title behavior as before.

- [ ] **Step 5: Add lazy-image attribute test.**

For an image-backed row, assert the rendered `<img>` has fixed dimensions,
`loading="lazy"`, `decoding="async"`, `fetchpriority="low"`, `alt=""`, and
`aria-hidden="true"`.

### U5. Lock Virtualization And Lazy-Load Bounds

Files:

- Modify: `tests/vitest/component-library-ui.test.tsx`
- Or create: `tests/vitest/component-library-sidebar-thumbnails.test.tsx`
- Optional modify: `tests/vitest/estimate-sheet-library-lazy-load.test.tsx`

- [ ] **Step 1: Add large-list virtualized thumbnail test.**

Render at least 200 image-backed components with tree virtualization active. Assert `[data-tree-virtualizer]` exists and the thumbnail count is less than the total component count.

Expected assertion shape:

```tsx
const virtualizer = document.querySelector("[data-tree-virtualizer]") as HTMLElement;
const mountedCount = Number(virtualizer.getAttribute("data-tree-virtual-mounted-count"));
const thumbnails = screen.getAllByTestId("component-library-row-thumbnail");
const imageThumbnails = document.querySelectorAll<HTMLImageElement>(
  "img[data-component-library-row-thumbnail]",
);

expect(thumbnails.length).toBeLessThan(200);
expect(thumbnails.length).toBeLessThanOrEqual(mountedCount);
for (const image of imageThumbnails) {
  expect(image).toHaveAttribute("loading", "lazy");
  expect(image).toHaveAttribute("decoding", "async");
  expect(image).toHaveAttribute("fetchpriority", "low");
}
```

- [ ] **Step 2: Add non-virtualized small-list guard.**

Render fewer than 150 image-backed components so the shared tree does not use
virtualization. Assert no `[data-tree-virtualizer]` exists, every thumbnail
image still uses lazy/async/low-priority attributes, and no test-side code adds
preload links for thumbnails.

- [ ] **Step 3: Preserve sidebar lazy-load proof.**

Run the existing lazy-load test and extend it only if thumbnail implementation changes the loader or repository projection.

```bash
bunx vitest run tests/vitest/estimate-sheet-library-lazy-load.test.tsx --maxWorkers=1
```

Expected: still proves the estimate route does not server-render the component library catalog.

### U6. Verification Pass

Run the focused checks:

```bash
bunx vitest run tests/vitest/component-library-ui.test.tsx tests/vitest/ui-tree.test.tsx --maxWorkers=1
```

```bash
bunx vitest run tests/vitest/estimate-sheet-library-lazy-load.test.tsx tests/vitest/estimate-component-drag.test.tsx tests/vitest/estimate-sheet-library-insert.test.tsx --maxWorkers=1
```

```bash
bun run type-check
git diff --check
```

```bash
rg -n "getComponentImageUrl" src/components/workshop/component-library/tree/LibraryTree.tsx src/components/workshop/component-library/tree/thumbnail.ts
```

Expected: no matches. If `thumbnail.ts` is not created, omit that path and keep
the `LibraryTree.tsx` guard.

Run browser proof only if the final implementation changes row height, focus/hover rails, responsive sidebar clipping, or drag affordances. The browser-only claim would be: icon, square thumbnail, title, price, add button, drag affordance, and focus ring do not overlap in the real right sidebar at desktop and narrow widths.

## UltraQA Scenario Matrix

| Scenario | Expected proof | Risk |
| --- | --- | --- |
| 200+ image-backed components | Mounted thumbnail count is bounded by virtual mounted rows. | High |
| Search expands many matches | Thumbnail count remains tied to rendered rows, not filtered result count. | High |
| Missing image URL | Placeholder reserves the same 24px square. | Medium |
| Broken thumbnail URL | Error state swaps to placeholder and row stays draggable/addable. | Medium |
| Invalid URL | No `<img src>` is emitted; placeholder renders. | High |
| Disallowed Supabase or external URL | Placeholder renders and no arbitrary remote image URL reaches the DOM. | High |
| External category fallback | Static guard proves row helper does not call `getComponentImageUrl`. | High |
| Non-virtualized list below 150 rows | Lazy/async/low-priority attributes are present and no preload loop exists. | Medium |
| Drag row with thumbnail | Existing drag payload and target insert behavior remain unchanged. | High |
| Keyboard navigation | `treeitem` accessible name and action reachability remain unchanged. | Medium |
| Sidebar closed on initial route | 0 thumbnail requests before lazy library query. | High |

## Non-Goals

- No command-palette thumbnails in this pass.
- No reusable project-source image metadata in this pass.
- No template payload changes.
- No upload/storage schema migration.
- No private project-image rendering contract.
- No publication/shared-link image normalization changes.
- No generic `Tree` API redesign.
- No expansion of arbitrary remote image domains.

## Follow-Up Staffing Guidance

Recommended execution lanes:

- `executor`: implement `LibraryTree` opt-in row helper and thumbnail component.
- `test-engineer`: add DOM, drag, accessibility, lazy-load, and virtualization tests.
- `ce-performance-reviewer`: review request bounds and row-height assumptions after implementation.
- `code-reviewer` plus `architect`: final independent review before treating the change as complete.

Use `$ultragoal` to own durable completion evidence if this becomes an implementation goal. Use `$team` or native parallel agents if implementation and tests are split across disjoint files. A single `$ralph`-style lane is only necessary if the implementation gets blocked by flaky DOM tests or row-geometry regressions that need repeated fix/verify loops.

## ADR

**Decision:** Add 24px decorative thumbnails to component leaf rows in the estimate-sheet right-sidebar `LibraryTree` path, using an opt-in `LibraryTree` prop, existing `EstimateRowItem.imageUrl` data, and a row-specific safe thumbnail helper.

**Drivers:** Preserve the current right-sidebar UI density, avoid all-list image fetches, keep component taxonomy simple, and avoid schema churn.

**Alternatives considered:**

- Use `getComponentImageUrl(item)` directly. Rejected because it can fall back to large category imagery and arbitrary external URLs.
- Add thumbnails to shared `Tree` as a generic icon slot. Rejected because this is component-library-specific presentation and would enlarge shared-tree blast radius.
- Add thumbnails to every `LibraryTree` consumer by default. Rejected because it couples a sidebar polish feature to library-manager and template-editor surfaces.
- Use 32px thumbnails immediately. Rejected for first pass because it likely needs a row-height and skeleton adjustment. It can be revisited with browser proof.
- Use Next `Image` for all rows. Rejected for first pass because allowed-domain/proxy handling adds complexity; plain `<img>` with safe URLs is enough for tiny stored thumbnails.

**Consequences:**

- Component rows gain visual scannability with minimal layout change.
- Missing thumbnails show a neutral placeholder rather than category photos.
- Virtualized row image requests remain bounded by mounted rows and browser lazy loading.
- Non-sidebar `LibraryTree` consumers stay unchanged unless they intentionally opt in later.
- A later larger-thumbnail visual pass must explicitly adjust local virtualization estimates and skeleton height.

**Follow-ups:**

- If stored thumbnails are missing for many real components, add a separate image-generation/backfill plan that produces 48px to 64px thumbnail assets.
- If external supplier images become a product requirement, add a separate security/performance decision for allowed domains, referrer policy, and CDN transformation.
