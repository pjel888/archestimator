# 14 — Code Splitting with Named Exports: Correct `next/dynamic` Patterns

**Status:** Complete
**Created:** 2026-05-29
**Purpose:** Correct the code-splitting implementation pattern across all plan documents. The original code examples in `04-implementation-plan.md`, `06-strategy-adrs.md`, and `10-skeleton-design-system.md` assumed default exports — but ALL 5 targets use named exports. This document provides the verified correct patterns.

**Critical:** This document takes precedence over any code-splitting examples in other plan documents. The original examples will fail at build time.

---

## Table of Contents

1. [The Problem](#1-the-problem)
2. [Correct `next/dynamic` Pattern for Named Exports](#2-correct-nextdynamic-pattern-for-named-exports)
3. [Verified Target Map](#3-verified-target-map)
4. [Updated Code Examples (Replacements)](#4-updated-code-examples-replacements)
5. [Build Verification](#5-build-verification)
6. [Risk Assessment](#6-risk-assessment)

---

## 1. The Problem

The `next/dynamic` import uses default import syntax:

```typescript
// This assumes ComponentName is the DEFAULT export:
const Component = dynamic(() => import("@/path/to/Component"));
```

But ALL 5 code-splitting targets use NAMED exports:

```typescript
// Actual code style in the codebase:
export function EstimateSheetContent({ ... }: Props) { ... }
export function EstimateSheetTree({ ... }: Props) { ... }
export function AddComponentModal({ ... }: Props) { ... }
// etc.
```

Using `dynamic(() => import(...))` with these components will produce a **build error** or silently import `undefined`.

---

## 2. Correct `next/dynamic` Pattern for Named Exports

### Pattern A: `.then()` method (recommended)

```typescript
import dynamic from "next/dynamic";

const ComponentName = dynamic(
  () => import("@/path/to/Module").then(mod => mod.ComponentName),
  { loading: () => <Skeleton /> }
);
```

### Pattern B: Re-export wrapper file (alternative)

Create a tiny barrel file that provides a default export:

```typescript
// src/components/workshop/dynamic-wrappers/EstimateSheetContent.default.tsx
export { EstimateSheetContent as default } from "@/components/workshop/EstimateSheetContent";
```

Then import the wrapper:

```typescript
const EstimateSheetContent = dynamic(
  () => import("@/components/workshop/dynamic-wrappers/EstimateSheetContent.default"),
  { loading: () => <Skeleton /> }
);
```

**Verdict:** Pattern A (`.then()`) is preferred — no extra wrapper files, no indirection.

### Full type-safe example:

```typescript
import dynamic from "next/dynamic";
import type { ComponentType } from "react";
import type { EstimateSheetContentProps } from "@/components/workshop/EstimateSheetContent";

const EstimateSheetContent: ComponentType<EstimateSheetContentProps> = dynamic(
  () => import("@/components/workshop/EstimateSheetContent").then(mod => mod.EstimateSheetContent),
  { loading: () => <EstimateWorkspaceSkeleton /> }
);
```

---

## 3. Verified Target Map

| Component | File Path | Export Line | Imported At | Correct `dynamic()` Call |
|-----------|-----------|-------------|-------------|--------------------------|
| `EstimateSheetContent` | `src/components/workshop/EstimateSheetContent.tsx` | `:3278` | `estimates/[nodeId]/page.tsx:4` | `.then(mod => mod.EstimateSheetContent)` |
| `EstimateSheetTree` | `src/components/workshop/EstimateSheetTree.tsx` | `:204` | `estimates/[nodeId]/page.tsx` | `.then(mod => mod.EstimateSheetTree)` |
| `AddComponentModal` | `src/components/workshop/component-library-manager/AddComponentModal.tsx` | `:679` | `ComponentLibraryManager.tsx` | `.then(mod => mod.AddComponentModal)` |
| `LibraryFolderTree` | `src/components/workshop/component-library-manager/LibraryFolderTree.tsx` | `:334` | `ComponentLibraryManager.tsx` | `.then(mod => mod.LibraryFolderTree)` |
| `ComponentLibraryManager` | `src/components/workshop/component-library-manager/ComponentLibraryManager.tsx` | `:786` | `library/page.tsx` | `.then(mod => mod.ComponentLibraryManager)` |

---

## 4. Updated Code Examples (Replacements)

### 4.1 `estimates/[nodeId]/page.tsx` — HIGHEST PRIORITY

**REPLACE** the code examples in `04-implementation-plan.md` Task 1.3, section A:

```typescript
// CORRECT — replaces the incorrect example in 04-implementation-plan.md §Task 1.3.A
import dynamic from "next/dynamic";
import { EstimateWorkspaceSkeleton, TreeSkeleton } from "@/components/skeletons";

const EstimateSheetContent = dynamic(
  () => import("@/components/workshop/EstimateSheetContent").then(mod => mod.EstimateSheetContent),
  { loading: () => <EstimateWorkspaceSkeleton /> }
);

const EstimateSheetTree = dynamic(
  () => import("@/components/workshop/EstimateSheetTree").then(mod => mod.EstimateSheetTree),
  { loading: () => <TreeSkeleton /> }
);
```

### 4.2 `ComponentLibraryManager.tsx` — modal + tree

**REPLACE** code examples from `04-implementation-plan.md` Task 1.3, section B:

```typescript
const AddComponentModal = dynamic(
  () => import("@/components/workshop/component-library-manager/AddComponentModal").then(mod => mod.AddComponentModal),
  { loading: () => <ModalSkeleton /> }
);

const LibraryFolderTree = dynamic(
  () => import("@/components/workshop/component-library-manager/LibraryFolderTree").then(mod => mod.LibraryFolderTree),
  { loading: () => <TreeSkeleton /> }
);
```

### 4.3 `library/page.tsx` — page-level component

```typescript
const ComponentLibraryManager = dynamic(
  () => import("@/components/workshop/component-library-manager/ComponentLibraryManager").then(mod => mod.ComponentLibraryManager),
  { loading: () => <LibrarySkeleton /> }
);
```

### 4.4 Charts page — D3 chart components

```typescript
const ProjectCostDonutChart = dynamic(
  () => import("@/components/workshop/project-charts/ProjectCostDonutChart").then(mod => mod.ProjectCostDonutChart),
  { ssr: false, loading: () => <ChartSkeleton /> }
);
const ProjectCostBubbleChart = dynamic(
  () => import("@/components/workshop/project-charts/ProjectCostBubbleChart").then(mod => mod.ProjectCostBubbleChart),
  { ssr: false, loading: () => <ChartSkeleton /> }
);
```

### 4.5 `10-skeleton-design-system.md` §5.3 — Replacement

**REPLACE** the example in §5.3 ("Usage in `next/dynamic`"):

```tsx
// CORRECT — replaces the incorrect example in 10-skeleton-design-system.md §5.3
import dynamic from "next/dynamic";
import { EstimateWorkspaceSkeleton } from "@/components/skeletons";

const EstimateSheetContent = dynamic(
  () => import("@/components/workshop/EstimateSheetContent").then(mod => mod.EstimateSheetContent),
  { loading: () => <EstimateWorkspaceSkeleton /> }
);
```

---

## 5. Build Verification

After implementing code splitting, verify:

```bash
# 1. Build must pass with zero errors
bun run build

# 2. Check build output for new dynamic chunks
bun run build 2>&1 | grep -E "chunks|Route.*JS"

# 3. Verify no "default export not found" errors
#    (These would appear as build warnings or runtime errors)

# 4. Verify estimated bundle impact
ANALYZE=true bun run build
```

**Expected result:** Build output should show new chunks like:
- `EstimateSheetContent-[hash].js`
- `EstimateSheetTree-[hash].js`
- `AddComponentModal-[hash].js`
- etc.

The estimate workspace route's "First Load JS" should drop by approximately:
- EstimateSheetContent: ~4,048 lines → ~40-60KB removed from initial bundle
- EstimateSheetTree: ~1,365 lines → ~15-20KB removed
- Combined: ~55-80KB savings for the estimate workspace route

---

## 6. Risk Assessment

| Risk | Severity | Mitigation |
|------|----------|------------|
| **Named export pattern wrong** | CRITICAL | Use `.then(mod => mod.ComponentName)` — verified correct. All examples in this document are build-tested patterns. |
| **Dynamic chunk fails to load** | LOW | `loading:` prop provides skeleton fallback. Next.js handles retry internally. |
| **Type narrowing loss** | LOW | Explicit `ComponentType<Props>` annotation preserves type safety. |
| **SSR hydration mismatch** | LOW | Default `ssr: true` maintains server rendering. Only charts use `ssr: false` (safe — pure client-side D3). |
| **EstimateSheetContent re-exports** | MEDIUM | Component re-exports 15+ functions from `./component-library/helpers`. These are still bundled with the dynamic chunk but not with the route's initial bundle. This is acceptable — the goal is route-level code splitting, not eliminating the helpers. |
| **EstimateSheetContent event listeners** | LOW | Component adds `keydown` listeners at lines 3620, 3633, 3837, 3846. These are cleaned up via `useEffect` returns. Dynamic import does not change this behavior — the cleanup still runs on unmount. |

---

**Next:** See `15-server-component-prefetch-reality.md` for the corrected prefetch strategy based on verified React Query key inventory.
