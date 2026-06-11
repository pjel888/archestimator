# 01 — Rendering Path Audit

**Date**: 2026-06-11 | **Status**: Source-audited; runtime measurement pending | **Prior Oracle**: 6 passes | **Last Update**: 2026-06-11 02:42 UTC
**Path**: `/` -> `/workshop/projects/[projectId]/estimates/[nodeId]`

---

## Key Takeaways

1. **66+ components in the full path** (31 landing + 35 workshop) — high hydration cost. Landing page loads 27KB of CSS unnecessary for workshop pages.
2. **3 Suspense boundaries** — at project layout, workshop shell, and dynamic imports. Well-structured progressive rendering.
3. **Dynamic imports for tree and sheet content** — prevents blocking initial paint. Good pattern.
4. **Route parameter resolution is dual-path** — the route segment is `[nodeId]`; repository fallback treats a non-node UUID as an estimate ID. Adds a fallback query when the UUID is not a node.
5. **WorkshopPageShell renders all chrome** (sidebar, header, footer, modals, copilot button) regardless of whether they're visible or used.

---

## 1. Proxy (`src/proxy.ts`) & Auth Gates

### Entry Point: `src/proxy.ts`
Every request matching `config.matcher` passes through the proxy. For `/workshop/*` paths:

1. **Session Validation**: `supabase.auth.getUser()` — secure HTTP round-trip to Supabase Auth (NOT `getSession()`)
2. **Auth Redirect**: If no user → `redirect("/login?next=[sanitizedPath]")`
3. **Closed Beta Check**: If user → check `closed_beta_users` table → redirect to `/beta/access-required` if denied
4. **Cache Headers**: Sets `Cache-Control: private, no-cache, no-store, max-age=0, must-revalidate` for protected routes

### Workshop Layout Gate: `src/app/workshop/layout.tsx`
1. **Terms Acceptance**: `getCurrentUserTermsAcceptanceStatus()` → redirect to `/workshop/terms` if not accepted
2. **User Context**: `getCurrentUserContext()` → fetches user + profile + beta status

### Performance Impact
- Proxy (`src/proxy.ts`) adds ~50-150ms per request (Supabase Auth round-trip)
- Workshop layout adds ~30-80ms (profile + terms check queries)
- Total auth overhead before first byte: **~80-230ms**

---

## 2. Complete Component Hierarchy

```
[Server] RootLayout (src/app/layout.tsx)
├── Inter + Roboto_Mono fonts (next/font/google)
├── VercelWebAnalytics (src/components/analytics/VercelWebAnalytics.tsx)
└── [Client] AppProviders (src/app/providers.tsx)
    ├── QueryClientProvider (@tanstack/react-query)
    ├── ToastProvider (src/components/ui/toast.tsx)
    ├── NotificationProvider (src/features/notifications/components/NotificationProvider.tsx)
    │   └── ReleaseAnnouncementModal
    ├── BfcacheHandler (src/components/bfcache-handler.tsx)
    ├── PerformanceMonitor (src/components/performance-monitor.tsx)
    ├── NavigationListener (src/components/navigation-listener.tsx)
    ├── RouteLoadingOverlay (src/components/ui/route-loading-overlay.tsx)
    └── [Server] WorkshopLayout (src/app/workshop/layout.tsx)
        └── [Server] ProjectLayout (src/app/workshop/projects/[projectId]/layout.tsx)
            └── [Server] WorkshopPageShell (src/components/workshop/WorkshopPageShell.tsx)
                ├── [Client] MainSidebar
                ├── [Client] WorkshopTitleHeader
                │   ├── ProjectEstimateMetadataStrip
                │   ├── ProjectPublicationHeader
                │   │   ├── Modal, SharedLinkActivityFeed, RecipientEmailComposer
                │   ├── ProjectTeamspaceHeader
                │   ├── WorkshopNotificationEntry
                │   └── WorkshopSettingsModal
                ├── [Suspense boundary 1] fallback: WorkshopShellContentFallback
                │   ├── [Client] ProjectMiniSidebar
                │   └── [Suspense boundary 2] fallback: ProjectRouteContentFallback
                │       └── [Server] ProjectEstimateNodePage (src/app/workshop/projects/[projectId]/estimates/[nodeId]/page.tsx)
                │           ├── ProjectEstimateMetadataPublisher
                │           └── [Client] EstimateWorkspaceClient
                │               ├── [Dynamic import] EstimateSheetTree (fallback: EstimateTreeFallback)
                │               │   ├── ResizableSidePanel, TreePanelHeader, Tree, ContextMenu, BulkActionToolbar
                │               └── [Dynamic import] EstimateSheetContent (fallback: EstimateContentFallback)
                │                   ├── EstimateSheetHeader, EstimateSheetBranch, EstimateRowItemsTable
                │                   ├── EstimateMaterialCell, EstimateDropZone
                │                   ├── RowDetailsModal, ActivityHistoryModal
                │                   ├── ProposalExportPreviewDialog
                │                   └── EstimateRightSidebar (component-library/index.tsx)
                ├── [Client] WorkshopFeedbackModal
                ├── [Client] ProjectTotalHeader
                └── [Client] AskFlipFooterAssistant
```

