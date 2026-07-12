# 04 — Findings Registry (consolidated, improve-stage)

Master index of ALL findings across create-stage (`02`, `03`) and improve-stage
(`07` adversarial, `08` design, `09` perf-budget) passes. `file:line` vs current `main`.

**Totals: 65 findings** — P0: 0 · P1: 23 · P2: 27 · P3: 11 · safe/accepted: 4.

## Performance & data-layer

| ID | Sev | Type | Title | Evidence | Doc | Unit | Status |
|---|---|---|---|---|---|---|---|
| PF-1 | P1 | perf | **~20 D1 RTs / 4 serial waves** on a <100ms route (was "8", corrected) | `roster-repository.ts:635-673`; `workspace-repository.ts:1486-1624` | 09 | UNIT-1 | OPEN |
| PF-2 | P1 | perf | `readAccessibleEstimateIdSet` serial loop, 1 RT/90 estimates | `workspace-repository.ts:1279,1292` | 09 | UNIT-1 | OPEN |
| PF-3 | P1 | perf | Correlated subquery redundant; derivable from fetched rows | `roster-repository.ts:595-628` | 09,02 | UNIT-1 | OPEN |
| PF-4 | P1 | bundle | `ShareWizard` (+764-LOC RecipientEmailComposer) static, user-gated; no `next/dynamic` | `PublisherRosterClient.tsx:15` | 09 | UNIT-11 | OPEN |
| PF-5 | P1 | bundle | `PublisherDrawer`+`Picker` static, user-gated | `PublisherRosterClient.tsx:10,13` | 09 | UNIT-11 | OPEN |
| PF-6 | P2 | observ | D1 RTs invisible to tracing (only Postgres wrapped) | `server-timing.ts:98-139` | 09 | UNIT-1 | OPEN |
| PF-7 | P2 | perf | Double `<Suspense>` wraps single async child | `page.tsx:42-45,58-60` | 09 | UNIT-11 | OPEN |
| PF-8 | P2 | perf | Mutations trigger full `router.refresh()` not optimistic patch | `usePublisherDrawer.ts:24,36-40` | 09 | UNIT-1 | OPEN |
| PERF-3 | P2 | perf | Drawer staleTime + double refresh | `usePublisherDrawer.ts:24,36-40` | 02 | (defer) | OPEN |
| PERF-4 | P2 | perf | Staleness cache per-isolate singleton | `workspace-repository.ts:1041-1048` | 02 | (documented) | ACCEPTED |

## Bugs (data/logic)

| ID | Sev | Type | Title | Evidence | Doc | Unit | Status |
|---|---|---|---|---|---|---|---|
| BUG-1 | P1 | bug | Activity source-cap drops dominant-source rows | `activity-repository.ts:293,358` | 02 | UNIT-2 | OPEN |
| BUG-2 | P1 | bug | `submitClientResponse` dedupe race | `d1-store.ts:760-765,779` | 02 | UNIT-3 | OPEN |
| BUG-3 | P1 | bug | Manager mutations throw, no client error handling | `actions.ts:394`; `usePublisherDrawer.ts:42-58` | 02 | UNIT-5 | OPEN |
| BUG-4 | P2 | bug | `ShareLinkDisplay.message` never clears | `ShareLinkDisplay.tsx:20,31` | 02 | UNIT-7 | OPEN |
| BUG-5 | P2 | bug | Activity 250-publication cap silent | `activity-repository.ts:280-284` | 02 | UNIT-2 | OPEN |
| BUG-6 | P1 | dead | `PublisherProjectMembersPanel` zero prod importers | `PublisherProjectMembersPanel.tsx` | 02 | UNIT-6 | OPEN |

## Bugs (adversarial pass — client state/lifecycle)

