# Project Workspace Invite Entry Plan

**Date:** 2026-05-27
**Status:** Implemented, linked-Supabase verified, browser-E2E verified, and archive-ready on 2026-05-27. Linked lint reaches the database but is blocked by unrelated pre-existing SQL errors in older estimate-template/history functions.
**Route scope:** new public invite entry route plus existing `/workshop`, `/workshop/projects`, and Teamspaces access UI.
**Primary user job:** An existing project manager invites another person into one project workspace, and the invitee can accept and start working without required country/profile/workspace intake.

## Planning Decision

Use an app-owned invitation entry route:

```txt
/invite/[token]
```

This route is public enough to explain an invitation before sign-in, but it never exposes private project data without a valid invitation token. Successful sign-up or log-in still lands at `/workshop`; a pending invitation bridge on the workshop homebase auto-accepts signed-out flows after matching auth and renders a non-blocking success or failure banner. This preserves the 2026-05-27 auth decision that every successful auth callback goes to `/workshop`.

## Controlling Plan Pack

The first-pass documents `01` through `08` remain useful background. The decision-grade source of truth is the recovery layer below:

- `00-quality-recovery-and-controlling-map.md` - explains the quality recovery, fixed decisions, rejected directions, and coverage target.
- `09-decision-grade-prd.md` - product contract, scope, non-goals, personas, metrics, and acceptance criteria.
- `10-state-machine-and-route-spec.md` - invitation state machine, route outcomes, pending cookie, and sheet-only route behavior.
- `11-ux-ui-screen-copy-spec.md` - screen-by-screen UX/UI, exact copy, CTAs, Teamspaces controls, and shared project card treatment.
- `12-security-data-rpc-threat-model.md` - token table decision, RPC contract, grants/revokes, RLS, threats, and audit events.
- `13-current-code-delta-and-blast-radius.md` - expected future files, blast radius, no-touch boundaries, and implementation notes.
- `14-red-first-tests-rollout-readiness.md` - exact red-first tests, browser QA, rollout sequence, rollback, and closeout commands.
- `15-confidence-gate.md` - strategy readiness definition, flow coverage matrix, reviewer rubric, and final gate.

## First-Pass Context

- `01-readiness-and-current-state-audit.md` - current repo state, blast radius, and readiness blockers.
- `02-ux-ui-journey-map.md` - invitee journeys for email, copy URL, signed-out, signed-in, wrong account, accepted, expired, and revoked states.
- `03-route-and-entry-contract.md` - route contract for `/invite/[token]`, pending invite bridge, and workshop handoff.
- `04-data-security-permissions-plan.md` - invitation token model, RLS, anti-enumeration, and acceptance rules.
- `05-workshop-projects-membership-ui-plan.md` - shared project display on `/workshop/projects`.
- `06-test-and-qa-plan.md` - TDD, route, server-action, migration, and browser QA plan.
- `07-implementation-slices.md` - execution-ready implementation sequence, still no code.
- `08-audit-checklists.md` - closed readiness, UX, accessibility, security, and implementation launch audit checklists.

## Non-Goals

- Do not make users complete profile, country, or workspace intake before using the app.
- Do not restore `/workshop/onboarding` as a gate.
- Do not make a generic "anyone with this link can join" project link in v1.
- Do not grant access by merely opening a link while signed out.
- Do not bypass project/sheet RLS with client-visible role state.
- Do not broaden this into organization-wide workspace invitations.

## Success Criteria

- A not-yet-signed-up invitee can open the invite, understand who invited them and to what project or sheet, sign up or log in, land on `/workshop`, see the project or sheet added, and then open it.
- A signed-in invited user sees an accept screen and can open the shared project without onboarding.
- A signed-in wrong-account user gets a clear account mismatch state.
- `/workshop/projects` distinguishes projects the user owns or manages from projects where they are only a project or sheet collaborator.
- Expired, revoked, accepted, malformed, and already-member invite states are explicit and non-leaky.
- Implementation later follows red-first tests and includes browser QA on invite entry, `/workshop`, and `/workshop/projects`.

## Implementation Evidence

See `16-implementation-evidence.md` for the implementation summary, linked migration apply/repair evidence, grant verification, test-first evidence, validation results, browser E2E, and remaining Supabase lint caveats. See `17-archive-closeout.md` for the archive disposition and external launch gates transferred to the roadmap.
