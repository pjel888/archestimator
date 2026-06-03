# 00 — Plan Index: Share Page Client Review UX/UI Overhaul

**Plan ID:** `2026-06-03-share-page-client-review-ux-ui-overhaul`
**Created:** 2026-06-03
**Second-Pass Refinement:** 2026-06-03 (see "Second-Pass Refinement Notes" below)
**Status:** `READY_FOR_IMPLEMENTATION` — Philip approved lightweight GET routes for comment/decision state loading on 2026-06-03 (Option 1 in `24_API_CONTRACT_PLAN.md`). All blocking decisions resolved. See `11_READINESS_SCORECARD.md` for full scores.
**Repository:** `pjel888/archestimator`
**Branch:** `main` (feature branch required for implementation)

---

## Task Goal

Redesign the public client share page (`/share/[token]`) from a technical, workshop-like viewer into a premium, client-trustworthy proposal review portal. Fix the `CostDonutChart` SVG hydration mismatch. Remove visible debug artifacts. Load existing comment/decision state. Deliver a polished experience where clients can clearly understand their review state, comment, accept, decline, or request revisions.

## Scope

**IN SCOPE:**
- `/share/[token]` page route (`src/app/share/[token]/page.tsx`)
- All `src/components/share/` components (tabs, comments, decision, hero, session banner, recipient initializer, password form, estimate tree/grid)
- `CostDonutChart` hydration fix + debug artifact removal (`src/components/charts/CostDonutChart.tsx`)
- Visual redesign: layout, typography, color usage, whitespace, information hierarchy
- UX improvements: decision flow clarity, comment experience, session state communication
- Comment/decision state loading from server (via new lightweight GET routes — see 24_API_CONTRACT_PLAN.md)
- Mobile-responsive layout improvements
- Accessibility improvements (focus, keyboard, ARIA, modal focus trap)
- Any copy/language changes for client-facing clarity
- Design-system compliance pass

**OUT OF SCOPE:**
- Database schema changes (no migrations)
- Supabase/RLS changes
- Package.json dependency changes
- Workshop/owner-side publication manager changes
- Invite/collaboration system changes
- AI/Ask Flip changes
- Landing page changes
- PDF/export additions

**MAY REQUIRE API ROUTE ADDITIONS (Human Decision Required):**
- Adding lightweight public GET routes for comment history and decision state loading
- See `12_OPEN_QUESTIONS_AND_DECISIONS.md` item P4 for Philip's decision
- See `24_API_CONTRACT_PLAN.md` for proposed route contracts
- If Philip rejects new routes, implementor should use existing public data paths or mark as deferred
- Modifying existing API route behavior (GET routes are additive only, POST/DELETE unchanged)

## Plan Document Map

| # | Document | Purpose | Status |
|---|----------|---------|--------|
| 00 | INDEX (this file) | Navigation, start-here, risk summary | ✅ Refined (second-pass) |
| 01 | Requirements & Acceptance Criteria | What must be delivered, pass/fail gates | ✅ |
| 02 | Codebase Research | Files inspected, patterns found, gaps identified | ✅ |
| 03 | Architecture & Design Plan | Proposed approach, data flow, file changes | ✅ |
| 04 | Implementation Sequence | Ordered steps with validations | ✅ |
| 05 | Blast Radius & Risk Analysis | Affected flows, regressions, mitigations | ✅ |
| 06 | Testing & Verification Plan | Tests needed, validation commands | ✅ |
| 07 | UI/UX & Accessibility Plan | Layout, states, responsiveness, a11y | ✅ |
| 08 | Security, Performance & Data Plan | Auth, RLS, validation, perf | ✅ |
| 09 | Deployment, Migration & Rollback Plan | Deploy steps, migration, rollback | ✅ |
| 10 | Implementation Prompt Draft | Future agent prompt for executing this plan | ✅ Refined (second-pass) |
| 11 | Readiness Scorecard | Scores per doc, improvement log | ✅ Refined (second-pass) |
| 12 | Open Questions & Decisions | Resolved + pending items | ✅ |
| 13 | Traceability Matrix | Requirement → file → step → test mapping | ✅ |
| 14 | Share Page UX Audit | Detailed current-state UX issues | ✅ |
| 15 | Hydration Fix Plan | Technical plan for CostDonutChart fix | ✅ |
| 24 | API Contract Plan | GET route contracts for comment/decision state loading | ✅ NEW (second-pass) |
| 25 | Bug Triage & Blocker Register | All related bugs, severity, blocking status | ✅ NEW (second-pass) |

