# 04 — Requirements Specification

> **PASS-2 AUDIT BANNER (2026-06-25).** This document has 2 CRITICAL requirement refinements and 2 HIGH requirement refinements recorded in `18_AUDIT_FINDINGS_AND_CORRECTIONS_2026-06-25.md`. Headlines: ARCH-DEFECT-05 (FR-07 recipient-add MUST specify a per-action cap — recommend 50 emails per add-action — to prevent Resend blast risk; existing `shared_link_atomic_publish_and_digest_slot` throttle is per-publication, not per-bulk-add-action), ARCH-DEFECT-11 (FR-09 sheet-selection change MUST specify snapshot_version behavior — does bump invalidate recipient cookies? cite `createPublicationViewToken` + `verifyPublicationAccessCookieValue` semantics in `src/lib/publication/security.ts`), FAB-U02 (FR-18 acceptance MUST cite `src/components/ui/empty-state.tsx` primitive for reuse), FAB-U03 (FR-20 skeleton reuse unclear — either create `PublisherRosterSkeleton.tsx` or document row-shape adapter from `ProjectsListSkeleton.tsx`). Read doc 18_ for full evidence.
>
> **UX/UI RESEARCH ADDENDUM (2026-06-25).** `19_UX_UI_RESEARCH_AND_REFINEMENT_2026-06-25.md` adds UX-09..12, A11Y-08..09, and TEST-07..08. These requirements are source-backed by the research map in doc 19 and should be treated as part of Phase 0 planning before code work starts.

---

Every requirement has a stable ID, objective acceptance criterion, source, priority, dependency, and validation method. Categories: FR (Functional), UX, A11Y, ARCH, DATA, API, SEC, PERF, REL, OPS, TEST, DOC.

Priority legend: **P0** launch-blocking · **P1** Phase 1 exit · **P2** Phase 2 · **P3** post-launch.

---

## FR — Functional Requirements

### FR-01 · Publisher roster (workspace scope)
- **Statement.** The `/workshop/publisher` route renders a roster of every publication visible to the current user across their workspace projects.
- **Rationale.** G1 — unified roster. Builders currently flip between project pages.
- **Source.** User brief; `01_EXECUTIVE_SUMMARY.md` §"What the Publisher page must ADD" G1.
- **Priority.** P0.
- **Dependencies.** DATA-01 (or the existing `workspace-repository.ts` per-project rollup).
- **Acceptance criterion.** Authenticated workspace admin sees a row per active publication, ordered by `latestActivityAt desc`. Each row shows the primary roster fields from UX-09 (publication/project, status/health, recipients summary, latest activity, sheet scope, actions). Secondary metrics such as open count, last-opened timestamp, snapshot version, and days-behind warning are available in the drawer or detail surface.
- **Validation.** Vitest DOM test renders the roster with mocked server data; Playwright e2e hits `/workshop/publisher` and asserts at least one row for a seeded workspace.
- **Affected code.** `src/app/workshop/publisher/page.tsx` (rewrite from stub), new `src/components/workshop/publisher/PublisherRoster.tsx`, reuse `src/lib/repositories/workspace-repository.ts`.

### FR-02 · Publication status filter
- **Statement.** Roster supports filter tabs: All · Active · Stale · Expired · Revoked · Drafts.
- **Rationale.** Triage efficiency.
- **Source.** G1.
- **Priority.** P1.
- **Dependencies.** FR-01.
- **Acceptance.** Clicking a tab filters server-side; URL param `?status=stale` persists.
- **Validation.** DOM test asserts URL-param-driven filtering.

### FR-03 · Publication detail drawer
- **Statement.** Clicking a roster row opens a right-side drawer (or full-page route `/workshop/publisher/[publicationId]`) showing recipients, snapshot version, sheet selection, comments, decisions, events, and manager actions.
- **Rationale.** Single-screen flow.
- **Source.** G1, G4.
- **Priority.** P0.
- **Dependencies.** FR-01, UX-03.
- **Acceptance.** Drawer surfaces every field of `ProjectPublicationSummary` (`src/lib/publication/types.ts:11-46`) plus the activity timeline.
- **Validation.** DOM test renders drawer with mocked data.

