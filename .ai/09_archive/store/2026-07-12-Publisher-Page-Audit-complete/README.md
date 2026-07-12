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
| `package_status` | `IMPLEMENTATION_READY` | Audit deliverable complete; remediation units are concrete and evidence-cited |
| `implementation_status` | `COMPLETE` | The **audit** (comprehension + findings + remediation backlog) is complete. Remediation itself is future, separately-authorized work, not part of this pack's deliverable. |
| `release_status` | `NOT_EVALUATED` | No release claim (read-only audit) |
| `plan_lifecycle` | `N/A` | Audit pack; no implementation lifecycle to archive |
| `terminal_status` | `ACHIEVED` | The requested audit outcome is fully delivered |
| `package_action_ceiling` | `IMPLEMENT_LOCAL` | Describes the future remediation units' reach |
| `last_observed_run_scope` | `PLAN_ONLY` | This run only wrote the pack folder (read source/docs/migrations) |

`package_action_ceiling: IMPLEMENT_LOCAL` describes the **remediation units**
the pack proposes, not anything this audit run performed. The audit run itself
was strictly `PLAN_ONLY` (read source/docs/migrations, wrote only this folder).

## 5. Findings summary (full detail in numbered docs)

Severity legend: **P0** = correctness/security/data bug · **P1** = real bug with
user impact or notable perf · **P2** = quality/consistency/tech-debt · **P3** =
minor/nit. **Totals: 65 findings — 0 P0, 23 P1, 27 P2, 11 P3, 4 safe/accepted.**
Full index: `04-findings-registry.md`. Improve-pass added `07` (adversarial),
`08` (design/a11y), `09` (perf-budget).

**Create-stage said "8 D1 round-trips"; improve-stage corrected this to ~20**
(the create-stage count missed `listCurrentWorkspaceProjects`'s 11-14 upstream
RTs). See PF-1 in `09-findings-performance-budget.md`.

**Top issues (P1, grouped):**

*Performance / data layer:*
1. **[PF-1, P1]** Roster cold load is **~20 D1 round-trips across 4 serial waves**
   on a route nominally budgeted <100ms (`roster-repository.ts:635-673`;
   `workspace-repository.ts:1486-1624`). No D1/query-count budget exists.
2. **[PF-2, P1]** `readAccessibleEstimateIdSet` is a serial loop of 1 RT per 90
   estimates, paid every load (`workspace-repository.ts:1279,1292`).
3. **[PF-3, P1]** Correlated subquery is redundant — latest-status derivable
   from already-fetched rows (`roster-repository.ts:595-628`). Quickest win.
4. **[PF-4/PF-5, P1]** `ShareWizard` (+764-LOC `RecipientEmailComposer`),
   `PublisherDrawer`, `PublisherProjectPicker` all statically imported but
   user-gated — no `next/dynamic` anywhere in the tree. Violates the
   `/workshop/*` <80KB main bundle budget.

*Bugs (data/logic):*
5. **[BUG-1, P1]** Activity feed drops rows when one source dominates the
   `safeLimit+1` cap (`activity-repository.ts:293,358`).
6. **[BUG-2, P1]** `submitClientResponse` dedupe race — concurrent double-submit
   throws instead of returning null (`d1-store.ts:760-765,779`).
7. **[BUG-3, P1]** Manager mutations throw with no client `onError` — D1 blips
   surface as unhandled errors (`actions.ts:394`, `usePublisherDrawer.ts:42-58`).

*Bugs (client state/navigation — adversarial pass):*
8. **[A-BUG-1, P1]** `searchValue` never re-syncs from `filters.search` → stale
   input / URL clobber on back/forward (`PublisherRosterClient.tsx:120,247`).
9. **[A-BUG-2, P1]** `selectedProjectId` not kept valid vs `roster.rows` → detail
   pane collapses when a filter removes the selected row (`:130-139`).
10. **[A-BUG-4, P1]** `verificationPending` stuck screen — no "back to editor"
    after a transient post-save verify failure (`ShareWizard.tsx:45,105-138`).
11. **[A-BUG-6, P1]** Draft state (password, selections) wiped before verify
    confirms → lost draft on verify-fail (`ShareWizard.tsx:140-162`).
12. **[A-BUG-12, P1]** Drawer/wizard deep-links matched only against current-page
    rows → `?drawer=<id>` for an off-page project silently never opens
    (`PublisherRosterClient.tsx:91-108`).

*Security / dead code / design:*
13. **[SEC-1, P1]** Share HTML page sends no `Cache-Control: no-store` — CDN-cache
    risk for unlocked proposal HTML (`share/[token]/page.tsx:35`).
14. **[BUG-6/UX-1, P1]** `PublisherProjectMembersPanel` dead production code
    (zero importers) — feature gap or stale scaffold.
15. **[D-1, P1]** `ClientPreviewBanner` hardcodes amber palette bypassing tokens.
16. **[D-9, P1]** Mobile/desktop split via imperative `matchMedia` at click time;
    `mobile` empty-state variant exists but is never rendered (dead).
17. **[D-12, P1]** Copy "Copied" feedback never resets (3 sites).
18. **[D-15, P1]** Roster list has no listbox/arrow-key semantics.

**Notable P2:** `closeWizard` leaves `project` param (A-BUG-13); picker focus
lands on close button not search (A-BUG-9); warning text contrast borderline
4.51:1 (D-17); link-as-button duplicated & drifted in 4 sites (D-5); D1 RTs
invisible to tracing (PF-6); mutations do full `router.refresh()` (PF-8).

**Cleared suspicions:** no redirect loop in `page.tsx`; no XSS; no memory leaks.

## 6. Execution DAG (remediation units — for a FUTURE implementation run)

Units are independent unless noted (UNIT-11 should follow UNIT-8/9/10). Owner
can pick any subset; nothing here is auto-executed. Each `UNIT-*` in
`05-execution-units.md`. Improve-stage added UNIT-8..11.

```
UNIT-1 (perf: roster query consolidation + RT reduction)
UNIT-2 (bug: activity source-cap + 250 cap + load() guard)
UNIT-3 (bug: response dedupe race)
UNIT-4 (sec: share Cache-Control header)
UNIT-5 (bug: mutation error handling + in-flight ref + onError)
UNIT-6 (deadcode: members panel — owner intent)
UNIT-7 (P2/P3 cleanup: amber, copy-reset, aria-live, console, constants, focus)
UNIT-8 (client state sync: searchValue, selectedProjectId, matchMedia, deep-link, closeWizard)  [improve-pass]
UNIT-9 (ShareWizard lifecycle: verificationPending, retry, draft-wipe, checkbox)                [improve-pass]
UNIT-10 (a11y: roster listbox + non-color selection cue)                                       [improve-pass]
UNIT-11 (bundle: next/dynamic ShareWizard/Drawer/Picker + Suspense split)                      [improve-pass]
```

**Recommended order (impact/risk for first-users stage):** UNIT-4 → (D-12/D-13/D-1
subset of UNIT-7) → PF-3 (⊂UNIT-1) → UNIT-8 → UNIT-3 → UNIT-9 → UNIT-2 → UNIT-5
→ UNIT-10 → UNIT-11 → UNIT-6 (after owner intent) → rest of UNIT-7.

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
