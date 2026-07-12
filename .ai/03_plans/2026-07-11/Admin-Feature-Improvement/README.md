# Admin Feature Improvement Plan Pack

**Package:** `PLAN-2026-07-11-admin-feature-improvement`
**Profile:** `high-blast-radius`
**Current run scope:** `PLAN_ONLY`
**Planning status:** `CONDITIONALLY_READY`; `UNIT-001` is the dependency-closed executable slice, downstream local units are planned behind fresh producer/lease receipts, and hosted/provider proof remains a later release boundary.
**Canonical execution artifact:** [`IMPLEMENTATION_PLAN.md`](IMPLEMENTATION_PLAN.md)

## Mission

Turn `/admin` from a functional scaffold into Archestimator's trustworthy operator control plane. The target is tailored to the actual product, data model, Cloudflare runtime, Better Auth identity layer, collaboration model, Activity History, corporate accounts, support system, and user notification inbox.

The two primary product outcomes are:

1. A truthful **User 360** view: canonical signup, last successful login, last authenticated use, product activity, sessions/security, memberships, projects/estimates, support, notifications, and audited interventions.
2. A complete **Notification Manager**: draft, template, preview, review, test, target, one-time or recurring schedule, publish, pause/cancel/retract, inspect campaign/occurrence/sent history, manage user preferences/quiet hours/digests, measure engagement, reconcile failures, and preserve an immutable operator audit trail.

This is a plan pack only. It does not implement source, migrations, provider configuration, or runtime behavior.

## Current Verdict

The current admin surface is useful but not a safe production control plane:

- searched user listing is red because SQL parameters are bound out of placeholder order;
- the user activity timeline reads only admin actions performed by that user, not product activity;
- `profiles.created_at` is displayed as signup although Better Auth `user.createdAt` is the canonical identity creation time;
- active-session `updatedAt` is displayed as last session but is not a durable last-used signal;
- account status writes do not prove an affected row or revoke sessions;
- `/admin/audit` renders placeholder data despite a real D1 audit repository;
- the notification page is a one-shot synchronous broadcast form with no sent history, schedule, target preview, lifecycle, metrics, retry, or rollback;
- broadcast definition, fanout, and audit writes are not atomic, and generated delivery IDs may not satisfy inbox UUID validation;
- support, flags, observability, analytics, and workshop operator tools remain fragmented or partial.

## Start Here

1. Recompute the scoped baseline in [`03_SOURCE_CODEBASE_AND_STALENESS_AUDIT.md`](03_SOURCE_CODEBASE_AND_STALENESS_AUDIT.md). Any mismatch invalidates affected claims and requires a bounded re-audit before edits.
2. Execute only from [`IMPLEMENTATION_PLAN.md`](IMPLEMENTATION_PLAN.md).
3. Begin with `UNIT-001`; it locks current defects and reconciles active overlap packs before schema allocation.
4. Use the Beta Program migration lease/generation protocol. Never hardcode the next migration number from this pack.
5. Update [`LOOP_LEDGER.md`](LOOP_LEDGER.md) on every implementation iteration and update `plan-pack.json` last.
6. Keep product implementation, local proof, hosted proof, release readiness, and plan archival as distinct states.

## Artifact Map

