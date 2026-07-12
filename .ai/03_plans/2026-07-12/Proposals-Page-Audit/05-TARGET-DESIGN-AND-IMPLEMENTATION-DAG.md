# 05 — Target Design & Implementation DAG

> This document converts the audit findings + parity gap + target UX design into
> a **concrete, dependency-ordered implementation DAG** grounded in real file
> paths and patterns. It is designed to feed the active
> `.ai/03_plans/2026-07-11/Proposals-Feature/` pack's execution units, or to
> stand alone as a fix-forward plan.
>
> Per the **User Test Authorization Gate**, every unit below defaults to
> `test_requirement: NOT_REQUIRED`. Where a named invariant warrants a test, the
> unit records a `TEST_PROPOSAL` and waits for explicit owner authorization.

## 1. Two-track strategy

The work splits cleanly into two independent tracks. **Track A is safe to ship
first** without touching the redesign; **Track B** is the UX redesign.

```
Track A — Data-layer hardening (bug fixes, no UI change)
  A1 repository row-resilience + logging
  A2 normalizeDecision type fix
  A3 responded delivery status write
  A4 truncation signal (COUNT + truncated flag)   ← optional, can move to B

Track B — UX redesign ("looks like the projects page")
  B1 WorkshopCollectionLayout adoption + useReducer state
  B2 ProposalStatusTabs + counts
  B3 deferred multi-field search
  B4 sort (field + direction)
  B5 view modes (list/card + persistence)
  B6 ProposalCard (card mode)
  B7 ProposalListRow (list mode, refactor existing ProposalRow)
  B8 glass-card empty states (genuine / search / status)
  B9 card-grid skeleton
```

Track A has **no dependency** on Track B. Track B's units depend on B1 (the
shell + reducer) but are otherwise parallelizable in small batches.

## 2. Track A — Data-layer hardening (ship first)

### A1 · Repository row-resilience + logging
- **Goal:** one unmappable row no longer blanks the whole inbox; D1 failures are logged.
- **Exact paths:** `src/lib/repositories/recipient-proposals-repository.ts`.
- **Current symbols:** `listRecipientProposals` (`:86-163`), the `rows.some(row => row === null)` fail-all at `:157`, the bare `catch` at `:160-162`.
- **Approach:**
  - Replace `:157` (fail-all) with per-row filter: `const rows = results.map(...).filter((row): row is RecipientProposalRow => row !== null);` Optionally include a `droppedCount` if an observability signal is wanted.
  - In the `catch` (`:160-162`), add `logAppError(error, { event: "recipient_proposals_list_failed" })` (import from `@/lib/observability/logger`). Keep the typed `{ ok:false, error:"unknown" }` return for the client.
  - Also log when `getCloudflareD1Database()` returns null (`:93`) — currently silent.
- **Invariants:** the client `RecipientProposalsResult` shape is unchanged; the client already handles `{ ok:false }`. No API contract break.
- **Test decision:** `NOT_REQUIRED` (static evidence: read the diff). `TEST_PROPOSAL`: extend `tests/vitest/recipient-proposals-repository.test.ts` with a "one corrupt row does not hide others" case — await `TEST_TASK`.
- **Failure response:** if `logAppError` import path is wrong, confirm via `rg "export.*logAppError" src/lib/observability/logger.ts`.

### A2 · `normalizeDecision` type fix
- **Goal:** the declared union stops lying; the "unexpected decision" state is explicit.
- **Exact paths:** `src/lib/repositories/recipient-proposals-repository.ts:55-59,65`.
- **Approach:** widen the return to `RecipientProposalDecision | "unknown"` (or introduce a small `type DecisionParseResult = { kind: "known"; value: RecipientProposalDecision } | { kind: "unknown" }`). Update `mapRecipientProposalRow` (`:61-84`) to treat `"unknown"` as a drop-and-log row (ties into A1). Do **not** use bare `undefined` as a sentinel.
- **Test decision:** `NOT_REQUIRED`.

### A3 · `responded` delivery status write
- **Goal:** owners see when a recipient decided.
- **Exact paths:** `src/lib/publication/d1-store.ts:377,410` (`SET delivery_status = 'opened'`), `submitClientResponse` `:717-823`.
- **Approach:** in the same transaction that inserts the `shared_link_responses` row, set `delivery_status = 'responded'` (and keep `last_opened_at`). Confirm the CHECK constraint allows it (it does: `0014:67`, `0066:167`).
- **Invariants:** `delivery_status` transitions `opened → responded` only on decision submit; never regresses.
- **Test decision:** `NOT_REQUIRED`. `TEST_PROPOSAL`: create `tests/vitest/publication-d1-store.test.ts` — await `TEST_TASK`.
- **Note:** maps to active pack `UNIT-014`.

