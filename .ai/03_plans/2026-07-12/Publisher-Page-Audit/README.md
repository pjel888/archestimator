# Publisher Page Audit — `/workshop/publisher`

> **Profile:** `standard` · **This is a READ-ONLY AUDIT & READINESS pack.**
> No application code, tests, migrations, config, provider state, or runtime is
> mutated by this pack. It is an evidence-grounded comprehension + bug/perf/UX
> audit that produces prioritized remediation units for a *future* execution task.
> Canonical execution artifact: this `README.md`.

## 1. Outcome

Audit, comprehend, and memorize **everything** about the Publisher page
(`http://localhost:3000/workshop/publisher`) and its preview route
(`/workshop/publisher/preview/[projectId]`): route structure, component tree,
data layer, D1 queries, publication/share mutation layer, security, performance,
Cloudflare posture, UX/UI, accessibility, and bugs. Produce a prioritized,
evidence-cited remediation backlog a fresh executor can implement unit-by-unit
without re-discovery.

**This pack does not implement fixes.** Each finding is recorded with severity,
evidence (file:line), and a concrete `UNIT-*` for a future implementation run.

## 2. Scope

**In scope:**

- Route: `src/app/workshop/publisher/**` (`page.tsx`, `loading.tsx`, `error.tsx`,
  `preview/[projectId]/page.tsx`).
- Components: `src/components/workshop/publisher/**` (15 files).
- Lib: `src/lib/publisher/**` (6 files: `roster-repository.ts`,
  `roster-filter.ts`, `permissions.ts`, `activity-repository.ts`,
  `activity-actions.ts`, `drawer-actions.ts`).
- Direct data/mutation dependencies touched by the above:
  `src/lib/publication/{actions,d1-store,types,security,snapshot}.ts`,
  `src/lib/publication/admin-d1-client.ts`, `src/lib/repositories/workspace-repository.ts`
  (publication summary / staleness / project listing paths), the public share
  components reused by the preview route (`src/components/share/**`,
  `src/components/workshop/publication/RecipientEmailComposer.tsx`,
  `SheetPickerList.tsx`), and the D1 migrations that define the publication
  tables (`0014_publication_shared_links.sql`, `0066_publication_foreign_keys.sql`,
  `0015_publication_admin_sidecars.sql`).
- Cross-cutting: performance/query count, Cloudflare D1/Email/Cache posture,
  accessibility, dead code, outdated/legacy markers.

**Non-goals (explicit):**

- Implementing any fix. All fixes are `UNIT-*` proposals for a future run.
- Running tests, builds, browser automation, or visual QA (User Test
  Authorization Gate). Each risky finding records a `TEST_PROPOSAL` only.
- Auditing the public `/share/[token]` route exhaustively — only the slices the
  Publisher page reuses (preview route + shared components) are covered; the
  share route's own surface is summarized for context, not re-audited.
- Mutating provider/D1/Cloudflare state.

## 3. Current-state architecture (comprehended)

### 3.1 Routes

| Route | File | Render | Purpose |
|---|---|---|---|
| `/workshop/publisher` | `src/app/workshop/publisher/page.tsx` | RSC + client | "Client links" workspace: master/detail roster of projects ↔ publications, filters, pagination, drawer, share wizard |
| `/workshop/publisher/preview/[projectId]` | `preview/[projectId]/page.tsx` | RSC | Manager read-only preview of exactly what a client sees (`previewMode="manager-read-only"`) |
| `loading.tsx` / `error.tsx` | same folder | — | `<PublisherRosterSkeleton>` / `<WorkshopRouteErrorState>` |

The main page is a **server component** (`page.tsx`) that:

1. Reads `searchParams` (Next 16 async pattern, `page.tsx:13`).
2. If `?wizard=<projectId>` is present, it forces filters to that project
   (`page.tsx:18-29` — clears `page`/`q`/`status`, sets `project`).
3. `PublisherData` resolves the current user + default workspace in parallel,
   then `readWorkspacePublicationsRoster(workspaceId, userId, filters)`
   (`roster-repository.ts:630`), wrapped in `withPerfTraceRequest` +
   `traced(...)` server-timing spans.
4. Renders `<PublisherRosterClient roster filters>` inside two nested
   `<Suspense>` boundaries.

`PublisherRosterClient` (`PublisherRosterClient.tsx`, the heart of the UI) is a
client component managing: URL-synced filters (status/project/search/page via
`router.replace` + `useTransition`), a master list (`PublisherRosterCard`), a
detail pane (`PublisherDrawer` embedded), a "Create client link" picker
(`PublisherProjectPicker`), and the share editor (`ShareWizard`). It handles
mobile (drawer via `?drawer=`) and desktop (selection) via `window.matchMedia`.

