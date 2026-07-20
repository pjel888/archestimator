# 005 — First-Estimate Checklist Publish Step

> Closes **High** `UX-ACTIVATE-001`. Survived second-pass challenge at original severity.

## unit_id
`UNIT-005`

## title
Wire the first-estimate checklist 'Publish' step to milestone detection OR hide it when not_available.

## status
`READY`

## priority
`P1` — before user #1. Every new user sees a permanently-broken final step.

## severity_of_findings
High (`UX-ACTIVATE-001`)

## effort
Small (~1-2 hours). Either wire a predicate (the milestone `publication_created` already exists) or filter out not_available rows.

## implementation_risk
`LOW` — change is additive (hide row) or wires an existing predicate.

## local_implementation_status
`NOT_STARTED`

## external_lifecycle_status
`NOT_REQUIRED`

## requirements
`UX-005`

## findings
`UX-ACTIVATE-001`

## existing_plan_links
MVP Startup Readiness `012-first-session-cta-and-seed-json.md` owns first-session CTA work; this unit owns only the checklist's publish-row defect.

## goal
The first-estimate checklist never shows a permanently-degraded publish step. Either the row appears as actionable when the publish milestone is satisfied, or it is hidden entirely.

## security_invariants
None.

## current_source_evidence
- `src/lib/onboarding/first-estimate-checklist.ts:42` — `{ id: "publish", label: "Publish when ready", href: "/workshop/publisher", status: "not_available" }` hardcoded.
- `src/lib/onboarding/first-estimate-checklist.ts:20` — `publication_created` exists in `milestoneRank` (rank 8).
- `src/lib/onboarding/first-estimate-checklist.ts:26-29` — `hasMilestone` helper used for the other 5 rows but NOT publish.
- `src/components/workshop/FirstEstimateChecklist.tsx:42` — appends " (not available)".
- `src/components/workshop/FirstEstimateChecklist.tsx:48-52` — shows the "Some checklist steps are not available yet..." notice whenever `hasUnavailableItems`.

## affected_paths_and_resources
- `src/lib/onboarding/first-estimate-checklist.ts`
- `src/components/workshop/FirstEstimateChecklist.tsx`

## owned_paths
- `src/lib/onboarding/first-estimate-checklist.ts`
- `src/components/workshop/FirstEstimateChecklist.tsx`

## dependencies
None (file-independent; verify with `bun run build` after UNIT-001).

## preconditions
None.

## non_goals
- Redesigning the checklist UI.
- Adding new milestones.

## implementation_sequence
1. Pick one of two fixes:
   - **A (wire):** change `first-estimate-checklist.ts:42` to derive status from `hasMilestone(progress, "publication_created")` like the other rows.
   - **B (hide):** in `FirstEstimateChecklist.tsx`, filter out rows with `status === "not_available"` instead of rendering them; remove the "Some checklist steps are not available yet" notice.
2. Prefer A if the milestone predicate is reliable; prefer B if publish readiness depends on more than the milestone.
3. Run `bun run build` (after UNIT-001) and manually verify on `/workshop`.

## data_or_schema_changes
None.

## authz_and_tenant_implications
None.

## failure_and_exception_behavior
N/A.

## acceptance_criteria
1. The checklist never renders a publish row marked " (not available)" on a fresh user session.
2. If fix A is chosen, the publish row becomes actionable once `publication_created` milestone is satisfied.
3. If fix B is chosen, the "Some checklist steps are not available yet" notice never appears for the publish row.
4. `bun run build` exits 0.

## acceptance_evidence
- Diff inspection.
- Manual `/workshop` load on a fresh user (after UNIT-001) confirms no degraded publish row.

## test_decision
`TEST_PROPOSAL`.

## exact_test_proposal_if_any
- **Risk:** Future checklist changes reintroduce a hardcoded `not_available` row.
- **Cheapest decisive test:** `bun x vitest run tests/vitest/onboarding/first-estimate-checklist.test.ts` (new) — assert no row is `not_available` for a user with no milestones; assert publish row becomes `available` (fix A) once the milestone is set.

## authorization_boundaries
None.

## observability_or_audit_requirements
None.

## recovery_or_fix_forward
Revert.

## conflict_and_concurrency_notes
Coordinate with MVP `012-first-session-cta-and-seed-json.md` if it touches the same checklist file.

## completion_signal
`UNIT-005` is `DONE` when all four acceptance criteria are evidenced.

## next_unit_on_success
Any of UNIT-006..UNIT-013.
