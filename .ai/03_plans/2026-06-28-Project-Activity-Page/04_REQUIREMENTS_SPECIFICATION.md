# 04 — Requirements Specification

Every requirement has a stable ID, a rationale, a source, a priority, dependencies, objective acceptance criteria, a validation method, affected code areas, and risks. Priorities: `P0` (blocker), `P1` (must-have for v1), `P2` (nice-to-have for v1, can defer), `P3` (explicitly out of scope for v1, captured for v2).

## Glossary (ubiquitous-language anchor)

- **Project** — top-level entity the page is scoped to. Matches `public.projects`.
- **Estimate (sheet)** — an estimate inside a project. Matches `public.estimates`.
- **Activity event** — a single audit row from any source table (estimate, share, comment, decision, collaboration).
- **ActivityViewModel** — the rendered representation returned by `compose*Activity` in `src/lib/activity/`.
- **Scope** — which slice of the project the timeline covers: `whole-project`, `project-only`, or `estimate:{estimateId}`.
- **Action class** — the semantic category of an event: `created`, `edited`, `deleted`, `reordered`, `shared`, `commented`, `decided`, `invited`, `viewed`, `versioned`, `system`.
- **Actor** — who performed the event. Internal users come from `profiles`. Client/recipient actors come from `shared_link_recipients.display_name`.
- **Recipient / Client** — the external person who received a shared link for the project. The two terms are used interchangeably here; "client" is the user-facing word.
- **Cursor** — opaque pagination token; encodes `(created_at, id)` tie-breaker per source. It is transient client pagination state, not part of the shareable URL contract.

## FR — Functional requirements

### FR-01 (P0) — Authenticated route
The route `/workshop/projects/{projectId}/activity` exists, is authenticated, and renders inside the existing `WorkshopPageShell` + `ProjectMiniSidebar` chrome.
- Source: brief.
- Acceptance: an authenticated request returns 200 with the chrome visible; an unauthenticated request is redirected by the existing proxy.
- Validation: Vitest DOM smoke + manual browser check.
- Affected: `src/app/workshop/projects/[projectId]/activity/page.tsx`.
- Risks: if `projectId` is invalid, must `notFound()` or `redirect(/workshop?removedProject=...)` like the dashboard does.

### FR-02 (P0) — Project ownership gate
The page 404s if the project does not exist in the current workspace. If the project exists but the user cannot edit the project, the page renders a permission-denied state inside the chrome.
- Source: `02_FEATURE_BRIEF_AND_SCOPE.md` authority section; dashboard precedent in `src/app/workshop/projects/[projectId]/page.tsx`.
- Acceptance: invalid `projectId` → `redirect(/workshop?removedProject=...)` if UUID-shaped, else `notFound()`; project that exists but is not editable → render a permission-denied state inside the chrome.
- Validation: Vitest denial test.
- Affected: `src/app/workshop/projects/[projectId]/activity/page.tsx`; reuses `getCurrentWorkspaceProject` and `can_edit_project`.

### FR-03 (P0) — Multi-source activity timeline (whole-project scope)
In the default `whole-project` scope, the page renders a merged, deduplicated, stable-paginated timeline composed from `estimate_sheet_events`, `project_publications`, `shared_link_comments`, `shared_link_responses`, `shared_link_events`, and `collaboration_audit_events`.
- Source: brief ("history of the whole project").
- Acceptance: timeline items from all six sources appear, sorted by `(created_at desc, id desc)`, with stable tie-breakers; actor labels resolve for both internal users and recipients.
- Validation: repository Vitest unit test with seeded fixtures.
- Affected: new `src/lib/repositories/project-activity-feed-repository.ts` (expected name).
- Risks: see `09_PERFORMANCE_RELIABILITY_OBSERVABILITY.md` for fan-out query budget.

