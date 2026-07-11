# 01 — Comprehensive Audit and Current State

> This document is the evidence-grounded current-state model. Every claim is
> sourced from actual code/files inspected on 2026-07-11. Stale plan/doc claims
> are flagged and reconciled.

---

## 1. The Naming Duality (Critical Understanding)

The single most important thing to understand about this feature: **"proposal"
and "publication" are the same thing** under different names.

| Term | Where it appears | What it means |
|---|---|---|
| **Proposal** | User-facing UI copy, sidebar nav, route `/workshop/proposals`, XLSX export pipeline (`src/lib/proposal-export/`), spec `proposal-package-system.md`, DESIGN.md | The client-facing deliverable — a cost proposal sent to a client for review/decision |
| **Publication** | Data model, D1 tables (`project_publications`, `shared_link_*`), repository layer (`recipient-proposals-repository.ts`, `publication/`), server actions (`publication/actions.ts`) | The technical implementation — a published snapshot of estimate data with a shareable link |

The mapping is: **one proposal = one `project_publications` row** (scoped to
one `published` row per project via a partial UNIQUE index).

There is **no `proposals` table**. The `proposal_packages` string appears only as
an onboarding enum value in `0005_account_settings.sql` (the user's
`primary_use` profile setting).

---

## 2. Three Implemented Subsystems

### 2A. Recipient Proposals Inbox (`/workshop/proposals`)

**Route files:**
- `src/app/workshop/proposals/page.tsx` — server component shell. Renders `WorkshopRouteHeader` (title "Proposals"), `WorkshopCanvasWash`, and `<Suspense fallback={<ProposalsListSkeleton />}><ProposalsData /></Suspense>`.
- `src/app/workshop/proposals/proposals-data.tsx` — async server component. Calls `requireCurrentUserContext()` then `listRecipientProposals()`. Passes `initialResult` + `userEmail` to `ProposalsPageClient`.
- `src/app/workshop/proposals/loading.tsx` — renders `<ProposalsListSkeleton />`.
- `src/app/workshop/proposals/error.tsx` — client error boundary. Renders `WorkshopRouteErrorState`.

**Client components:**
- `src/components/workshop/proposals-page-client.tsx` — orchestrator. TanStack Query with `["recipient-proposals", userEmail]` key, 30s staleTime, window-focus refetch, `retry: false`. Seeds from SSR `initialResult`. Renders a header bar (title + email + Refresh button), optional error banner, and `ProposalsList` or `ProposalsEmptyState`.
- `src/components/workshop/proposals-page/ProposalsList.tsx` — bordered card with "Recipient proposals" header + count chip, maps rows to `ProposalRow`.
- `src/components/workshop/proposals-page/ProposalRow.tsx` — 3-column grid row. Status chip (New/Opened/Decision submitted/Expired/Revoked), decision chip, expiry chip, last-activity date. Server-action form (`openRecipientProposalAction`) with brand-orange "Review" button. Disabled when `status !== "published"`.
- `src/components/workshop/proposals-page/ProposalsEmptyState.tsx` — dashed-border card, envelope icon, "No proposals yet".
- `src/components/workshop/proposals-page/ProposalsErrorState.tsx` — full-card error with Retry.
- `src/components/workshop/proposals-page/ProposalsListSkeleton.tsx` — 6 skeleton rows.

**Data layer:**
- `src/lib/repositories/recipient-proposals-repository.ts` — `listRecipientProposals()`. Server-only. Single D1 query joining `shared_link_recipients` → `project_publications` → `projects` → `workspaces` → `profiles` (sender) → `shared_link_responses` (latest decision). Derives status in SQL. Filters by `lower(recipient.email) = currentUserEmail`. Orders by `last_activity_at DESC`. **LIMIT 50.**
- `src/lib/recipient-proposals/actions.ts` — thin server-action wrapper `loadRecipientProposals()`.

**Current UX/UI structure:**
```
WorkshopLayout
  └── WorkshopShell (sidebar with Proposals nav item, ⌘4)
        └── WorkshopRouteHeader (title "Proposals", breadcrumb, notifications, settings)
              └── Suspense → ProposalsData (server fetch)
                    └── ProposalsPageClient (TanStack Query)
                          ├── Header bar: "Proposals" + email + Refresh
                          ├── (optional) error banner + Retry
                          └── ProposalsList (bordered card)
                                └── ProposalRow[] (3-col grid: identity | metadata chips | Review button)
                          OR ProposalsEmptyState
```

