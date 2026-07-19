# 010 — Invite Page Affordances

> Closes **Low** `UX-INVITE-001` and **Low** `UX-INVITE-002`. Combined (same page).

## unit_id
`UNIT-010`

## title
Add a sign-in link to the invite already-used state; bump invite copy to the workshop's standard font scale.

## status
`READY`

## priority
`P3` — before paid MVP.

## severity_of_findings
Low (`UX-INVITE-001`) + Low (`UX-INVITE-002`)

## effort
Trivial (~20 minutes).

## implementation_risk
`LOW`.

## local_implementation_status
`NOT_STARTED`

## external_lifecycle_status
`NOT_REQUIRED`

## requirements
`UX-010`

## findings
`UX-INVITE-001`, `UX-INVITE-002`

## existing_plan_links
None.

## goal
- A returning user opening an already-used invite sees a sign-in link.
- All invite copy is at least `text-[11px]`.

## current_source_evidence
- `src/app/invite/[token]/page.tsx:220-227` — already-used state is plain text, no link.
- `src/app/invite/[token]/page.tsx:129,132,135,175,176` — `text-[8px]` through `text-[12px]`.

## owned_paths
- `src/app/invite/[token]/page.tsx`

## dependencies
None.

## non_goals
- Restructuring the invite page layout.
- New invite states.

## implementation_sequence
1. Add `<Link href="/login">Sign in</Link>` to the already-used branch (`:220-227`).
2. Replace `text-[8px]`, `text-[9px]`, `text-[10px]` with `text-[11px]` minimum across the page.
3. Run `bun run build` (after UNIT-001).

## acceptance_criteria
1. Already-used state includes a sign-in link.
2. No invite copy is smaller than `text-[11px]`.
3. `bun run build` exits 0.

## acceptance_evidence
- Diff inspection.
- Manual mobile-viewport visit to `/invite/<token>` (after UNIT-001).

## test_decision
`NOT_REQUIRED`.

## completion_signal
`DONE` when all three criteria evidenced.

## next_unit_on_success
UNIT-011..UNIT-013.