### FR-04 (P0) — Scope selector (whole-project / project-only / estimate)
The page exposes a single-select scope control with three modes:
1. `whole-project` — every source.
2. `project-only` — project-level events only: publications, shared-link events/comments/responses that are not tied to one estimate where that can be determined, and collaboration audit rows with `estimate_id is null`; excludes estimate-sheet mutation events.
3. `estimate:{estimateId}` — every source filtered to that estimate (estimate events for that estimate + every comment/response whose `estimate_id` matches + every publication that contains the estimate in its snapshot + collaboration audit rows with `estimate_id` equal to the selected estimate). Project-wide collaboration audit rows are excluded from estimate scope unless a row explicitly carries that estimate id.
- Source: brief ("see the history of the whole project, of just the project (without the estimate sheet activity history) or select an estimate sheet and see its activity history").
- Acceptance: changing scope visibly changes the timeline; URL state reflects the chosen scope.
- Validation: client component test.
- Affected: client component scope control + repository scope argument.
- Risks: `estimate:{estimateId}` scope must join publications via `activity_target_labels_json ->> 'estimateLabels'` lookup to know which publications contain the estimate.

### FR-05 (P1) — Action filter (multi-select)
The page exposes a multi-select action filter with at minimum the following buckets, derived from the existing `ActivityAction` enum and the existing estimate-sheet filter dictionary: `{all, created, edited, deleted, reordered, shared, commented, decided, invited, viewed, versioned, system}`. Selecting multiple buckets ORs them.
- Source: brief ("filter out things like only show deletion history, only show editing history").
- Acceptance: with `deleted` selected, only delete-class events appear; with `deleted, commented` selected, both appear.
- Validation: client component test + repository filter test.
- Affected: client filter row + repository action-class derivation.
- Risks: action classification is a derivation from `(source, event_type, target_kind, decision)`; see `06_ARCHITECTURE_AND_TECHNICAL_DESIGN.md` for the mapping.

### FR-06 (P1) — Actor filter (single-select internal user)
The page exposes a single-select dropdown listing internal workspace members who are members of this project. Selecting one restricts the timeline to events with that actor. An "edited by me" preset (`actor=me`) is a one-click shortcut.
- Source: brief ("per user ... only show activities by user A").
- Acceptance: selecting an actor hides all events not performed by them; the URL reflects `actor=<userId>` or `actor=me`.
- Validation: client component test.
- Affected: client filter row + repository `actorUserId` argument + `project_members` lookup.
- Risks: ODD-02 chooses project members for v1; reversal is low-cost if workspace-wide actor filters are later requested.

### FR-07 (P1) — Client filter (single-select shared-link recipient)
The page exposes a single-select dropdown listing `shared_link_recipients.display_name` for recipients on **active** publications on this project. Selecting one restricts the timeline to events whose `recipient_id` matches.
- Source: brief ("filter and see only activities by the client lets say a shared link has been sent to the client and then the cliend opened it or commended it").
- Acceptance: selecting a recipient hides all events not belonging to them; URL reflects `client=<recipientId>`.
- Validation: client component test.
- Affected: client filter row + repository `recipientId` argument + `shared_link_recipients` lookup.
- Risks: PII minimization — only display_name is rendered, never email (see `08_SECURITY_PRIVACY_THREAT_MODEL.md`).

### FR-08 (P1) — URL state is canonical for filters and scope
All filters and scope are reflected in URL search params (`?scope=...&action=...&actor=...&client=...`). Navigating back/forward restores filter state. Sharing a URL reproduces the same filtered first page for another authorized user. Pagination cursor is intentionally excluded from the shareable URL contract.
- Source: AGENTS.md + repo pattern (URL state for shareable navigation).
- Acceptance: changing any filter updates the URL; reloading preserves filters; back/forward works.
- Validation: client component test.
- Affected: client URL-state helpers.
- Risks: must guard against invalid UUIDs in URL params.

### FR-09 (P1) — Cursor pagination
The timeline paginates with a cursor. "Load more" appends the next page via the authenticated read-only pagination loader. Cursor encodes the last `(created_at, id)` per source and stays in client state rather than becoming canonical URL state.
- Source: brief (implicit) + existing `listProjectActivityPage` precedent.
- Acceptance: clicking "Load more" appends items; cursor is stable across rapid clicks.
- Validation: client component + repository test.
- Affected: client + repository cursor handling.
- Risks: see `09` for cursor filter correctness across multi-source merges.

