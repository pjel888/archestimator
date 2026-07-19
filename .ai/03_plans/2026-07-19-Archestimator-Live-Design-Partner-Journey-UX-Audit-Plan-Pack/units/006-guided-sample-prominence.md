# 006 — Guided Sample Prominence

> Closes **Medium** `UX-ACTIVATE-002`. Cross-references MVP Startup Readiness for guided-sample sequencing.

## unit_id
`UNIT-006`

## title
Visually elevate the 'guided sample' first-project card to primary CTA styling.

## status
`READY`

## priority
`P2` — before user #5.

## severity_of_findings
Medium (`UX-ACTIVATE-002`)

## effort
Small (~30 min). Tailwind class changes + label rewrite.

## implementation_risk
`LOW`.

## local_implementation_status
`NOT_STARTED`

## external_lifecycle_status
`NOT_REQUIRED`

## requirements
`UX-006`

## findings
`UX-ACTIVATE-002`

## existing_plan_links
MVP Startup Readiness `012-first-session-cta-and-seed-json.md` owns guided-sample product sequencing; this unit owns only the *card-prominence UX surface*.

## goal
The fastest PH-native activation path (guided sample, which pre-seeds PHP-denominated data) is the most visually prominent first-project option.

## current_source_evidence
- `src/components/workshop/FirstProjectZeroState.tsx:39-86` — three equal-weight cards; guided sample is third with least action-oriented label.
- `src/lib/onboarding/activation-actions.ts:85-146` — `startGuidedSample` is fully functional.
- `src/lib/onboarding/guided-sample.ts:16` — `itemCost: 1250`, `currencyCode: "PHP"`.

## owned_paths
- `src/components/workshop/FirstProjectZeroState.tsx`

## dependencies
None.

## non_goals
- Removing the Blank / Template paths.
- Changes to `startGuidedSample` server action.

## implementation_sequence
1. In `FirstProjectZeroState.tsx`, reorder so guided sample is first OR give it primary CTA styling (brand variant).
2. Relabel from "Explore guided sample" to "Try the sample estimate" (action-oriented).
3. Rewrite description to emphasize PHP-denominated, ready-to-edit.

## acceptance_criteria
1. Guided-sample card has visually distinct primary weight (color, size, or position).
2. Label is action-oriented.
3. `bun run build` exits 0.

## acceptance_evidence
- Diff inspection.
- Manual `/workshop` first-visit (after UNIT-001).

## test_decision
`NOT_REQUIRED`.

## completion_signal
`DONE` when all three criteria evidenced.

## next_unit_on_success
UNIT-007..UNIT-013.