### FR-04 · Publish action
- **Statement.** "Publish" CTA opens the existing publication modal (or its Publisher-equivalent) to create a new publication for a selected project.
- **Rationale.** Single-screen flow.
- **Source.** User brief.
- **Priority.** P0.
- **Dependencies.** FR-01; reuses `src/lib/publication/actions.ts:publishProjectPublication`.
- **Acceptance.** After publish, roster updates within one revalidate; new publication appears at top.
- **Validation.** DOM + e2e.

### FR-05 · Rotate token
- **Statement.** Manager can rotate a publication's share token from the roster row or drawer.
- **Rationale.** Security hygiene.
- **Source.** G1.
- **Priority.** P0.
- **Dependencies.** FR-03; reuses existing rotate server action.
- **Acceptance.** Old token stops working immediately; new token is copyable; audit row written.
- **Validation.** Vitest server-action contract test + e2e.

### FR-06 · Revoke publication
- **Statement.** Manager can revoke a publication; recipients see the generic revoked state on `/share/[token]`.
- **Priority.** P0.
- **Dependencies.** FR-03.
- **Acceptance.** Status transitions to `revoked`; receiver route shows revoked screen; audit row written.

### FR-07 · Recipient add / remove
- **Statement.** Manager can add or remove recipients from the drawer.
- **Priority.** P0.
- **Dependencies.** FR-03; reuses `RecipientEmailComposer.tsx`.
- **Acceptance.** Add/remove persists; add-recipient is capped at 50 emails per action unless D-ARCH-07 changes the cap; invalid addresses render inline errors; Resend digest fires on add; audit row written.

### FR-08 · Password protect / clear
- **Statement.** Manager can set, change, or clear a publication password from the drawer.
- **Priority.** P1.
- **Dependencies.** FR-03; reuses `src/lib/publication/security.ts` hash/verify.
- **Acceptance.** Setting a password changes `credentialVersion` and invalidates existing access cookies (verified by `verifyPublicationAccessCookieValue`).

### FR-09 · Sheet selection
- **Statement.** Manager can change which estimate sheets are exposed by the publication.
- **Priority.** P1.
- **Dependencies.** FR-03; reuses `SheetPickerList.tsx`.
- **Acceptance.** Snapshot regenerates on save; recipients see updated sheets on next view. Phase 0 must resolve D-ARCH-08: whether the save bumps `snapshot_version` and invalidates recipient cookies, citing `createPublicationViewToken` and `verifyPublicationAccessCookieValue`.

### FR-10 · Unified activity feed (workspace scope)
- **Statement.** A workspace-scoped activity timeline aggregates `shared_link_events`, `shared_link_comments`, `shared_link_responses`, `collaboration_audit_events`, `estimate_sheet_events` into one chronological list.
- **Rationale.** G4.
- **Priority.** P1 (Phase 2).
- **Dependencies.** DATA-02 or application-layer union.
- **Acceptance.** Timeline shows 50 most-recent events with type icon, actor, target, timestamp; paginated "Load more".

### FR-11 · Bulk rotate / revoke
- **Statement.** Manager can select multiple publications and apply rotate / revoke in one action.
- **Priority.** P3 (post-launch).
- **Dependencies.** FR-05, FR-06, G7.
- **Acceptance.** Confirmation modal previews affected publications; bulk action is atomic per publication (one failure does not block others).

### FR-12 · Project drill-down
- **Statement.** `/workshop/publisher?project=<id>` filters roster to one project; deep-linkable.
- **Priority.** P1.
- **Dependencies.** FR-01.
- **Acceptance.** URL param drives server query; back button restores unfiltered view.

### FR-13 · Stale-snapshot rollup
- **Statement.** Roster highlights publications whose snapshot is > N days behind the latest estimate (`staleSnapshotWarning` field already exists).
- **Priority.** P1.
- **Dependencies.** FR-01.
- **Acceptance.** "Stale" filter tab returns these publications.

### FR-14 · Member roster per project (RBAC visibility)
- **Statement.** From the Publisher roster, manager can drill into a project's member list with each member's role and effective sheet-access mode.
- **Rationale.** G3.
- **Priority.** P1.
- **Dependencies.** FR-12.
- **Acceptance.** Member list shows: email, profile color, role (owner/admin/editor/viewer), sheet-access mode (inherits-project / sheet-overrides / restricted), per-sheet overrides (if any).