## Start-Here for Implementation Agent

1. **Read this INDEX first** — understand scope, non-goals, risk summary
2. **Read `AGENTS.md` and `.ai/README.md`** — project rules and Next.js 16 requirements
3. **Read `01_REQUIREMENTS`** — all acceptance criteria (pass/fail gates)
4. **Read `02_CODEBASE_RESEARCH`** — understand current architecture and second-pass findings
5. **Read `24_API_CONTRACT_PLAN`** — understand GET route contracts
6. **Read `25_BUG_TRIAGE_AND_BLOCKER_REGISTER`** — all known bugs and blockers
7. **Read `04_IMPLEMENTATION_SEQUENCE`** — follow exact step order
8. **Read `07_UI_UX_AND_ACCESSIBILITY_PLAN`** — design decisions
9. **Read relevant Next.js 16 local docs** (`node_modules/next/dist/docs/`) before touching App Router, hydration, or SSR behavior
10. **Run repo safety checks** (`git status`, `git fetch`, `git log`) before editing
11. **Execute in exact wave order** specified in `04_IMPLEMENTATION_SEQUENCE`
12. **Run validations after each step** as specified
13. **Update `.ai` docs** after implementation
14. **Archive plan folder to `.ai/09_archive/`** after completion

## Recommended Implementation Sequence

1. **Phase 1 — Tests & Foundation**: Add/adjust tests for hydration, share page UX contracts (TDD-first)
2. **Phase 2 — Hydration Fix**: Fix `CostDonutChart` floating-point mismatch (see bug plan B1)
3. **Phase 3 — Language & Artifacts**: Remove "View-only" badge, debug badge, de-technicalize copy
4. **Phase 4 — Layout & Visual Redesign**: Restructure page layout, extract DecisionBar
5. **Phase 5 — State & Data Loading**: Add GET routes, load existing comments and decision state
6. **Phase 6 — Accessibility & Mobile**: Focus trap, keyboard, responsive pass
7. **Phase 7 — Full Validation**: `bun run validate`, `bun run build`, `bun run lint:design-system`, manual QA

## Required Verification Commands

```bash
bun run validate          # type-check + lint + design-system + unit + DOM tests
bun run build             # Next.js production build
bun run lint:design-system # Design system enforcement
git diff --check           # Whitespace validation
```

Manual QA: Navigate to target share URL, verify zero hydration warnings, clean visual appearance.

## Risk Summary

| Risk | Severity | Mitigation |
|------|----------|------------|
| Hydration regression from D3 changes | Medium | Deterministic rounding + regression test |
| Password gate regression | High | Don't touch password/auth boundaries |
| Recipient session regression | High | Keep session cookie logic unchanged |
| Comment/decision GET route introduces new attack surface | Medium | Minimal read-only endpoints, no schema changes, reuse existing security patterns |
| Design-system lint failures | Low | Run lint after every visual change |
| Mobile layout breakage | Medium | Manual QA on mobile viewport |
| Accessibility regression | Low | Keep existing ARIA, add focus-trap tests |
| Build failure from component restructure | Low | Incremental changes, build after each phase |

## Bug/Blocker References

| # | Bug | Plan File | Blocks? |
|---|-----|-----------|---------|
| B1 | CostDonutChart SVG hydration mismatch | `.ai/15_Bugs/2026-06-03-share-page-cost-donut-chart-hydration-mismatch.md` | ✅ Phase 2 |
| B2 | CostDonutChart visible debug badge | `.ai/15_Bugs/2026-06-03-share-page-cost-donut-chart-visible-debug-badge.md` | ✅ Phase 3 |
| B3 | Comments not loading existing history | `.ai/15_Bugs/2026-06-03-share-page-comments-not-loading-existing-history.md` | ✅ Phase 5 |
| B4 | Decision state not persisting on reload | `.ai/15_Bugs/2026-06-03-share-page-decision-state-not-persisting-on-reload.md` | ✅ Phase 5 |
| B5 | Decision modal focus trap/keyboard a11y | `.ai/15_Bugs/2026-06-03-share-page-decision-modal-focus-accessibility.md` | ✅ Phase 6 |