| ID | Sev | Title | Evidence | Doc | Unit | Status |
|---|---|---|---|---|---|---|
| A-BUG-1 | P1 | `searchValue` never re-syncs from `filters.search` | `PublisherRosterClient.tsx:120,247` | 07 | UNIT-8 | OPEN |
| A-BUG-2 | P1 | `selectedProjectId` not kept valid vs `roster.rows` | `PublisherRosterClient.tsx:130-139` | 07 | UNIT-8 | OPEN |
| A-BUG-3 | P2 | Imperative `matchMedia` in click handler (= D-9) | `PublisherRosterClient.tsx:190` | 07 | UNIT-8 | OPEN |
| A-BUG-4 | P1 | `verificationPending` no "back to editor" transition | `ShareWizard.tsx:45,51,105-138` | 07 | UNIT-9 | OPEN |
| A-BUG-5 | P2 | `retryProjectDetails` early-return drops initial-load retry | `ShareWizard.tsx:123-126` | 07 | UNIT-9 | OPEN |
| A-BUG-6 | P1 | Draft state wiped before verification confirms | `ShareWizard.tsx:140-162` | 07 | UNIT-9 | OPEN |
| A-BUG-7 | P2 | No `onError` on mutations + `void` (⊂ BUG-3) | `PublisherDrawer.tsx:170-177` | 07 | UNIT-5 | OPEN |
| A-BUG-8 | P2 | In-flight ref keyed on mutable projectId; never cleared | `PublisherDrawer.tsx:112,144-168` | 07 | UNIT-5 | OPEN |
| A-BUG-9 | P2 | Picker focus lands on close button, not search (= D-21) | `PublisherProjectPicker.tsx:70,85` | 07 | UNIT-7 | OPEN |
| A-BUG-10 | P2 | Search cleared on Link click → full-list flash | `PublisherProjectPicker.tsx:54-62,140` | 07 | UNIT-7 | OPEN |
| A-BUG-11 | P2 | `useSyncExternalStore` no-op subscribe (= D-22) | `ShareLinkDisplay.tsx:15-25` | 07 | UNIT-7 | OPEN |
| A-BUG-12 | P1 | Drawer/wizard deep-link matched only vs current-page rows | `PublisherRosterClient.tsx:91-108` | 07 | UNIT-8 | OPEN |
| A-BUG-13 | P2 | `closeWizard` leaves `project` param → roster stays filtered | `PublisherRosterClient.tsx:207-235` | 07 | UNIT-8 | OPEN |

## Security

| ID | Sev | Title | Evidence | Doc | Unit | Status |
|---|---|---|---|---|---|---|
| SEC-1 | P1 | Share HTML page no `Cache-Control: no-store` | `share/[token]/page.tsx:35` | 03 | UNIT-4 | OPEN |
| SEC-2 | — | Preview token safe (verified) | `preview/[projectId]/page.tsx:37` | 03 | — | N/A (safe) |
| SEC-3 | P2 | Manager mutation error leakage (⊂ BUG-3) | `actions.ts:394` | 03 | UNIT-5 | OPEN |

## Design / UX / Accessibility

| ID | Sev | Title | Evidence | Doc | Unit | Status |
|---|---|---|---|---|---|---|
| D-1 | P1 | Amber palette hardcoded in ClientPreviewBanner | `ClientPreviewBanner.tsx:5` | 08 | UNIT-7 | OPEN |
| D-2 | P2 | Banner 12px body + `<strong>` outside type scale | `ClientPreviewBanner.tsx:6` | 08 | UNIT-7 | OPEN |
| D-3 | P3 | Pervasive `!text-[Npx]` with `!important` | across directory | 08 | (defer) | OPEN |
| D-4 | P3 | Duplicated grid templates client+skeleton | `PublisherRosterClient.tsx:278` | 08 | UNIT-7 | OPEN |
| D-5 | P2 | Link-as-button duplicated, drifted (4 sites) | `PublisherDrawer.tsx:240` et al. | 08 | UNIT-7 | OPEN |
| D-6 | P2 | Native checkbox instead of `Checkbox` primitive | `ShareWizard.tsx:309` | 08 | UNIT-9 | OPEN |
| D-7 | P3 | Read-only link raw `<input>` ×2 | `PublisherDrawer.tsx:301` | 08 | (defer) | OPEN |
| D-8 | P3 | Picker re-implements AppModal chrome | `PublisherProjectPicker.tsx:64` | 08 | UNIT-9 | OPEN |
| D-9 | P1 | Mobile matchMedia at click time + dead mobile empty-state (= A-BUG-3) | `PublisherRosterClient.tsx:190` | 08 | UNIT-8 | OPEN |
| D-10 | P2 | Fixed toolbar columns overflow; no tooltip on select | `PublisherRosterClient.tsx:278` | 08 | UNIT-7 | OPEN |
| D-11 | P2 | 8-9px meta at readability floor; 3-way recipient-copy drift | `PublisherRosterCard.tsx:52` | 08 | UNIT-7 | OPEN |
| D-12 | P1 | Copy "Copied" feedback never resets (3 sites) | `PublisherRosterClient.tsx:253` | 08 | UNIT-7 | OPEN |
| D-13 | P2 | aria-live announces raw `"id:copied"` | `PublisherRosterClient.tsx:405` | 08 | UNIT-7 | OPEN |
| D-14 | P2 | No in-flight feedback on destructive actions | `PublisherDrawer.tsx:155` | 08 | UNIT-5 | OPEN |
| D-15 | P1 | Roster no listbox semantics / arrow-key nav | `PublisherRosterClient.tsx:342` | 08 | UNIT-10 | OPEN |
| D-16 | P2 | Selected row color-only cue + brand-orange ring | `PublisherRosterCard.tsx:38` | 08 | UNIT-10 | OPEN |
| D-17 | P2 | Warning text contrast borderline 4.51:1 | `PublisherDrawer.tsx:252` | 08 | UNIT-7 | OPEN |
| D-18 | P2 | Drawer tabpanel `tabIndex={0}` extra tab stop | `PublisherDrawer.tsx:289` | 08 | UNIT-7 | OPEN |
| D-19 | P3 | `CheckCircle weight="fill"` (only enforcer failure) | `ShareWizard.tsx:212` | 08 | UNIT-7 | OPEN |
| D-20 | P3 | `StatusBadge` contract defeated everywhere | `PublisherRosterCard.tsx:56` | 08 | (defer) | OPEN |