### FR-15 · Access-mode toggle
- **Statement.** Manager can toggle a sheet's access mode between `inherits-project`, `sheet-overrides`, `restricted`.
- **Priority.** P2 (Phase 3).
- **Dependencies.** FR-14.
- **Acceptance.** Mode change persists; RLS reflects new mode immediately on next estimate-sheet access.

### FR-16 · Sheet-level member add/remove
- **Statement.** When mode = `sheet-overrides` or `restricted`, manager can add/remove per-sheet members.
- **Priority.** P2.
- **Dependencies.** FR-15.
- **Acceptance.** Per-sheet member list updates; RLS reflects change.

### FR-17 · Sidebar nav item
- **Statement.** `MainSidebar.tsx` includes a `Publisher` item linking to `/workshop/publisher`.
- **Rationale.** G5.
- **Priority.** P1.
- **Dependencies.** None.
- **Acceptance.** Item renders with active state when on `/workshop/publisher*`.

### FR-18 · Empty states
- **Statement.** Roster, drawer, timeline each render an empty state ("No publications yet — publish your first estimate", "No activity in the last 7 days").
- **Priority.** P1.
- **Acceptance.** Empty-state copy reuses `src/components/ui/empty-state.tsx` and has state-specific copy plus a direct action for no-publications, filtered-empty, feature-disabled, permission-denied, read-only, and mobile fallback states.

### FR-19 · Error states
- **Statement.** Failed server actions surface a toast with retry; the roster renders `WorkshopRouteErrorState` on unrecoverable errors.
- **Priority.** P1.
- **Acceptance.** Toast component reused; error boundary wraps the roster.

### FR-20 · Loading states
- **Statement.** Initial roster render shows a Publisher-specific row-shape skeleton; subsequent navigations use `route-loading-overlay`.
- **Priority.** P1.
- **Acceptance.** Add `PublisherRosterSkeleton.tsx` or document a row-shape adapter from `ProjectsListSkeleton.tsx`; no layout shift on data arrival; skeleton matches final row height ±4px.

---

## UX — User Experience

### UX-01 · Time-to-publish under 30s
- **Statement.** From the Publisher roster, a manager can publish a new shared link in under 30 seconds for a typical project (3 clicks + 1 password entry).
- **Priority.** P0.
- **Acceptance.** UX audit measures click count + time on a seeded workspace.

### UX-02 · Zero surface switches for common ops
- **Statement.** Rotate / revoke / add-recipient / change-password all complete from the Publisher drawer without leaving to `/workshop/projects/[id]`.
- **Priority.** P0.

### UX-03 · Drawer vs page decision
- **Statement.** Publication detail is a drawer (slide-over) on wide viewports, a full page on narrow viewports.
- **Priority.** P1.
- **Dependencies.** D3 (sidebar placement).

### UX-04 · Responsive floor
- **Statement.** Publisher is usable at ≥ 1024px (desktop builder persona). Tablet (768px) is the responsive floor. Mobile (<768px) renders an empty-state redirect to `/workshop`.
- **Priority.** P1.

### UX-05 · Copy-link affordance
- **Statement.** "Copy link" button on each roster row copies the publication URL to clipboard with a 2s toast confirmation.
- **Priority.** P0.

### UX-06 · Recipient roster sort
- **Statement.** Drawer's recipient list sorts by `lastOpenedAt desc` by default; sortable by email ascending.
- **Priority.** P2.

### UX-07 · Filter persistence
- **Statement.** Active filter state persists in URL (`?status=stale&project=<id>`); back/forward works.
- **Priority.** P1.

### UX-08 · Confirm destructive actions
- **Statement.** Revoke, bulk-revoke, password-clear, and access-mode-restrict require a confirmation modal previewing the affected recipients.
- **Priority.** P0.

