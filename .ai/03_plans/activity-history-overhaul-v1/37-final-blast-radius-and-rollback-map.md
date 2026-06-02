# 37 — Final Blast Radius and Rollback Map

**Date:** 2026-06-02
**Status:** Fifth pass — per-PR blast radius
**Purpose:** Realistic blast radius, risk, and rollback assessment for each implementation PR.

---

## PR 2 — Preflight Correctness Cleanup

| Metric | Value |
|--------|-------|
| **Files touched** | 5–7 production files, 2–3 test files |
| **Data touched** | None (no DB changes, no migrations) |
| **User surfaces affected** | Activity filter dropdown (Fix 1), SharedLinkActivityFeed Realtime (Fix 2), Public API response (Fix 3), Comments form (Fix 5), Decision form (Fix 5) |
| **Risk** | 🟡 **MEDIUM** — CSRF changes affect live client interactions (comments/decisions). Incorrect cookie/header logic could break comment/decision submission. |
| **Rollback** | Revert each fix individually. No data rollback needed. |
| **Tests** | Existing: `estimate-sheet-version-control-ui.test.tsx`, `project-publication-comments.test.tsx`, `project-publication-decision.test.tsx`, `project-publication-activity.test.tsx`. New: CSRF integration tests for comments/decisions, GET /activity origin tests. |

### Per-fix blast radius

| Fix | Files changed | Risk | Notes |
|-----|--------------|------|-------|
| 1: row_inserted filter | `EstimateSheetContent.tsx`, `estimate-sheet-version-control-ui.test.tsx` | 🟢 LOW | UI-only filter label change. No behavior change beyond filter results. |
| 2: Realtime filter | `SharedLinkActivityFeed.tsx`, `ProjectPublicationHeader.tsx` | 🟢 LOW | Owner-only. Adds prop. Scopes existing subscription. |
| 3: event_type query handling | `activity/route.ts` | 🟢 LOW | Currently unused route. Query already selects event_type; PR 2 adds TODO for PR 5 composer integration. No raw event_type in public JSON response. |
| 4: GET /activity CSRF | `activity/route.ts`, `security.ts` | 🟡 MEDIUM | Changes CSRF on currently-broken route. Extract assertSameOrigin to security.ts as shared utility. |
| 5: Comments/Decisions CSRF | `SharePageComments.tsx` (2 paths), `SharePageDecision.tsx` (1 path), possibly new `use-publication-csrf.ts` hook | 🟡 MEDIUM | 3 fetch paths. MUST test normal POST + offline queue flush. Shared utility recommended. |

### PR 2 Risk Mitigations

- Test comments/decisions CSRF with cookie set + matching header
- Test offline queue flush with CSRF token
- Test GET /activity with and without Origin header
- Test cross-origin rejection
- Manual QA: post comment, submit decision, check activity feed

---

## PR 3 — Activity Composer Module

| Metric | Value |
|--------|-------|
| **Files touched** | ~5 new files in `src/lib/activity/`, ~3 test files |
| **Data touched** | None (pure read projection) |
| **User surfaces affected** | None directly (composer is consumed by PRs 4-6) |
| **Risk** | 🟢 LOW — Pure function module. No DB writes. No route changes. |
| **Rollback** | Delete composer module. No data impact. |
| **Tests** | ~100 new composer unit tests. All existing tests unaffected. |

---

## PR 4 — Estimate Activity UI Integration

| Metric | Value |
|--------|-------|
| **Files touched** | `EstimateSheetContent.tsx`, `estimates/actions.ts`, 2–3 test files |
| **Data touched** | None (reads existing estimate_sheet_events) |
| **User surfaces affected** | Activity History modal (workshop), Row Details → Activity tab |
| **Risk** | 🟡 MEDIUM — Touches existing Activity UI that users interact with. Must preserve all existing behavior while adding composer integration. |
| **Rollback** | Revert EstimateSheetContent.tsx changes. Composer module untouched. |
| **Tests** | Update existing UI tests. Add copy regression tests. |

---

## PR 5 — Shared-Link Activity API Integration

| Metric | Value |
|--------|-------|
| **Files touched** | `SharedLinkActivityFeed.tsx`, `actions.ts`, `activity/route.ts`, 2–3 test files |
| **Data touched** | None (reads existing tables) |
| **User surfaces affected** | SharedLinkActivityFeed (owner workshop view) |
| **Risk** | 🟡 MEDIUM — Touches owner-visible activity feed. Must not regress comment/decision/event rendering. |
| **Rollback** | Revert component + route changes. |
| **Tests** | Update existing activity feed tests. Add copy regression tests for shared-link events. |

---

## PR 6 — Recipient Actor Resolution + Comments/Decisions Copy

| Metric | Value |
|--------|-------|
| **Files touched** | `SharedLinkActivityFeed.tsx`, `actions.ts`, `public-repository.ts`, 2–3 test files |
| **Data touched** | Reads `shared_link_recipients` for actor resolution |
| **User surfaces affected** | SharedLinkActivityFeed (owner view) |
| **Risk** | 🟢 LOW — Read-only actor resolution. Adds display name resolution for recipients. |
| **Rollback** | Revert actor resolution changes. Activity stays with "Client" placeholder. |
| **Tests** | Actor resolution tests, edge cases (missing recipient, deleted recipient). |

---

## PR 7 — Shared Page Access Telemetry ✅ APPROVED