### FR-10 (P1) — Partial-source resilience
If a source query fails (e.g. `collaboration_audit_events` unavailable), the page still renders the other sources, with a non-blocking "partial data" indicator.
- Source: existing `readPublisherWorkspaceActivity` precedent (`unavailableSources` field).
- Acceptance: simulated source failure does not break the page; `unavailableSources` is surfaced.
- Validation: repository test with stubbed failing source.
- Affected: repository + client partial-state UI.

### FR-11 (P2) — Refresh
A visible "Refresh" action re-runs the query from the beginning (cursor cleared).
- Source: useful baseline affordance.
- Acceptance: clicking refresh drops cursor and re-fetches.
- Validation: client component test.

### FR-12 (P3, out of scope for v1) — Real-time live updates, search, export, change-diff inspector, AI summary, cross-project feed
Captured for v2.
- Source: `02` non-goals.

## UX — User-experience requirements

### UX-01 (P0) — Adapt dashboard chrome
The page reuses the dashboard's chrome (header, breadcrumbs, mini-sidebar, metadata strip) so the activity page reads as a sibling of Overview.
- Source: brief ("adapt the ui of the project dashboard page").
- Acceptance: screenshots side-by-side show consistent header, spacing, and sidebar.
- Validation: visual review against `ProjectDashboardClient` rendering.

### UX-02 (P0) — Filter row layout
Filter controls sit in a single sticky filter row at the top of the content area (Scope | Action | Actor | Client | Clear), with a count summary ("Showing X of Y") on the right.
- Source: best-practice for audit dashboards; matches existing dashboard tile density.
- Acceptance: row stays visible during scroll; "Clear" resets all filters.
- Validation: DOM test asserting sticky positioning + clear behavior.

### UX-03 (P1) — Each activity item shows: timestamp, actor, action verb, target label, optional summary, optional delta, optional source badge.
- Source: existing `ActivityViewModel` shape.
- Acceptance: every rendered item presents these fields; missing fields fall back gracefully (e.g. "Unknown user", "the proposal").
- Validation: DOM snapshot test.

### UX-04 (P1) — Empty state
When the filtered result is empty, the page shows a contextual empty state:
- No activity at all → "No activity yet. As you and your client interact with this project, the history will appear here."
- Filters exclude everything → "No activity matches your filters. Try clearing them."
- Source: AGENTS.md UX state coverage.
- Acceptance: each empty case renders the right copy.
- Validation: DOM test.

### UX-05 (P1) — Loading state
Initial load shows a meaningful skeleton that matches the dashboard tile rhythm. "Load more" shows an inline spinner, not a full-page overlay.
- Source: AGENTS.md UX state coverage.
- Acceptance: skeleton renders before first paint of data; spinner renders during pagination.
- Validation: DOM test.

### UX-06 (P1) — Error state
If the page fails to load initial data, the page shows an error state with a retry button and never leaks the underlying error message.
- Source: AGENTS.md UX state coverage.
- Acceptance: simulated server error → friendly error UI; no stack trace.
- Validation: DOM test.

### UX-07 (P1) — Permission-denied state
If the user cannot edit the project (read-only spectator), the page shows a permission-denied panel inside the chrome instead of the activity UI.
- Source: FR-02.
- Acceptance: spectator sees a clear "You don't have access to this project's activity" panel.
- Validation: DOM test.

### UX-08 (P2) — "Edited by me" preset
One-click button above the filter row that sets `actor=me`.
- Source: ODD-08 owner-delegated default.
- Acceptance: clicking it filters to current user's events.
- Validation: client component test.

## A11Y — Accessibility requirements

### A11Y-01 (P0) — Keyboard operability
Every filter control, the scope selector, the "Load more" button, the "Clear" button, and the "Refresh" button are fully operable from the keyboard with visible focus.
- Acceptance: Tab order is logical; Enter/Space activate controls; Esc closes any open dropdown.
- Validation: keyboard-only interaction test.