### UX-09 · At-a-glance roster split
- **Statement.** The default roster caps visible task columns to: publication/project, status/health, recipients summary, latest activity, sheet scope, and actions. Secondary detail moves to the drawer, detail route, or expandable row.
- **Priority.** P0.
- **Source.** `19_UX_UI_RESEARCH_AND_REFINEMENT_2026-06-25.md` UX-R1/UX-R2.
- **Acceptance.** A DOM test asserts the default table does not render separate opens, last-opened, snapshot-version, and days-behind columns at desktop width; those fields are available in the detail surface.

### UX-10 · Permission-change impact preview
- **Statement.** Publication permission-changing actions show affected people/scope and truthful reversal or next-step behavior before/after mutation.
- **Priority.** P0.
- **Source.** `19_UX_UI_RESEARCH_AND_REFINEMENT_2026-06-25.md` UX-R3.
- **Acceptance.** Rotate, revoke, password clear/change, sheet-scope change, access-mode restrict, and recipient bulk-add previews identify impact; undo is shown only when the action is truly reversible.

### UX-11 · Tablet 768px support
- **Statement.** 768px-1023px viewport is supported as a priority-column roster with full-page/detail-route behavior for drawer content. Only `<768px` uses the desktop-first fallback.
- **Priority.** P1.
- **Source.** ARCH-DEFECT-13 in doc 18; `19` UX-R7.
- **Acceptance.** 768px portrait validation shows usable roster controls, no overlapping text, and a reachable publication detail surface.

### UX-12 · Copy-link privacy
- **Statement.** `Copy link` never navigates; future open/share anchors must not leak the authenticated workshop URL via the Referer header.
- **Priority.** P0.
- **Source.** D-OPS-01 in doc 15/doc 18; `19` UX-R8.
- **Acceptance.** Copy action writes to clipboard and confirms via toast/status. Any open-share anchor uses `rel="noreferrer"`, and `/workshop/*` uses `Referrer-Policy: no-referrer` or `same-origin` once D-OPS-01 is resolved.

---

## A11Y — Accessibility

### A11Y-01 · Keyboard navigation
- **Statement.** All roster + drawer + modal actions are reachable via Tab/Shift-Tab; Enter/Space activate; Esc closes drawer/modal.
- **Priority.** P0.
- **Acceptance.** axe-core + manual keyboard pass.

### A11Y-02 · Focus trap in modals
- **Statement.** Drawer and confirmation modals trap focus while open; return focus to trigger on close.
- **Priority.** P0.
- **Acceptance.** Reuses existing `Modal` focus-trap.

### A11Y-03 · ARIA on comboboxes
- **Statement.** Filter comboboxes use `creatable-combobox.tsx` ARIA pattern; listbox semantics; arrow-key navigation.
- **Priority.** P0.

### A11Y-04 · Screen-reader labels
- **Statement.** Every icon-only button has `aria-label`; status badges have `aria-label` describing the status.
- **Priority.** P0.

### A11Y-05 · Color contrast
- **Statement.** Profile colors (`src/lib/collaboration/colors.ts`) meet WCAG AA 4.5:1 against background; verified by `collaboration-colors-contrast.test.ts`.
- **Priority.** P0.

### A11Y-06 · Live region for toasts
- **Statement.** Toast notifications use `aria-live="polite"` and `role="status"`.
- **Priority.** P1.

### A11Y-07 · Reduced motion
- **Statement.** Drawer slide, skeleton pulse, and toast fade respect `prefers-reduced-motion: reduce`.
- **Priority.** P1.

### A11Y-08 · WCAG 2.2 AA target
- **Statement.** New Publisher surfaces target WCAG 2.2 AA, including visible focus, focus not obscured, target size, and keyboard operation.
- **Priority.** P0.
- **Acceptance.** Axe scan has zero critical violations; manual keyboard pass covers roster, drawer/detail page, modal, batch toolbar, and copy-link controls.

### A11Y-09 · Form error summary and inline errors
- **Statement.** Publish, recipient, password, sheet-scope, and destructive-confirmation forms render inline errors plus a top error summary on submit failure.
- **Priority.** P0.
- **Acceptance.** DOM tests assert summary text, field-level error text, `aria-describedby` wiring, and focus movement to the summary after submit failure.

---

## ARCH — Architecture

