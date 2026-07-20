# 008 — Magic-Link and Session-Expiry Copy

> Closes **Medium** `UX-MAGIC-001` and **Medium** `UX-SESSION-001`. Combined because both touch the auth error mapping surface.

## unit_id
`UNIT-008`

## title
Branch magic-link verify errors into distinct public messages; add a session-expired banner to the auth redirect target.

## status
`READY`

## priority
`P2` — before user #5.

## severity_of_findings
Medium (`UX-MAGIC-001`) + Medium (`UX-SESSION-001`)

## effort
Small-Medium (~2-3 hours). Branch error mapping + add one banner.

## implementation_risk
`LOW-MEDIUM` — requires understanding Better Auth's verify error code surface.

## local_implementation_status
`NOT_STARTED`

## external_lifecycle_status
`NOT_REQUIRED`

## requirements
`UX-008`

## findings
`UX-MAGIC-001`, `UX-SESSION-001`

## existing_plan_links
Infosec OWASP owns security conclusions on auth; this unit owns only the *usability copy* consequence.

## goal
- A user with an expired / already-used / wrong-browser magic link sees a distinct, actionable message.
- A workshop user whose session expired mid-edit sees a banner explaining what happened and how to recover.

## current_source_evidence
- `src/lib/auth/error-mapping.ts:8-29` — only 7 codes; magic-link issues collapse to `callback_exchange_failed`.
- `src/lib/auth/actions.ts:131` — `errorCallbackURL` funnels everything through the single code.
- Codebase search for session-expiry copy returns essentially only `state_mismatch` (Google reset) and the share recipient-session alert at `src/app/share/[token]/page.tsx:121-134`.

## owned_paths
- `src/lib/auth/error-mapping.ts`
- `src/app/login/page.tsx` or `src/components/auth/AuthStatusBanner.tsx` (banner)

## dependencies
None.

## non_goals
- Auth/security invariant changes (Infosec-owned).
- A new session-management system.

## implementation_sequence
1. Inspect Better Auth's verify error code surface (read `node_modules/better-auth` for the verify error types).
2. Add distinct codes for: `magic_link_expired`, `magic_link_used`, `magic_link_wrong_browser` (or whatever Better Auth actually emits).
3. Map each to a public message in `error-mapping.ts` with a clear next-action ("Request a new link").
4. For session-expiry: pass `?reason=session_expired` from the workshop auth redirect and render a banner on `/login` when present.

## acceptance_criteria
1. Three distinct magic-link error messages exist in `error-mapping.ts`.
2. `/login?reason=session_expired` renders a banner.
3. `bun run build` exits 0.

## acceptance_evidence
- Diff inspection.
- Manual magic-link failure flows (after UNIT-001).

## test_decision
`TEST_PROPOSAL`.

## exact_test_proposal_if_any
- **Risk:** Future Better Auth upgrades change the error code surface and silently re-collapse the messages.
- **Cheapest decisive test:** `bun x vitest run tests/vitest/auth/error-mapping.test.ts` (new) — assert each known Better Auth verify error maps to a distinct public message.

## authorization_boundaries
None.

## completion_signal
`DONE` when all three criteria evidenced.

## next_unit_on_success
UNIT-009..UNIT-013.