### A11Y-02 (P0) — Screen-reader semantics
- The filter row is a `<form role="search">` with an accessible name.
- Each filter control has a `<label>` (visible or visually-hidden).
- The timeline is a `<ul>`/`<ol>` of `<li>` items, each with a heading or named region.
- The "Showing X of Y" counter is an `aria-live="polite"` region.
- Acceptance: axe + manual screen-reader spot check.
- Validation: axe assertions in DOM test + manual.

### A11Y-03 (P1) — Focus restoration
After "Load more", focus moves to the first new item (or stays on the button, per UX team preference — implement the most common pattern: keep focus on the button and announce the new count).
- Acceptance: keyboard-only test confirms no focus loss.
- Validation: DOM test.

### A11Y-04 (P1) — Reduced motion
Skeleton/transition animations respect `prefers-reduced-motion: reduce`.
- Acceptance: in OS reduced-motion mode, animations are absent or minimized.
- Validation: visual check.

### A11Y-05 (P1) — Non-color status cues
Action classes are not communicated by color alone. Each chip has an icon and/or text label.
- Acceptance: grayscale screenshot still readable.
- Validation: visual check.

### A11Y-06 (P1) — Color contrast
All text and controls meet WCAG 2.2 AA contrast in the project's neutral palette.
- Acceptance: axe contrast pass.
- Validation: axe assertions in DOM test.

## ARCH — Architecture requirements

### ARCH-01 (P0) — Server Component owns initial fetch + auth
The route Server Component runs ownership check + initial multi-source fetch and passes serializable `ActivityViewModel[]` + cursor + counts to the client component.
- Source: AGENTS.md, Next.js 16 RSC pattern.
- Acceptance: client component never directly calls Supabase on initial render.
- Validation: code review + DOM test asserting server-side data path.

### ARCH-02 (P0) — Smallest `"use client"` boundary
Only the interactive surface (filter row, scope selector, list, "Load more", refresh) is a Client Component. The chrome wrapper remains Server Component.
- Source: AGENTS.md, Next.js 16 local docs.
- Acceptance: only one client component file is added.
- Validation: code review.

### ARCH-03 (P0) — Repository is server-only
The new repository file imports server-only Supabase client and is never imported from a client component.
- Source: AGENTS.md, existing repository pattern.
- Acceptance: no client bundle dependency on the repository.
- Validation: `import "server-only"` at top of repository; code review.

### ARCH-04 (P1) — Existing repositories are not broken
`listProjectActivityPage` and `readPublisherWorkspaceActivity` continue to work unchanged for their existing callers (dashboard preview card, publisher surface).
- Source: non-regression.
- Acceptance: existing tests still pass.
- Validation: existing `bun run test:dom` matrix.

### ARCH-05 (P1) — Cache owner and revalidation
The Server Component prefetch uses request-local `React.cache` only where it deduplicates work inside a single request. No `use cache`, `cacheLife`, `cacheTag`, or `revalidateTag` for v1 because the route reads request-time auth/search state and must not cross-user cache. After future mutations, use `router.refresh`/`revalidatePath` only when that mutation is added and tested.
- Source: AGENTS.md cache rules + Next.js 16 local docs (`searchParams` causes dynamic rendering; `use cache` cannot directly access request-time APIs).
- Acceptance: no cross-user leakage.
- Validation: code review.

## DATA — Data requirements

### DATA-01 (P0) — Scoped collaboration-audit RPC migration only
The implementation requires exactly one scoped migration for `read_project_collaboration_audit_events(...)` because `collaboration_audit_events` has direct API access revoked and a restrictive deny policy. The migration must keep direct table reads denied, grant execute only to `authenticated`, authorize with `can_edit_project(target_project_id)`, return only display-safe columns, include rollback/fix-forward instructions, and update generated Supabase types. No denormalized activity table or broad schema redesign is allowed.
- Source: `03_SOURCE_AND_CODEBASE_AUDIT.md`; `supabase/migrations/20260614152946_explicit_internal_table_deny_policies.sql`.
- Acceptance: direct authenticated `.from("collaboration_audit_events")` reads remain denied; authorized users can call the RPC for their editable project; unauthorized users get no rows or an authorization error.
- Validation: migration schema test + local/provider RLS/RPC proof recorded in `19_RESEARCH_REVIEW_AND_QA_EVIDENCE.md`.