### ARCH-01 · Server-component-first roster
- **Statement.** The Publisher roster is a React Server Component that fetches via `workspace-repository.ts` server functions. No client-side privileged data fetch.
- **Priority.** P0.
- **Rationale.** Prevents privilege escalation via client-side filtering.

### ARCH-02 · Client islands for interactivity
- **Statement.** Filter tabs, drawer, modals, toasts are client components ("use client") composed inside the RSC roster.
- **Priority.** P0.

### ARCH-03 · No new crypto, no new auth
- **Statement.** Publisher reuses `src/lib/publication/security.ts` and `src/lib/collaboration/*` verbatim. Zero new cryptographic primitives.
- **Priority.** P0.

### ARCH-04 · Server actions for mutations
- **Statement.** Every mutation routes through existing server actions in `src/lib/publication/actions.ts` or `src/lib/collaboration/actions.ts`. No new public API endpoints in Phase 1.
- **Priority.** P0.

### ARCH-05 · Feature flag
- **Statement.** Publisher is gated by `ARCHESTIMATOR_PUBLISHER_ENABLED` (or extending existing flag pattern). Off → empty state.
- **Priority.** P0.

### ARCH-06 · No new mega-file
- **Statement.** Publisher code lives under `src/app/workshop/publisher/` and `src/components/workshop/publisher/`. No new entry in the Tier-2 mega-file list (`2026-06-21-Ponytail-Pass-Plan/`).
- **Priority.** P0.

### ARCH-07 · Repository boundary respected
- **Statement.** Publisher does NOT add direct Supabase calls in components. All data flows through `src/lib/repositories/` or `src/lib/{publication,collaboration}/actions.ts`.
- **Priority.** P0.

### ARCH-08 · Optimistic mutations
- **Statement.** Recipient add/remove and rotate use TanStack Query optimistic mutation pattern from `publication-optimistic.ts`.
- **Priority.** P1.

---

## DATA — Data

### DATA-01 · Workspace publications rollup
- **Statement.** Phase 1: server-component loop over per-project publication summaries from `workspace-repository.ts`. Phase 2: optional dedicated RPC `workspace_publications_summary` if measured slow.
- **Priority.** P1 (loop), P2 (RPC).
- **Acceptance.** 95th percentile roster render < 800ms for a 50-project workspace.

### DATA-02 · Workspace activity feed
- **Statement.** Phase 1: application-layer union of 5 audit/event tables, paginated. Phase 2: optional RPC `workspace_activity_feed`.
- **Priority.** P2.
- **Acceptance.** 50-event feed renders < 400ms.

### DATA-03 · No new table required for Phase 1
- **Statement.** Phase 1 reuses `project_publications`, `shared_link_*`, `project_members`, `estimate_sheet_*` as-is.
- **Priority.** P0.

### DATA-04 · Schema gap for per-recipient grants (future)
- **Statement.** If D1 (recipient edit-grant) moves past MVP, add a `shared_link_recipient_capabilities` table or column on `shared_link_recipients`. NOT in Phase 1.
- **Priority.** P3.

### DATA-05 · Audit on every manager action
- **Statement.** Every manager mutation (publish, rotate, revoke, recipient add/remove, password change, sheet selection change, access-mode toggle, member add/remove) writes a row to `collaboration_audit_events` or `account_security_events`.
- **Priority.** P0.
- **Acceptance.** Existing test helpers in `tests/vitest/security-findings-test-helpers.ts` extended to assert Publisher action audit.

---

## API — Network

### API-01 · No new public endpoint in Phase 1
- **Statement.** Publisher does not add `/api/*` routes in Phase 1.
- **Priority.** P0.

### API-02 · Server actions enforce origin
- **Statement.** Every Publisher-invoked server action that mutates state calls `assertSameOrigin` (or equivalent) on the request.
- **Priority.** P0.

### API-03 · Idempotency for rotate / revoke
- **Statement.** Rotate / revoke accept an idempotency key (or are naturally idempotent). Replay returns the current state without re-mutating.
- **Priority.** P1.

### API-04 · Rate-limit reuse
- **Statement.** Publisher mutations do NOT bypass existing rate limits (comment 5/min, decision via recipient pipeline, password lockout).
- **Priority.** P0.

---

## SEC — Security