---

## 3. Render Depth & Component Count

| Metric | Value (measured) |
|--------|-----------------|
| **Total components in tree** | ~45+ (workshop path only), ~76+ (full path incl. landing) |
| **Client components** | ~35 (workshop), ~31 additional (landing) = ~66 total |
| **Server components** | ~10 |
| **Max render depth** | 8 levels |
| **Suspense boundaries** | 3 |
| **Dynamic imports** | 3 (`EstimateSheetTree`, `EstimateSheetContent`, `AddComponentModal`) |
| **Loading states** | 2 (`workshop/loading.tsx`, `estimates/loading.tsx`) |
| **Error boundaries** | 1 (`estimates/[nodeId]/error.tsx`) |
| **Workshop components total lines** | **15,064** (measured) |
| **Landing components total lines** | **3,597** (measured) |
| **Largest component** | `EstimateSheetContent.tsx`: **4,336 lines** in current worktree snapshot |
| **Second largest** | `AnimatedProposalRecordSection.tsx`: **834 lines** (measured) |
| **Landing page components** | **31** files (measured) |
| **Hooks in EstimateSheetContent** | Current snapshot occurrences: 14 `useEffect`, 23 `useMemo`, 33 `useState`, 32 `useCallback`, 7 `useRef`; no `useDeferredValue`, `useOptimistic`, or `useTransition` |

---

## 4. Suspense & Loading Architecture

### Loading States
| File | Renders | Trigger |
|------|---------|---------|
| `src/app/workshop/loading.tsx` | `StaticWorkshopLoadingShell` | Workshop segment loading |
| `src/app/workshop/projects/[projectId]/estimates/loading.tsx` | `ProjectRouteContentFallback` | Estimate segment loading |

### Suspense Boundaries
| Location | Fallback | Wraps |
|----------|----------|-------|
| `WorkshopPageShell.tsx` | `<WorkshopShellContentFallback />` | Project sidebar + route content |
| `ProjectLayout` (`layout.tsx`) | `<ProjectRouteContentFallback />` | Page content (estimate sheet) |

### Dynamic Import Fallbacks
| Component | Fallback |
|-----------|----------|
| `EstimateSheetTree` | `<EstimateTreeFallback />` |
| `EstimateSheetContent` | `<EstimateContentFallback />` |

---

## 5. Route Parameter Resolution

The URL `/workshop/projects/22222222-2222-4222-8222-222222222222/estimates/77777777-7777-4777-8777-777777777720` resolves via `getProjectEstimateTreeByNode(projectId, nodeId)` in `src/lib/repositories/workspace-repository.ts:1640`:

1. Query `estimate_nodes` with `nodeId` — if found, load that node's estimate tree
2. If NOT found (nodeId is actually an estimateId), fallback to `getProjectEstimateTreeByEstimate(projectId, nodeId)` — treat `nodeId` as `estimateId`
3. This dual-resolution adds a potential extra query when `nodeId` is not a node UUID

---

## 6. Key Performance Observations

### Strengths
- Dynamic imports for `EstimateSheetTree` and `EstimateSheetContent` prevent blocking initial page shell paint
- Suspense boundaries at project and shell level allow progressive rendering
- `next/font/google` with `variable` option for font optimization
- `optimizePackageImports: ["@phosphor-icons/react"]` in next.config

### Weaknesses
- **35 client components** loaded — high hydration cost on initial load
- **4,336-line `EstimateSheetContent.tsx`** — monolithic component with no virtualization
- **Route parameter dual-resolution** adds fallback query overhead
- **No streaming** (React `renderToReadableStream`) configured for the estimate page
- **WorkshopPageShell** renders ALL sidebar/header/footer components regardless of whether they're visible
