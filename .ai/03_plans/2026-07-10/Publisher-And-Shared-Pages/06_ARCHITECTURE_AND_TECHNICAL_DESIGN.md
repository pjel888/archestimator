# 06 — Architecture And Technical Design

This document specifies the component, server-client boundary, state management,
and integration architecture for the redesigned Publisher and Shared Link surfaces.

## Architecture Principles

1. **Preserve the existing security/data model.** The token/password/cookie/CSRF/
   rate-limit architecture in `src/lib/publication/security.ts` and
   `public-repository.ts` is sound and stays unchanged in its contracts.
2. **Add a UX layer, don't restructure the backend.** Most improvements are
   component-level: new wizard, redesigned roster cards, improved share page
   components. Server actions and API routes keep their signatures (with targeted
   hardening additions).
3. **RSC-first.** Server components for data; minimal client islands for
   interactivity. The existing pattern (`page.tsx` RSC → stream client component)
   is preserved.
4. **URL state remains the source of truth** for publisher filters/drawer/wizard.
5. **TanStack Query** for client-side mutations and drawer/wizard data (existing
   pattern in `usePublisherDrawer`).

## Component Architecture

### Publisher — new component tree

```text
src/app/workshop/publisher/page.tsx (RSC)
  └─ <PublisherRosterClient> (existing, redesigned)
       ├─ <ShareWizard> (NEW — guided publish flow)
       │    ├─ <SheetSelectionStep>
       │    │    └─ <SheetPickerList> (existing, reused)
       │    ├─ <AccessSettingsStep> (password/expiry)
       │    ├─ <GenerateStep>
       │    └─ <SuccessStep>
       │         ├─ <ShareLinkDisplay> (NEW — URL + copy + QR)
       │         ├─ <RecipientEmailComposer> (EXISTING — reused, not reinvented)
       │         └─ <ClientPreviewLink> (NEW — preview as client)
       ├─ <PublisherRosterCard> (NEW — replaces PublisherRosterRow table layout)
       │    ├─ <ProposalStatusBadge>
       │    ├─ <ShareLinkDisplay> (compact variant — persistent link visibility per REQ-009)
       │    └─ <PublisherDrawer> (existing, for advanced management — NOT for primary publish/update)
       ├─ <PublisherRosterTable> (existing table, desktop-optional view)
       └─ <PublisherPagination> (NEW — working pagination)
```

### Shared link — improved component tree

```text
src/app/share/[token]/page.tsx (RSC, existing)
  └─ <ProjectPublicationView> (existing, modified)
       ├─ <SharePageRecipientSessionAlert> (existing)
       ├─ <SharePageSessionBanner> (FIX — actionable path)
       ├─ <ShareContainer> (existing)
       │    ├─ <SharePageProposalHeader> (FIX — dynamic status + sender branding)
       │    │    └─ <ProposalStatusBadge> (NEW)
       │    │    └─ <SenderBrandingHeader> (NEW)
       │    ├─ <SharePageSummaryCard> (FIX — add expiry)
       │    ├─ <SharePageHero> (FIX — cover fallback)
       │    │    └─ <CoverImagePlaceholder> (NEW)
       │    ├─ <ShareReviewWorkspace> (existing)
       │    │    ├─ <SharePageTabs> (FIX — terminology, row actions, mobile tree)
       │    │    ├─ <SharePageComments> (FIX — dates, author badges, page scroll)
       │    │    └─ <SharePageDecision> (FIX — sticky CTA)
       │    └─ <StickyDecisionBar> (NEW — desktop floating CTA)
       └─ <SharePrintButton> (NEW — visible Download PDF button)
```

## Server-Client Boundary

### Publisher wizard — server actions (existing, reused)

The wizard calls the **same server actions** as the current drawer:
- `republishProjectPublication({projectId, selectedEstimateIds, password?, expiresAt?, locationVisibility?})`
  — creates or updates the publication. Falls through to `createProjectPublication`
  if none exists (existing behavior, `actions.ts:878-886`).