### SEC-01 · RLS enforcement end-to-end
- **Statement.** Every roster query, every drawer query, every timeline query goes through Supabase RLS. Zero service-role reads for user-facing data.
- **Priority.** P0.
- **Acceptance.** Test: rotate a publication as a non-manager → 403-equivalent error; verify zero rows leak.

### SEC-02 · No token in URL logs
- **Statement.** Publication tokens never appear in server logs, error messages, or client bundles. The roster shows "Copy link" only; the URL is reconstructed on click from `clientLinkPath` (already hashed).
- **Priority.** P0.

### SEC-03 · Manager gate on every action
- **Statement.** Every Publisher-invoked server action calls `assertProjectPublicationManager(projectId)` or `canManageCollaborationRole(role)` equivalent.
- **Priority.** P0.

### SEC-04 · CSRF / same-origin
- **Statement.** Every state-changing server action asserts same-origin via the existing helpers.
- **Priority.** P0.

### SEC-05 · No client-side privileged filter
- **Statement.** The RSC roster only returns rows the current user can see. Client-side filter tabs operate on already-filtered data, never on a privileged superset.
- **Priority.** P0.

### SEC-06 · Recipient enumeration resistance
- **Statement.** Adding a recipient by email does not reveal whether that email is already a recipient of another publication (return generic success).
- **Priority.** P1.

### SEC-07 · Audit immutability
- **Statement.** Audit rows are insert-only. No UPDATE/DELETE path on `collaboration_audit_events` or `account_security_events` from app code.
- **Priority.** P0.

### SEC-08 · Stale snapshot warning integrity
- **Statement.** `staleSnapshotWarning` is computed server-side from `estimate_row_items.updated_at` vs `project_publications.snapshot_generated_at`. Client cannot forge a "fresh" state.
- **Priority.** P0.

### SEC-09 · Session cookie scope
- **Statement.** Publication access cookies are scoped per-token (`ae_publication_access_<suffix>`), `HttpOnly`, `Secure`, `SameSite=Lax`. Verified via existing `verifyPublicationAccessCookieValue` tests.
- **Priority.** P0.

### SEC-10 · OWASP Top 10 2025 mapping
- **Statement.** See `08_SECURITY_PRIVACY_THREAT_MODEL.md` for the per-category mapping.
- **Priority.** P0.

---

## PERF — Performance

### PERF-01 · Roster first paint < 1.2s
- **Statement.** 95th percentile TTFB + render < 1.2s on a 50-project / 100-publication workspace.
- **Priority.** P0.

### PERF-02 · Roster payload < 80KB gzipped
- **Statement.** Initial HTML + hydrating JS < 80KB gzipped.
- **Priority.** P1.

### PERF-03 · Drawer open < 200ms
- **Statement.** Clicking a roster row opens the drawer in < 200ms perceived.
- **Priority.** P1.

### PERF-04 · Activity feed paginated
- **Statement.** Timeline returns 50 events per page; "Load more" button fetches next 50.
- **Priority.** P1.

### PERF-05 · No N+1 on roster
- **Statement.** Roster query is at most: 1 workspace query + 1 projects query + 1 publications query + 1 activity-rollup query. No per-row follow-up queries.
- **Priority.** P0.

---

## REL — Reliability

### REL-01 · Graceful degradation
- **Statement.** If any one of the 5 audit tables is unavailable, the activity feed renders the available events with a "partial" badge.
- **Priority.** P1.

### REL-02 · Optimistic rollback
- **Statement.** Failed mutations roll back the optimistic state within 500ms and surface a retry toast.
- **Priority.** P1.

### REL-03 · Error boundary
- **Statement.** Roster + drawer + timeline each have an error boundary (`WorkshopRouteErrorState`) — one failing section does not blank the page.
- **Priority.** P0.

### REL-04 · Retry on transient failure
- **Statement.** Read queries retry once on transient Supabase error; mutations do NOT auto-retry (user-driven).
- **Priority.** P1.

---

## OPS — Operations

### OPS-01 · Feature flag default off
- **Statement.** `ARCHESTIMATOR_PUBLISHER_ENABLED` defaults off in production until Phase 1 exits.
- **Priority.** P0.

