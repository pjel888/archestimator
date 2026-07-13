# 06 — Architecture and Technical Design

---

## Current-state architecture

```mermaid
flowchart LR
  subgraph Server[Server - RSC + Server Actions]
    Page["src/app/workshop/publisher/page.tsx<br/>PublisherPage (RSC)"]
    DrawerActions["src/lib/publisher/drawer-actions.ts<br/>readPublisherPublicationDrawerData"]
    RosterRepo["src/lib/publisher/roster-repository.ts<br/>readWorkspacePublicationsRoster"]
    PubActions["src/lib/publication/actions.ts<br/>create/republish/rotate/revoke<br/>add/list/resend/remove recipients<br/>openRecipientProposalAction"]
    Security["src/lib/publication/security.ts<br/>HMAC + AES-GCM + scrypt + cookies"]
    D1Store["src/lib/publication/d1-store.ts / admin-d1-client.ts<br/>D1 RPCs"]
  end
  subgraph D1[(Cloudflare D1 - ARCH_DB)]
    PubTbl[("project_publications<br/>token_hash + encrypted_token")]
    RecTbl[("shared_link_recipients<br/>recipient_token_hash")]
    EvTbl[("project_publication_events")]
    RateTbl[("security_rate_limit_events")]
  end
  subgraph Client[Client components]
    RosterClient["PublisherRosterClient<br/>min-768px gate :224/:228"]
    Row["PublisherRosterRow<br/>Copy/Open/Manage"]
    Drawer["PublisherDrawer<br/>overview/recipients/sheets/access/settings/activity"]
    Composer["RecipientEmailComposer<br/>add/remove/resend"]
    UseDrawer["usePublisherDrawer<br/>TanStack Query + mutations"]
  end
  Email["Cloudflare Email (EMAIL binding)<br/>sendCloudflareEmail"]

  Page --> RosterRepo --> D1
  Page --> RosterClient
  RosterClient --> Row --> Drawer
  Drawer --> UseDrawer --> DrawerActions --> D1
  Drawer --> Composer
  Composer --> PubActions
  UseDrawer --> PubActions
  PubActions --> Security
  PubActions --> D1Store --> D1
  PubActions --> Email
  D1Store --> PubTbl & RecTbl & EvTbl & RateTbl
```

**Key facts (evidence):**
- RSC `PublisherPage` fetches roster server-side inside two Suspense boundaries; passes `roster` + `filters` to `PublisherRosterClient`.
- Client owns URL state (`status`,`project`,`q`,`page`,`pageSize`,`drawer`,`tab`) via Next router.
- TanStack Query only for the drawer (`usePublisherDrawer`); roster is RSC + router refresh.
- Mutations invalidate `publisherRosterQueryKeys.all` + drawer key + `router.refresh()` (`refreshPublisherSurface`).
- Authz is server-side in every action (`assertProjectPublicationManager`); UI-level `canManagePublisherRosterProject` only hides affordances.

## Target-state architecture (this pack)

Minimal, additive changes — **no new service boundaries, no new state owner, no new cache layer.**

1. **Mobile reachability (DEC-MOBILE Option B):**
   - Keep the 768px CSS guard for the heavy table.
   - Make the mobile empty state **honest + actionable**: add a one-tap "Copy link to open on desktop" button (reuses `navigator.clipboard` + `readAbsoluteClientLink`) and ensure the existing `?drawer=&tab=` deep-link plumbing is advertised.
   - Allow read-only roster **status browsing** on mobile (the status tabs + counts already render above the gate; verify they remain reachable, or surface a compact status summary in the mobile message).
   - No new hook, no new store.

2. **Sender action state surfacing:**
   - Consolidate per-action pending/success/failure/recovery into the existing drawer + composer + live-region pattern. No new global store.
   - Resend rate-limit window, rotate-invalidates-recipients, and revoke-blocks-access are surfaced as explicit confirm/hint text.

3. **Audit/proof surfacing:**
   - Surface `project_publication_events` + `loadSharedLinkActivity` in the drawer Activity tab with honest labels. Consume workflow-pack honest-delivery labels (dependency).

