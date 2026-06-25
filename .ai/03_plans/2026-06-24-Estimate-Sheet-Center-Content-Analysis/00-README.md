# 00 — README: Estimate Sheet Center-Content Forensic Audit

**Audit date:** 2026-06-24
**Audited at:** branch `main`, commit `1166b16f6bda9a5ff0d01defd2f8fe922fc8ed79`
**Working-tree status:** 7 unrelated modified files (landing/dashboard/projects page — none touching the audited surfaces). One untracked sibling dir `.ai/03_plans/2026-06-24-Estimate-Sheet-Right-Sidebar-Analysis/`. Audit boundary: clean.
**Package manager:** `bun`. Scripts: `test`, `lint`, `type-check`, `build`, `validate`, `dev` (full list in `package.json`).
**Audit mode:** Investigation/verification/documentation only. **No production code was modified.** No destructive DB commands run. All claims cite file:line read during the audit.

## Executive summary

The Estimate Sheet center column is a **functional, optimistic, generally well-engineered** surface that has accumulated three categories of risk that deserve correction before first-users scale:

1. **Two non-atomic multi-write operations** (move-component, bulk-delete) can leave the database in a partial state that the UI cannot cleanly recover from. Both are silent enough to be missed by a casual QA pass and rare enough that the team likely has not hit them yet — but they will appear at scale. (**ESC-P0-01**, **ESC-P1-03**)
2. **One optimistic-vs-canonical reconciliation gap** in project-source insertion can overwrite newer local edits with a stale full-tree server response. It is serious workflow risk but not structural data corruption, so the 2026-06-25 decision pass re-rated it from P0 to P1 while retaining the historical ID. (**ESC-P0-02**, severity P1)
3. **Several UX, reliability, and observability gaps that mislead without corrupting** — global save toast hides per-row failures, read-only users see enabled mutation controls, malformed drag payloads can throw, adjacent identical trash icons invite destructive mistakes, and beta telemetry has no production sink. (**ESC-P1-04/07**, **ESC-P2-26**, **ESC-P2-08/13**, **ESC-P3-22** re-rated P2)

Alongside these, the 3,550-line `EstimateSheetContent.tsx` orchestrator is at the upper limit of what a single component can safely own; future work should decompose it along the seven domains it currently bundles (**ESC-P2-14**).

The good news: server-side authorization (`assertCanEditEstimate`, `assertCanEditProject`, `assertCanManageLibrary`), source-trust gating (`getLibraryCommitTrustGate`), RLS, optimistic-concurrency row revisions, identity-verified collaboration cursors, and the lazy component-library cache are all in good shape. The gaps are in **client coordination of multi-write operations**, not in the security or persistence layer.

## Health ratings

| Surface | Rating | Notes |
|---------|--------|-------|
| Overall center-sheet health | **B−** | Functional; 1 true P0 and 9 P1s block "production-hardened" status. |
| Row CRUD | **C+** | Single-row operations solid; multi-write (move, bulk) not atomic. |
| Drag-and-drop | **B** | MIME/reader discipline mostly correct; stopPropagation + dragCount edge cases. |
| Persistence-integrity | **C** | Two silent-corruption paths (move, project-source). |
| Performance | **B−** | Virtualization works but has a hard cliff for inline editors in large areas. |
| Accessibility | **C** | Grid-over-`<tr>` virtualization degrades SR semantics; few a11y tests. |
| Security | **A−** | Server authz + RLS solid; client UX leaks enabled controls to read-only users. |

## P0/P1/P2/P3 counts

- **P0:** 1 (ESC-P0-01 move-component)
- **P1:** 9 (ESC-P0-02 project-source tree-override, ESC-P1-03 bulk-delete, ESC-P1-04 save toast, ESC-P1-05 trust-gate stale target, ESC-P1-06 virtualization cliff, ESC-P1-07 read-only UX, ESC-P1-08 virtualized-table a11y package, ESC-P1-09 custom event validation, ESC-P2-26 drag-payload validation)
- **P2:** 9 (clear-vs-delete icons, drop stopPropagation, dragCount, column-width leak, selection prune, "Group" label, orchestrator size, focus budget, ESC-P3-22 telemetry sink)
- **P3:** 9 (cost-sort math, image fallbacks, preview dirty-flag, fetch credentials, shortcut consistency, node-code perf, activity debounce, toast overlap, cursor rAF)

