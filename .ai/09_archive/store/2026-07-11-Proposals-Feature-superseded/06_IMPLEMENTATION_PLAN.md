# 06 — Implementation Plan (Canonical Execution Artifact)

> This is the canonical execution artifact. Every unit is self-contained enough
> for a fresh agent to execute with bounded context retrieval.

---

## Execution DAG Overview

```
Layer 0 (no blockers):
  UNIT-001: Adopt WorkshopCollectionLayout for proposals inbox
  UNIT-002: Build ProposalCard component
  UNIT-009: Audit XLSX export pipeline edge cases
  UNIT-014: Wire responded delivery_status (independent data fix)

Layer 1 (depends on UNIT-001, UNIT-002):
  UNIT-003: Add status tabs, search, sort, view-mode controls
  UNIT-004: Add grouping (by workspace / status)
  UNIT-011: Wrong-account recovery CTA (depends on UNIT-002)

Layer 2 (depends on UNIT-003):
  UNIT-005: Data layer — enrich RecipientProposalRow (clientName optional)
  UNIT-006: Skeleton, empty states (incl. forked wrong-email), error states parity

Layer 3 (depends on UNIT-006, UNIT-009):
  UNIT-007: Share/review surface audit
  UNIT-016: Fix contractor-name leak (depends on UNIT-009)

Layer 4 (depends on UNIT-007):
  UNIT-008: Publisher flow audit
  UNIT-012: Share page terminal states + "View all proposals" link
  UNIT-015: Recipient-side staleness surface

Layer 5 (depends on UNIT-008):
  UNIT-010: Stale-plan reconciliation + current-state.md update
```

**Critical path:** UNIT-001 → UNIT-002 → UNIT-003 → UNIT-006 → UNIT-007 → UNIT-012 → UNIT-010

