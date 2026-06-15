# 10 — Skeleton Design System: Consistent Loading States

**Status:** New  
**Created:** 2026-05-29  
**Purpose:** Define a consistent skeleton UI system for all Suspense fallbacks and code-split loading states. Skeletons must match final layout dimensions to minimize CLS and provide a polished loading experience.

---

## Table of Contents

1. [Design Principles](#1-design-principles)
2. [Base Skeleton Primitives](#2-base-skeleton-primitives)
3. [Route-Specific Skeletons](#3-route-specific-skeletons)
4. [Code-Split Loading Skeletons](#4-code-split-loading-skeletons)
5. [Implementation Guidelines](#5-implementation-guidelines)

---

## 1. Design Principles

1. **Match final dimensions exactly.** Every skeleton block must have the same width, height, padding, and gap as the real content it replaces. This prevents Cumulative Layout Shift (CLS < 0.1).

2. **Use Tailwind `animate-pulse`** for the shimmer effect. Do not use custom CSS animations.

3. **Use `bg-muted`** (the project's existing muted background color) for skeleton blocks. Do not introduce new skeleton colors.

4. **Never use spinner-only skeletons.** A spinner inside a Suspense fallback does not prevent layout shift. Always use shaped blocks that approximate the real content.

5. **Respect `prefers-reduced-motion`.** The `animate-pulse` class already respects this via Tailwind's motion-reduce utilities.

6. **Mirror the layout structure.** If the real content has a sidebar + main area, the skeleton must have the same sidebar + main area structure.

7. **Use semantic structure.** Wrap skeletons in `<div aria-hidden="true" role="presentation">` so screen readers ignore them.

---

## 2. Base Skeleton Primitives

### 2.1 Text Line Skeleton

```tsx
function SkeletonLine({ className }: { className?: string }) {
  return <div className={`h-4 rounded bg-muted animate-pulse ${className}`} aria-hidden="true" />;
}
```

### 2.2 Block Skeleton

```tsx
function SkeletonBlock({ className }: { className?: string }) {
  return <div className={`rounded bg-muted animate-pulse ${className}`} aria-hidden="true" />;
}
```

### 2.3 Card Skeleton

```tsx
function SkeletonCard({ className }: { className?: string }) {
  return <div className={`h-48 rounded-lg bg-muted animate-pulse ${className}`} aria-hidden="true" />;
}
```

### 2.4 Tree Node Skeleton

```tsx
function TreeNodeSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="space-y-1 p-2" aria-hidden="true">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="h-6 rounded bg-muted animate-pulse" style={{ width: `${60 + Math.random() * 30}%` }} />
      ))}
    </div>
  );
}
```

### 2.5 Table Row Skeleton

```tsx
function TableRowSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="space-y-2 p-4" aria-hidden="true">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="h-10 rounded bg-muted animate-pulse" />
      ))}
    </div>
  );
}
```

---

## 3. Route-Specific Skeletons

### 3.1 Projects Grid Skeleton

**Matches:** `ProjectsPageClient` grid layout with project cards.

```tsx
export function ProjectsGridSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 p-6 sm:grid-cols-2 lg:grid-cols-3" aria-hidden="true">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="h-48 rounded-lg bg-muted animate-pulse" />
      ))}
    </div>
  );
}
```

### 3.2 Project Detail Skeleton

**Matches:** `ProjectDashboardClient` layout with header + stat cards.

```tsx
export function ProjectDetailSkeleton() {
  return (
    <div className="p-6 space-y-4" aria-hidden="true">
      <div className="h-8 w-64 rounded bg-muted animate-pulse" />
      <div className="h-4 w-48 rounded bg-muted animate-pulse" />
      <div className="grid grid-cols-3 gap-4 mt-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-32 rounded bg-muted animate-pulse" />
        ))}
      </div>
    </div>
  );
}
```

### 3.3 Project Header Skeleton

**Matches:** `ProjectWorkspaceHeaderRow` in the project layout.

```tsx
export function ProjectHeaderSkeleton() {
  return (
    <div className="flex items-center gap-4 border-b px-4 py-3" aria-hidden="true">
      <div className="h-5 w-32 rounded bg-muted animate-pulse" />
      <div className="h-5 w-24 rounded bg-muted animate-pulse" />
      <div className="ml-auto h-8 w-24 rounded bg-muted animate-pulse" />
    </div>
  );
}
```

### 3.4 Estimates Table Skeleton

**Matches:** `ProjectEstimatesTable` with TanStack Table rows.

```tsx
export function EstimatesTableSkeleton() {
  return (
    <div className="p-4 space-y-2" aria-hidden="true">
      <div className="flex gap-2 mb-4">
        <div className="h-8 w-32 rounded bg-muted animate-pulse" />
        <div className="h-8 w-24 rounded bg-muted animate-pulse" />
      </div>
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="h-10 rounded bg-muted animate-pulse" />
      ))}
    </div>
  );
}
```

### 3.5 Estimate Workspace Skeleton

**Matches:** `EstimateSheetTree` (sidebar) + `EstimateSheetContent` (main area).

```tsx
export function EstimateWorkspaceSkeleton() {
  return (
    <div className="flex h-full" aria-hidden="true">
      {/* Tree sidebar */}
      <div className="w-56 border-r p-2 space-y-1">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="h-6 rounded bg-muted animate-pulse" style={{ width: `${50 + Math.random() * 40}%` }} />
        ))}
      </div>
      {/* Main content */}
      <div className="flex-1 p-4 space-y-2">
        <div className="flex gap-2 mb-4">
          <div className="h-8 w-48 rounded bg-muted animate-pulse" />
          <div className="h-8 w-32 rounded bg-muted animate-pulse" />
        </div>
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="h-8 rounded bg-muted animate-pulse" />
        ))}
      </div>
    </div>
  );
}
```

### 3.6 Library Skeleton

**Matches:** `ComponentLibraryManager` with tree + center sheet.

```tsx
export function LibrarySkeleton() {
  return (
    <div className="flex h-full" aria-hidden="true">
      <div className="w-56 border-r p-2 space-y-1">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-6 rounded bg-muted animate-pulse" />
        ))}
      </div>
      <div className="flex-1 p-4 space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-24 rounded bg-muted animate-pulse" />
        ))}
      </div>
    </div>
  );
}
```

### 3.7 Charts Skeleton

**Matches:** `ProjectChartsClient` with chart panels.

```tsx
export function ChartSkeleton() {
  return (
    <div className="p-4 space-y-4" aria-hidden="true">
      <div className="h-8 w-48 rounded bg-muted animate-pulse" />
      <div className="grid grid-cols-2 gap-4">
        <div className="h-64 rounded bg-muted animate-pulse" />
        <div className="h-64 rounded bg-muted animate-pulse" />
      </div>
      <div className="h-48 rounded bg-muted animate-pulse" />
    </div>
  );
}
```

---

## 4. Code-Split Loading Skeletons

When using `next/dynamic`, provide a skeleton that approximates the component being loaded:

| Component | Lines | Dynamic Import Skeleton |
|-----------|-------|------------------------|
| `EstimateSheetContent` | ~4,048 | `<EstimateWorkspaceSkeleton />` (partial — tree loads separately) |
| `EstimateSheetTree` | 1,365 | `<TreeNodeSkeleton count={10} />` |
| `AddComponentModal` | ~2,354 | `<SkeletonBlock className="h-96 w-full" />` |
| `LibraryFolderTree` | ~1,172 | `<TreeNodeSkeleton count={8} />` |
| `ComponentLibraryManager` | 1,009 | `<LibrarySkeleton />` |
| `ProjectCostDonutChart` | ~130 | `<SkeletonBlock className="h-64 w-64 rounded-full" />` |
| `ProjectCostBubbleChart` | ~130 | `<SkeletonBlock className="h-64 w-full" />` |

---

## 5. Implementation Guidelines

### 5.1 File Organization

Create all skeleton components in a single file:

```
src/components/skeletons/index.tsx
```

Export all skeletons from this barrel. Import them in `loading.tsx` files and `dynamic()` calls.

### 5.2 Usage in `loading.tsx`

```tsx
// src/app/workshop/projects/loading.tsx
import { ProjectsGridSkeleton } from "@/components/skeletons";

export default function ProjectsLoading() {
  return <ProjectsGridSkeleton />;
}
```

### 5.3 Usage in `next/dynamic`

**⚠️ All code-splitting targets use NAMED exports. Use `.then(mod => mod.ComponentName)` pattern.** See `14-code-splitting-named-exports.md`.

```tsx
import dynamic from "next/dynamic";
import { EstimateWorkspaceSkeleton } from "@/components/skeletons";

const EstimateSheetContent = dynamic(
  () => import("@/components/workshop/EstimateSheetContent").then(mod => mod.EstimateSheetContent),
  { loading: () => <EstimateWorkspaceSkeleton /> }
);
```

### 5.4 Usage in Suspense Boundaries

```tsx
import { Suspense } from "react";
import { ProjectsGridSkeleton } from "@/components/skeletons";

export default async function ProjectsPage() {
  return (
    <WorkshopPageShell title="Projects">
      <Suspense fallback={<ProjectsGridSkeleton />}>
        <ProjectsPageContent />
      </Suspense>
    </WorkshopPageShell>
  );
}
```

---

**Next:** See `11-prefetch-wiring-map.md` for the exact prefetch hookup plan. See `33-loading-sequence-progressive-enhancement.md` for when skeletons appear in the user's click-to-interactive timeline.