**What's missing compared to the projects page:**
- ❌ No `WorkshopCollectionLayout` (search + toolbar + tabs shell)
- ❌ No search/filter input
- ❌ No status tabs (All / New / Opened / Decision / Expired / Revoked)
- ❌ No sort dropdowns
- ❌ No view-mode toggle (list / cards)
- ❌ No grouping
- ❌ No card grid — uses a flat bordered table
- ❌ No pagination (hard LIMIT 50)
- ❌ Plain `<button>` elements instead of shared `Button` primitive (in header, empty state, error state)
- ❌ No bulk actions (not applicable to recipient inbox, but no selection model exists)

### 2B. XLSX Proposal Export Pipeline

**Library (`src/lib/proposal-export/`):**
- `types.ts` — extensive type system: `ProposalExportModel`, `ProposalExportSettings`, `ProposalExportRow`, `ProposalSummaryRow`, `ProposalExportTotals`, `ProposalExportAudience` (`client|internal`), `ProposalScopeStatus`, `ProposalChargeMode`, `ProposalTabbedWorkbookModel`, etc.
- `build-proposal-export-model.ts` — pure-function model builder. `flattenEstimateTree`, `consolidateProposalRows`, `buildProposalExportModel`. Applies CSI-style division taxonomy ordering.
- `settings.ts` — `defaultProposalExportSettings` (PHP currency, 10% contingency, 12% VAT), `applyAudiencePolicy` (drops Source Breakdown + supplier info for `client` audience — server-gated).
- `create-proposal-workbook.ts` — ExcelJS workbook builder. Produces "Bid Form / Bill of Quantities", "Summary", "Commercial Terms", optional "Source Breakdown". Peso format `[$₱-3409]`, formula-driven totals, "amount in words" generator, exclusions block, signature/conforme block.
- `worksheet-name.ts` — Excel-safe unique worksheet naming.
- `xlsx-workbook.ts` — ExcelJS re-export/wrapper.

**API route:**
- `src/app/api/projects/[projectId]/estimates/[estimateId]/export/proposal.xlsx/route.ts` — Node runtime, `maxDuration = 60`. GET handler. Resolves audience (internal only for workspace members). Rate-limited via `checkProposalExportRateLimit`. Supports single-tab and all-tabs.
- `src/app/api/projects/[projectId]/estimates/[estimateId]/export/proposal.xlsx/filename.ts` — `buildProposalWorkbookFilename()`.

**Client-side preview:**
- `src/components/workshop/ProposalExportPreviewDialog.tsx` — large portal `<dialog>` modal. Scope toggle (all-tabs/active-tab), collapsible export settings, download button with preparing/disabled states, stale-preview badge, validation-issues list, sheet summary.
- `src/components/workshop/estimate-sheet/use-estimate-proposal-preview.ts` — hook wiring the preview dialog. Builds export model client-side, computes change-signature for staleness, fetch-then-blob download.
- `src/components/workshop/estimate-sheet/proposal-preview-model.ts` — `createProposalPreviewSignature`, `countUnsavedEditableRows`, `appendProposalExportSettingsParams`, `triggerBlobDownload`.
- `src/components/workshop/proposal-export-preview-utils.ts` — `clampRate()`.

**Audit findings (potential gaps):**
- No Zod validation — all parsing is hand-rolled (search params, body parsing).
- `download_attempt_blocked` event type was defined in migration 0014 but **silently dropped** in 0066's CHECK constraint recreation. Any code relying on it would now fail the CHECK.
- No PDF generation exists — only XLSX via ExcelJS + browser print on share page.
- Currency is hardcoded to PHP (`[$₱-3409]` format) — the project's `currency_code` field exists but may not be wired into the export format.
- The export is **mutable** (exports current estimate data, not an immutable snapshot). This is by design for beta (D-008/D-025).

### 2C. Shared-Link Publication/Review Surface (`/share/[token]`)

**Route:**
- `src/app/share/[token]/page.tsx` — public review page.

