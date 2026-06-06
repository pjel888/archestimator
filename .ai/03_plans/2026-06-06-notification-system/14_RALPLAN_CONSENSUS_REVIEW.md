# RALPLAN Consensus Review

## Mode

`$plan --consensus` / `$ralplan` short mode. The user requested planning only and no implementation.

## Planner Output

Favored plan: durable database-backed notifications with release modal and notification center, implemented as a new bounded domain.

Principles:

1. Durable state before realtime.
2. RLS/user identity is the primary boundary.
3. Reuse existing UI primitives.
4. Notification loading must not block estimating.
5. Keep V1 small enough to verify.

Decision drivers:

1. Security and privacy.
2. Integration safety.
3. Performance under beta constraints.

Options considered:

- Durable DB + modal/center + optional Broadcast.
- Static version-only release modal.
- Pure Realtime notifications.
- Shared-link activity reuse.

Chosen option: durable DB + modal/center + optional Broadcast.

## Architect Review Record

Architect status: WATCH.

Architect conclusions:

- The repo has notification-shaped UI primitives and one-off email/activity precedents, but no canonical notification domain.
- The plan should separate durable notification state from presentation.
- Toast should stay transient feedback only.
- Modal is appropriate for release/version announcements.
- Realtime should be delivery glue, not source of truth.
- `AppProviders` and query freshness are global blast-radius points.
- Existing Realtime authorization only understands `project:` and `estimate:` topics, so notifications need explicit user-topic authorization if Realtime ships.
- The current `Modal` has Escape/backdrop close but the final implementation must prove focus return/focus behavior.

Applied Architect improvements:

- Added audience taxonomy.
- Added state transitions.
- Added channel split: modal, inbox, toast.
- Added explicit query freshness rules.
- Added `dedupe_key`, `seen_at`, and `archived_at` fields.
- Added focus-return test requirement.
- Added user-only Realtime topic guidance.
- Added shared-link activity boundary warning.

## Critic Gate Criteria

The final plan must satisfy:

- Principle-option consistency.
- Fair alternative exploration.
- Testable acceptance criteria.
- Concrete verification commands.
- Explicit blast radius.
- UX/accessibility coverage.
- Security/RLS coverage.
- Performance implications.
- Implementation-only handoff without source edits in planning.

## Critic Iteration

Initial Critic verdict: ITERATE.

Required fixes:

1. Add deliberate pre-mortem with cross-user leakage, provider/query freshness regression, and modal focus/restore failure.
2. Define exact `notification_definitions` read path.
3. Expand verification with e2e and observability evidence.

Applied fixes:

- Added deliberate pre-mortem to `05_BLAST_RADIUS_AND_RISK_ANALYSIS.md`.
- Added `notification_definitions_select_delivered` policy/read-path guidance to `03_ARCHITECTURE_AND_DESIGN_PLAN.md` and `08_SECURITY_PERFORMANCE_AND_DATA_PLAN.md`.
- Added Task 1 and test updates for definition read RLS to `04_IMPLEMENTATION_SEQUENCE.md` and `06_TESTING_AND_VERIFICATION_PLAN.md`.
- Added explicit Playwright e2e specs and observability evidence requirements to `06_TESTING_AND_VERIFICATION_PLAN.md`.
- Added traceability rows for definition privacy, e2e proof, and observability in `13_TRACEABILITY_MATRIX.md`.

## Consensus Verdict

APPROVED FOR IMPLEMENTATION PLANNING HANDOFF.

The plan is ready for a future implementation agent after that agent reruns branch, docs, codebase, and official-doc verification on the then-current repo state.

## Improvements Applied

- Added `00_INDEX.md` with readiness, bug-plan status, start-here sequence, and execution lane.
- Added database table/index/RLS shape to `03_ARCHITECTURE_AND_DESIGN_PLAN.md`.
- Added ordered implementation tasks and rollback points to `04_IMPLEMENTATION_SEQUENCE.md`.
- Added blast-radius table and merge-conflict risk list to `05_BLAST_RADIUS_AND_RISK_ANALYSIS.md`.
- Added targeted test file names and broader validation commands to `06_TESTING_AND_VERIFICATION_PLAN.md`.
- Added modal/center interaction, typography, responsive, and accessibility requirements to `07_UI_UX_AND_ACCESSIBILITY_PLAN.md`.
- Added Supabase project ref, RLS policy shape, payload privacy, caching, and Realtime limits to `08_SECURITY_PERFORMANCE_AND_DATA_PLAN.md`.
- Added feature-flag, migration, deployment, and rollback guidance to `09_DEPLOYMENT_MIGRATION_AND_ROLLBACK_PLAN.md`.
- Added future prompt, agent roster, Team + Ultragoal staffing, launch hints, and verification path to `10_IMPLEMENTATION_PROMPT_DRAFT.md`.

## Execution Boundary

No implementation is authorized by this document. It is the durable planning handoff only.
