# 01 — Current-State Map (Publisher page)

Evidence-grounded inventory of files, symbols, data flow, and dependencies as of
`main` commit `b4b85b307`. All `file:line` references re-read before any edit.

## File inventory (25 files)

### Routes (`src/app/workshop/publisher/`)

| File | LoC-ish | Role |
|---|---|---|
| `page.tsx` | 64 | RSC: searchParams → filters → roster fetch → `<PublisherRosterClient>` in 2 Suspense |
| `preview/[projectId]/page.tsx` | 41 | RSC: `requireAuth` + `assertProjectPublicationManager` → snapshot read → sanitized share components, `previewMode="manager-read-only"` |
| `loading.tsx` | 5 | `<PublisherRosterSkeleton>` |
| `error.tsx` | ~14 | `<WorkshopRouteErrorState routeLabel="Share">` (client error boundary; uses `unstable_retry`) |

### Components (`src/components/workshop/publisher/`)

| File | Role | Data source |
|---|---|---|
| `PublisherRosterClient.tsx` | Master/detail client shell: URL filters, selection, picker, wizard orchestration | props (server roster) + URL |
| `PublisherDrawer.tsx` | Detail pane: overview/recipients/activity tabs, rotate/revoke/copy actions | `usePublisherDrawer` (TanStack Query) |
| `ShareWizard.tsx` | Create/Edit client link editor (estimate pick + password) | `usePublisherDrawer` |
| `PublisherRosterCard.tsx` | Master-list row card (status, copy, select) | props |
| `PublisherProjectPicker.tsx` | "Create client link" project picker modal | props (shareProjectOptions) |
| `PublisherActivityFeed.tsx` | Activity tab wrapper | server action `loadPublisherWorkspaceActivity` |
| `PublisherPagination.tsx` | URL page-number pagination (Prev/Next) | props |
| `PublisherEmptyState.tsx` | Empty states (`filtered` / `no-publications` / `mobile`) | props |
| `PublisherRosterSkeleton.tsx` | Loading skeleton | — |
| `ShareLinkDisplay.tsx` | Wizard completion: copy/share/preview link box | props |
| `ClientPreviewBanner.tsx` | Preview route amber "manager preview" banner | props |
| `usePublisherDrawer.ts` | Hook: 1 query + 3 mutations (republish/rotate/revoke) | TanStack Query + server actions |
| `publisher-queries.ts` | Query keys + `writePublisherRosterSearchParams` | pure |
| `PublisherRosterRow.tsx` | **Helpers module** (status copy, date/scope formatters) — misnamed, not a component | pure |
| `PublisherProjectMembersPanel.tsx` | **Re-export shim** of `ProjectMembersAccessPanel` — **zero production importers (dead)** | — |

### Lib (`src/lib/publisher/`)

| File | Role |
|---|---|
| `roster-repository.ts` | `readWorkspacePublicationsRoster` + `composePublisherRosterResult` (the data core) |
| `roster-filter.ts` | `parsePublisherRosterFilters` (status/project/search/page/pageSize) + constants |
| `permissions.ts` | `canReadPublisherRosterProject` (not viewer) / `canManagePublisherRosterProject` (owner/admin) |
| `activity-repository.ts` | `readPublisherWorkspaceActivity` (cursor-paginated, 7-table union) |
| `activity-actions.ts` | server action wrapper (`loadPublisherWorkspaceActivity`) |
| `drawer-actions.ts` | server action `readPublisherPublicationDrawerData` (summary + estimates + collab) |

### Direct data/mutation dependencies (audited, not owned)

- `src/lib/publication/actions.ts` (~1970 LoC): create/republish/rotate/revoke,
  recipient add/remove/resend, `assertProjectPublicationManager`,
  `openRecipientProposalAction`, activity digest.
- `src/lib/publication/d1-store.ts` (827 LoC): recipient/public-side store
  (snapshot reads, rate-limit table, eventing, comment/response writes).
- `src/lib/publication/types.ts`: `ProjectPublicationStatus` =
  `"unpublished"|"published"|"expired"|"revoked"` (note: `unpublished` is
  summary-only — D1 CHECK allows only the latter 3, migration `0014:8`).
- `src/lib/publication/security.ts` (553 LoC): token hash/encrypt/decrypt,
  password scrypt, access/session cookies, CSRF, view tokens.
- `src/lib/publication/snapshot.ts` (516 LoC): snapshot build + public
  sanitization (UUID→opaque-id maps, location scrubbing by visibility).
- `src/lib/publication/admin-d1-client.ts`: Supabase-style query builder that
  compiles to D1 SQL (NOT legacy Supabase — see "Legacy markers" below).
- `src/lib/repositories/workspace-repository.ts`: `listCurrentWorkspaceProjects`,
  `getProjectPublicationSummary`, `listProjectEstimateSheets`,
  `readPublicationSnapshotStaleness` (5-min module cache, `>7 days` threshold).

## Data flow — roster cold load