**Components (`src/components/share/`):**
- `ShareContainer`, `SharePageHero`, `SharePageProposalHeader`, `SharePageTabs`, `SharePageDecision`, `SharePageDecisionConfirmDialog`, `SharePageComments`, `SharePageSummaryCard`, `ShareReviewWorkspace`, `ShareEstimateTreeView`, `ShareEstimateTreePanel`, `ProposalStatusBadge`, `ProjectPublicationPasswordForm`, `CoverImagePlaceholder`, `SharePrintButton`, `share-review-target.ts`.

**API routes (`src/app/api/share/[token]/`):**
- `route.ts` — GET resolves publication by token; returns snapshot JSON (after password check); records `open` event via `after()`. 404 if unavailable, 423 if password required, 429 rate-limited.
- `session/route.ts` — GET/POST/DELETE recipient session.
- `comment/route.ts` — GET paginated comments; POST insert comment (CSRF, bounded body, rate limit).
- `decision/route.ts` — GET latest decision; POST submit decision (`accepted|declined|revision_requested`); requires `signerName` for accept/decline; 409 on duplicate or snapshot drift.
- `activity/route.ts` — GET public-safe activity feed.
- `password/route.ts` — password gate verification.
- `unsubscribe/route.ts` — one-click recipient unsubscribe.

**Publication library (`src/lib/publication/`):**
- `actions.ts` (1,978 lines) — the complete manager-side action surface: `openRecipientProposalAction`, `createProjectPublication`, `republishProjectPublication`, `rotateProjectPublicationLink`, `revokeProjectPublication`, recipient management, activity feed, digest trigger.
- `d1-store.ts` — low-level D1 store for public (token-resolved) reads/writes.
- `admin-d1-client.ts` — admin query builder + emulated stored procedures (5 procedures in TypeScript).
- `public-repository.ts` — service layer with rate limiters, telemetry hashing, recipient-token verification.
- `security.ts` — token create/hash/encrypt/decrypt, password hash/verify, session cookies, CSRF, view-token signing.
- `snapshot.ts` — `buildProjectPublicationSnapshot`, opaque public-id mapping, sanitization.
- `types.ts` — `ProjectPublicationStatus`, `ProjectPublicationSnapshot`, `ProjectPublicationSummary`, etc.

**Status:** Recently redesigned by the `Publisher-And-Shared-Pages` plan (archived 2026-07-11, ACHIEVED). This pack audits but does not re-plan it.

### 2D. Publisher Flow (Manager-Side)

**Route:**
- `src/app/workshop/publisher/preview/[projectId]/page.tsx` — publisher preview.

**Actions (in `src/lib/publication/actions.ts`):**
- `createProjectPublication` — builds snapshot via `buildSnapshotForProject`, persists via `replace_project_publication` emulated procedure, revalidates `/workshop/proposals` + `/workshop/publisher` + project page.
- `republishProjectPublication` — same lifecycle, supersedes prior.
- `rotateProjectPublicationLink` — token rotation, invalidates recipient tokens.
- `revokeProjectPublication` — sets status to `revoked`.
- Recipient management: `listSharedLinkRecipients`, `addSharedLinkRecipients`, `resendSharedLinkRecipientEmail`, `removeSharedLinkRecipient`.
- `loadSharedLinkActivity` — owner-only activity feed.
- `maybeTriggerSharedLinkActivityDigest` — owner email digest.

**Status:** Completed in `Publisher-And-Shared-Pages` plan. Audit only in this pack.

---

## 3. Database Schema (Proposals Data Model)

### Core tables (migrations `0014_publication_shared_links.sql` + `0066_publication_foreign_keys.sql`)