## UX (create-stage)

| ID | Sev | Title | Evidence | Doc | Unit | Status |
|---|---|---|---|---|---|---|
| UX-1 | P1 | Members panel dead/feature-gap (= BUG-6) | `PublisherProjectMembersPanel.tsx` | 03 | UNIT-6 | OPEN |
| UX-3 | P2 | Two pagination models coexist | PublisherPagination vs activity cursor | 03 | (documented) | ACCEPTED |
| UX-4 | P3 | Very small font sizes (⊂ D-3/D-11) | pervasive | 03 | (defer) | ACCEPTED |

## Debt

| ID | Sev | Title | Evidence | Doc | Unit | Status |
|---|---|---|---|---|---|---|
| DEBT-1 | P2 | Activity `limit:50` literal in 3 files | `activity-repository.ts:107` | 03 | UNIT-7 | OPEN |
| DEBT-2 | P2 | `console.warn` in prod | `roster-repository.ts:199` | 03 | UNIT-7 | OPEN |
| DEBT-3 | P3 | `PublisherRosterRow.tsx` misnamed | `PublisherRosterRow.tsx` | 03 | (low value) | ACCEPTED |
| DEBT-4 | P3 | `en-PH` locale hardcoded | `PublisherRosterRow.tsx:24` | 03 | UNIT-7 | OPEN |
| DEBT-5 | P3 | Duplicated grid templates (= D-4) | skeleton/picker/members | 03 | UNIT-7 | OPEN |
| DEBT-6 | P2 | Activity `load()` double-click unguarded | `SharedLinkActivityFeed.tsx:346` | 03 | UNIT-2 | OPEN |
| DEBT-7 | P3 | Picker double focus directive (= A-BUG-9/D-21) | `PublisherProjectPicker.tsx:70,85` | 03 | UNIT-7 | OPEN |

## Priority guidance for first-users stage

**Fix first (security + cheap high-impact):** SEC-1 (Cache-Control, trivial), D-12+D-13 (copy feedback + aria-live, small), D-1 (amber, trivial), PF-3 (delete redundant query, no behavior change).

**Fix before scale:** PF-1/PF-2 (roster query consolidation), BUG-1/BUG-2 (data correctness), A-BUG-1/A-BUG-2/A-BUG-12/A-BUG-13 (URL/state sync — all user-visible navigation bugs), BUG-3/A-BUG-7 (mutation error handling).

**Decide intent:** BUG-6/UX-1 (members panel — wire or delete), D-15 (listbox vs plain list).

**Defer:** PF-4/PF-5/PF-7 (bundle/streaming — matters at scale), D-3/D-20 (type-scale/token evolution), UX-3/UX-4 (cosmetic).