```
page.tsx
 └─ PublisherData
     ├─ requireCurrentUserContext()  ┐ parallel
     ├─ ensureDefaultWorkspace()     ┘
     └─ readWorkspacePublicationsRoster(workspaceId, userId, filters)
         ├─ listCurrentWorkspaceProjects()                    [D1 #1]  (workspace-repository)
         ├─ readRosterPublications(db, ws, projectIds)        [D1 #2]  project_publications LIMIT 100
         ├─ readEstimateUpdatedAtRows(db, projectIds)         [D1 #3]  estimates LIMIT 1000
         ├─ readEstimateCountsByProjectId(db, manageableIds)  [D1 #4]  estimates COUNT GROUP BY
         ├─ readLatestPublicationStatusByProjectId(...)       [D1 #5]  correlated subquery per project
         │   └─ (await #2..#5 in Promise.all)
         ├─ readRecipientCountsByPublicationId(db, pubIds)    [D1 #6]  shared_link_recipients COUNT
         ├─ readLatestCommentAtByPublicationId(db, pubIds)    [D1 #7]  shared_link_comments MAX
         ├─ readLatestResponseAtByPublicationId(db, pubIds)   [D1 #8]  shared_link_responses MAX
         │   └─ (await #6..#8 in Promise.all)
         └─ composePublisherRosterResult({...})   ← in-memory: status, staleness,
                                                  filter, sort, paginate (slice)
```

**Total: 8 D1 round-trips.** #2–#5 run in one `Promise.all`; #6–#8 in another.
Pagination (`offset`/`slice`, `roster-repository.ts:434`) and all filters
(status/search/project) are applied **after** fetching the full candidate set,
not pushed into SQL. The `100` publication scan cap and `1000` estimate cap mean
filtering/sorting operate on a bounded set, but every page navigation re-runs
all 8 queries.

## Data flow — mutation

```
PublisherRosterClient / PublisherDrawer / ShareWizard
 └─ usePublisherDrawer(projectId, open)
     ├─ useQuery(drawer data)  → readPublisherPublicationDrawerData (server action)
     │                          └─ getProjectPublicationSummary + listProjectEstimateSheets
     │                             + getProjectCollaborationSummary  [D1, 3 reads]
     ├─ republishMutation → republishProjectPublication  → D1 RPC replace_project_publication
     ├─ rotateMutation    → rotateProjectPublicationLink → D1 RPC rotate_project_publication_credentials
     └─ revokeMutation    → revokeProjectPublication     → raw UPDATE project_publications
     onSuccess → invalidatePublisherQueries([all, drawer(id)]) → router.refresh()
     (also revalidatePath server-side via revalidatePublicationRoutes)
```

`usePublisherDrawer` has `staleTime: 10_000` on the query and **no `onError`**
on any mutation (`usePublisherDrawer.ts:42-58`).

## D1 schema (publication tables) — migrations

- `migrations/0014_publication_shared_links.sql`: creates
  `project_publications`, `project_publication_events`, `shared_link_recipients`,
  `shared_link_comments`, `shared_link_responses`, `shared_link_events`,
  `publication_digest_log`. `project_publications.status` CHECK =
  `('published','expired','revoked')` (NOT `unpublished`). Unique partial index
  `idx_project_publications_one_published_per_project` on `(project_id) WHERE
  status='published'`.
- `migrations/0015_publication_admin_sidecars.sql`: adds `projects.client_name`,
  `location`, `currency_code`, `metadata`; creates `estimate_row_items`,
  `estimate_nodes`, `estimate_tabs` (snapshot sources).
- `migrations/0066_publication_foreign_keys.sql` (dated Jul 12): rebuilds all
  publication tables to add `REFERENCES ... ON DELETE CASCADE/SET NULL`; prunes
  `project_publication_events` CHECK to remove `'download_attempt_blocked'`
  (runtime type already aligned — `d1-store.ts:101`).

## Legacy / outdated markers (intentional vs. stale)

- **Intentional legacy support:** `PublisherRosterClient.tsx:52`
  `LEGACY_DRAWER_TABS = {"access","sheets","settings"}` → redirects to
  `overview` (old tab URLs); `activity-helpers.ts:242`
  `decodeLegacySharedLinkActivityCursor` (old base64 cursor format);
  `snapshot.ts` `LegacyPublicationSnapshotRow`/`…EstimateTab` types + legacy
  adjustment-percentage fallback (`calculateRowTotal`).
- **Misleading naming, NOT legacy Supabase:** `admin-d1-client.ts` exposes a
  Supabase-style `.from().select().eq().insert()` API but compiles to **D1 SQL**
  (`actions.ts:265-267` → `createPublicationAdminD1Client`). The "service role
  bypasses RLS" comments (`actions.ts:1335,1844`) describe intent over D1, not a
  Postgres dependency. Postgres code `23505` is synthesized from D1
  (`admin-d1-client.ts:96`).
- **Misnamed file:** `PublisherRosterRow.tsx` is a helpers module
  (`readPublisherStatusCopy`, `formatPublisherDate`, …), not a React component.
- **Column-name misnomer:** `shared_link_recipients.resend_email_id` etc. are
  Cloudflare Email message ids, not Resend (the email service is Cloudflare
  Email — `transactional-email-client.ts:6,140`).

## Accessibility baseline (strong)

`aria-label`s on icon-only buttons, `aria-current` for selection
(`PublisherRosterCard.tsx:46`, `PublisherPagination.tsx:15`), `role="feed"` +
`aria-posinset`/`aria-setsize` in activity, live regions
(`PublisherRosterSkeleton.tsx:6`, activity partial/empty), dialog `closeLabel` +
`initialFocus` (`PublisherProjectPicker.tsx:65,70`), focus-visible rings
throughout, decorative icons `aria-hidden`. Minor: `PublisherProjectPicker`
sets both `initialFocus="first"` and `SearchInput autoFocus` (precedence depends
on dialog primitive — verify no focus jump).
