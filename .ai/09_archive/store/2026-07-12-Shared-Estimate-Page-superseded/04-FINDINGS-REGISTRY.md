# 04 — Findings Registry (consolidated, deduplicated, severity-ranked)

> Source of truth for the prioritized backlog. Each row maps to a `UNIT-*` in
> `05-EXECUTION-UNITS.md` and a detailed doc. Severity: **P0** correctness/security/data
> · **P1** real bug w/ user impact or notable perf · **P2** quality/consistency/tech-debt
> · **P3** minor/nit.

| ID | Sev | Title | Evidence (file:line) | Doc | Unit |
|---|---|---|---|---|---|
| GAP-1 | P1 | No per-area/per-component/per-node commenting (headline) | `share-review-target.ts:1`; `ShareEstimateTreeView.tsx:212-218`; `migrations/0066…sql:223` | 03 §3 / 06 | UNIT-1,2 |
| GAP-2 | P1 | No row-level commenting from inside the tree view | `ShareEstimateTreeView.tsx:148-188` (non-interactive) vs `SharePageTabs.tsx:848` (collated works) | 03 §3 | UNIT-3 |
| BUG-1 | P1 | Cross-widget cache staleness (no invalidateQueries) | `SharePageComments.tsx`; `SharePageDecision.tsx:330-341`; `SharedLinkActivityFeed.tsx` | 02 | UNIT-6 |
| BUG-2 | P1 | Silent tree degradation at >500 rows | `reconstruct-share-tree.ts:29,352-354` | 02 | UNIT-5 |
| BUG-3 | P1 | Decision: no undo + drafts not persisted | `SharePageDecision.tsx:350-377,311` | 02 / 03 §5 | UNIT-7 |
| SEC-1 | P1 | No Cache-Control:no-store on HTML page route | `share/[token]/page.tsx:35` | 02 | UNIT-8 |
| PERF-1 | P1 | No virtualization in tree views | `workshop-tree.tsx:237-259`; `ShareEstimateTreePanel.tsx:356-358` | 02 | UNIT-9 |
| ACT-1 | P1 | Activity feed absent from recipient page | `ShareReviewWorkspace.tsx` (not imported) | 03 §6 | UNIT-10b |
| UX-1 | P2 | Implicit comment target easy to miss | `SharePageComments.tsx:704-706` | 03 §3 | UNIT-11 |
| UX-2 | P2 | No threading / replies (schema lacks parent_id) | `migrations/0066…sql:213-228` | 03 §3 | UNIT-12 |
| UX-3 | P2 | No resolve/unresolve | schema lacks `is_resolved` | 03 §3 | UNIT-12 |
| UX-4 | P2 | No edit/delete | comments immutable | 03 §3 | UNIT-12 |
| UX-5 | P2 | No @mentions | — | 03 §3 | UNIT-12 |
| UX-6 | P2 | No attachments / rich text | plaintext 1000-char cap | 03 §3 | UNIT-12 |
| UX-7 | P2 | No comment filtering/sorting | flat list oldest-first | 03 §3 | UNIT-12 |
| UX-8 | P2 | No inline/pinned comment affordance | `SharePageTabs.tsx` global target only | 03 §3 | UNIT-2/3 |
| UX-9 | P3 | No unread/"new since last visit" on comments | — | 03 §3 | UNIT-12 |
| UX-10 | P2 | No notifications of replies | owner email digest only | 03 §3 | UNIT-12 |
| DEC-3 | P2 | Asymmetric signer-name requirement | `SharePageDecision.tsx:290` | 03 §5 | UNIT-7 |
| DEC-4 | P2 | No multi-stakeholder workflow | enum fixed | 03 §5 | UNIT-12 |
| DEC-5 | P2 | No RFI / question-as-first-class | — | 03 §5 | UNIT-12 |
| DEC-6 | P2 | No mark-as-reviewed per section/sheet | one global decision | 03 §5 | UNIT-12 |
| DEC-7 | P3 | Signature hash not surfaced in UI | `public-repository.ts:959` | 03 §5 | UNIT-11 |
| ACT-2 | P2 | No realtime updates (no SSE/WS/poll) | no `refetchInterval` in share | 03 §6 | UNIT-12 |
| PERF-2 | P2 | Entire snapshot in SSR HTML (monitor) | `page.tsx:343-352` | 02 | monitor |
| PERF-3 | P2 | Duplicate snapshot read on write path | `d1-store.ts:657-665` | 02 | UNIT-11 |
| PERF-4 | P3 | Per-isolate rate-limit cleanup | `public-repository.ts:308-310` | 02 | UNIT-11 |
| PERF-5 | P3 | Loading skeleton drift | `loading.tsx:47` vs `SharePageTabs.tsx:917` | 02 | UNIT-11 |
| BUG-4 | P2 | Designation-text delimiter fragility | `reconstruct-share-tree.ts:36` | 02 | UNIT-5 |
| BUG-5 | P2 | activeNodeId highlight dead in production | `SharePageTabs.tsx:923` | 02 | UNIT-11 |
| BUG-6 | P2 | Optimistic append vs server ordering jitter | `SharePageComments.tsx:195,200-208` | 02 | UNIT-11 |
| BUG-7 | P2 | Password backoff blocks worker | `password/route.ts:103-105` | 02 | UNIT-11 |
| BUG-9 | P2 | Dead/aspirational snapshot schema (issuance, v1.2) | `types.ts:121-134`; `snapshot.ts:504` | 02 | UNIT-11 |
| BUG-10 | P3 | Dead store methods (listPublicComments, etc.) | `d1-store.ts:372-383,433-458,518-531` | 02 | UNIT-11 |
| BUG-11 | P3 | Type weaknesses / unsafe casts | `public-repository.ts:686,820,847` | 02 | UNIT-11 |
| BUG-12 | P3 | Code duplication across comment+decision routes | `comment/route.ts` ≈ `decision/route.ts` | 02 | UNIT-11 |
| BUG-13 | P3 | Supabase-pattern residue / RLS comments | `actions.ts:1059-1061,1844` | 02 | doc only |
| SEC-2 | P2 | Snapshot read lacks runtime shape validation | `public-repository.ts:686` | 02 | UNIT-11 |
| SEC-3 | P3 | viewToken is client-provided (soft binding) | `comment/route.ts:311-336` | 02 | doc only |

## Counts

- **P1:** 8 (GAP-1, GAP-2, BUG-1, BUG-2, BUG-3, SEC-1, PERF-1, ACT-1)
- **P2:** 18
- **P3:** 9
- **P0:** 0 (no correctness/security/data-integrity hard bugs found; the surface is
  functional, the gaps are feature-scope + perf + polish)

## Recommended execution order

1. **UNIT-8** (SEC Cache-Control) — trivial, high-value, zero risk.
2. **UNIT-1** (node review-target enabler) — unblocks the owner's headline ask.
3. **UNIT-2 + UNIT-3** (node + row commenting from tree) — delivers the headline.
4. **UNIT-6** (cross-widget invalidation) — quick correctness win.
5. **UNIT-5** (>500-row degradation) — quick, removes a silent trap.
6. **UNIT-7** (decision undo + draft persistence) — recipient-facing correctness.
7. **UNIT-9** (virtualization) — perf, measure first.
8. **UNIT-10** (nav panel totals + area donut + activity feed) — UX completeness.
9. **UNIT-11** (P2/P3 cleanup bundle) — batch the long tail.
10. **UNIT-12** (feature backlog: threading/resolve/edit/mentions/realtime) — larger
    product scope, sequence after headline lands.
