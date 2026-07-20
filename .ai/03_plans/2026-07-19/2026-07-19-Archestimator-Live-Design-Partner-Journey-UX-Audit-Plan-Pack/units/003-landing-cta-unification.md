# 003 — Landing CTA Unification (minimum-safe-fix scope)

> Closes **High** `UX-CTA-001` (severity downgraded from Critical after second-pass challenge).

## unit_id
`UNIT-003`

## title
Pass the intent param from LandingHeader on secondary marketing pages; document the three-system CTA drift.

## status
`READY`

## priority
`P1` — before user #1.

## severity_of_findings
High (`UX-CTA-001`)

## effort
Trivial (~10 minutes) for the minimum-safe-fix; ~half-day for full unification.

## implementation_risk
`LOW` — adding a query param to one href cannot regress.

## local_implementation_status
`NOT_STARTED`

## external_lifecycle_status
`NOT_REQUIRED`

## requirements
`UX-003`

## findings
`UX-CTA-001`

## existing_plan_links
None.

## goal
Secondary-marketing-page header CTAs (`/privacy`, `/security`, `/features`, `/terms`) carry an `intent` param so `ContactForm` preselects the right inquiry dropdown; the three-system drift is documented (or fully consolidated).

## security_invariants
None.

## current_source_evidence
- `src/components/landing/LandingHeader.tsx:115` — `href="/contact"` (no intent).
- `src/components/landing/sections/LandingCTAs.tsx:13` — `START_HREF = "/contact?intent=started"`.
- `src/components/landing-v3/landing-content.ts:1` — `WALKTHROUGH_HREF = "/contact?intent=walkthrough"`.
- `src/components/landing-v3/ArchestimatorLandingPage.tsx:95` — uses WALKTHROUGH_HREF.
- `src/components/landing/ContactForm.tsx:58-62` — preselects dropdown from `intent`.
- `src/components/landing/PublicPageShell.tsx:28-32` — LandingHeader renders only when `isHomePage=false`.
- `src/app/page.tsx:20` — `isHomePage={true}` so `/` does NOT render LandingHeader.

## affected_paths_and_resources
- `src/components/landing/LandingHeader.tsx` (minimum fix: add `?intent=walkthrough` to `:115`).
- Optional consolidation: pick one CTA component across landing-v3 hero, LandingCTAs, LandingHeader.

## owned_paths
- `src/components/landing/LandingHeader.tsx`

## dependencies
None (file is independent of UNIT-001's broken module).

## preconditions
None.

## non_goals
- Hero copy unification ("Book a walkthrough" vs "Start with an estimate") — deliberate brand decision, out of scope for the minimum fix.
- Visual redesign of CTAs.

## implementation_sequence
1. In `LandingHeader.tsx:115`, change `href="/contact"` to `href="/contact?intent=walkthrough"` (matches the landing-v3 hero intent).
2. (Optional full unification) Extract one `LANDING_PRIMARY_CTA_HREF` constant in `landing-content.ts`, use it in all three call sites.
3. (Optional) Add a code comment at `LandingHeader.tsx` explaining the intent-param contract.

## data_or_schema_changes
None.

## authz_and_tenant_implications
None.

## failure_and_exception_behavior
N/A.

## acceptance_criteria
1. `LandingHeader.tsx:115` href includes an `intent` param.
2. Visiting `/privacy` (or `/security`, `/features`, `/terms`) and clicking the header CTA navigates to `/contact?intent=<value>` (source inspection).
3. `ContactForm` receives the intent and preselects the matching dropdown (manual verification after UNIT-001 unblocks dev).
4. `bun run build` exits 0.

## acceptance_evidence
- Diff inspection of `LandingHeader.tsx`.
- Manual click-through on a secondary page (after UNIT-001) confirming the dropdown preselect.

## test_decision
`TEST_PROPOSAL`.

## exact_test_proposal_if_any
- **Risk:** A future landing-page refactor re-drops the intent param silently.
- **Cheapest decisive test:** `bun x playwright test e2e/landing-audit.spec.ts` (existing) — add an assertion that secondary-page header CTA href contains `intent=`.

## authorization_boundaries
None.

## observability_or_audit_requirements
None.

## recovery_or_fix_forward
Revert the one-line href change.

## conflict_and_concurrency_notes
None.

## completion_signal
`UNIT-003` is `DONE` when all four acceptance criteria are evidenced.

## next_unit_on_success
Any of UNIT-004..UNIT-013.