### 3.2 Data layer — roster read path

`readWorkspacePublicationsRoster` (`roster-repository.ts:630`) performs, per
page load, **8 D1 round-trips** (1 project list + 4 parallel + 3 parallel):

1. `listCurrentWorkspaceProjects()` — projects + roles (in workspace-repository).
2. `readRosterPublications` — `project_publications` by workspace+projectIds
   (`LIMIT 100`, `roster-repository.ts:480`).
3. `readEstimateUpdatedAtRows` — `estimates` updated_at by projectIds
   (`LIMIT 1000`, `roster-repository.ts:559`).
4. `readEstimateCountsByProjectId` — `COUNT(*)` estimates grouped by project
   (`roster-repository.ts:579`).
5. `readLatestPublicationStatusByProjectId` — **correlated subquery** per project
   to find the latest publication row (`roster-repository.ts:595`).
6. `readRecipientCountsByPublicationId` — `COUNT(*)` `shared_link_recipients`
   grouped by publication.
7. `readLatestCommentAtByPublicationId` — `MAX(created_at)` `shared_link_comments`.
8. `readLatestResponseAtByPublicationId` — `MAX(created_at)` `shared_link_responses`.

Filtering, status derivation, staleness, sorting, and pagination are all done
**in memory in JS** (`composePublisherRosterResult`, `roster-repository.ts:320`)
after the D1 fetches — see PERF findings. Status (`active`/`stale`/`expired`/
`revoked`/`drafts`/`all`) and search are client-side filters over the fetched
set, not SQL predicates.

`readPublicationStatus` (`roster-repository.ts:204`) derives status from
`expiresAt`/`revokedAt`/stored `status`. Staleness
(`readPublicationSnapshotStaleness`, in `workspace-repository.ts:1073`) returns
`{ daysBehind, … }` only when `daysBehind > 7`, with a 5-min module-level cache.

### 3.3 Mutation layer

| Action | Entry | D1 surface |
|---|---|---|
| Create / republish link | `ShareWizard` → `usePublisherDrawer.republishMutation` → `republishProjectPublication` (`actions.ts:851`) | D1 RPC `replace_project_publication`; rebuilds snapshot |
| Replace (rotate) link | `PublisherDrawer` → `rotateMutation` → `rotateProjectPublicationLink` (`actions.ts:941`) | D1 RPC `rotate_project_publication_credentials` (in-place token rotate, preserves recipient FKs) |
| Turn off (revoke) | `PublisherDrawer` → `revokeMutation` → `revokeProjectPublication` (`actions.ts:1015`) | Raw `UPDATE project_publications SET status='revoked'` |
| Add/remove/resend recipients | `RecipientEmailComposer` → `addSharedLinkRecipients` / `removeSharedLinkRecipient` / `resendSharedLinkRecipientEmail` (`actions.ts:1355/1656/1557`) | `shared_link_recipients` (+ Cloudflare Email send) |

All mutations `requireAuth()` + `assertProjectPublicationManager(projectId)`
(workspace owner/admin only — `permissions.ts:7`). `usePublisherDrawer`
(`usePublisherDrawer.ts`) wires 1 query (drawer data, `staleTime: 10s`) + 3
TanStack mutations with `onSuccess → invalidatePublisherQueries + router.refresh()`.

### 3.4 Security posture (summarized — see `02-findings-security.md`)

Token: HMAC-SHA256 hash stored, AES-256-GCM encrypted-at-rest envelope,
decrypt only for link construction. Password: scrypt with per-hash salt,
constant-time verify, signed access cookie bound to credential version.
Recipients: HMAC-hash only, raw token stripped from URL after session set.
Rate limits on every public surface (open/comment/decision/password/session).
CSRF double-submit on all public writes. **Preview route's
`token="manager-preview"` is safe** — it only hides UI; the fake token fails
shape validation at every API.

## 4. Status tuple

| Field | Value | Why |
|---|---|---|
| `package_status` | `IMPLEMENTATION_READY` | Audit complete; remediation units are concrete and evidence-cited |
| `implementation_status` | `NOT_STARTED` | This pack audits; no fix is implemented |
| `release_status` | `NOT_EVALUATED` | No release claim (read-only audit) |
| `plan_lifecycle` | `ACTIVE` | Findings await a separate execution authorization |
| `terminal_status` | `ACTIVE` | Audit delivered; fixes are future work |
| `package_action_ceiling` | `IMPLEMENT_LOCAL` | Describes future remediation reach |
| `last_observed_run_scope` | `PLAN_ONLY` | This run only wrote the pack folder |

