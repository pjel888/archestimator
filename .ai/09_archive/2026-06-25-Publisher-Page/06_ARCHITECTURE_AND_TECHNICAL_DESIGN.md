# 06 — Architecture and Technical Design

> **PASS-2 AUDIT BANNER (2026-06-25).** This document has 1 CRITICAL correction and 6 HIGH corrections recorded in `18_AUDIT_FINDINGS_AND_CORRECTIONS_2026-06-25.md`. Headlines: FAB-A09 (roster function MUST live in new `src/lib/publisher/roster-repository.ts`, NOT in `workspace-repository.ts` which is 3,267 lines and Ponytail T2.3 split target #1), FAB-A11 (`ProjectPublicationListSummary` is too narrow — roster needs NEW `ProjectPublicationRosterRow` type), FAB-A07 (`feat/sidebar-redesign` branch does NOT exist — fabricated coordination risk), ARCH-DEFECT-08 (RSC HTML payload leak vector — bounded by viewer rank but undocumented), ARCH-DEFECT-15 (optimistic mutation queueing on same publication must be serialized or rejected), FAB-A10 (publication/actions.ts is Ponytail T2.6 mega-file — note dependency), ARCH-DEFECT-13 (UX-04 tablet floor must test at 768px for PH/SEA market). Read doc 18_ for full evidence and correction text.

> **PASS-3 REFINEMENT (2026-06-25, see `18_AUDIT_FINDINGS_AND_CORRECTIONS_2026-06-25.md` §"Pass 3 refinement").** NX-GAP-03: Next.js 16 stabilizes intercepting routes (`(..)`) + parallel routes (`@*`) — Phase 2 drawer escape hatch can use intercepting routes for deep-linkable drawer. NX-GAP-04: TanStack Query 5 hydration pattern unspecified — RSC should `queryClient.prefetchQuery` + dehydrate, client island uses `useHydrate` + `useQuery` for refetches.

## Current-state architecture (relevant slice)

```
┌─────────────────────────────────────────────────────────────────┐
│ Browser                                                         │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ /workshop/publisher (RSC)                                  │  │
│  │   WorkshopPageShell                                        │  │
│  │     PublisherRoster (DataTable)                            │  │
│  │     PublisherDrawer (client)                               │  │
│  │     PublisherTimeline (client, extends SharedLinkActivity) │  │
│  └───────────────────────────────────────────────────────────┘  │
│         ▲ server-action invocations                              │
└─────────┼────────────────────────────────────────────────────────┘
          │
┌─────────▼────────────────────────────────────────────────────────┐
│ Next.js 16 server (Node runtime)                                 │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ src/lib/repositories/workspace-repository.ts (server-only) │  │
│  │   readWorkspaceProjectsSummary                             │  │
│  │   readProjectPublicationSummaries (per-project loop)       │  │
│  │   canManageCollaborationRole / canManagePublication        │  │
│  └────────────────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ src/lib/publication/actions.ts ('use server')              │  │
│  │   assertProjectPublicationManager (RBAC gate)              │  │
│  │   create/republish/rotate/revokeProjectPublication*        │  │
│  │   list/add/remove/resendSharedLinkRecipient*               │  │
│  └────────────────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ src/lib/collaboration/actions.ts ('use server')            │  │
│  │   assertProjectMemberManager (RBAC gate)                   │  │
│  │   invite/update/remove collaborators, setEstimateSheetMode │  │
│  └────────────────────────────────────────────────────────────┘  │
└──────────┬───────────────────────────────────────────────────────┘
           │ Supabase JS client (anon key + RLS)
┌──────────▼───────────────────────────────────────────────────────┐
│ Supabase Postgres 17 — project ebxxqidacheyapmmzavr              │
│  RLS-enforced tables:                                             │
│   workspaces, workspace_members, profiles                         │
│   projects, project_members                                       │
│   estimate_sheets, estimate_sheet_access_settings,                │
│     estimate_sheet_members, estimate_sheet_events                 │
│   project_publications, shared_link_recipients,                   │
│     shared_link_comments, shared_link_responses,                  │
│     shared_link_events                                            │
│   collaboration_invitations, collaboration_invitation_tokens,     │
│     collaboration_audit_events                                     │
│   account_security_events                                          │
│  RPCs:                                                             │
│   current_project_access_rank, current_estimate_access_rank       │
│   workspace_projects_summary, workspace_homebase_summary           │
│   rotate_shared_link_token, mark_shared_link_viewed                │
│   atomic_publish + digest_slot                                      │
└────────────────────────────────────────────────────────────────────┘
```

## Target-state architecture (Publisher added, Phase 1)

```
NEW: /workshop/publisher (RSC)
  ├─ page.tsx (server component)
  │    ├─ read session (existing getSession helper)
  │    ├─ read workspace publications rollup (NEW helper in workspace-repository)
  │    │    ├─ workspace loop → projects → publications
  │    │    ├─ filter by canManagePublication (existing predicate)
  │    │    └─ return ProjectPublicationListSummary[]
  │    ├─ <WorkshopPageShell title="Publisher">
  │    ├─ <PublisherRosterClient> (client island — filter, search, drawer trigger)
  │    │    └─ TanStack Query hook: useWorkspacePublications()
  │    └─ <Suspense fallback={<ProjectsListSkeleton/>}>
  │         <PublisherActivityFeedRSC> (RSC, paginated)
  │           └─ union of 5 audit tables (application layer)

NEW: src/components/workshop/publisher/
  ├─ PublisherRosterClient.tsx (client)
  ├─ PublisherRosterRow.tsx (client)
  ├─ PublisherDrawer.tsx (client, lazy)
  ├─ PublisherDrawerRecipients.tsx (client)
  ├─ PublisherDrawerSettings.tsx (client)
  ├─ PublisherActivityFeed.tsx (client, extends SharedLinkActivityFeed)
  ├─ PublisherEmptyState.tsx (server)
  └─ publisher-queries.ts (TanStack Query keys + fetchers)

NEW: src/lib/repositories/workspace-repository.ts (additive — DO NOT fork)
  └─ readWorkspacePublicationsRoster(workspaceId, userId, filters)
       returns ProjectPublicationListSummary[]

NEW: src/lib/publisher/ (small, focused helpers — NOT a mega-file)
  ├─ feature-flag.ts (isPublisherEnabled)
  └─ roster-filter.ts (URL-param → filter predicate)

REUSED (no changes):
  src/lib/publication/* (all 9 files)
  src/lib/collaboration/* (all 16 files)
  src/lib/repositories/workspace-repository.ts (existing functions)
  src/app/api/share/[token]/* (7 endpoints)
  src/proxy.ts (middleware)
  src/components/ui/* (60+ primitives)
  src/components/workshop/WorkshopPageShell.tsx
  src/components/workshop/publication/{RecipientEmailComposer,SheetPickerList}
  src/components/share/SharedLinkActivityFeed.tsx
```

## Component tree (Phase 1)

```mermaid
graph TD
  A[page.tsx RSC] --> B[WorkshopPageShell]
  B --> C[PublisherHeader]
  C --> C1[Title + count]
  C --> C2[SearchInput]
  C --> C3[FilterTabs]
  C --> C4[PublishButton - managers only]
  B --> D[PublisherRosterClient]
  D --> D1[DataTable]
  D1 --> D2[PublisherRosterRow * N]
  D2 --> D2a[StatusBadge]
  D2 --> D2b[AvatarStack recipients]
  D2 --> D2c[IconButton CopyLink]
  D2 --> D2d[DropdownMenu actions]
  D --> D3[BulkActionToolbar when selected]
  D --> E[PublisherDrawer lazy client]
  E --> E1[SummaryCard]
  E --> E2[Tabs Activity|Recipients|Sheets|Settings]
  E2 --> E3[PublisherActivityFeed]
  E2 --> E4[RecipientEmailComposer]
  E2 --> E5[SheetPickerList]
  E2 --> E6[SettingsTab rotate|revoke|password]
  B --> F[PublisherEmptyState when empty]
  B --> G[WorkshopRouteErrorState on error]
```

## Data flow — read (roster)

```
1. User GET /workshop/publisher
2. proxy.ts: PROTECTED_PREFIXES match → auth check → closed-beta gate
3. page.tsx RSC:
   - getSession() → user, workspace
   - readWorkspacePublicationsRoster(workspaceId, userId, filters) from new
     src/lib/publisher/roster-repository.ts:
     - read workspace-visible projects through existing repository helpers
     - batch publication, recipient-summary, and latest-activity reads instead
       of appending a new function to the workspace-repository mega-file
     - merge into ProjectPublicationRosterRow[]
     - sort by latestActivityAt desc
     - return paginated ProjectPublicationRosterRow[]
4. RSC renders <PublisherRosterClient initialRoster=...>
5. Client hydrates; subsequent filter / search runs against cached data
   (TanStack Query with staleTime 30s)
```

## Data flow — mutation (rotate token)

```
1. User clicks Rotate in drawer → confirmation modal
2. PublisherDrawerSettings calls existing server action rotateProjectPublicationLink
3. rotateProjectPublicationLink (src/lib/publication/actions.ts):
   - assertProjectPublicationManager(projectId)
   - assertSameOrigin(request)
   - generate new token via createPublicationToken
   - hashPublicationToken(newToken, secret) → new hash
   - encryptPublicationToken(newToken, secret) → new recopy
   - call rotate_project_publication_credentials with expected_encrypted_token
   - inside the RPC, acquire the D-ARCH-05 per-publication rotate lock
   - UPDATE project_publications SET token_hash, encrypted_token, snapshot fields
   - INSERT account_security_events (action='publisher_token_rotated')
   - revalidatePath('/workshop/publisher')
4. Client TanStack Query:
   - optimistic: row status → 'rotating'
   - D-ARCH-06 guard: reject any second same-publication mutation while in flight
   - on success: invalidate publications query, row status → 'active'
   - on error: rollback, toast Retry
5. Toast: "New link generated. Old link revoked."
```

## Shared contracts (additive, no breaking changes)

### Type additions (no removals)

`src/lib/publisher/roster-repository.ts`:
- New export: `readWorkspacePublicationsRoster(workspaceId, userId, filters): Promise<ProjectPublicationRosterRow[]>`
- New type: `ProjectPublicationRosterRow`, because existing `ProjectPublicationListSummary` is too narrow for workspace roster, recipient summary, sheet-scope, and latest-activity fields.
- Existing `workspace-repository.ts` types unchanged; do not add to the mega-file for Phase 1.

`src/lib/publication/types.ts`:
- Existing `ProjectPublicationSummary` and `ProjectPublicationListSummary` reused as-is.

### New filter types

`src/lib/publisher/roster-filter.ts`:
```ts
type PublicationRosterStatus = 'all' | 'active' | 'stale' | 'expired' | 'revoked' | 'draft';
type PublicationRosterFilters = {
  status: PublicationRosterStatus;
  projectId?: string;
  search?: string;
};
```

### Server action signature (existing surface, called from new UI)

Existing verified exports:
- `createProjectPublication({ projectId, selectedEstimateIds, password, expiresAt, locationVisibility })`
- `republishProjectPublication({ projectId, selectedEstimateIds, password, clearPassword, expiresAt, locationVisibility })`
- `rotateProjectPublicationLink({ projectId, password, clearPassword })`
- `revokeProjectPublication({ projectId })`
- `listSharedLinkRecipients({ publicationId })`
- `addSharedLinkRecipients({ publicationId, recipients })`
- `removeSharedLinkRecipient({ publicationId, recipientId })`
- `loadSharedLinkActivity(...)`
- `setEstimateSheetAccessMode(...)` from `src/lib/collaboration/actions.ts`

**Publisher does NOT add server actions in Phase 1.** Phase 2 consumes verified existing actions from the new UI and may add only a DB-side rotate-lock migration if D-ARCH-05 is not already satisfied by the existing RPC.

## Reusable abstractions

| Abstraction | Source | Publisher reuse |
|---|---|---|
| `assertProjectPublicationManager` | `src/lib/publication/actions.ts:174` | Direct call from new server actions (none added in Phase 1) |
| `canManageCollaborationRole` | `src/lib/repositories/workspace-repository.ts:297` | Direct |
| `canManagePublication` | computed in 3 places in workspace-repository | Consider extracting to single helper (Phase 2 cleanup) |
| `ProjectPublicationRosterRow` | New `src/lib/publisher/roster-repository.ts` type | Workspace roster row; do not force-fit `ProjectPublicationListSummary` |
| TanStack Query optimistic pattern | `src/components/workshop/publication/publication-optimistic.ts` | Direct |

## Coupling

**Low coupling by design.** Publisher depends on:
- new `src/lib/publisher/roster-repository.ts` (uses existing repository/query helpers without expanding the workspace-repository mega-file)
- `publication/actions.ts` (consume existing, no edits)
- `collaboration/actions.ts` (consume existing, no edits)
- `WorkshopPageShell`, UI primitives, `RecipientEmailComposer`, `SheetPickerList`, `SharedLinkActivityFeed`

Nothing depends on Publisher in Phase 1. Phase 4 may consolidate the project-page modals to depend on Publisher components.

## Dependency direction

```
UI layer (src/app/workshop/publisher, src/components/workshop/publisher)
  ↓
Repository layer (src/lib/repositories/workspace-repository.ts)
  ↓
Action layer (src/lib/{publication,collaboration}/actions.ts)
  ↓
Crypto / security (src/lib/publication/security.ts, src/lib/collaboration/invite-*)
  ↓
Supabase client (src/lib/supabase/*)
  ↓
Postgres + RLS + RPCs
```

Publisher does not skip layers. No UI → Supabase calls.

## Failure boundaries

| Boundary | Behavior |
|---|---|
| Auth fail | `proxy.ts` redirects to `/login?next=/workshop/publisher` |
| Closed-beta fail | `proxy.ts` redirects to `/access-required` |
| Workspace membership fail | RSC renders `WorkshopRouteErrorState` with "Ask a workspace admin" |
| Publication query fail (transient) | RSC retries once, then renders `WorkshopRouteErrorState` with Retry |
| Manager action fail (RBAC) | Server action throws; client toast "You don't have permission" |
| Manager action fail (network) | Optimistic rollback + Retry toast |
| Drawer lazy-load fail | RSC error boundary → "Couldn't load this publication. Close and retry." |

## Integration points

| System | Integration | Risk |
|---|---|---|
| Existing publication actions | Direct call — no API change | LOW |
| Existing collaboration actions | Direct call — no API change | LOW |
| Existing `/share/[token]` receiver | NOT integrated — Publisher is builder-side | NONE |
| Existing Teamspaces / Publication modals | Coexist (D4); Phase 4 consolidation | LOW (Phase 1–3), MED (Phase 4) |
| Sidebar (`MainSidebar.tsx`) | Add 1 nav item | LOW — coordinate with `feat/sidebar-redesign` |
| Notifications system (`src/lib/notifications/`) | Optional: surface unread publication comment counts in future | LOW |
| Resend email | Existing digest pipeline unchanged | NONE |
| Audit tables | Insert-only via existing actions | NONE |

## Architectural alternatives considered

(See `15_DECISIONS_ASSUMPTIONS_AND_ALTERNATIVES.md` for full discussion.)

- **A1: Publisher as a route vs a modal.** Route chosen — deep-linkable, scalable, allows Phase 4 to migrate modals into it.
- **A2: RSC roster vs client-side fetch.** RSC chosen — server-side RLS enforcement, smaller client bundle.
- **A3: New RPC vs application-layer loop for roster.** Phase 1: application loop (small N). Phase 2+: optional `workspace_publications_summary` RPC.
- **A4: TanStack Query vs SWR vs plain hooks.** TanStack Query — repo standard.

## Decision rationale

The architecture is **presentation-first** because the substrate is already mature. The riskiest choice is the workspace-rollup read path; Phase 1 keeps it as an application loop to avoid premature RPC work, with a measured migration path to RPC in Phase 2 if PERF-01 fails.
