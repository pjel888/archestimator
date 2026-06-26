---
title: Full Scope Execution Goal
type: goal
date: 2026-06-25
status: active
---

# Full Scope Execution Goal

## Intended Outcome

Implement every estimate-sheet requirement, finding, task, decision, threat, and
edge-case item from the three 2026-06-24 source analysis folders and the
2026-06-25 orchestration package unless the item is explicitly rejected or
unsafe outside the authorized Archestimator boundary.

Previous `Deferred`, `Deferred with guard`, `accepted defer`, and
`Accepted local hold` rows are no longer completion stop conditions by
themselves. They are newly authorized implementation candidates unless a current
source document marks them `Rejected`, they require a product choice that cannot
be safely inferred, or they require destructive/paid/cross-provider action.

## Scope

- Center estimate-sheet content requirements and MOP-6 cleanup/product work.
- Right sidebar component-library, preference, responsive, reducer, and
  telemetry requirements.
- Tree sidebar CRUD, interaction, performance, undo, lazy/realtime, provider,
  and operational requirements.
- Supabase/Postgres migrations, RPCs, RLS, grants, constraints, generated types,
  and scoped provider proof for project `ebxxqidacheyapmmzavr`.
- Local tests, type checks, source-level proof, provider metadata proof, code
  review, adversarial QA, and durable traceability updates.

## Non-Goals And Hard Stops

- Do not mutate provider projects other than `ebxxqidacheyapmmzavr`.
- Do not enable paid Supabase features such as PITR.
- Do not deploy production unless a later explicit task asks for deployment.
- Do not perform irreversible destructive data loss without a fresh recovery
  path and explicit instruction.
- Do not overwrite, revert, or delete unrelated dirty work.
- Do not implement source rows explicitly marked `Rejected`; record the rejection
  evidence instead.

## Major Workstreams

1. Requirements and traceability audit: source plans, coverage appendix, todos,
   implementation ledger, and code reality.
2. Center work: decomposition/product enhancements, proposal dirty-state, undo
   policy where applicable, editable-total sort, export/collaboration polish,
   and tests.
3. Right sidebar work: reducer/hooks extraction, account-synced preferences or
   explicit beta-safe local persistence, mobile drawer, custom ordering, and
   preference tests.
4. Tree work: delete undo, non-launch polish, lazy subtree loading/realtime v2
   decisions, numeric/sparse sort migration, and tree interaction proof.
5. Data/provider work: migration-history reconciliation strategy, direct SQL or
   migration application where safe, generated types, rollback/runbook proof,
   and telemetry/ops evidence.
6. QA/review work: targeted regression tests, provider checks, code review,
   UltraQA scenario matrix, and final completion audit.

## Constraints And Safety Requirements

- Preserve all unfamiliar current worktree changes.
- Re-read affected files before every meaningful edit.
- Give subagents bounded read or write scopes; implementation agents must own
  disjoint write sets.
- Prefer existing components, hooks, repositories, server actions, and migration
  patterns over new abstractions.
- Keep browser automation opt-in for browser-only claims; use source/DOM/unit
  proof when it proves the behavior.
- Provider work must stay scoped, reviewable, and fix-forward.

## Acceptance Criteria

- Every source ID in `14_SOURCE_ID_COVERAGE_APPENDIX.md` is either implemented,
  explicitly rejected with evidence, or externally blocked with a concrete
  blocker and safe substitute.
- Every unchecked item in `07_ORCHESTRATION_TODO.md` is implemented, rejected,
  or updated to an evidence-backed external blocker.
- All implementation-ledger rows no longer contain stale `Not started`,
  `Partial pass`, or historical local-only gaps unless those gaps remain true
  and are linked to current evidence.
- Supabase/provider claims are backed by current project-ref and provider
  metadata evidence, or by a documented auth/throttle blocker and saved prior
  evidence.
- Targeted tests pass for every changed behavior slice; broader checks run when
  the blast radius justifies them.
- Code review and adversarial QA produce no unresolved critical/high findings.

## Validation Requirements

- Fresh `git status --short --branch` and `git diff --check`.
- `bun run type-check` after source changes.
- Focused Vitest suites for center/right/tree/data changes.
- Provider metadata SQL checks for migrations/RPCs/tables/grants/RLS affected by
  this pass.
- UltraQA scenario matrix for mutation entry points, preferences, responsive
  access, undo/destructive recovery, provider drift, dirty worktree safety, and
  misleading-success risk.

## Final Deliverables

- Implemented code, migrations, generated types, and tests.
- Updated source coverage appendix, TODO, implementation ledger, loop ledger, and
  current-state fast path.
- Provider proof files under the existing evidence folder.
- Review and UltraQA reports with residual risks, if any.