### A4 · Truncation signal (optional, can move to Track B)
- **Goal:** recipient knows when they have >50 proposals.
- **Exact paths:** `src/lib/repositories/recipient-proposals-repository.ts:150-159` (the `LIMIT 50` and result mapping), the `RecipientProposalsResult` type (`:28-30`), and the client render (`proposals-page-client.tsx:111,149-153`).
- **Approach:** add a second `SELECT COUNT(*)` (or `LIMIT 51` + `rows.length > 50` heuristic) and surface `{ ok:true; rows; truncated: boolean; totalCount?: number }`. Client renders a "Showing 50 of N" affordance above the list.
- **Dependency:** if done in Track A, touches the result type (a contract the client consumes). Coordinate with B1 if B1 is in flight on the same files. Safe to do first in Track A if B hasn't started.

## 3. Track B — UX redesign

All Track B units assume the **server component boundary stays the same**
(`ProposalsData` → `ProposalsPageClient`) and the **TanStack Query config stays
the same** (DEC-AUTO-002: keep `staleTime 30s`, `refetchOnWindowFocus`, `retry:false`,
key `["recipient-proposals", userEmail]`).

### B1 · `WorkshopCollectionLayout` adoption + `useReducer` state
- **Goal:** replace the inline header bar (`proposals-page-client.tsx:114-128`) with the shared shell; introduce a typed reducer for collection state.
- **Exact paths:** `src/components/workshop/proposals-page-client.tsx` (rewrite the return), new state types/reducer (inline or co-located).
- **Reuse:** `WorkshopCollectionLayout` (`src/components/workshop/WorkshopCollectionLayout.tsx`); the reducer pattern from `projects-page-client.tsx:350-604` (trimmed to proposals fields).
- **Approach:** the `ProposalsPageClient` return becomes
  ```tsx
  <WorkshopCollectionLayout
    searchLabel="Search proposals"
    searchPlaceholder="Search proposals"
    searchValue={state.searchQuery}
    onSearchChange={(v) => dispatch({ type: "setSearchQuery", value: v })}
    toolbarLabel="Proposal tools"
    toolbarPrefix="proposals"
    filterSlot={<>{/* view + sort dropdowns (B4/B5) */}</>}
    toolbarPanel={<ProposalStatusTabs ... />}
    contentScroll
  >
    {/* cards/list/empty states */}
  </WorkshopCollectionLayout>
  ```
- **Invariants:** error/refresh logic (refs, `refresh`, `handleRetry`, `handleActionError`) moves inside the new shell; the soft-error banner and hard-error state must remain reachable.
- **Test decision:** `NOT_REQUIRED`. This is UI plumbing; static review + (if owner authorizes) browser proof.

### B2 · `ProposalStatusTabs` + counts
- **Exact paths:** new component (e.g. `src/components/workshop/proposals-page/ProposalStatusTabs.tsx`), consuming `Tabs` from `src/components/ui/tabs.tsx`.
- **Reuse:** mirror `ProjectStatusTabs` (`projects-page-client.tsx:319-348`).
- **Tab set** (from target design §4.1): All / New / Opened / Decision / Expired / Revoked. Counts derived from the cached `rows` via `useMemo`. Filter predicates mirror `getProposalState` (`ProposalRow.tsx:51-57`).
- **Dependency:** B1 (shell `toolbarPanel` slot).

### B3 · Deferred multi-field search
- **Exact paths:** inside the reducer state (`searchQuery`) + a `useDeferredValue` + `useMemo` filter derivation.
- **Fields:** `projectName`, `workspaceName`, `projectCode`, `senderDisplayName` (all already on `RecipientProposalRow`).
- **Reuse:** the `useDeferredValue` + lowercased-include pattern from `projects-page-client.tsx:1803,1836-1865`.

### B4 · Sort (field + direction)
- **Exact paths:** reducer state (`sortField`, `sortDirection`, `sortTouched`) + `DropdownSelect` controls in `filterSlot`.
- **Fields:** Last activity (default desc), Sent date, Project name. Direction with smart labels ("Newest first" / "A to Z").
- **Reuse:** `DropdownSelect` (`src/components/ui/dropdown-select.tsx`); the sort helper structure from `:991-1032` (adapted to `RecipientProposalRow`).

