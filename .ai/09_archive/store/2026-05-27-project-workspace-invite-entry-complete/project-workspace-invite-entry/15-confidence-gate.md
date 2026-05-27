# 15 - Confidence Gate

## Definition Of Strategy-Ready

This plan is strategy-ready when every item below is true:

- the PRD states the user job, personas, scope, non-goals, and acceptance criteria;
- the state machine maps every invite state to a route, actor, guard, side effect, and next state;
- the UX spec gives exact screen states, copy, CTAs, and card treatment;
- the security spec names token storage, RPCs, grants, RLS posture, audit events, and threats;
- the blast-radius map names files, likely symbols, risks, and no-touch boundaries;
- the test plan names exact files, exact test cases, and expected red failures;
- rollout and rollback are explicit;
- no unresolved product decision is required before implementation planning;
- future implementation still starts with fresh impact analysis and red tests.

## Required Flow Coverage

| Flow | Covered In |
| --- | --- |
| Email invite to not-yet-signed-up user | `09`, `10`, `11`, `14` |
| Copy invite URL to not-yet-signed-up user | `09`, `10`, `11`, `12`, `14` |
| Signed-out existing user | `10`, `11`, `14` |
| Signed-in matching account | `09`, `10`, `11`, `12`, `14` |
| Signed-in wrong account | `09`, `10`, `11`, `12`, `14` |
| Already project member | `09`, `10`, `11`, `14` |
| Already sheet-only collaborator | `10`, `11`, `13`, `14` |
| Expired token | `10`, `11`, `12`, `14` |
| Revoked token | `10`, `11`, `12`, `14` |
| Invalid or malformed token | `10`, `11`, `12`, `14` |
| Already-used token | `10`, `11`, `12`, `14` |
| `/workshop` non-blocking post-auth handoff | `09`, `10`, `11`, `14` |
| `/workshop/projects` shared project cards | `09`, `11`, `13`, `14` |
| Sheet-only route behavior | `10`, `11`, `13`, `14` |
| RPC/RLS/token security | `12`, `13`, `14` |
| Implementation blast radius | `13`, `14` |
| Rollout and rollback | `14` |

## Reviewer Rubric

Score each area as pass/fail.

Product:

- pass if no required onboarding or profile field blocks invite usage;
- pass if auth success remains `/workshop`;
- pass if every major user state has one clear primary action.

UX/UI:

- pass if `/invite/[token]` is compact and product-native;
- pass if `/workshop` invite handoff is non-blocking;
- pass if shared/sheet-only project state is visible without stigma;
- pass if text labels carry meaning independent of color.

Security:

- pass if tokens are hash-only at rest;
- pass if acceptance is email-bound;
- pass if broad security-definer functions are revoked from browser roles;
- pass if wrong-account and invalid-token states are non-leaky;
- pass if sheet-only access does not expose project-wide charts.

Data:

- pass if invitation and token lifecycle use the locked child-table model;
- pass if resend, copy, refresh, revoke, accept, expire, and replay are represented;
- pass if existing-user direct grant remains distinct from accepted-through-route.

QA:

- pass if every implementation slice has a named red test;
- pass if invite-entry feature flag tests exist;
- pass if Supabase redirect evidence is required before rollout;
- pass if browser QA covers mobile and desktop;
- pass if rollout and rollback do not require reverting unrelated app behavior.

## Known Risks Left For Implementation

These are implementation risks, not planning gaps:

- exact Supabase generated type shape after migration;
- local or linked Supabase function syntax details;
- current dirty-worktree unrelated test failures;
- provider-specific Supabase Auth email template constraints;
- the central server feature flag may need a minimal implementation before invite entry code can be enabled.

Each risk has a planned proof path in `14-red-first-tests-rollout-readiness.md`.

## Final Planning Gate

Implementation may begin only after:

- this folder passes `git diff --check`;
- a future agent refreshes impact analysis for the actual files to be edited;
- the owner accepts the v1 email-bound invite model;
- the future implementation starts with the tests named in `14-red-first-tests-rollout-readiness.md`.

No additional product decisions are required to start the implementation plan.