| Table | Role | Key columns |
|---|---|---|
| `project_publications` | The "proposal" record | `id`, `workspace_id`, `project_id`, `token_hash` (UNIQUE), `encrypted_token`, `password_hash`, `status` (`published\|expired\|revoked`), `snapshot_version`, `selected_estimate_ids` (JSON), `snapshot_json` (JSON), `location_visibility`, `published_by`, `published_at`, `expires_at`, `revoked_at`, `open_count`, `latest_opened_at` |
| `project_publication_events` | Open/password analytics | `publication_id`, `event_type` (`open\|password_success\|password_failure\|password_attempt`) |
| `shared_link_recipients` | Invited clients | `publication_id`, `email`, `display_name`, `recipient_token_hash` (UNIQUE), `delivery_status`, `last_opened_at`, email tracking fields |
| `shared_link_comments` | Client/owner comments | `publication_id`, `recipient_id`, `target_kind` (`proposal\|estimate\|row`) |
| `shared_link_responses` | Client decisions | `publication_id`, `recipient_id`, `decision` (`accepted\|declined\|revision_requested`), `note`, `signer_name`, `signature_intent_hash` |
| `shared_link_events` | Per-recipient events | `publication_id`, `recipient_id`, `event_type` (`open\|comment_add\|accept_decision\|decline_decision\|password_attempt`) |
| `publication_digest_log` | Owner digest audit | `publication_id`, `activity_kind` |

### Relationships
- `project_publications` → `workspaces` (CASCADE), `projects` (CASCADE)
- 1 live `published` publication per project (partial UNIQUE index)
- `selected_estimate_ids` (JSON array) links to specific `estimates`
- At publish time, estimate data is frozen into `snapshot_json`
- `shared_link_recipients.email` is the match key for the recipient inbox
- `published_by` → `profiles(id)` (sender identity)

---

## 4. .ai Documentation Audit

### Current and authoritative

| Document | Date | Status | Relevance |
|---|---|---|---|
| `.ai/06_specs/proposal-package-system.md` | 2026-05-29 | Implemented/Active | Defines XLSX export + shared-link publication. Authoritative spec. |
| `.ai/00_corpus/archestimator-app-bible.md` | ongoing | Current | Defines proposals as core job. Notes PDF is not beta scope. |
| `DESIGN.md` (root) | ongoing | Current (alpha) | Proposal design tokens (`proposalPaper`, `proposal-body` typography). "Do not make client-facing proposal pages look like raw admin dashboards." |
| `.ai/01_roadmap/14-owner-decisions.md` | frozen 2026-05-30 | Current | D-008 (immutable snapshots NOT beta), D-009 (PDF is Enterprise P1) |
| `.ai/01_roadmap/29-enterprise-mvp-scope-and-owner-defaults.md` | frozen | Current | D-025, ENTERPRISE-P1-PROD-001/002 |
| `.ai/10_state/current-state.md` | ongoing | Current | FAST PATH + recipient inbox migration checkpoint (2026-07-01) |
| `.ai/10_state/decisions.md` | ongoing | Current | Proposal narrative pivot, mutable export decision |
| `.ai/10_state/known-issues.md` | ongoing | Current | "Immutable issued proposal snapshots — Not implemented" |

### Plan packs (proposals-related)

| Pack | Date | Status | Relationship to this pack |
|---|---|---|---|
| `2026-07-11-Publisher-And-Shared-Pages` (archived) | 2026-07-11 | ACHIEVED | Completed publisher + share redesign. This pack audits its output. |
| `2026-07-07-recipient-proposals-inbox-ia-recovery` | 2026-07-07 | CONDITIONALLY_READY | Planned IA recovery. **This pack supersedes and absorbs its open items.** |
| `2026-07-07-client-ready-proposal-package-workflow` | 2026-07-07 | CONDITIONALLY_READY | Planned owner workflow. This pack audits scope. |
| `2026-07-07-proposal-export-and-immutable-deliverable-trust` | 2026-07-07 | CONDITIONALLY_READY | Export trust. PDF is BLOCKED-EXTERNAL. |
| `2026-06-28-Proposals-Page` (archived) | 2026-06-29 | IMPLEMENTED | Original inbox implementation. Stale as planning artifact. |
| `2026-05-29-industry-standard-excel-proposal-export-complete` (archived) | 2026-05-29 | IMPLEMENTED | Original XLSX export. Stale. |
| `2026-05-21-implemented-plan-cleanup/proposal-package-builder-ui-system-slice.md` (archived) | 2026-05-16 | STALE/PRE-RESET | Old prototype, deleted. Must not be restored. |

### Stale/reconciled claims

