# 17 - Final Readiness Review

## Package metadata

- Plan folder: `.ai/03_plans/2026-06-28-Project-Activity-Page/`
- Plan profile: exhaustive planning package, revised by owner-delegated improvement pass
- Documents in package: 21 canonical documents plus `LOOP_LEDGER.md`
- Author mode: lead agent with native specialist council, adversarial review, and final verifier lane
- Verification mode: `verification_mode: independent`

## Canonical readiness status

**`IMPLEMENTATION-READY`**

Rationale:

- The package now resolves the native council's P0/P1 planning findings: collaboration audit access, URL cursor semantics, recipient PII, known-red broad validation, count contracts, cache policy, and implementation-time proof gates.
- No owner/product decision remains blocked. Reversible product choices are recorded as owner-delegated planning decisions in `15_DECISIONS_ASSUMPTIONS_AND_ALTERNATIVES.md`.
- Implementation may proceed inside the documented v1 scope. Feature completion still requires the implementation-time tests, local/provider proof, performance timing, and browser QA listed in this package.
- This status does not authorize app code changes, provider mutations, deployment, or production proof during this planning task.

## Verification mode

`verification_mode: independent`

Native specialist lanes have reviewed and materially changed the package:

| Lane | Result incorporated |
|---|---|
| Product/UX | Non-PII recipient disambiguation, mobile filter semantics, activity-page workflow states |
| Architecture/Data | Scoped collaboration-audit RPC, authenticated pagination loader, transient cursor model |
| Test/QA | Known-red validation posture, route-handler/RPC/security tests, exact count assertions |
| Adversarial review | Removed contradictions around public APIs, URL cursor sharing, cache tags, and table access |

Final verifier `019f0e82-50d0-7940-a0c9-d59bd8d72f31` returned `IMPLEMENTATION-READY` with no P0/P1 contradictions after this revision pass.

## Readiness scorecard

| Dimension | Score (0-100) | Notes |
|---|---:|---|
| Source/codebase audit | 97 | Current source, migrations, scripts, local Next.js docs, and relevant existing patterns inspected; evidence strength labeled in traceability |
| Requirements specification | 98 | 59 requirements traced; shareable URL, cursor, count, authz, and migration contracts are explicit |
| UX/UI/A11y plan | 96 | State matrix, touch/mobile filter semantics, copy, focus, and non-PII recipient handling documented |
| Architecture | 97 | Server/client boundary, loader boundary, cache policy, DTOs, and rejected alternatives recorded |
| Data/DB/API/network | 97 | Scoped RPC migration required; direct collaboration-audit table access remains denied; authenticated loader is narrow and read-only |
| Security/privacy | 97 | Threat model covers RPC misuse, direct-table bypass, PII leakage, route-handler abuse, and cross-project access |
| Performance/reliability/observability | 95 | Query-count budget, authenticated evaluator, exact percentile definitions, count overhead, and rollback trigger defined |
| Blast radius | 97 | Required/probable/verification-only file scope separated; rollback and deletion criteria documented |
| Implementation plan | 97 | Phase 0 proof, WP-0 RPC migration, loader, repository, client, tests, and release gates sequenced |
| Test/validation strategy | 97 | Focused checks, known-red `validate` handling, RPC denial/proof, route-handler tests, and adversarial matrix present |
| Rollout/rollback/ops | 95 | Closed-beta rollout, kill switch, migration rollback, and support runbook defined |
| Risk register | 97 | New high risks for RPC/direct-read mistakes and misleading counts included |
| Decisions/assumptions/alternatives | 98 | Owner-delegated decisions replace open blockers; rejected alternatives explain why they lost |
| Traceability | 98 | Source-strength column prevents inference from masquerading as repo evidence |
| Final review | 98 | Independent final verifier found no P0/P1 contradictions |

**Aggregate readiness: 98 / 100.** Remaining gaps are implementation-time proof requirements, not planning blockers.

## P0 / P1 findings

