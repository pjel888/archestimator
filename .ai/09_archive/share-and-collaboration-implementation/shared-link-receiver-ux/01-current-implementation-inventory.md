# 01 - Current Implementation Inventory

## Route Entry

| Surface | File | Notes |
| --- | --- | --- |
| Public receiver route | `src/app/share/[token]/page.tsx` | Server component route, `dynamic = "force-dynamic"` |
| Password gate | `src/app/share/[token]/page.tsx`, `ProjectPublicationPasswordForm.tsx` | Password cookie gated before snapshot load |
| Metadata | `generateMetadata` in `src/app/share/[token]/page.tsx` | Uses publication snapshot title/description |

The rendered receiver shell is created by `ProjectPublicationView` in `src/app/share/[token]/page.tsx:53`. The content cap and header use `mx-auto max-w-7xl` at `page.tsx:64` and `page.tsx:69`.

## Server Data Flow

1. Resolve token through `resolveProjectPublicationAccessByToken(token)`.
2. If password protected, validate `createPublicationAccessCookieName(token)` with `verifyPublicationAccessCookieValue`.
3. If `?recipient=` is present, validate with `verifySharedLinkRecipientToken`.
4. Set HttpOnly recipient session cookie plus non-secret client `_ok` flag.
5. Load immutable snapshot through `resolveProjectPublicationSnapshotByToken(token)`.
6. Record an `open` event with `recordProjectPublicationEvent`.
7. Render `ProjectPublicationView`.

**Current link-generation mismatch:** `src/lib/publication/actions.ts` currently appends `?rt=` in recipient email links, while this route reads `?recipient=`. The combined implementation plan treats this as Wave 2 safety/data work before recipient identity, comments/decisions from emailed links, or per-recipient tracking.

## Client Component Tree

```text
ProjectPublicationView
  SharePageSessionBanner
  header with ArchestimatorLogo and View-only badge
  project metadata block
  SharePageHero
  desktop/mobile content layout
    SharePageTabs
      active estimate summary
      CostDonutChart compact
      sheet tablist
      view mode tablist
      Grid Preview table OR Tree View
        ShareEstimateTreePanel
        ShareEstimateTreeView
    SharePageDecision
    SharePageComments
```

## Important Client Files

| File | Role | Current risk for future UI work |
| --- | --- | --- |
| `src/components/share/SharePageTabs.tsx` | Main estimate receiver orchestrator | High, because chart, tabs, grid, tree, and state are all here |
| `src/components/share/ShareEstimateTreePanel.tsx` | Desktop search/navigation tree panel | Medium, fixed width and repeated tree concepts |
| `src/components/share/ShareEstimateTreeView.tsx` | Main read-only hierarchy render | Medium, row density and mobile expansion drive usability |
| `src/components/share/SharePageDecision.tsx` | Recipient decision actions | Medium, session-gated and security-sensitive |
| `src/components/share/SharePageComments.tsx` | Recipient comments and offline queue | Medium, session-gated and API-backed |
| `src/components/share/SharePageHero.tsx` | Optional cover image | Low, but large first-screen impact |
| `src/components/share/ShareFloatingTreeNav.tsx` | Scrollspy nav component | Medium, exists but is not wired into current route |
| `src/hooks/use-shared-link-session.ts` | Client session flag | Medium, used by comments/decision/banner |

## Snapshot Data Model

The publication snapshot type already supports:

- Project metadata and optional cover image.
- Estimate sheets.
- Flat rows.
- Optional row image URL.
- Optional row `nodeId`.
- Optional estimate `treeNodes`.

Relevant source:

- `src/lib/publication/types.ts:27` defines `PublicationSnapshotTreeNode`.
- `src/lib/publication/types.ts:34` defines `PublicationSnapshotRow`.
- `src/lib/publication/types.ts:52` defines `PublicationSnapshotEstimate`.
- `src/lib/publication/snapshot.ts:80` builds snapshot tree nodes.
- `src/lib/share/reconstruct-share-tree.ts:327` defines `getBestShareTree`, but current `SharePageTabs` uses `reconstructTreeFromRows` directly.

## Public API Surface

| Route | Purpose |
| --- | --- |
| `/api/share/[token]` | Snapshot JSON |
| `/api/share/[token]/password` | Password unlock |
| `/api/share/[token]/comment` | Session-gated comments |
| `/api/share/[token]/decision` | Session-gated response |
| `/api/share/[token]/activity` | Activity feed route |
| `/api/share/[token]/events` | Public event recording |

## Test Coverage Inventory

| Test file | Coverage |
| --- | --- |
| `tests/vitest/project-publication-page.test.tsx` | Page rendering, password gate, tabs, metadata, hero/images |
| `tests/vitest/project-publication-comments.test.tsx` | Comments UI, retry, circuit behavior |
| `tests/vitest/project-publication-decision.test.tsx` | Decision UI/API behavior |
| `tests/vitest/project-publication-route.test.ts` | Snapshot/password/event routes |
| `tests/vitest/project-publication-security-headers.test.ts` | Share route security headers |
| `tests/vitest/share/reconstruct-share-tree.test.ts` | Reconstruction, fallback, XSS safety |
| `e2e/shared-link-receiver.spec.ts` | E2E scenarios, skipped unless `ARCHESTIMATOR_E2E_SHARED_LINK=1` |

## Current Missing Route Files

`src/app/share/[token]/` currently contains only `page.tsx`. There is no route-local `loading.tsx` or `error.tsx`, so future layout work should plan explicit loading/error treatment if the route shell becomes more interactive or if snapshot fetch paths are split.