- `addSharedLinkRecipients({publicationId, recipients, baseClientLink?})` — sends
  invitations (existing).
- `readPublisherPublicationDrawerData(projectId)` — loads summary + sheets +
  collaboration (existing).

**No new server actions needed for the wizard.** The wizard is a UI-layer
reorganization of existing action calls. The wizard reuses the existing
`RecipientEmailComposer` component (765 lines, already handles email chips,
send/resend/remove, delivery-readiness degradation) — it does NOT invent a new
`RecipientQuickAdd`.

### Wizard URL state — page.tsx ownership

The wizard opens via `?wizard=<projectId>&step=<n>` URL params. This requires
`src/app/workshop/publisher/page.tsx` to forward the wizard params to
`PublisherRosterClient` (or the client reads `useSearchParams()` directly). This
file is currently listed under "coordinate" in blast-radius. UNIT-011 owns this
specific `page.tsx` change (forwarding the `wizard`/`step` params). This is the
only modification to `page.tsx` — no data-fetching changes.

### Preview as client — new server action

```text
createClientPreviewSession(projectId)
  → assertProjectPublicationManager(projectId) [RBAC]
  → resolve latest publication for project
  → decrypt token → /share/<token>
  → set a preview-mode marker cookie (distinct from real recipient session)
  → return { clientLinkPath, previewToken }
```

The preview marker cookie is a signed cookie that the share page reads to render
a "Preview mode" banner and enable comment/decision UI in a non-persistent mode.
Preview-mode actions are **not persisted** (no real comments/decisions are written).

**Preview-cookie precedence (SEC-008):** If a valid `shared_link_session_*`
recipient cookie exists, the real session takes precedence — preview mode does
NOT activate. This prevents a manager who is also a recipient from having their
real comment/decision ability disabled. Preview mode activates only when no valid
recipient session exists. The preview cookie is cleared via an explicit "Exit
preview" action.

**Share page modification (UNIT-014 owns):** `src/app/share/[token]/page.tsx`
must read the preview cookie alongside the existing session cookie and pass a
`previewMode` flag to `<ProjectPublicationView>`. This is a read-only addition
(cookie read + prop pass); no data-fetching changes. UNIT-014 owns this specific
`page.tsx` change.

**Alternative (DEC-AUTO-001):** Instead of a preview cookie, open `/share/<token>`
with a query param `?preview=1` that the share page reads. Simpler, but the share
page's server component would need to conditionally enable recipient features
based on this param — which blurs the security boundary. The cookie approach is
cleaner because it's manager-auth-gated and doesn't expose a public URL pattern.

### Shared link — API route changes (hardening only)

| Route | Change | Requirement |
|---|---|---|
| `comment/route.ts` GET | Return 423 not 401 for password-required | SEC-002 |
| `decision/route.ts` GET | Return 423 not 401 for password-required | SEC-002 |
| `decision/route.ts` POST | Add circuit breaker (parity with comment) | SEC-003 |
| All public POST routes | Add explicit Content-Length cap (413) | SEC-001 |
| `comment/route.ts` GET | Add cursor pagination | SEC-004 |

No new API routes. The `events/route.ts` is either wired or removed (SEC-007).

## State Management

### Publisher — state ownership

| State | Owner | Mechanism |
|---|---|---|
| Filters (status, project, search, page) | URL | `useSearchParams` + `router.replace` |
| Wizard open/close + step | URL | `?wizard=<projectId>&step=<n>` |
| Drawer open/close + tab | URL | `?drawer=<projectId>&tab=<id>` (existing) |
| Copy feedback | Local React state | per-card `copyState` |
| Wizard data (summary, sheets) | TanStack Query | `usePublisherDrawer` (existing) |
| Wizard mutations | TanStack Query mutations | `usePublisherDrawer` (existing) |

### Shared link — state ownership (unchanged)