4. **Server/Client boundary:** unchanged. `"use client"` already minimal on the three interactive components. No server-only data moves to client.

## Reuse map (do not invent)

| Need | Reuse |
|---|---|
| Drawer | `SheetDrawer` (`src/components/ui/overlays/sheet-drawer`) |
| Confirm | `Modal`/`ConfirmDialog` (existing in `PublisherDrawer`) |
| Filters | `DropdownSelect` + `Tabs` (existing) |
| Empty states | `PublisherNoRowsEmptyState` (existing) |
| Clipboard | `navigator.clipboard` + `readAbsoluteClientLink` (existing) |
| Mutations/cache | `usePublisherDrawer` + `refreshPublisherSurface` (existing) |
| Deep link | `readDrawerIntent` (`PublisherRosterClient.tsx:88-97`) (existing) |

## Coupling / dependency direction
- `PublisherRosterClient` → `PublisherRosterRow` → `PublisherDrawer` → `RecipientEmailComposer` → `actions.ts` (unchanged).
- `actions.ts` → `security.ts` → `d1-store.ts`/`admin-d1-client.ts` → D1 (unchanged, audit-only).
- **Cross-pack dependency:** honest delivery labels + readiness gate come from the workflow pack (one-way consume).

## Cache / revalidation contract
- **Cache model (verified this audit):** the project runs the **default (non-Cache-Components)** model — `next.config.ts` has no `experimental.cacheComponents` flag; Next.js 16.2.10. Under this model `fetch` defaults to no-store. See `23_ROUTE_BOUNDARY_AND_CACHE_CONTRACT.md` for the full per-route contract and the cited local doc (`node_modules/next/dist/docs/01-app/02-guides/caching-without-cache-components.md`).
- **Active revalidation primitive:** `revalidatePath` — `actions.ts:739` (`revalidatePath('/workshop/projects/${projectId}')`) and `:741` (`revalidatePath(clientLinkPath)`), invoked after mutations. There are **no** `use cache`/`cacheLife`/`cacheTag`/`revalidateTag`/`unstable_cache` boundaries in scope (grep confirmed).
- Drawer: TanStack Query key `publisherRosterQueryKeys.drawer(projectId)`, `staleTime 10s`, refetch-on-success (`refreshPublisherSurface`). Unchanged.
- Roster: RSC + `router.refresh()` after mutations. Unchanged.
- Read-your-writes: handled by `onSuccess` invalidation + `router.refresh()` + `revalidatePath`.

## Server Actions as POST endpoints
- All sender actions already enforce `requireAuth` + `assertProjectPublicationManager` + input validation + idempotency where needed (resend rate limit; revoke idempotent via status check). This pack **does not change** their contracts — it only improves how their results/errors surface in the owner UI.

## Component quality gates (per `Creating-Plan-Prompt.md` §8A)
- No effect-driven render derivation added.
- Memoization only if a real render cost appears (none anticipated).
- Stable keys for recipient chips (existing).
- No `any`; typed DTOs from `actions.ts` returns.
- Decomposition target: `RecipientEmailComposer` already carries a `react-doctor/no-giant-component` annotation (`:292`) — this pack should **not** worsen it; if Option A is later chosen, extract a mobile subcomponent.

## Architectural alternatives (rejected)
- **Add a `useIsMobile` hook + JS-gated layout:** rejected — adds hydration-risk and a second source of truth vs. the CSS guard; CSS guard + improved message is simpler and SSR-safe.
- **New Zustand store for sender states:** rejected — TanStack Query + local component state already own this; a new store is unnecessary abstraction.
- **Mirror roster into TanStack Query for mobile:** rejected — RSC + router refresh is fine; mirroring adds cache-coherence risk.

## Decisions
- DEC-ARCH-1: keep CSS 768px guard; improve the mobile message + add copy-URL + advertise deep link (Option B). Rationale: SSR-safe, cheap, aligns with DESIGN.md, reversible.
- DEC-ARCH-2: no new migration, no new binding, no new store, no new cache layer.
- DEC-ARCH-3: serialize shared-file edits with the workflow pack (one-way consume of its labels/gate).
