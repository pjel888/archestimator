# 10 — Blast Radius and Dependencies

## Direct impact

| Area | Path | Impact | Classification |
|---|---|---|---|
| Workshop gate layout | `src/app/workshop/layout.tsx` | Add chrome rendering; (Phase 2) move uncached reads | Required change |
| New shell component | `src/components/workshop/WorkshopShell.tsx` (new) | Persistent chrome | Required change (Phase 1) |
| Page shell | `src/components/workshop/WorkshopPageShell.tsx` | Refactor to content-only (or retire for top-level pages) | Required change |
| Loading shell | `src/components/workshop/StaticWorkshopLoadingShell.tsx` | Reduce to content skeleton | Required change |
| Top-level workshop pages | `workshop/page.tsx`, `proposals/page.tsx`, `projects/page.tsx`, `publisher/page.tsx`, `settings/page.tsx`, `onboarding/page.tsx`, `feedback/`, `components/`, `templates/`, `terms/` | Stop wrapping in full shell; render content | Required change |
| Top-level loading files | `workshop/loading.tsx`, `proposals/loading.tsx`, `projects/loading.tsx`, `settings/loading.tsx`, `onboarding/loading.tsx` | Content-only skeletons | Required change |
| Nested layouts (already correct) | `library/layout.tsx`, `projects/[projectId]/layout.tsx` | Reconcile to avoid double-wrap | Required change (verification-heavy) |
| Sidebar | `src/components/sidebar/MainSidebar.tsx` | Unchanged structurally (benefits from not remounting) | Verification only |
| Config | `next.config.ts` | Phase 4 only (optional) | Possible change |

## Transitive impact
- **`WorkshopTitleHeader` / breadcrumbs / actions** (`WorkshopNotificationEntry`, `WorkshopSettingsModal`): currently rendered by `WorkshopPageShell`; must be placed by the new `WorkshopShell` OR remain page-supplied via a slot. (Phase 1 design decision.)
- **`RouteLoadingOverlay`** (`route-loading-overlay.tsx`): unaffected (queries `[data-workshop-page-shell-root]` — that attribute must remain on the persistent shell element).
- **`react-complex-tree` CSS import** in `workshop/layout.tsx`: stays.
- **Sidebar-width cookie reads** (`getSidePanelWidthCssVariables`): currently in `WorkshopPageShell`; moves to `WorkshopShell`.
- **TanStack Query favorites seeding** (`useSidebarFavoritesQuery` initialData): stays; benefits from stable instance.
- **`WebVitalsProbe`**: stays in shell.

## Affected tests / docs
- Existing workshop route/integration tests: verify they still pass after shell restructuring (some may query `WorkshopPageShell`).
- `DESIGN.md`: alpha-stage; not law — no design-system blocker.
- `.ai/10_state/current-state.md`: DOC-1 update.

## Explicitly unaffected
- Marketing routes, `/share`, `/invite`, `/login`, `/signup`, `/auth`, `/api/*`.
- `src/middleware.ts`, `src/lib/auth/request-proxy.ts` (auth-gate logic).
- All D1/R2/DO/Queue/Email/migrations/wrangler.
- `src/app/providers.tsx` providers (unchanged).
- `next.config.ts` `staleTimes` (unchanged through Phase 3).

## Compatibility / backward-compat
- No URL changes (ARCH-1). No public API changes. No DB changes. The change is purely client-render structure within the existing route tree.
- Risk surface is the visual/interaction parity of the workshop chrome after restructuring — addressed by PERF-1 + manual nav matrix.