`package_action_ceiling: IMPLEMENT_LOCAL` describes the **remediation units**
the pack proposes, not anything this audit run performed. The audit run itself
was strictly `PLAN_ONLY` (read source/docs/migrations, wrote only this folder).

## 5. Findings summary (full detail in numbered docs)

Severity legend: **P0** = correctness/security/data bug · **P1** = real bug with
user impact or notable perf · **P2** = quality/consistency/tech-debt · **P3** =
minor/nit. Counts: see `03-findings-registry.md`.

**Top issues (P0/P1):**

1. **[PERF-1, P1]** Roster read does **8 D1 round-trips per page load** with
   in-memory filtering/pagination — does not scale and over-fetches
   (`roster-repository.ts:630-688`). Worst cost on the master/detail cold load.
2. **[PERF-2, P1]** Correlated subquery in `readLatestPublicationStatusByProjectId`
   runs once per manageable project (`roster-repository.ts:595-628`).
3. **[BUG-1, P1]** Activity feed source-cap boundary: when one source has a
   contiguous run > `safeLimit+1` (51) newest rows, older rows from that source
   are silently dropped on subsequent pages (`activity-repository.ts:293,358`).
4. **[BUG-2, P1]** `submitClientResponse` read-then-write dedupe is racy; the
   unique partial index is the real guard but the INSERT path doesn't catch a
   uniqueness violation, so concurrent double-submit throws instead of returning
   null (`d1-store.ts:760-765`, `779`).
5. **[SEC-1, P1]** Share HTML page sends no explicit `Cache-Control: no-store`;
   relies on `force-dynamic` + Cloudflare defaults. A password-unlocked page's
   HTML could be CDN-cached if rules are loose (`share/[token]/page.tsx`).
6. **[BUG-3, P1]** `assertProjectPublicationManager` and all manager mutations
   **throw on D1 error with no try/catch**; `usePublisherDrawer` has **no
   `onError`**. A D1 blip surfaces as an unhandled server-action error with no
   user-facing recovery (`actions.ts:394`, `usePublisherDrawer.ts:42-58`).
7. **[UX-1, P1]** `PublisherProjectMembersPanel` is **dead production code** —
   zero production importers (only tests). If the drawer was meant to show
   project members, the wiring is missing (`PublisherProjectMembersPanel.tsx`).

**Notable P2:** activity `limit:50` duplicated as literal in 3 files;
`ClientPreviewBanner` hardcodes amber palette bypassing theme tokens;
`ShareLinkDisplay.message` never auto-clears; `console.warn` left in
`roster-repository.ts:199`; activity publications capped at 250 silently;
`PublisherRosterRow` misnamed (it's a helpers module, not a component).

## 6. Execution DAG (remediation units — for a FUTURE implementation run)

Units are independent unless noted. Owner can pick any subset; nothing here is
auto-executed. Each `UNIT-*` in `04-execution-units.md`.

```
UNIT-1 (PERF roster query consolidation)  ──┐
UNIT-2 (BUG activity source-cap fix)      ──┼─ all independent, serialize on shared files only
UNIT-3 (BUG response dedupe race)         ──┤
UNIT-4 (SEC share Cache-Control header)   ──┤
UNIT-5 (BUG mutation error handling)      ──┤
UNIT-6 (DEADCODE remove/repurpose members panel) ─┤
UNIT-7 (P2 cleanup: constants, console, theme, message) ─┘
```

## 7. Test policy (User Test Authorization Gate)

All criteria are `NOT_REQUIRED` (audit; cheapest decisive evidence = source
inspection). Risky remediation units record **`TEST_PROPOSAL`** only — they do
not authorize running anything. Explicit user `TEST_TASK` required before any
test/build/browser execution. See `05-test-policy.md`.

## 8. Authorization boundaries

**None active.** This audit touched only local source/docs/migrations (read)
and wrote only this plan folder. No `AUTH-*`. A future implementation run that
touches D1/Cloudflare uses the standing Cloudflare-resource authorization in
`AGENTS.md` (bound resources only); no new boundary is created here.

## 9. Resume / handoff

- **Resume point:** read this README, then `03-findings-registry.md` for the
  prioritized list, then `04-execution-units.md` for the unit to execute.
- **First unit (recommended):** `UNIT-1` (roster query consolidation) — highest
  impact, self-contained, touches only `roster-repository.ts`.
- **Evidence freshness:** all citations are vs. current `main` at audit time
  (commit `b4b85b307`). Re-read cited files immediately before implementing.
- **Canonical manifest:** `plan-pack.json`.