**Total: 28 findings.** Full detail in `15-PRIORITIZED-FINDINGS.md`. Historical IDs are retained even when severity was re-rated on 2026-06-25.

## Ten most consequential risks

1. Move-component partial failure silently corrupts rows (ESC-P0-01).
2. Project-source insert can overwrite newer optimistic edits in the visible tree (ESC-P0-02, severity P1).
3. Bulk-delete is non-transactional; partial persistence without recovery (ESC-P1-03).
4. Global save toast hides per-row failures (ESC-P1-04).
5. Read-only UX is hostile: controls look enabled, fail at server (ESC-P1-07).
6. Trust-gate modal commits against stale target / deleted area (ESC-P1-05).
7. Drag payload parsing can throw or accept malformed client detail without shared validation (ESC-P2-26, severity P1).
8. Clear-vs-Delete-row icons are visually identical (ESC-P2-08).
9. Virtualization cliff when express editor active in large area (ESC-P1-06).
10. Silent bulk-selection pruning on search/filter (ESC-P2-12).

## Recommended first implementation phase

**Phase 1 — Data-integrity & partial-failure corrections** (no UI rework):
1. M-1: Atomic server-side `move_estimate_row_component` RPC, single client call (ESC-P0-01).
2. M-2: Revision-gate the project-source insert reconciliation (ESC-P0-02).
3. M-3: Transactional all-or-nothing `delete_estimate_row_items_bulk` RPC + atomic-failure UX (ESC-P1-03).
4. M-4: Disable Confirm in trust-gate modal when captured target no longer exists (ESC-P1-05).
5. M-5: Gate every row control on `canEditEstimate` (ESC-P1-07).

This phase closes the true P0 and the highest-impact P1s in roughly 4–6 engineer-days. Phase 0 telemetry and decision-contract tasks must land first. See `16-IMPLEMENTATION-PLAN.md`.

## Relationship to Launch-Readiness-Audit

The `2026-06-19-Launch-Readiness-Audit` pack (`.ai/03_plans/README.md`) tracks ~9 hard launch blockers across 18 audit/remediation subfolders. The findings in this plan map to that register as follows:

| This plan's finding | Launch-Readiness-Audit mapping | Status note |
|---|---|---|
| ESC-P0-01 (move-component non-atomic) | Not previously tracked as a launch blocker in `Realtime-Collaboration-Presence` or `API-Routes-And-Server-Actions` subfolders | **New blocker surfaced by this audit.** Phase 1 M-1 must land before external launch. |
| ESC-P0-02 (project-source race, severity P1) | Not previously tracked | **New serious workflow blocker surfaced by this audit.** Phase 1 M-2 must land before external launch. |
| ESC-P1-03 (bulk-delete non-tx) | Adjacent to `API-Routes-And-Server-Actions` partial-failure concerns | **New blocker surfaced by this audit.** Phase 1 M-3 must land. |
| ESC-P1-07 (read-only UX) | Adjacent to `RLS-RPC-And-DB-Security` authz-UX gaps | Strategically load-bearing for the approver-side wedge (`README.md:225-227`); treat as launch-blocking. |

Phases 7–9 of `16-IMPLEMENTATION-PLAN.md` (virtualization refinements, decomposition, account-scoped column widths) are **not** launch-blocking and should be sequenced after first users.

Owner action: cross-reference these findings in the `2026-06-19-Launch-Readiness-Audit` register so the launch critical path reflects them.

## Artifact index