### OPS-02 · Audit dashboard entry
- **Statement.** Future ops dashboard can filter `account_security_events` by `action LIKE 'publisher_%'`.
- **Priority.** P2.

### OPS-03 · No new infrastructure
- **Statement.** Publisher adds no new background worker, no new cron, no new external service dependency.
- **Priority.** P0.

### OPS-04 · Rollback path
- **Statement.** Disabling `ARCHESTIMATOR_PUBLISHER_ENABLED` returns the 17-line stub behavior. No migration to reverse.
- **Priority.** P0.

---

## TEST — Testing

### TEST-01 · Vitest roster contract
- **Statement.** New `tests/vitest/publisher-roster.test.ts` renders the roster with 5 mocked publications and asserts every field per `ProjectPublicationSummary`.
- **Priority.** P0.

### TEST-02 · Vitest RBAC contract
- **Statement.** New `tests/vitest/publisher-rbac.test.ts` asserts: viewer → 0 publications visible; editor → only publications for accessible projects; admin/owner → all workspace publications.
- **Priority.** P0.

### TEST-03 · Playwright e2e
- **Statement.** New `e2e/publisher-roster.spec.ts` covers: open roster, filter, open drawer, rotate token, assert old token rejected, assert audit row written.
- **Priority.** P0 (behind `ARCHESTIMATOR_E2E_PUBLISHER=1`).

### TEST-04 · Security contract extension
- **Statement.** Extend `tests/vitest/security-findings-publication-contracts.test.ts` (or sibling) with Publisher-specific invariants: no service-role reads, audit on every action, RLS denial path.
- **Priority.** P0.

### TEST-05 · A11y axe pass
- **Statement.** Axe-core scan on roster + drawer in Vitest DOM test asserts zero critical violations.
- **Priority.** P1.

### TEST-06 · Design-system lint
- **Statement.** `bun run lint:design-system` passes on all new files.
- **Priority.** P0.

### TEST-07 · UX task-model validation
- **Statement.** Publisher tests validate the four primary roster tasks: find, compare, inspect/manage one publication, and act on eligible records.
- **Priority.** P0.
- **Acceptance.** `publisher-roster.test.ts` covers search/filter, health comparison, Manage opening detail, Copy link, and selection-mode affordances.

### TEST-08 · UX/accessibility/privacy edge validation
- **Statement.** Publisher tests validate permission previews, 768px tablet layout, error-summary behavior, and copy/open share-link privacy.
- **Priority.** P0.
- **Acceptance.** DOM/manual/e2e matrix includes recipient cap/error summary, destructive previews, 768px portrait, `rel="noreferrer"` for open-share anchors, and `Referrer-Policy` once D-OPS-01 is implemented.

---

## DOC — Documentation

### DOC-01 · Spec update
- **Statement.** `.ai/06_specs/shared-link-and-publication-spec.md` updated with Publisher section once Phase 1 ships.
- **Priority.** P1 (post-Phase-1).

### DOC-02 · README update
- **Statement.** Root `README.md` route table includes `/workshop/publisher` once Phase 1 ships.
- **Priority.** P1.

### DOC-03 · Decisions log
- **Statement.** `.ai/10_state/decisions.md` records each D1–D5 resolution with rationale.
- **Priority.** P0 (per-decision).

### DOC-04 · Current-state entry
- **Statement.** `.ai/10_state/current-state.md` appends an entry on Phase 1 exit.
- **Priority.** P1.

### DOC-05 · Feature-inventory entry
- **Statement.** `.ai/06_specs/feature-inventory.md` adds the Publisher row.
- **Priority.** P1.

---

## Requirement count summary

| Category | Count |
|---|---|
| FR | 20 |
| UX | 12 |
| A11Y | 9 |
| ARCH | 8 |
| DATA | 5 |
| API | 4 |
| SEC | 10 |
| PERF | 5 |
| REL | 4 |
| OPS | 4 |
| TEST | 8 |
| DOC | 5 |
| **Total** | **94** |

Every requirement traces to at least one implementation task in `11_IMPLEMENTATION_PLAN.md` and at least one test in `12_TEST_AND_VALIDATION_STRATEGY.md` (see `16_REQUIREMENTS_TRACEABILITY_MATRIX.md`).