| Metric | Value |
|--------|-------|
| **Files touched** | `share/[token]/page.tsx`, `public-repository.ts` (new helper), `security.ts`, 5+ test files |
| **Data touched** | Writes to `project_publication_events` (existing table, new helper). NO new tables. NO migrations. |
| **User surfaces affected** | None (analytics only in V1.1). Owner UI in future PR. |
| **Risk** | 🟡 **MEDIUM** — Privacy gates cleared by Owner/Product + Internal Privacy (2026-06-02). Implementation risk remains. |
| **Rollback** | Remove analytics helper calls from page.tsx. No data cleanup needed (existing table). |
| **Tests** | 25+ access telemetry tests covering all access stages, side effects, bot detection, deduplication. |

**GATE:** ✅ APPROVED — All gates cleared by Owner/Product + Internal Privacy (2026-06-02):
- D-017 (device/browser in UI) approved by Product
- D-018 (location granularity) approved by Legal
- D-023 (in-product disclosure) approved by Legal
- Implementation proceeds under conservative privacy constraints (see doc 47). No stakeholder blockers.

---

## PR 8A — Shared-Link Pagination + Realtime Hardening

| Metric | Value |
|--------|-------|
| **Files touched** | `SharedLinkActivityFeed.tsx`, `actions.ts`, `activity/route.ts`, 3–4 test files |
| **Data touched** | None (query-level changes only) |
| **User surfaces affected** | SharedLinkActivityFeed, Activity History modal |
| **Risk** | 🟡 MEDIUM — Pagination changes affect data retrieval. Must not introduce data loss at page boundaries. |
| **Rollback** | Revert pagination changes. PR 8B unaffected. |
| **Tests** | Deep pagination tests, cursor boundary tests, Realtime filter verification. |
| **Dependency** | Can proceed after PRs 2–6. NOT gated on PR 7. |

---

## PR 8B — Access Telemetry Hardening

| Metric | Value |
|--------|-------|
| **Files touched** | `actions.ts`, `SharedLinkActivityFeed.tsx`, owner/support views, observability |
| **Data touched** | Reads access telemetry data from PR 7 |
| **User surfaces affected** | Owner activity views, support views |
| **Risk** | 🟡 MEDIUM — Depends on PR 7 data. Dedupe and bot filtering logic must be correct. |
| **Rollback** | Revert per-file changes. PR 8A remains independent. |
| **Tests** | Dedupe rendering tests, bot filtering tests, observability tests. |
| **Dependency** | GO after PR 7 (gate cleared). |

---

## PR 9 — UI Polish, Accessibility, Manual QA

| Metric | Value |
|--------|-------|
| **Files touched** | 5–10 UI component files, CSS classes, test files |
| **Data touched** | None |
| **User surfaces affected** | All activity surfaces (Activity History modal, SharedLinkActivityFeed, comments, decisions) |
| **Risk** | 🟢 LOW — Visual/polish only. No logic changes. |
| **Rollback** | Revert CSS and aria changes. |
| **Tests** | Accessibility tests, screen reader verification, manual QA matrix from doc 18. |

---

## Cross-PR Dependencies

```
PR 1 (docs) ──► PR 2 (preflight) ──► PR 3 (composer) ──► PR 4 (estimate UI)
                                   │                      ├──► PR 5 (shared-link API)
                                   │                      └──► PR 6 (actors)
                                   │
                                   ├──► PR 8A (pagination + Realtime) ← can proceed without PR 7
                                   │
                                   └──► (independent path)
                                        
PR 7 (access telemetry) ──► PR 8B (telemetry hardening) ──► PR 9 (polish)
      ✅ GO (gates cleared)
```

PRs 2-6 are sequential after PR 1. PRs 3-6 can partially parallelize (3 must finish before 4/5/6 can begin, but 4/5/6 can go in any order or parallel). PR 8A can proceed after PRs 2-6 — NOT gated on PR 7. PR 8B follows PR 7 (gates cleared, no stakeholder blockers). PR 9 follows the relevant path (8A or 8B).

---

## Overall Risk Summary

| PR | Risk | Key concern |
|----|------|------------|
| PR 1 | 🟢 LOW | Docs only |
| PR 2 | 🟡 MEDIUM | CSRF fixes affect live client interactions |
| PR 3 | 🟢 LOW | Pure module, no consumer impact |
| PR 4 | 🟡 MEDIUM | Touches existing Activity UI |
| PR 5 | 🟡 MEDIUM | Touches owner activity feed |
| PR 6 | 🟢 LOW | Read-only actor resolution |
| PR 7 | 🟡 MEDIUM | Privacy gates cleared; implementation risk remains |
| PR 8A | 🟡 MEDIUM | Pagination changes affect data retrieval |
| PR 8B | 🟡 MEDIUM | Depends on PR 7 data correctness |
| PR 9 | 🟢 LOW | Visual polish only |

---

## Cross-References

- `34-final-preimplementation-audit.md` — Overall audit summary
- `35-code-truth-map.md` — Code truth map
- `36-access-telemetry-side-effects-audit.md` — Side effects matrix
- `38-pr2-test-command-and-fixture-plan.md` — PR 2 test plan
- `40-final-implementation-handoff.md` — Implementation handoff
- `47-pr7-gate-clearance-and-privacy-approvals.md` — PR 7 gate clearance and privacy approvals
- `48-ph-dpa-npc-compliance-plan.md` — Philippine DPA/NPC compliance plan
