# 011 — Share Password UX

> Closes **Medium** `UX-SHARE-001` and **Low** `UX-SHARE-002`. Combined (same component).

## unit_id
`UNIT-011`

## title
Surface Retry-After countdown on share-password lockout; bump touch targets to iOS 44px minimum.

## status
`READY`

## priority
`P2` — before user #5.

## severity_of_findings
Medium (`UX-SHARE-001`) + Low (`UX-SHARE-002`)

## effort
Small (~1 hour).

## implementation_risk
`LOW`.

## local_implementation_status
`NOT_STARTED`

## external_lifecycle_status
`NOT_REQUIRED`

## requirements
`UX-011`

## findings
`UX-SHARE-001`, `UX-SHARE-002`

## existing_plan_links
Infosec OWASP owns share hardening; this unit owns only the *lockout UX copy* and *touch-target* consequence.

## goal
- A locked-out recipient sees a minutes-remaining countdown and auto-recovery.
- Mobile touch targets meet the iOS 44px minimum.

## current_source_evidence
- `src/components/share/ProjectPublicationPasswordForm.tsx:36-47` — HTTP 429 → `status: "locked"`; no Retry-After parsing.
- `src/components/share/ProjectPublicationPasswordForm.tsx:57-58` — "Too many attempts. Please try again later." (no countdown).
- `src/components/share/ProjectPublicationPasswordForm.tsx:65,97` — input and button both `h-9` (36px).
- Compare `proposal.xlsx/route.ts:397` — Retry-After pattern exists in the codebase.

## owned_paths
- `src/components/share/ProjectPublicationPasswordForm.tsx`

## dependencies
None.

## non_goals
- Changes to the lockout threshold or rate-limit policy (Infosec-owned).

## implementation_sequence
1. On 429, parse `Retry-After` from the response and store seconds-remaining in state.
2. Render a countdown ("Try again in N min") and decrement via `setInterval`.
3. When the countdown hits 0, reset the form to unlocked.
4. Change input and button height from `h-9` to `min-h-11` (44px).
5. Run `bun run build` (after UNIT-001).

## acceptance_criteria
1. 429 lockout shows a countdown derived from Retry-After.
2. Form auto-recovers when the countdown expires.
3. Input and button have `min-h-11` (or equivalent ≥44px).
4. `bun run build` exits 0.

## acceptance_evidence
- Diff inspection.
- Manual `/share/<token>` mobile-viewport load with repeated wrong password (after UNIT-001).

## test_decision
`TEST_PROPOSAL`.

## exact_test_proposal_if_any
- **Risk:** Countdown desyncs from server-side lockout window.
- **Cheapest decisive test:** `bun x playwright test e2e/shared-link-receiver.spec.ts --workers=1` (existing) — extend the existing lockout-after-5-fails assertion to check the countdown is rendered.

## completion_signal
`DONE` when all four criteria evidenced.

## next_unit_on_success
UNIT-012..UNIT-013.