### B5 · View modes (list/card + persistence)
- **Exact paths:** reducer state (`viewMode`) + `useSyncExternalStore` preference module + `DropdownSelect` in `filterSlot`.
- **Reuse:** the full persistence pattern from `:651-694` (copy + rename keys to `archestimator_proposals_view_mode_v1` and event `archestimator:proposals-view-mode-change`). Modes: `list` + `card` (V1 two modes; projects has four but proposals doesn't need small/medium/large granularity for V1).

### B6 · `ProposalCard` (card mode)
- **Exact paths:** new `src/components/workshop/proposals-page/ProposalCard.tsx` (`"use client"`, `memo`).
- **Content:** per target design §4.2 — workspace name, status chip, project name, meta line (code · v{n} · sent date), sender, decision chip, expiry chip, last activity, Review button.
- **Reuse:** the existing `getProposalState` + `getChipClassName` + `decisionLabels` + `formatProposalDate` from `ProposalRow.tsx:36-64` (extract to a shared `proposal-state.ts` helper so card + list row share them). `Button variant="brand" size="sm"`. The `useActionState(openRecipientProposalAction)` form pattern from `ProposalRow.tsx:74,145-159` (kept verbatim — do not change the server-action contract).
- **Disabled state:** `bg-surfaceMuted/45`, button shows state label, "can no longer be reviewed" note — same as current.
- **memo discipline:** pass primitive props only; use `useStableCallback` for `onActionError`.

### B7 · `ProposalListRow` (list mode — refactor existing `ProposalRow`)
- **Exact paths:** refactor `src/components/workshop/proposals-page/ProposalRow.tsx` into a compact list-row variant (or rename). The existing markup is already close to the target list row (target design §4.3).
- **Reuse:** the extracted `proposal-state.ts` helpers from B6.

### B8 · Glass-card empty states
- **Exact paths:** replace `ProposalsEmptyState.tsx` (dashed-border) with glass-card variant; add `ProposalSearchEmptyState` and `ProposalStatusEmptyState`.
- **Copy:** target design §4.8 — genuine empty gets the secondary "Not seeing a proposal? It may have been sent to a different email." line (absorbed from the IA-recovery plan).

### B9 · Card-grid skeleton
- **Exact paths:** add a card-grid variant alongside `ProposalsListSkeleton.tsx`.
- **Reuse:** `Skeleton` (`src/components/ui/skeleton.tsx`); 8-card grid in the `auto-fill,minmax(248px,1fr)` layout.

## 4. Dependency DAG

```
A1 ── A2 (same file; do together)
A3 (independent)
A4 (independent; touches result type)

B1 (shell + reducer) ──┬── B2 (status tabs)
                       ├── B3 (search)
                       ├── B4 (sort)
                       ├── B5 (view modes)
                       ├── B8 (empty states)
                       └── B9 (skeleton)
B6 (card) ── B7 (list row refactor)   [B6/B7 share proposal-state.ts extraction]
```

- A1+A2 are one PR (same file, same concern).
- A3 is one PR (different file, independent).
- A4 is one PR (or fold into B1 if B starts first).
- B1 is the integration point; B2-B5, B8, B9 can follow in small batches once B1 lands.
- B6+B7 are one PR (shared helper extraction).

## 5. Things to explicitly NOT do (non-goals)

- No owner-side affordances (create/edit/delete/DnD/favorites/bulk) — read-only inbox.
- No grouping in V1 (deferred; see `04` §5).
- No new server actions (keep `openRecipientProposalAction` + `loadRecipientProposals`).
- No change to the `openRecipientProposalAction` authz contract.
- No change to the TanStack Query key/config.
- No new D1 columns (A4 uses `COUNT(*)`, not a schema change; A3 uses an existing enum value).
- No immutable snapshots / PDF (Enterprise P1, out of scope).

## 6. Resume state

This is a planning artifact. No code has been changed. The first executable
unit is **A1+A2** (or, if the owner wants the redesign first, **B1**). Before
execution, re-read the target files immediately (`recipient-proposals-repository.ts`,
`proposals-page-client.tsx`, `WorkshopCollectionLayout.tsx`) and confirm `git
status` is clean on the scoped paths.