1. **"V2 Shared Link Client Publications" spec** (`proposal-package-system.md` §2) describes a "Cost Donut Chart" using D3 — the actual implementation should be verified against current `src/components/share/` code. The spec is from 2026-05-29 and may not reflect the Publisher-And-Shared-Pages redesign.
2. **Migration 0014's `download_attempt_blocked` event type** was silently dropped in 0066. Any code referencing it would fail the CHECK constraint.
3. **The 2026-07-07 IA recovery plan** references `e2e/shared-link-receiver.spec.ts` — verify this test file still exists and covers the intended states.
4. **The 2026-07-07 IA recovery plan** planned terminal-state differentiation (expired/revoked/invalid pages on `/share/[token]`). Verify whether the Publisher-And-Shared-Pages plan implemented these or if they remain open.

---

## 5. Projects Page Pattern (Reference for Proposals Redesign)

The projects page (`/workshop/projects`) is the target visual/UX pattern. Key characteristics:

### Route structure (identical shell)
- `page.tsx` — server component, `WorkshopRouteHeader` + `WorkshopCanvasWash` + `<Suspense><ProjectsData /></Suspense>`
- `loading.tsx` — `<ProjectsListSkeleton />`
- `error.tsx` — `<WorkshopRouteErrorState routeLabel="Projects" />`

### Component tree
```
ProjectsPageClient (3,478-line orchestrator, useReducer with ~25 state slices)
  └── WorkshopCollectionLayout (search + toolbar + tabs + content shell)
        ├── TreePanelHeader (search input, filterSlot, addActions)
        ├── ProjectStatusTabs (Tabs variant="underline": All / Ongoing / Completed / Archived)
        └── content section
              ├── BulkActionToolbar (bottom dock)
              ├── LiveProjectCard[] (card grid) OR ProjectGroupSection[] (when grouping)
              NewProjectModal, ProjectDetailsModal, BulkDestructivePreviewModal (lazy)
```

### Key patterns to reuse for proposals
- **`WorkshopCollectionLayout`** (`src/components/workshop/WorkshopCollectionLayout.tsx`) — the shared search + toolbar + tabs + content shell. This is the primary reuse point.
- **`TreePanelHeader`** (`src/components/ui/tree-panel-header.tsx`) — search input + toolbar row.
- **`Tabs` with `variant="underline"`** (`src/components/ui/tabs.tsx`) — status tabs.
- **`DropdownSelect`** (`src/components/ui/dropdown-select.tsx`) — view-mode, group-by, sort controls.
- **Card grid** with auto-fill: `grid-cols-[repeat(auto-fill,minmax(248px,1fr))] gap-3` (large mode).
- **`Skeleton`** primitive for loading states.
- **Glass-card visual language** (`workshop-project-card-glass` classes).
- **`useDeferredValue`** for non-blocking search.
- **localStorage-persisted** view mode + group-by preferences.
- **Empty states**: centered glass card with icon, message, and action button (not dashed-border).
- **`Button` primitive** (not plain `<button>` elements).