| State | Owner | Mechanism |
|---|---|---|
| Comments | TanStack Query | `SharePageComments` (existing) |
| Decision | TanStack Query | `SharePageDecision` (existing) |
| Review target (row/estimate scope) | React Context | `share-review-target.ts` (existing) |
| Active sheet/tab | Local state + sessionStorage | `SharePageTabs` (existing) |
| Session validity | `useSyncExternalStore` on cookie | `use-shared-link-session.ts` (existing) |

No state management changes needed — the existing patterns are sound. The UX
improvements are component-render-level.

## Data Flow — Wizard Publish

```text
User clicks "Share a project" or "Share project" on a draft card
  → URL: /workshop/publisher?wizard=<projectId>&step=1
  → ShareWizard opens (modal/sheet)
  → usePublisherDrawer(projectId) loads summary + sheets
  → Step 1: SheetPickerList (user selects estimates)
  → Step 2: AccessSettings (password/expiry)
  → Step 3: Generate → republishProjectPublication(...)
    → on success: query.refetch() + router.refresh()
  → Step 4: Success
    → ShareLinkDisplay shows /share/<token>
    → RecipientQuickAdd: addSharedLinkRecipients(...)
    → ClientPreviewLink: createClientPreviewSession(...) → opens /share/<token>?preview
  → Done: wizard closes, roster refreshes
```

## Integration Points

### Route revalidation (existing, preserved)

`revalidatePublicationRoutes` (`actions.ts:738-748`) already revalidates:
- `/workshop/projects/<id>`
- `/workshop/publisher`
- `/workshop`
- `/workshop/proposals`
- Each `clientLinkPath`

The wizard's mutations trigger this automatically. No change needed.

### Sidebar nav (modified)

`src/components/sidebar/MainSidebar.tsx` line 59:
- Change `label: "Publisher"` → `label: "Share"`
- Change `icon: NewspaperClipping` → `icon: ShareNetwork` (or `PaperPlane`)
- Keep `shortcut: "⌘5"` and `href: "/workshop/publisher"` (URL unchanged for
  backward compatibility; the route path is an internal detail).

### Dashboard (modified)

`src/components/workshop/dashboard/WorkshopDashboard.tsx`:
- `PublishedProjectLinks` (lines 36-86) already shows published projects.
- Add a parallel section for **unpublished manageable projects** with a "Share"
  CTA that deep-links to `?wizard=<projectId>`.

### Project header (preserved)

`src/components/workshop/ProjectChromeAsync.tsx` deep-links to
`?project=<id>&drawer=<id>`. Add an alternative deep-link to `?wizard=<id>` for
the "first share" action (when no publication exists).

## Next.js 16 / React 19 Considerations

- **App Router RSC pattern:** The publisher page and share page are already RSC
  with streamed client components. The wizard is a client component island.
- **`searchParams`/`params` are Promises** (Next 15+ async dynamic APIs). The
  existing code already `await`s them. New code must follow this pattern.
- **`router.refresh()`** re-runs the server component. The wizard uses this after
  mutations (existing pattern).
- **`useSearchParams` in client components** requires a `<Suspense>` boundary
  (existing pattern in `PublisherRosterClient`).
- **Read `node_modules/next/dist/docs/`** before any framework-sensitive claim
  (per AGENTS.md).

## Tailwind v4 Considerations

- The existing components use Tailwind utility classes with the project's design
  tokens (`surfaceMuted`, `textSecondary`, etc.). New components follow the same
  patterns.
- No new Tailwind configuration needed.
- Mobile breakpoints: `sm:` (640px), `md:` (768px), `lg:` (1024px) — used
  consistently with existing components.

## Type Safety

- All new components are fully typed with TypeScript.
- Domain types in `src/lib/publication/types.ts` are reused.
- The `ShareWizard` uses the existing `ProjectPublicationSummary` and
  `ProjectEstimateSheet` types.
- No `any` types; no unsafe casts.
