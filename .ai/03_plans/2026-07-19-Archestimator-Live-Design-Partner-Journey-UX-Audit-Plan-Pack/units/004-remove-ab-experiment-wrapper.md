# 004 — Remove or Implement hero-cta-copy A/B Experiment

> Closes **Medium** `UX-CTA-002` (severity downgraded from High after second-pass challenge).

## unit_id
`UNIT-004`

## title
Either remove the ABExperimentProvider wrapper (currently a no-op for variant) or implement variant assignment.

## status
`READY`

## priority
`P2` — before user #5.

## severity_of_findings
Medium (`UX-CTA-002`)

## effort
Trivial (~10 minutes) to remove; ~half-day to implement variant B.

## implementation_risk
`LOW` — removing the wrapper renders children directly plus removing a one-shot analytics effect.

## local_implementation_status
`NOT_STARTED`

## external_lifecycle_status
`NOT_REQUIRED`

## requirements
`UX-004`

## findings
`UX-CTA-002`

## existing_plan_links
None.

## goal
No misleading `experimentId="hero-cta-copy"` declaration remains unless a real variant B exists.

## security_invariants
None.

## current_source_evidence
- `src/app/page.tsx:21` — `<ABExperimentProvider experimentId="hero-cta-copy" variant="A">`.
- `src/components/landing/ABExperimentProvider.tsx:13-29` — variant prop in deps but never read; only `trackExperimentView(experimentId)` called.
- `grep "hero-cta-copy" src/` — only `trackConversion` calls in `LandingHeader.tsx:104,117,127`; no variant B copy.

## affected_paths_and_resources
- Option A (remove): `src/app/page.tsx` (delete the wrapper), optionally delete `src/components/landing/ABExperimentProvider.tsx` if no other consumer.
- Option B (implement): add variant assignment logic to `ABExperimentProvider.tsx`; add variant B copy.

## owned_paths
- `src/app/page.tsx`
- `src/components/landing/ABExperimentProvider.tsx`

## dependencies
None.

## preconditions
None.

## non_goals
- Building a full A/B testing framework.
- Brand decisions about variant B copy (founder-owned).

## implementation_sequence
1. Decide: remove or implement. Recommended default: remove (smaller change; founder can re-add when ready to actually A/B test).
2. Option A:
   - Remove `<ABExperimentProvider>` wrapper in `src/app/page.tsx:21`.
   - Check `ABExperimentProvider.tsx` for other consumers; if none, delete the file.
3. Option B:
   - Add cookie- or random-based variant assignment in `ABExperimentProvider.tsx`.
   - Add a variant B copy in `landing-content.ts`.
   - Pass `variant` to `trackExperimentView`.

## data_or_schema_changes
None.

## authz_and_tenant_implications
None.

## failure_and_exception_behavior
N/A.

## acceptance_criteria
1. Either no `ABExperimentProvider` wrapper remains around the landing page, OR a variant B exists and is assigned at runtime.
2. Analytics events either stop firing `experiment_view` for `hero-cta-copy`, OR fire with a real variant label.
3. `bun run build` exits 0.

## acceptance_evidence
- Diff inspection.
- `grep "hero-cta-copy" src/` confirms either absence or real variant assignment.
- `bun run build` exit 0.

## test_decision
`NOT_REQUIRED`.

## authorization_boundaries
None.

## observability_or_audit_requirements
None.

## recovery_or_fix_forward
Revert.

## conflict_and_concurrency_notes
None.

## completion_signal
`UNIT-004` is `DONE` when all three acceptance criteria are evidenced.

## next_unit_on_success
Any of UNIT-005..UNIT-013.