### Key patterns NOT applicable to proposals
- Drag-and-drop reordering (proposals are read-only recipient data, not user-owned).
- Bulk selection/delete (not applicable to recipient inbox).
- Create/edit modals (recipients don't create proposals).
- Favorites (not applicable).
- Thumbnail images (proposals don't have project images in the recipient context).
- Optimistic create (no creation flow).

---

## 6. Known Gaps and Issues

### Inbox UX/UI gaps (primary improvement target)
1. No search, filtering, sorting, view modes, or grouping.
2. Flat bordered table instead of card grid.
3. Hard LIMIT 50 with no pagination or "load more".
4. Plain `<button>` elements instead of shared `Button` primitive.
5. No status tabs to filter by New/Opened/Decision/Expired/Revoked.
6. Empty state is a dashed-border card, not the glass-card pattern used by projects.
7. No workspace grouping (recipient may have proposals from multiple workspaces).

### Data layer gaps
1. `listRecipientProposals()` has no filtering/sorting parameters — always returns all 50 rows ordered by `last_activity_at DESC`.
2. No count query (the UI shows "N proposals" from `rows.length`, not a total count).
3. No pagination support (no cursor, no offset, no "load more").
4. `RecipientProposalRow` doesn't include all useful display fields (e.g., `client_name` from the project, `location`, `currency_code`).

### Export pipeline gaps
1. No Zod schema validation — hand-rolled parsing.
2. Currency hardcoded to PHP format — `currency_code` may not be wired.
3. `download_attempt_blocked` event type dropped in migration 0066.
4. No audit of edge cases (empty estimate, single-row, negative quantities, etc.).

### Security/privacy items to verify
1. The recipient-proposals repository correctly excludes token hashes, encrypted tokens, and password hashes (proven by existing test). **Verify this test still exists and passes.**
2. Anti-enumeration: the `openRecipientProposalAction` redirects to `/share/[token]` — verify the token is never exposed in client-visible state.
3. Snapshot version drift: the decision API returns 409 on version mismatch — verify the inbox reflects stale versions.

### Stale plan reconciliation (COMPLETED — see `09_STALE_PLAN_RECONCILIATION.md`)
1. The `2026-07-07-recipient-proposals-inbox-ia-recovery` plan's open items are NOT implemented (except FR-08 decision finality, which is SUPERSEDED). Wrong-account CTA (FR-06), forked empty state (FR-04), terminal states (FR-09/10), and "View all proposals" link (FR-02) are all ABSORBED into this pack.
2. The `2026-07-07-client-ready-proposal-package-workflow` plan's open items are NOT implemented. Readiness/preflight (FR-01..04) and owner message (FR-05) are DEFERRED to publisher scope. `responded` status (FR-07) is ABSORBED — the UI handles it but the store never writes it (`d1-store.ts:717-823` has no `UPDATE ... SET delivery_status='responded'`).
3. The `2026-07-07-proposal-export-and-immutable-deliverable-trust` plan: trust ledger (FR-2) and content-bound proof (FR-7) are DEFERRED (Enterprise MVP P1). Staleness surface (FR-3/4) is PARTIALLY done (manager-side exists; recipient-side missing) — ABSORBED. Redaction (FR-5) is NOT implemented — contractor=workspace-name leak still present at `route.ts:241` — ABSORBED.

### Cache interaction gap (improve-stage finding)
`revalidatePath("/workshop/proposals")` in `src/lib/publication/actions.ts:745` purges the RSC data cache but does NOT invalidate the TanStack Query client cache (`["recipient-proposals", userEmail]`). Publication mutations from the publisher page won't reflect in the inbox until the 30s staleTime expires or the user clicks Refresh. Decision: accept the gap for beta (DEC-AUTO-008). See `11_IMPLEMENTATION_REFERENCE_PATTERNS.md` §7.

### Test compatibility (improve-stage finding)
Adding `clientName` to `RecipientProposalRow` will affect:
- `tests/vitest/recipient-proposals-repository.test.ts:91-112` — strict `toEqual` matcher.
- `tests/vitest/recipient-proposals-page.test.tsx:40-59` — `proposal()` factory.
**Resolution (DEC-AUTO-007):** Make `clientName` optional (`clientName?: string | null`). This avoids breaking both test files. See `11_IMPLEMENTATION_REFERENCE_PATTERNS.md` §10.

### Migration number reality (improve-stage finding)
The 2026-07-07 plans assumed latest migration `0036` → next `0037`. **Actual latest migration as of 2026-07-11: `0067`.** Any migration work must recompute by running `ls migrations/ | sort | tail -3`.

### `responded` delivery_status gap (improve-stage finding)
The `responded` enum value exists in the DB CHECK constraint (`0014:67`, `0066:167`) and the UI handles it (`RecipientEmailComposer.tsx:50,245,673-685`), but `submitClientResponse` (`d1-store.ts:717-823`) never writes it — only `SET delivery_status = 'opened'` at lines 377, 410. This is the smallest data-layer fix in the pack (UNIT-014).

### Contractor-name leak (improve-stage finding)
`src/app/api/projects/[projectId]/estimates/[estimateId]/export/proposal.xlsx/route.ts:241` sets `contractorName = workspace.name` — the workspace name is used as the contractor name in client-audience XLSX exports. `create-proposal-workbook.ts:297` writes it as "Bidder / Contractor" in the title block. `applyAudiencePolicy` in `settings.ts` does NOT strip the workspace name. This is a data leak for client-audience exports (UNIT-016).

### No `error.tsx` under `src/app/share/` (improve-stage finding)
There is no `error.tsx` anywhere under `src/app/share/` (confirmed via `find`). The IA recovery plan's FR-10b (share-level error boundary) is not started. ABSORBED as UNIT-012.