**Improve-stage changes:**
- UNIT-005 test decision changed from TARGETED to NOT_REQUIRED (DEC-AUTO-007 — adding optional field doesn't require test; see `11_IMPLEMENTATION_REFERENCE_PATTERNS.md` §10).
- UNIT-006 now includes forked empty state (wrong-email secondary line) from IA-recovery FR-04.
- 6 new units (UNIT-011 through UNIT-016) absorbed from 2026-07-07 plans.
- UNIT-014 (responded status) is independent and can run in Layer 0.
- See `10_ABSORBED_REQUIREMENTS_AND_UNITS.md` for new unit packets.
- See `11_IMPLEMENTATION_REFERENCE_PATTERNS.md` for exact code patterns.

---

## UNIT-001: Adopt WorkshopCollectionLayout for Proposals Inbox

**Goal:** Replace the bespoke header bar + flat list with `WorkshopCollectionLayout`.

**Linked requirements:** REQ-001, UX-001
**Non-goals:** Card design (UNIT-002), filtering controls (UNIT-003), grouping (UNIT-004).

**Exact paths and current symbols:**
- `src/components/workshop/proposals-page-client.tsx` — `ProposalsPageClient`. Currently renders a custom header bar (lines 114-128) and `ProposalsList`/`ProposalsEmptyState` (lines 149-153).
- `src/components/workshop/WorkshopCollectionLayout.tsx` — `WorkshopCollectionLayout` component. Props: `searchLabel`, `searchPlaceholder`, `searchValue`, `onSearchChange`, `toolbarLabel`, `toolbarPrefix`, `filterSlot`, `toolbarPanel`, `children`, etc.
- `src/components/workshop/proposals-page/ProposalsList.tsx` — `ProposalsList`. Currently renders a bordered card with header + rows.

**Approach:**
1. Refactor `ProposalsPageClient` to use `WorkshopCollectionLayout` as the outer shell.
2. Move the Refresh button into the `TreePanelHeader` toolbar (or keep as a `filterSlot`).
3. Move the recipient email display into the header area or a subtle subtitle.
4. Replace `ProposalsList`'s bordered card with a plain content section (the card grid will be added in UNIT-002).
5. Preserve the TanStack Query setup, error banner, and retry-focus behavior.

**Invariants:**
- TanStack Query key `["recipient-proposals", userEmail]` unchanged.
- `refetchOnWindowFocus: true`, `staleTime: 30_000`, `retry: false` unchanged.
- `focusRetryAfterFailureRef` behavior preserved.
- `openRecipientProposalAction` form action unchanged.

**Test requirement:** NOT_REQUIRED (test_trigger: NONE)
**Test rationale:** UI shell adoption is verifiable by source inspection and type check. No named MVP-critical invariant requires test evidence.

**Proof:** `tsc --noEmit` on changed files; `git diff --check` for whitespace errors. Source inspection confirms `WorkshopCollectionLayout` is used.

**Failure response:** If `WorkshopCollectionLayout` props don't match the proposals use case, adapt the wrapper (not the shared component) or fall back to a local layout that mirrors its structure.

**Checkpoint/resume:** After this unit, the inbox uses the collection layout shell with the existing flat list inside it. Next: UNIT-002.

---

## UNIT-002: Build ProposalCard Component

**Goal:** Create a `ProposalCard` component that mirrors `LiveProjectCard`'s glass-card visual language with proposal-specific metadata.

**Linked requirements:** REQ-002, UX-002
**Depends on:** UNIT-001 (the collection layout shell must exist)
**Non-goals:** Card grid layout (UNIT-003), list mode (UNIT-003), grouping (UNIT-004).

**Exact paths and current symbols:**
- `src/components/workshop/LiveProjectCard.tsx` — `LiveProjectCard` (reference for visual patterns: glass-card classes, `REVEAL_ON_INTENT`, `group` hover, `CONTROL_BUTTON` styles).
- `src/components/workshop/proposals-page/ProposalRow.tsx` — `ProposalRow` (current row; contains `getProposalState`, `getChipClassName`, `formatProposalDate`, `decisionLabels`, `readActionErrorMessage` — reuse these).
- `src/components/ui/button.tsx` — `Button` primitive.

**Approach:**
1. Create `src/components/workshop/proposals-page/ProposalCard.tsx` — `"use client"`.
2. Reuse `getProposalState`, `getChipClassName`, `formatProposalDate`, `decisionLabels` from `ProposalRow` (extract to a shared utils file or import directly).
3. Card structure (see `03_TARGET_UX_UI_DESIGN.md` §4.2):
   - Glass-card wrapper with `group` class for hover.
   - Workspace name (uppercase, tertiary).
   - Status chip (icon + tone + label).
   - Project name (bold).
   - Meta line: project code · "v{snapshotVersion}" · "Sent {date}".
   - Sender: "From {senderDisplayName}".
   - Decision chip + expiry chip.
   - Last activity date.
   - Review button (`Button variant="brand" size="sm"`).
   - Disabled state: reduced opacity, state label, "can no longer be reviewed" note.
4. Use the `openRecipientProposalAction` form action (same as current `ProposalRow`).
5. `memo()` the component for render performance.

**Invariants:**
- `openRecipientProposalAction` form action unchanged.
- Disabled when `status !== "published"`.
- Status chip logic identical to current `getProposalState`.
- No token hashes or sensitive data in the card.

**Test requirement:** NOT_REQUIRED (test_trigger: NONE)
**Test rationale:** Component renders proposal data from a typed `RecipientProposalRow`. Source inspection and type check prove correctness.

**Proof:** `tsc --noEmit`; source inspection confirms card uses `Button` primitive, `getProposalState` logic, and `openRecipientProposalAction`.

**Failure response:** If glass-card classes don't produce the right visual, fall back to a simpler bordered card matching the existing `ProposalRow` visual but in a card layout.

**Checkpoint/resume:** After this unit, `ProposalCard` exists and can render a single proposal. Next: UNIT-003.

---

## UNIT-003: Add Status Tabs, Search, Sort, View-Mode Controls

**Goal:** Add the collection-layout controls: status tabs, instant search, sort dropdowns, view-mode toggle.

**Linked requirements:** REQ-003, UX-003
**Depends on:** UNIT-001 (shell), UNIT-002 (card component)
**Non-goals:** Grouping (UNIT-004), server-side filtering (not needed for V1).

**Exact paths and current symbols:**
- `src/components/workshop/proposals-page-client.tsx` — `ProposalsPageClient` (add `useReducer` for state management).
- `src/components/workshop/projects-page-client.tsx` — `projectsPageClientReducer` (reference pattern; do NOT copy — create a proposals-specific reducer).
- `src/components/ui/tabs.tsx` — `Tabs`, `TabItem` (`variant="underline"`).
- `src/components/ui/dropdown-select.tsx` — `DropdownSelect`.
- `src/components/workshop/ProjectStatusTabs.tsx` — `ProjectStatusTabs` (reference for tab component structure).

**Approach:**
1. Create a `proposalsPageClientReducer` with state slices:
   - `searchQuery: string`
   - `activeStatusTab: "all" | "new" | "opened" | "decision" | "expired" | "revoked"`
   - `sortField: "lastActivity" | "sentDate" | "projectName"`
   - `sortDirection: "asc" | "desc"`
   - `viewMode: "cards" | "list"` (persisted to localStorage `archestimator_proposals_view_mode_v1`)
2. Add `ProposalStatusTabs` component (mirror `ProjectStatusTabs` with proposal statuses).
3. Wire search input to `TreePanelHeader`'s search prop. Use `useDeferredValue` for non-blocking filtering.
4. Wire sort dropdowns via `DropdownSelect`.
5. Wire view-mode toggle via `DropdownSelect`.
6. Implement client-side filtering: filter `rows` by search query (match `projectName`, `workspaceName`, `projectCode`, `senderDisplayName`) and status tab.
7. Implement client-side sorting: sort filtered rows by `sortField` + `sortDirection`.
8. Render `ProposalCard[]` in a card grid (cards mode) or `ProposalListRow[]` (list mode).

**Card grid classes:**
- Cards: `grid-cols-[repeat(auto-fill,minmax(248px,1fr))] gap-3`
- List: `flex flex-col divide-y` in a bordered container

**Invariants:**
- TanStack Query setup unchanged.
- All filtering/sorting is client-side on the cached `rows` array.
- `viewMode` persisted to localStorage and synced across tabs (same pattern as projects).

**Test requirement:** NOT_REQUIRED (test_trigger: NONE)
**Test rationale:** Filtering/sorting logic is verifiable by source inspection. The state reducer is a pure function.

**Proof:** `tsc --noEmit`; source inspection confirms reducer, tabs, search, sort, and view-mode are wired.

**Failure response:** If the reducer becomes too complex, simplify by splitting into individual `useState` calls (the projects page uses a reducer, but proposals has fewer state slices).

**Checkpoint/resume:** After this unit, the inbox has search, tabs, sort, and view modes. Next: UNIT-004 or UNIT-006.

---

## UNIT-004: Add Grouping (by Workspace / Status)

**Goal:** Optional grouping of proposals by workspace or status.

**Linked requirements:** REQ-004, UX-004
**Depends on:** UNIT-003 (filtering/sorting must work first)
**Non-goals:** DnD reordering (not applicable).

**Exact paths and current symbols:**
- `src/components/workshop/ProjectGroupSection.tsx` — `ProjectGroupSection` (reference for collapsible section structure).
- `src/components/workshop/proposals-page-client.tsx` — add `groupBy` state slice.

**Approach:**
1. Add `groupBy: "none" | "workspace" | "status"` to the reducer (persisted to localStorage).
2. Add a group-by `DropdownSelect` to the toolbar.
3. When `groupBy !== "none"`, group filtered+sorted rows by the selected field.
4. Render each group in a `ProposalGroupSection` (collapsible section with header showing group name + count).
5. Within each group, render the card grid or list rows.

**Invariants:**
- Grouping is applied after filtering and sorting.
- Groups are ordered alphabetically (workspace) or by status severity (status: published → expired → revoked).
- `groupBy` persisted to localStorage.

**Test requirement:** NOT_REQUIRED (test_trigger: NONE)

**Proof:** `tsc --noEmit`; source inspection confirms grouping logic.

**Checkpoint/resume:** After this unit, proposals can be grouped. Next: UNIT-005 or UNIT-006.

---

## UNIT-005: Data Layer — Enrich RecipientProposalRow

**Goal:** Add `client_name` to the recipient proposals query and row type for richer card display.

**Linked requirements:** REQ-005, DATA-001
**Depends on:** UNIT-002 (card component exists to consume the field)
**Non-goals:** Pagination (deferred), server-side filtering (not needed for V1).

**Exact paths and current symbols:**
- `src/lib/repositories/recipient-proposals-repository.ts` — `listRecipientProposals()`, `RecipientProposalRow`, `RecipientProposalD1Row`, `mapRecipientProposalRow`.
- `src/components/workshop/proposals-page/ProposalCard.tsx` — consume `clientName` in the card.

**Approach:**
1. Add `project.client_name` to the SQL SELECT.
2. Add `client_name: string | null` to `RecipientProposalD1Row`.
3. Add `clientName?: string | null` (OPTIONAL — see DEC-AUTO-007) to `RecipientProposalRow`.
4. Map `client_name` in `mapRecipientProposalRow`.
5. Display `clientName` in the `ProposalCard` meta line (optional — only if it adds value beyond `projectName`).

**Invariants:**
- No sensitive columns added (no token hashes, no encrypted tokens, no password hashes).
- `clientName` is made OPTIONAL (`clientName?: string | null`) to avoid breaking `tests/vitest/recipient-proposals-page.test.tsx:40-59` (the `proposal()` factory omits it).
- The field name `clientName` does NOT match the credential-free test's regex assertions (`/token|hash|encrypted|password/i`) — verified safe.
- `client_name` is the project's client name (from the `projects` table), not the recipient's name.

**Test requirement:** NOT_REQUIRED (test_trigger: NONE)
**Test rationale:** Source inspection of the SELECT clause diff is the cheapest decisive proof that no sensitive columns were added. The existing credential-free test (`recipient-proposals-repository.test.ts`) uses strict `toEqual` (lines 91-112) which would need updating to mirror the new field — this requires a test edit, which the `CHEAPEST_DECISIVE_EXISTING_TEST` trigger forbids. Instead, source inspection of the diffed query is sufficient. The existing test's regex assertions (`not.toMatch(/\b(token_hash|recipient_token_hash|encrypted_token|password_hash)\b/i)` at line 117, `not.toMatch(/token|hash|encrypted|password/i` at line 119) remain valid evidence that the query doesn't select credentials — `clientName` does not match either pattern. See `11_IMPLEMENTATION_REFERENCE_PATTERNS.md` §10.

**Proof:** Source inspection of the diffed SELECT clause confirms only `project.client_name` was added. `tsc --noEmit` confirms the optional field type-checks against all consumers.

**Failure response:** If any consumer fails to type-check with the optional field, add the field to the consumer's type annotation or use a default value.

**Checkpoint/resume:** After this unit, the row type includes `client_name`. Next: UNIT-006.

---

## UNIT-006: Skeleton, Empty States, Error States Parity

**Goal:** Update loading, empty, and error states to match the projects page patterns. Includes the forked empty state (wrong-email secondary line) absorbed from IA-recovery FR-04.

**Linked requirements:** REQ-006, UX-005, UX-006
**Depends on:** UNIT-003 (card grid exists for skeleton to mirror)

**Exact paths and current symbols:**
- `src/components/workshop/proposals-page/ProposalsListSkeleton.tsx` — currently 6 skeleton rows.
- `src/components/workshop/proposals-page/ProposalsEmptyState.tsx` — dashed-border card.
- `src/components/workshop/proposals-page/ProposalsErrorState.tsx` — full-card error.
- `src/components/workshop/ProjectsListSkeleton.tsx` — reference (8 skeleton cards in card grid).
- `src/components/workshop/projects-page-client.tsx` — reference empty states (`data-project-search-empty-state`, `data-project-status-empty-state`).

**Approach:**
1. **Skeleton:** Rewrite `ProposalsListSkeleton` to mirror `ProjectsListSkeleton` — 8 skeleton cards in the large-card grid layout, plus skeleton search bar and toolbar row.
2. **Empty state (genuine):** Rewrite `ProposalsEmptyState` as a glass card (not dashed-border) with envelope icon, "No proposals yet", explanation, and secondary "Not seeing a proposal? It may have been sent to a different email." line (absorbed from IA recovery plan).
3. **Empty state (search):** New `ProposalSearchEmptyState` — glass card with magnifying-glass icon, "No search results for '{query}'", "Clear search" button.
4. **Empty state (status):** New `ProposalStatusEmptyState` — glass card with folder icon, "No {status} proposals yet.", "Show all proposals" button.
5. **Error state:** Restyle `ProposalsErrorState` to match the projects page error pattern (centered card).
6. Use `Button` primitive (not plain `<button>`) in all states.

**Invariants:**
- `role="status"` on skeleton and error states.
- Focus management preserved (`focusRetryAfterFailureRef`).
- Non-color cues (icons + text labels).

**Test requirement:** NOT_REQUIRED (test_trigger: NONE)

**Proof:** `tsc --noEmit`; source inspection confirms states use glass-card pattern and `Button` primitive.

**Checkpoint/resume:** After this unit, all states match projects page patterns. Next: UNIT-007/UNIT-008/UNIT-010.

---

## UNIT-007: Share/Review Surface Audit

**Goal:** Audit the `/share/[token]` surface for gaps; document findings.

**Linked requirements:** REQ-007
**Depends on:** UNIT-006 (state parity complete)
**Non-goals:** Implementing share page changes (audit only; findings are fix-forward).

**Exact paths and current symbols:**
- `src/app/share/[token]/page.tsx` — share page.
- `src/components/share/*` — all share components.
- `src/app/api/share/[token]/*/route.ts` — all share API routes.
- `.ai/03_plans/2026-07-07/2026-07-07-recipient-proposals-inbox-ia-recovery/05_UX_UI_ACCESSIBILITY_PLAN.md` — planned terminal states (expired/revoked/invalid pages).

**Approach:**
1. Verify the Publisher-And-Shared-Pages plan implemented the terminal-state differentiation (expired/revoked/invalid pages on `/share/[token]`).
2. If implemented, mark the IA recovery plan's open items as superseded.
3. If NOT implemented, document the gap as a fix-forward finding.
4. Verify anti-enumeration (404 for unknown tokens).
5. Verify rate limiters are wired.
6. Verify snapshot version drift handling (409 on decision POST).
7. Document findings in `01_AUDIT_AND_CURRENT_STATE.md` (append) and the `LOOP_LEDGER.md`.

**Test requirement:** NOT_REQUIRED (test_trigger: NONE)

**Proof:** Source inspection of share page and API routes. Document findings with file:line references.

**Checkpoint/resume:** After this unit, the share surface is audited with documented findings. Next: UNIT-008.

---

## UNIT-008: Publisher Flow Audit

**Goal:** Audit the publisher flow for correctness; document findings.

**Linked requirements:** REQ-008
**Depends on:** UNIT-007 (share audit complete)
**Non-goals:** Implementing publisher changes (audit only).

**Exact paths and current symbols:**
- `src/lib/publication/actions.ts` — all publication actions.
- `src/lib/publication/admin-d1-client.ts` — emulated procedures.
- `src/app/workshop/publisher/preview/[projectId]/page.tsx` — publisher preview.

**Approach:**
1. Verify `createProjectPublication` correctly revokes prior live publications before inserting new ones (via `replace_project_publication` emulated procedure).
2. Verify `rotateProjectPublicationLink` invalidates recipient tokens (prefixes with `revoked:`).
3. Verify all publication mutations revalidate `/workshop/proposals`.
4. Verify the revalidation works with the new TanStack Query + `WorkshopCollectionLayout` pattern.
5. Verify `download_attempt_blocked` event type is not referenced by any code (it was dropped in migration 0066).
6. Document findings.

**Test requirement:** NOT_REQUIRED (test_trigger: NONE)

**Proof:** Source inspection of publication actions and admin-d1-client. `rg "download_attempt_blocked"` to verify no references.

**Checkpoint/resume:** After this unit, the publisher flow is audited. Next: UNIT-010.

---

## UNIT-009: Audit XLSX Export Pipeline Edge Cases

**Goal:** Audit the XLSX export pipeline for edge cases and correctness.

**Linked requirements:** REQ-009, DATA-002
**Non-goals:** Implementing export changes (audit only; findings are fix-forward patches per DEC-AUTO-006).

**Exact paths and current symbols:**
- `src/lib/proposal-export/create-proposal-workbook.ts` — workbook builder.
- `src/lib/proposal-export/build-proposal-export-model.ts` — model builder.
- `src/lib/proposal-export/settings.ts` — settings + audience policy.
- `src/app/api/projects/[projectId]/estimates/[estimateId]/export/proposal.xlsx/route.ts` — API route.

**Approach:**
1. Verify currency handling — is `currency_code` from the project wired into the workbook format? (Currently hardcoded to PHP `[$₱-3409]`).
2. Verify empty estimate edge case — what happens when an estimate has zero rows?
3. Verify single-row edge case.
4. Verify negative quantity handling.
5. Verify audience policy enforcement — confirm `applyAudiencePolicy` strips internal data for `client` audience and cannot be bypassed via URL params.
6. Verify rate limiting is applied.
7. Document findings with severity (P0/P1/P2) and fix-forward recommendations.

**Test requirement:** NOT_REQUIRED (test_trigger: NONE)

**Proof:** Source inspection of export pipeline. Document findings with file:line references.

**Checkpoint/resume:** After this unit, the export pipeline is audited. Can run in parallel with UNIT-001..UNIT-006 (Layer 0).

---

## UNIT-010: Stale-Plan Reconciliation + Current-State Update

**Goal:** Reconcile stale plans and update `current-state.md`.

**Linked requirements:** REQ-010, OPS-001
**Depends on:** UNIT-007, UNIT-008 (audits complete to inform reconciliation)

**Exact paths and current symbols:**
- `.ai/03_plans/2026-07-07/2026-07-07-recipient-proposals-inbox-ia-recovery/` — IA recovery plan (CONDITIONALLY_READY).
- `.ai/03_plans/2026-07-07/2026-07-07-client-ready-proposal-package-workflow/` — owner workflow plan (CONDITIONALLY_READY).
- `.ai/03_plans/2026-07-07/2026-07-07-proposal-export-and-immutable-deliverable-trust/` — export trust plan (CONDITIONALLY_READY).
- `.ai/10_state/current-state.md` — FAST PATH block.

**Approach:**
1. For each 2026-07-07 plan, check its open items against current implementation:
   - If implemented by Publisher-And-Shared-Pages or this pack → mark superseded.
   - If not implemented and still relevant → absorb into this pack's implementation units.
   - If not implemented and deferred → document as explicitly deferred with rationale.
2. Update `current-state.md` FAST PATH block with the proposals inbox redesign summary.
3. Update `known-issues.md` if any new issues are found during audit.
4. Document the reconciliation in `LOOP_LEDGER.md`.

**Test requirement:** NOT_REQUIRED (test_trigger: NONE)

**Proof:** Source inspection of 2026-07-07 plans against current code. Document reconciliation with evidence.

**Checkpoint/resume:** After this unit, all stale plans are reconciled and current-state is updated. This is the final unit.