| Finding | Severity | Status | Resolution |
|---|---|---|---|
| Direct authenticated reads from `collaboration_audit_events` are denied | P0 | Repaired | `DEC-07` and `WP-0` require a scoped security-definer RPC using `can_edit_project(target_project_id)` while preserving direct table denial |
| Project sidebar Activity nav was already present | P1 | Repaired | Phase 0 now verifies the existing link instead of requiring duplicate nav work |
| Cursor was treated as both shareable URL state and transient append state | P0 | Repaired | Filters/scope are canonical URL state; cursor is transient client/loader state |
| Recipient disambiguation used an email-derived suffix | P0 | Repaired | Duplicate names use non-PII publication context or stable ordinal only |
| Estimate scope could include project-wide collaboration-audit events | P1 | Repaired | Estimate scope excludes collaboration-audit rows unless `estimate_id` explicitly matches |
| Count summary lacked an exact data contract | P1 | Repaired | DTO includes `loadedCount`, `filteredTotalCount`, and `scopeTotalCount` with tests |
| Plan omitted `bun run lint:design` and overclaimed broad validation | P1 | Repaired | Validation inventory now reflects repo scripts and known-red `bun run validate` posture |
| Cache plan named `cacheTag` despite request-time route constraints | P1 | Repaired | v1 uses request-scoped `React.cache` only where useful; no `use cache` or cache tags |
| Final independent verifier lane | P1 | Repaired | Verifier `019f0e82-50d0-7940-a0c9-d59bd8d72f31` returned `IMPLEMENTATION-READY` with no P0/P1 findings |

## Residual risks accepted by this planning run

- RISK-16: main's broad `bun run validate` is known-red in `test:dom`; implementation uses focused checks and documents unrelated reds.
- RISK-17: the client component may become large; implementation may split it when WP-7 crosses the documented complexity threshold.
- RISK-20: closed-beta fixture volume is smaller than future production volume; deterministic fixtures and authenticated performance timing mitigate v1 risk.
- RISK-21: implementer might accidentally use direct `collaboration_audit_events` reads; grep/code review and direct-deny tests are required.
- RISK-22: result counts can mislead users if filter totals and loaded totals blur; exact count DTO and UI assertions are required.

## What this plan does NOT authorize

- Production deploy or hosted proof.
- Provider setting changes outside the scoped Archestimator project boundary.
- Mutating provider state during planning.
- Public or unauthenticated activity APIs.
- Broad schema redesign, unrelated migrations, data backfills, or service-role reads.
- Showing recipient email or any email-derived suffix in the activity UI.
- Force-push, history rewrite, branch deletion, or broad cleanup.

## What this plan DOES authorize for implementation v1

- Editing `src/app/workshop/projects/[projectId]/activity/page.tsx`.
- Creating `src/app/workshop/projects/[projectId]/activity/loading.tsx`.
- Creating `src/app/api/projects/[projectId]/activity/route.ts` as one authenticated read-only Load more loader.
- Creating `src/components/workshop/project-activity/` and focused subcomponents.
- Creating `src/lib/repositories/project-activity-feed-repository.ts`.
- Adding the scoped `read_project_collaboration_audit_events(...)` migration, rollback/fix-forward notes, and generated type refresh.
- Creating `tests/vitest/project-activity-page/` with repository, route-handler, DOM, security, count, and URL-state tests.
- Verifying the existing `src/components/workshop/ProjectMiniSidebar.tsx` Activity item.
- Adding the narrow collaboration-audit index only if `EXPLAIN` shows it is needed.

## Recommendation

Proceed to implementation from `11_IMPLEMENTATION_PLAN.md`. Keep implementation inside the documented v1 scope and treat the RPC/direct-deny proof, exact count proof, focused tests, authenticated performance evaluator, and browser QA as implementation exit gates.

## Final verifier statement

Verifier `019f0e82-50d0-7940-a0c9-d59bd8d72f31` returned `IMPLEMENTATION-READY` and found no P0/P1 contradictions. It confirmed:

- All 21 canonical plan documents and `LOOP_LEDGER.md` are internally consistent.
- All 59 requirements are traced with source strength, acceptance criteria, work package, and proof path.
- The scoped RPC, authenticated loader, transient cursor, PII, exact counts, and known-red validation contracts are consistently represented.
- No stale `OPEN-*`, no-migration, public-API, cursor-URL, email-suffix, or direct-table-read instruction remains in the implementation path.