## Current Status

**READY_FOR_IMPLEMENTATION** — Philip approved lightweight GET routes for comment/decision state loading on 2026-06-03 (Option 1 in `24_API_CONTRACT_PLAN.md`). Plan is now 98% implementation-ready with all blocking decisions resolved. Implementation agent should verify plan against current repo reality before editing, then follow the implementation sequence in `04_IMPLEMENTATION_SEQUENCE.md`.

## Readiness Score Table

| Document | Score | Notes |
|----------|-------|-------|
| 00 INDEX | 100% | Navigation complete, second-pass refined, Philip approval recorded |
| 01 Requirements | 100% | API non-goal resolved by Philip's approval of GET routes |
| 02 Codebase Research | 98% | Second-pass findings section added |
| 03 Architecture | 100% | API strategy approved by Philip — GET route contracts in 24_API_CONTRACT_PLAN.md |
| 04 Implementation Seq | 98% | Bug plan references added |
| 05 Blast Radius | 98% | GET route risks added |
| 06 Testing | 98% | Hydration verification protocol detailed, GET route test contracts specified |
| 07 UI/UX | 98% | Design-system violation details added |
| 08 Security | 98% | GET route security analyzed |
| 09 Deployment | 98% | No migration, rollback clear |
| 10 Prompt Draft | 100% | All deferred decisions resolved by Philip's approval |
| 11 Scorecard | 100% | Honest rescore with before/after/approved scores |
| 12 Open Questions | 100% | P4 RESOLVED — Philip approved lightweight GET routes |
| 13 Traceability | 98% | New rows for bug plans and API contract |
| 14 UX Audit | 100% | Comprehensive audit |
| 15 Hydration Fix | 95% | SVG output catalog needs implementation-time verification |
| 24 API Contract | 100% | GET route contracts approved by Philip — ready for Phase 5 |
| 25 Bug Triage | 100% | All bugs registered |
| **OVERALL** | **98%** | Ready for implementation |

---

## Second-Pass Refinement Notes (2026-06-03)

**What was improved:**
1. **Bug plans created** for 4 previously-untracked defects: debug badge (B2), comment history (B3), decision persistence (B4), modal accessibility (B5)
2. **API contract plan created** (`24_API_CONTRACT_PLAN.md`) — resolves the contradiction between "no new API routes" non-goal and the requirement to load comment/decision state. Recommends lightweight GET routes. Marks as needing Philip approval.
3. **Bug triage register created** (`25_BUG_TRIAGE_AND_BLOCKER_REGISTER.md`) — all 9 related bugs tracked with severity and blocking status
4. **Score contradictions fixed** — all documents now agree on 98% readiness after refinement and Philip's API approval. Previous package had contradictory scores (95%/98%+/99%). Second-pass normalized to 95%, then Philip's approval upgraded to 98%.
5. **Implementation prompt expanded** — added repo safety checks, Next.js 16 docs requirement, GitNexus requirement, TDD expectations, bug plan references
6. **Design-system violations catalogued** — confirmed fontWeight={600}, tracking-normal, hardcoded colors, emoji in CostDonutChart
7. **API scope clarified** — plan now explicitly says GET routes are additive only, existing POST/DELETE routes unchanged, and recommends the approach with full contracts
8. **Philip approved API strategy (2026-06-03)** — lightweight GET routes approved (Option 1 in `24_API_CONTRACT_PLAN.md`). All blocking decisions resolved. Plan upgraded to 98% READY_FOR_IMPLEMENTATION.

**What was NOT changed (preserved from first pass):**
- Implementation sequence phases and step order
- Architecture decisions D1-D10 (all remain valid)
- Layout and visual hierarchy design
- Copy/language replacement table
- Accessibility requirements
- Security boundaries (all preserved)
- Blast radius analysis (expanded, not modified)
- Test specifications (expanded, not modified)
