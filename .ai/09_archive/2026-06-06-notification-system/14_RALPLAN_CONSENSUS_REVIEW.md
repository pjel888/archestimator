# RALPLAN Consensus Review

## Mode

`$plan --consensus` / `$ralplan` short mode. The user requested planning only and no implementation.

Refinement status: `REFINED_READY_FOR_IMPLEMENTATION`.

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

APPROVED FOR IMPLEMENTATION HANDOFF AFTER DOCS-ONLY REFINEMENT.

The plan is ready for a future implementation agent after that agent reruns branch, docs, codebase, and official-doc verification on the then-current repo state.

## Refinement Review Cycle

### Architect Recheck

Verdict: PASS.

Rationale:

- The durable database model is still the correct boundary for once-per-user release announcements and future user-specific notifications.
- The new specialist docs close the earlier handoff gap by making schema/RLS, server action contracts, UI placement, cache behavior, fixtures, accessibility, design-system, graph impact, provider evidence, and operations explicit.
- Realtime remains optional and cannot become the source of truth, which preserves offline and RLS correctness.
- Public share pages and existing shared-link/collaboration flows remain protected by explicit integration tests and provider route-gating.

Architect residual watch items for the future implementation session:

- Re-run graph/GitNexus impact analysis when source symbols are about to change.
- Re-check current workshop shell and provider files immediately before editing.
- Prove modal focus return before shipping the release modal.

### Critic Recheck

Verdict: PASS.

First refinement critic result: WATCH until five implementation-readiness gaps were made concrete.

WATCH findings:

1. Provider/typegen sequencing still allowed linked-project typegen before a local-only migration could exist remotely.
2. Mutation authority still left direct authenticated updates versus server-only writes as a future choice.
3. Static RLS shape tests were not enough to prove actual cross-user denial.
4. V1 release creation/fanout still offered seed/admin alternatives without pinning the first proof path and real beta source.
5. Seed/admin action links could bypass server-side validation without a DB/static seed gate.

Applied WATCH fixes:

- `23_SUPABASE_PROVIDER_AND_MIGRATION_EVIDENCE_PLAN.md` now requires local `db reset` plus `gen types --local` for local proof, branch-safe project typegen for preview proof, and linked production typegen only after owner-approved linked apply.
- `15_DATABASE_SCHEMA_RLS_PLAN.md`, `16_SERVER_ACTIONS_API_CONTRACT_PLAN.md`, and `08_SECURITY_PERFORMANCE_AND_DATA_PLAN.md` now fix V1 mutation authority to server actions using the existing service-role helper after `requireCurrentUserContext()`, with no direct authenticated notification table writes.
- `06_TESTING_AND_VERIFICATION_PLAN.md`, `15_DATABASE_SCHEMA_RLS_PLAN.md`, `23_SUPABASE_PROVIDER_AND_MIGRATION_EVIDENCE_PLAN.md`, and `25_IMPLEMENTATION_HANDOFF_CHECKLIST.md` now make local or branch-safe RLS behavior proof mandatory before UI work or PR.
- `19_TEST_FIXTURES_AND_SEED_DATA_PLAN.md` and `24_RELEASE_OPERATOR_RUNBOOK.md` now pin the first proof to deterministic local/test fixtures and real beta fanout to `profiles.email` joined against `closed_beta_allowed_emails.status in ('invited','active')` after owner approval.
- `03_ARCHITECTURE_AND_DESIGN_PLAN.md`, `15_DATABASE_SCHEMA_RLS_PLAN.md`, `16_SERVER_ACTIONS_API_CONTRACT_PLAN.md`, `19_TEST_FIXTURES_AND_SEED_DATA_PLAN.md`, and `24_RELEASE_OPERATOR_RUNBOOK.md` now add DB/static seed action-href safety for `/workshop` paths only.

Final critic challenge results:

- Requirement traceability now maps every acceptance criterion to future files, tests, evidence, and rollback in `13_TRACEABILITY_MATRIX.md`.
- The previous sub-100 readiness score was replaced with explicit baseline-vs-refined scoring in `11_READINESS_SCORECARD.md`.
- The plan now has concrete stop gates for RLS leakage, provider leakage, modal accessibility failure, design-system drift, Realtime authorization ambiguity, and provider/migration authority.
- No bug-plan doc is needed because no blocker remains; optional admin UI, Realtime, and producer breadth are not V1 blockers.
- UltraQA runtime execution is intentionally skipped for this docs-only refinement; adversarial QA is represented by the pre-mortem, traceability matrix, stop gates, and docs validation commands.

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
- Added specialist handoff docs `15` through `25`.
- Expanded implementation readiness scorecard to a documented 100/100 result.
- Expanded traceability from a short matrix into requirement, acceptance, document, evidence, and rollback traces.
- Closed critic WATCH items for typegen sequencing, mutation authority, actual RLS proof, V1 fanout path, and action-link seed safety.
- Updated task/log/state records for the refined planning status.

## Execution Boundary

No implementation is authorized by this document. It is the durable planning handoff only.
