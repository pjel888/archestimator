# 012 — Landing Copy PH Vocabulary

> Closes **Medium** `UX-VOCAB-001` (absorbs `UX-VOCAB-002`) and **Low** `UX-LEAD-003`.

## unit_id
`UNIT-012`

## title
Add PH AEC domain vocabulary to the landing hero and proof audiences; align contact-page CTA copy to the closed-beta intake reality.

## status
`READY`

## priority
`P2` — before user #5.

## severity_of_findings
Medium (`UX-VOCAB-001`, absorbs `UX-VOCAB-002`) + Low (`UX-LEAD-003`)

## effort
Small (~1 hour). Copy edits.

## implementation_risk
`LOW`.

## local_implementation_status
`NOT_STARTED`

## external_lifecycle_status
`NOT_REQUIRED`

## requirements
`UX-012`

## findings
`UX-VOCAB-001`, `UX-LEAD-003`

## existing_plan_links
None.

## goal
- The landing hero and proof audiences include at least one PH-domain noun and at least one of {architects, engineers, QS firms}.
- The `/contact` CTA copy matches the closed-beta intake reality (not "Start with an estimate").

## current_source_evidence
- `src/components/landing-v3/ArchestimatorLandingPage.tsx:265-269` — hero copy lacks PH/AEC domain nouns.
- `src/components/landing-v3/landing-content.ts:13-18` — proof audiences omit QS firms, architects, engineers.
- `src/app/pricing/page.tsx:14,42,50,52,89,170,176` — pricing page leans into PH vocabulary ("Philippine construction", "BOQ lines", "QS teams"); hero does not.
- `src/app/contact/page.tsx:32-37` — promises "design partners" but renders "Start with an estimate" CTA (`LandingCTAs`).

## owned_paths
- `src/components/landing-v3/landing-content.ts`
- `src/components/landing-v3/ArchestimatorLandingPage.tsx`
- `src/app/contact/page.tsx`

## dependencies
None.

## non_goals
- Full landing-page redesign.
- Translating copy to Filipino (founder decision).

## implementation_sequence
1. Add at least one PH-domain noun ("BOQ", "quantity surveyor", or peso-denominated sample) to the hero subhead in `landing-content.ts` / `ArchestimatorLandingPage.tsx`.
2. Add "architects", "engineers", or "QS firms" to the proof audiences list.
3. In `src/app/contact/page.tsx`, change the CTA copy from "Start with an estimate" to "Request access" (or pass through to `LandingCTAs` with a different label prop).
4. Run `bun run build` (after UNIT-001).

## acceptance_criteria
1. Hero copy contains at least one PH-domain noun.
2. Proof audiences list includes at least one of {architects, engineers, QS firms}.
3. `/contact` CTA label matches the closed-beta intake purpose.
4. `bun run build` exits 0.

## acceptance_evidence
- Diff inspection.
- Manual `/` and `/contact` load (after UNIT-001).

## test_decision
`NOT_REQUIRED`.

## completion_signal
`DONE` when all four criteria evidenced.

## next_unit_on_success
UNIT-013.