### DATA-02 (P0) — Project boundary
All queries are scoped to `project_id = <this project>` (and, where relevant, `workspace_id = <this workspace>`).
- Source: AGENTS.md standing DB mandate.
- Acceptance: repository tests assert the scoping is unconditional.
- Validation: repository unit tests with cross-project fixtures.

### DATA-03 (P1) — Cursor stability
Cursor filters use `(created_at, id)` tie-breakers per source and survive rapid pagination.
- Acceptance: load-more never yields duplicate items or skips items.
- Validation: repository test with deterministic fixtures.

### DATA-04 (P1) — Index usage
The repository reads use `estimate_sheet_events_project_created_idx`, the relevant shared-link indexes, and an indexed collaboration-audit RPC path. The RPC migration should add `collaboration_audit_events(project_id, created_at desc, id desc)` if the existing `(project_id, created_at desc)` index is insufficient for the cursor sort/filter. No sequential scans on primary closed-beta path.
- Acceptance: query plan review (or local `EXPLAIN`) confirms index usage for the primary path.
- Validation: manual `EXPLAIN` once during implementation; record artifact path.

## API — API / network requirements

### API-01 (P0) — One authenticated read-only pagination loader
Initial render and filter/scope changes are RSC-owned. "Load more" uses one narrow authenticated GET Route Handler (for example `src/app/api/projects/[projectId]/activity/route.ts`) because appending cursor pages without putting cursor into the shareable URL requires a transient client-owned fetch. The handler shares the same authz, input validation, repository, DTO minimization, limit clamp, and partial-source behavior as the route.
- Source: owner-delegated ODD-06 and ODD-12; Next.js App Router URL-state tradeoff.
- Acceptance: no unauthenticated/public API is added; the handler denies unauthorized projects; response DTO contains no email or secrets; it sets no cross-user cache headers.
- Validation: Route Handler tests, security denial tests, DTO snapshot, code review.

### API-02 (P1) — Read-your-own-writes
If the user just performed an action elsewhere (e.g. published a share from another tab) and navigates here, the activity must reflect it without a hard refresh.
- Source: AGENTS.md cache rules.
- Acceptance: each navigation performs a fresh server fetch.
- Validation: manual.

## SEC — Security requirements

See `08_SECURITY_PRIVACY_THREAT_MODEL.md` for the full threat model. Summary:

### SEC-01 (P0) — Project ownership enforced server-side
Server Component calls `getCurrentWorkspaceProject` and (for edit-gated features) `can_edit_project` before any data fetch.
### SEC-02 (P0) — Recipient PII minimization
The page never displays `shared_link_recipients.email` or `shared_link_comments.author_email`. It uses `display_name` only.
### SEC-03 (P0) — No client-side secrets
No `service_role` key, no `NEXT_PUBLIC_` exposure beyond what exists; client DTO contains only display-safe fields.
### SEC-04 (P0) — RLS is the last line of defense
Even if the repository is incorrectly scoped, RLS/policies on `estimate_sheet_events`, `shared_link_*`, and `project_publications` prevent cross-project reads; `collaboration_audit_events` is only exposed through the scoped RPC because direct table reads are intentionally denied.
### SEC-05 (P1) — Rate-limit aware
Pagination cursor + limit clamp (max 50) prevents unbounded scans.
### SEC-06 (P1) — No CSRF / injection surface
No form mutation, no user-controlled SQL string interpolation. All Supabase queries use parameterized builders.

## PERF — Performance requirements

See `09_PERFORMANCE_RELIABILITY_OBSERVABILITY.md` for the full contract. Summary:

