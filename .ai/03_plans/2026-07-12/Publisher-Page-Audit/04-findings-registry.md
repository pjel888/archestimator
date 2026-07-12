# 03 — Findings Registry

Master index of all findings with severity, type, evidence, and owning unit.
`file:line` vs `main@b4b85b307`.

| ID | Severity | Type | Title | Evidence | Owning unit | Status |
|---|---|---|---|---|---|---|
| PERF-1 | P1 | perf | 8 D1 round-trips + in-memory filter/pagination | `roster-repository.ts:630-688,320-445` | UNIT-1 | OPEN |
| PERF-2 | P1 | perf | Correlated subquery per project (latest status) | `roster-repository.ts:595-628` | UNIT-1 | OPEN |
| PERF-3 | P2 | perf | Drawer staleTime + double refresh | `usePublisherDrawer.ts:24,36-40` | (defer) | OPEN |
| PERF-4 | P2 | perf | Staleness cache per-isolate singleton | `workspace-repository.ts:1041-1048` | (documented) | ACCEPTED |
| BUG-1 | P1 | bug | Activity source-cap drops dominant-source rows | `activity-repository.ts:293,358,242-244` | UNIT-2 | OPEN |
| BUG-2 | P1 | bug | submitClientResponse dedupe race | `d1-store.ts:760-765,779` | UNIT-3 | OPEN |
| BUG-3 | P1 | bug | Manager mutations throw, no client error handling | `actions.ts:394`; `usePublisherDrawer.ts:42-58` | UNIT-5 | OPEN |
| BUG-4 | P2 | bug | ShareLinkDisplay message never clears | `ShareLinkDisplay.tsx:20,31,33,44,47,78` | UNIT-7 | OPEN |
| BUG-5 | P2 | bug | Activity 250-publication cap silent | `activity-repository.ts:280-284` | UNIT-2/7 | OPEN |
| BUG-6 | P1 | deadcode | PublisherProjectMembersPanel zero prod importers | `PublisherProjectMembersPanel.tsx` | UNIT-6 | OPEN |
| SEC-1 | P1 | sec | Share HTML page no `Cache-Control: no-store` | `share/[token]/page.tsx:35` | UNIT-4 | OPEN |
| SEC-2 | — | sec | Preview token safe (verified) | `preview/[projectId]/page.tsx:37` | — | N/A (safe) |
| SEC-3 | P2 | sec | Manager mutation error leakage | `actions.ts:394` | UNIT-5 | OPEN |
| UX-1 | P1 | ux | Members panel feature gap / dead code | (= BUG-6) | UNIT-6 | OPEN |
| UX-2 | P2 | ux | ClientPreviewBanner hardcoded amber | `ClientPreviewBanner.tsx:5` | UNIT-7 | OPEN |
| UX-3 | P2 | ux | Two pagination models coexist | `PublisherPagination` vs activity cursor | (documented) | ACCEPTED |
| UX-4 | P3 | ux | Very small font sizes | pervasive `!text-[8/9/10px]` | (defer to DESIGN.md) | ACCEPTED |
| DEBT-1 | P2 | debt | Activity limit:50 literal in 3 files | `activity-repository.ts:107`; `PublisherActivityFeed.tsx:17`; `SharedLinkActivityFeed.tsx:140,192` | UNIT-7 | OPEN |
| DEBT-2 | P2 | debt | `console.warn` in prod | `roster-repository.ts:199` | UNIT-7 | OPEN |
| DEBT-3 | P3 | debt | `PublisherRosterRow.tsx` misnamed | `PublisherRosterRow.tsx` | (low value) | ACCEPTED |
| DEBT-4 | P3 | debt | `en-PH` locale hardcoded | `PublisherRosterRow.tsx:24` et al. | UNIT-7 | OPEN |
| DEBT-5 | P3 | debt | Duplicated grid templates | skeleton/picker/members | (defer) | ACCEPTED |
| DEBT-6 | P2 | debt | Activity load() double-click unguarded | `SharedLinkActivityFeed.tsx:346` | UNIT-2 | OPEN |
| DEBT-7 | P3 | debt | Picker double focus directive | `PublisherProjectPicker.tsx:70,85` | UNIT-7 | OPEN |

**Counts:** 24 findings — P0: 0 · P1: 6 (PERF-1, PERF-2, BUG-1, BUG-2, BUG-3,
BUG-6/UX-1, SEC-1) · P2: 9 · P3: 4 · safe/accepted: 4.

**Note on P1 count:** SEC-1 and BUG-6/UX-1 are the highest-value to resolve
first (security-defense-in-depth and a missing/dead feature respectively).
PERF-1/2 and BUG-1/2/3 are real but bounded at first-user scale.