| # | Artifact | Purpose |
|---|----------|---------|
| 00 | README.md | This file — executive summary + index. |
| 01 | SCOPE-AND-SYSTEM-MAP.md | Branch/commit, file inventory, component hierarchy, state ownership, query/action/MIME/event maps, Mermaid diagrams. |
| 02 | ROW-DOMAIN-AND-SOURCE-OF-TRUTH.md | Estimate row model, library/project component states, source-of-truth ledger, persistence truth table. |
| 03 | COMPLETE-BEHAVIOR-INVENTORY.md | Every pointer/keyboard/event-triggered behavior. |
| 04 | ROW-CRUD-AUDIT.md | Per-operation audit (create/read/update/replace/clear/delete/bulk/move/detach/promote). |
| 05 | DRAG-DROP-AND-INSERTION-AUDIT.md | Source×target matrix, MIME contracts, payload validation, auto-scroll, spring-loading. |
| 06 | EDITING-MATH-AND-TOTALS-AUDIT.md | Numeric input behavior, formulas, rounding, totals parity. |
| 07 | TABS-SELECTION-SEARCH-AND-DISPLAY-AUDIT.md | Tab lifecycle, selection, search, facets, group, expand/collapse. |
| 08 | STATE-CONCURRENCY-AND-ROLLBACK-AUDIT.md | State machine, queues, revisions, rollback paths. |
| 09 | NETWORK-CACHE-AND-PERSISTENCE-AUDIT.md | Every query, every mutation, query keys, cache reconciliation. |
| 10 | UX-UI-ACCESSIBILITY-AUDIT.md | Layout, typography, destructive-action clarity, keyboard, SR, virtualized semantics. |
| 11 | PERFORMANCE-AUDIT.md | Render profiling, memo effectiveness, virtualization, large-data risks. |
| 12 | ACTIVITY-DETAILS-EXPORT-AND-COLLABORATION-AUDIT.md | Row details, activity history, proposal export, cursors, conflict handling. |
| 13 | SECURITY-AND-DATA-INTEGRITY-AUDIT.md | Authz, RLS, scoping, payload validation, idempotency. |
| 14 | EDGE-CASE-AND-TEST-MATRIX.md | State transitions, pairwise combos, failure injection, test gap matrix. |
| 15 | PRIORITIZED-FINDINGS.md | All 28 findings with full evidence + recommendations. |
| 16 | IMPLEMENTATION-PLAN.md | Phased execution plan, 9 phases, every task with DoD. |
| 17 | VALIDATION-PLAN.md | Type/lint/unit/integration/E2E/a11y/perf validation matrix. |
| 18 | OPEN-QUESTIONS-AND-DECISION-LEDGER.md | Product decisions code cannot answer + recommended defaults. |
| 19 | TRACEABILITY-MATRIX.md | Finding → decision → task → file → test → evidence. |
| 20 | PLAN-AUDIT-AND-SCORECARD.md | Initial + final scorecard, 6 specialist reviewers, resolved blockers, revision status. |
| 21 | ADVERSARIAL-REVIEW.md | Unverified assumptions, cross-doc contradictions, missing scenarios, severity disputes, missing findings, with resolution addendum. |
| 22 | THREAT-MODEL.md | Center-sheet assets, actors, trust boundaries, threat decisions, residual risks. |

## Out of scope

Per the spec §1: the complete left sidebar (`EstimateSheetTree`) and right sidebar (`EstimateRightSidebar`) implementations are NOT re-audited. They are inspected only where their contracts with the center sheet affect center-sheet behavior (drag payload creation, click-to-insert events, template/project-source insertion events, source-trust data, success/error feedback, cross-panel drag state, tab spring-loading). A separate sibling audit `2026-06-24-Estimate-Sheet-Right-Sidebar-Analysis/` covers the right sidebar in depth.

## Method note

This audit was conducted by reading the cited source directly (no runtime instrumentation). Background `explore` agents gathered three cross-cutting inventories (server-action bodies, drag contracts, state/virtualization/tests); their outputs were folded into the relevant artifacts. No claim of correctness is made without a file:line citation. Where runtime behavior was inferred rather than directly observed, the finding's **Confidence** field reflects that (Medium vs High).

## Environmental limitations

- No authenticated runtime session was available; all persistence-layer claims are inferred from server-action source, not from observing the DB post-mutation.
- The Supabase project is `ebxxqidacheyapmmzavr` (Archestimator); the audit did not run any SQL against it.
- No Playwright/E2E run was executed; perf claims (ESC-P1-06, ESC-P3-21) are reasoned from the code path, not measured.
- Browser a11y tools (axe, NVDA, VoiceOver) were not run over the rendered page; the a11y findings are inferred from the DOM structure (CSS Grid over `<tr>`, aria-* attributes present).
