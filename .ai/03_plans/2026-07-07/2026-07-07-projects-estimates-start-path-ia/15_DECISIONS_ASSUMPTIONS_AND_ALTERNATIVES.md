# 15 — Decisions, Assumptions, and Alternatives

## Assumptions (validated against source)

| ID | Assumption | Validation | Status |
|---|---|---|---|
| ASSUMP-01 | `/workshop` landing + "no onboarding wizard" is stable | `lib/auth/redirects.ts:1` (`DEFAULT_AUTH_DESTINATION="/workshop"`); `/workshop/onboarding` → redirect; sibling `first-user-activation` locks it | Validated |
| ASSUMP-02 | `ProjectStatus` (`ongoing`/`completed`/`archived`) + migration `0039` stable | migration `0039_project_status.sql`; `database.ts:7-20` | Validated |
| ASSUMP-03 | Auto-seeded first estimate in `NewProjectForm` is desired | `NewProjectForm.tsx:335` calls `createEstimateSheetDraft` | Validated (preserve; FR-07) |
| ASSUMP-04 | `src/components/ui/empty-state.tsx` is the canonical empty-state surface | DESIGN.md "no duplicated patterns in route files" | Validated |
| ASSUMP-05 | Telemetry helper in `use-estimate-row-handlers.ts:740` is canonical event surface | source | Validated (SDK choice deferred to sibling) |

## Decisions (load-bearing)

### DEC-01 — Keep landing at `/workshop`; no wizard
- **Problem:** Where does a first user start?
- **Options:** (A) keep `/workshop` + improve destinations (this plan); (B) add a `/workshop/start` wizard.
- **Rejected:** B — contradicts owner decision; slows returning users.
- **Selected:** A.
- **Conditions to change:** explicit owner request for a wizard.

### DEC-02 — Dense, operational empty states (not marketing hero)
- **Problem:** Visual treatment of empty states.
- **Options:** (A) tiny app-scale type + `EmptyState` primitive; (B) large hero/onboarding panels.
- **Rejected:** B — PROMPT constraint ("avoid decorative onboarding").
- **Selected:** A.
- **Implications:** UX-01; pass `lint:design-system`.

### DEC-03 — Reuse `EmptyState` primitive
- **Problem:** Build bespoke empty states or reuse?
- **Options:** (A) reuse `src/components/ui/empty-state.tsx`; (B) bespoke per route.
- **Rejected:** B — DESIGN.md duplication rule.
- **Selected:** A (extend only if a shared variant is needed).

### DEC-04 — No URL state for projects-list filters in this plan
- **Problem:** Filters live in `useReducer` only (lost on refresh); no create deep-link.
- **Options:** (A) defer URL state to a future plan; (B) add it now.
- **Rejected:** B — larger change, separate concern; not required for self-evident starts.
- **Selected:** A (documented as GAP-7; future work).

### DEC-05 — Analytics events only; no SDK choice here
- **Problem:** How to evidence a successful start.
- **Options:** (A) name redacted events + defer SDK to sibling; (B) pick an SDK now.
- **Rejected:** B — sibling plan owns the SDK decision (`OPEN-DEC-02` there).
- **Selected:** A.

### DEC-06 — Sidebar favorite mirrors card (Dashboard)
- **Problem:** href mismatch (C-1).
- **Options:** (A) both Dashboard; (B) both Estimates; (C) keep mismatch.
- **Rejected:** C (inconsistent); B would skip the dashboard summary for favorites.
- **Selected:** A (recommended; subject to OPEN-DEC-03).

### DEC-07 — Auto-seed preserved (not template-at-create)
- **Problem:** Should a new project's first estimate be pre-filled from a template?
- **Options:** (A) keep empty auto-seed + optional empty-state chooser (FR-04); (B) seed from a default template in `createEstimateWithDefaultTab`.
- **Rejected:** B — changes the core create contract + empty-tree assumption (OPEN-DEC-02).
- **Selected:** A.

### DEC-08 — Same-agent verification (honest cap)
- **Problem:** No native independent verifier in this session.
- **Options:** (A) label `same-agent` and cap readiness; (B) claim independent.
- **Rejected:** B — would be false.
- **Selected:** A → CONDITIONALLY READY.

## Open decisions (owner)

### OPEN-DEC-01 — Zero-project empty-state copy/visual
- **Problem:** Exact copy/visual for FR-01.
- **Why codebase can't resolve:** product/voice decision.
- **Options:** (A) recommended copy in `05_UX_UI_ACCESSIBILITY_PLAN.md`; (B) owner-supplied copy; (C) richer hero (rejected by PROMPT).
- **Recommendation:** A.
- **Impact of each:** A → ship as-is; B → swap copy (trivial); C → re-scope (rejected).
- **Owner:** Philip.

### OPEN-DEC-02 — Estimate template chooser placement
- **Problem:** Add chooser at creation time (server) or empty-state only (client)?
- **Options:** (A) empty-state-only chooser (no server change); (B) chooser at `createEstimateWithDefaultTab` (changes empty-tree contract); (C) no chooser (status quo).
- **Recommendation:** A.
- **Impact:** A → P3 as scoped; B → larger change to `createEstimateWithDefaultTab` + redirect semantics + tests; C → drop P3.
- **Owner:** Philip.

### OPEN-DEC-03 — Project-open landing route
- **Problem:** Dashboard or Estimates for card + favorite?
- **Options:** (A) both Dashboard; (B) both Estimates.
- **Recommendation:** A.
- **Impact:** one-line href change either way.
- **Owner:** Philip.

## Alternatives considered (cross-cutting)

- **Alt-A (TanStack Query projects list):** rejected (adds complexity; RSC + refresh works).
- **Alt-B (URL-state filters):** deferred (DEC-04).
- **Alt-C (`/workshop/start` route):** rejected (DEC-01).
- **Alt-D (template at server create):** rejected as default (DEC-07 / OPEN-DEC-02).

## Decision authority notes

- Owner-delegated planning decisions: DEC-06 (href) is owner-delegated with a safe default; implementation may proceed with the default and adjust on confirmation. OPEN-DEC-01/02/03 are genuine owner decisions with conditional implementation paths.