| Artifact | Purpose |
| --- | --- |
| `IMPLEMENTATION_PLAN.md` | Canonical dependency DAG, unit packets, stop conditions, staffing, verification |
| `01_EXECUTIVE_SUMMARY_AND_TARGET_STATE.md` | Outcome, priorities, current verdict, target operator model |
| `02_SCOPE_NON_GOALS_AND_TERMINOLOGY.md` | Scope, non-goals, canonical definitions, evidence semantics |
| `03_SOURCE_CODEBASE_AND_STALENESS_AUDIT.md` | Current-source inventory, defects, baseline pathspecs, known-red tests |
| `04_ADMIN_INFORMATION_ARCHITECTURE_UX_AND_ACCESSIBILITY.md` | Navigation, screens, state models, responsive and accessibility contract |
| `05_USER_360_IDENTITY_ACTIVITY_AND_LIFECYCLE.md` | Signup/login/use semantics, normalized activity, user detail, safe interventions |
| `06_NOTIFICATION_MANAGER_PRODUCT_AND_OPERATOR_WORKFLOWS.md` | Campaign lifecycle, authoring, targeting, scheduling, history, metrics, rollback |
| `07_NOTIFICATION_DATA_DISPATCH_AND_SCHEDULING.md` | D1 model, idempotency, outbox/queue, scheduler, retries, reconciliation |
| `08_AUTHORIZATION_SECURITY_PRIVACY_AND_COMPLIANCE.md` | Admin capabilities, sensitive reads/actions, threat model, retention/DSAR |
| `09_OPERATIONS_SUPPORT_FLAGS_OBSERVABILITY_AND_ANALYTICS.md` | Remaining admin domains and consolidation roadmap |
| `10_DATA_MIGRATIONS_APIS_PERFORMANCE_AND_COST.md` | Migration protocol, repository/API contracts, query budgets, free-tier controls |
| `11_TEST_ADVERSARIAL_QA_AND_EVIDENCE_PLAN.md` | Unit/integration/DOM/runtime/provider proof matrix and adversarial scenarios |
| `12_ROLLOUT_ROLLBACK_RUNBOOKS_AND_RELEASE_BOUNDARIES.md` | Flags, canaries, rollback, incident response, hosted evidence boundaries |
| `13_OVERLAP_DEPENDENCY_AND_CONSUMER_RECEIPTS.md` | Activity, Beta, Corporate, Teamwork, observability ownership and receipt contracts |
| `14_DECISIONS_ASSUMPTIONS_RISKS_AND_AUTH_BOUNDARIES.md` | Closed decisions, reversible assumptions, risks, true authorization gates |
| `15_REQUIREMENTS_TRACEABILITY_AND_FINAL_AUDIT.md` | Requirement-to-unit-to-test traceability and planning completion audit |
| `16_RESEARCH_AND_SPECIALIST_EVIDENCE.md` | Official primary-source research and independent read-only audit synthesis |
| `17_IMPROVE_STAGE_AUDIT_AND_SEMANTIC_DIFF.md` | Before-state invalidation, semantic repairs, readiness matrix, orchestration provenance |
| `18_LEAN_EXECUTION_AND_VALIDATION_POLICY.md` | Current no-overengineering/no-overtesting execution contract and supersession map |
| `evidence/2026-07-11-planning-audit-evidence.md` | Fresh commands, tests, source observations, and proof boundary |
| `LOOP_LEDGER.md` | Append-only planning and future execution coordination ledger |
| `plan-pack.json` | Versioned manifest, exact hashes, stable IDs, unit DAG, ready slice |

## Completion Boundary

This planning task is complete only when:

- every requested admin and notification-manager outcome is represented by stable requirements and implementation units;
- the current source defects and overlap ownership are recorded honestly;
- the pack contains an honest dependency-closed ready slice, exact downstream execution packets, and separate hosted proof units;
- `bun run validate:plan-pack -- .ai/03_plans/2026-07-11/Admin-Feature-Improvement` passes against frozen hashes;
- `bun run validate:planning-prompts` passes;
- a fresh deterministic criterion audit finds no unresolved P0/P1 readiness defect; use an independent reviewer only when a named material risk justifies the extra pass;
- `git diff --check` passes for the pack files.

Automated tests, builds used as gates, browser automation, screenshots, and broad QA are not part of this planning task and are not standing execution requirements. Every criterion defaults to `test_requirement: NOT_REQUIRED`; an executor may record a precise `TEST_PROPOSAL` for a named critical invariant, but may run or create tests only after an explicit current-task user request changes that criterion to `TEST_TASK`.

The product is not complete when this planning package passes. Product completion requires every implementation unit and matching local/hosted evidence receipt to be verified.