### PERF-01 (P0) — Initial route response budget
Server Component prefetch completes within ~250ms p50 at current closed-beta scale (single workspace, single active project).
### PERF-02 (P1) — Client bundle impact
The new client component adds ≤ 10 KB gzipped to the project route bundle.
### PERF-03 (P1) — No N+1 actor/recipient label lookups
All actor and recipient labels are resolved with at most one bulk `profiles.in(...)` and one bulk `shared_link_recipients.in(...)` per page render.
### PERF-04 (P1) — Parallel source queries
The five multi-source fan-out queries run via `Promise.all`, not sequentially.

## REL — Reliability requirements

### REL-01 (P0) — Partial-source resilience (mirrors FR-10).
### REL-02 (P1) — Graceful degradation if Supabase is unreachable
An upstream network error renders the friendly error UI; it never throws an uncaught exception to the route error boundary.
### REL-03 (P1) — No silent failures
Any source unavailable path is logged via existing logging and surfaced in the `unavailableSources` field.

## OPS — Operational requirements

### OPS-01 (P2) — Feature flag (optional)
Implementation MAY add `NEXT_PUBLIC_PROJECT_ACTIVITY_PAGE_ENABLED` to gate the nav link, defaulting to enabled. If not added, the page is always on.
### OPS-02 (P1) — Observability
Any source-unavailable warning is logged with a structured label.
### OPS-03 (P1) — Rollback
Reverting the implementation is documented in `13_ROLLOUT_ROLLBACK_AND_OPERATIONS.md`.

## TEST — Testing requirements

See `12_TEST_AND_VALIDATION_STRATEGY.md` for the full matrix. Summary:

### TEST-01 (P0) — Repository unit tests
Cover: scope filtering (3 scopes), action filter, actor filter, client filter, cursor stability, partial-source.
### TEST-02 (P0) — Client component DOM tests
Cover: filter row, scope selector, URL state, empty/loading/error/partial/permission-denied states, "Load more", "Clear", "Refresh".
### TEST-03 (P0) — Security denial tests
Cover: cross-project access, collaboration-audit RPC authorization, direct table-read denial, recipient email leak prevention, unauthenticated access.
### TEST-04 (P1) — A11y assertions
axe assertions for the filter row and one rendered item.

## DOC — Documentation requirements

### DOC-01 (P2) — User-facing copy is reviewed
All visible strings are spelled out in `05_UX_UI_ACCESSIBILITY_PLAN.md` and reviewed before implementation.
### DOC-02 (P3, v2) — In-app help
Deferred.

## Shadow-path matrix (applies to FR-03, FR-04, FR-05, FR-06, FR-07, FR-09, FR-10)

| Flow | Happy path | Nil/missing input | Empty result | Invalid input | Auth denied | Upstream error | Concurrency/race | Retry/idempotency | User-visible result | Test |
|---|---|---|---|---|---|---|---|---|---|---|
| Initial fetch (no filters) | Timeline renders | n/a | Empty state | invalid projectId → 404/redirect | permission-denied panel | partial indicator + retry | n/a (single request) | refresh re-fetches | 6-source timeline | repo + DOM test |
| Scope change | URL updates, list re-fetches | n/a | Empty state | invalid scope enum → default | n/a | partial indicator | rapid scope changes debounced via RSC navigation | back/forward restores | filtered list | DOM test |
| Action filter change | URL updates, list filters | "all" default | Empty state | invalid action enum ignored | n/a | partial indicator | rapid changes coalesced | n/a | filtered list | DOM test |
| Actor filter change | URL updates | "all" default | Empty state | invalid userId ignored | n/a | partial indicator | n/a | n/a | filtered list | DOM test |
| Client filter change | URL updates | "all" default | Empty state | invalid recipientId ignored | n/a | partial indicator | n/a | n/a | filtered list | DOM test |
| Load more (cursor) | Items append via authenticated loader | n/a | End-of-list | corrupted cursor → reset to page 1 | denied project → 403/404 | partial indicator | rapid clicks dedup by in-flight cursor | same cursor = same page | appended items without shareable URL mutation | route-handler + repo + DOM test |
| Source unavailable | Other sources render | n/a | Empty if all sources empty | n/a | n/a | unavailableSources surfaces | n/a | retry next click | partial banner | repo test |
