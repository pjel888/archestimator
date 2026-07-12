# Lean Execution and Validation Policy

## Authority and Purpose

This artifact aligns the pack to the `2026-07-11` planning suite, `AGENTS.md`, `.ai/00_system/AGENT_OPERATING_PROTOCOL.md`, and `.ai/00_system/VALIDATION_MATRIX.md`. It supersedes older wording in this pack that treats automated tests, builds, browser proof, multiple reviewers, or fixed team staffing as automatic completion gates.

The product objective remains intact. The execution method becomes leaner: analyze the evidence-supported direct and transitive blast radius, implement the smallest coherent unit, prove it with the cheapest decisive evidence, and stop when the mapped acceptance claim is grounded.

## No-Overengineering Contract

- Reuse current admin, auth, notification, audit, support, observability, and Cloudflare boundaries before adding abstractions.
- Add only schema, repositories, adapters, flags, queues, or provider surfaces required by an accepted requirement and its current execution unit.
- Do not implement speculative future channels, generalized workflow engines, plugin systems, duplicate analytics pipelines, or provider portability layers.
- Split work only where ownership, freshness, authorization, or rollback boundaries differ. Parallel lanes and maker/checker separation are optional, risk-justified tools rather than readiness requirements.
- Preserve one canonical execution authority: `IMPLEMENTATION_PLAN.md`.

## User Test Authorization Gate

All `AC-*` criteria currently use:

- `test_requirement: NOT_REQUIRED`;
- `test_trigger: NONE`;
- `test_ids: []`;
- a substantive rationale pointing to source, diff, schema, query, migration, runtime, hosted, or operator evidence as appropriate.

The pack does not authorize creating, expanding, repairing, or running automated tests, builds used as test gates, browser automation, screenshots, Storybook, or broad QA. Existing test names and commands elsewhere in historical planning evidence are examples of possible future proposals, not executable instructions.

When cheaper evidence cannot prove a named critical invariant, record a `TEST_PROPOSAL` containing the risk and exact narrow command. Continue all safe non-test work. Only an explicit user testing request for that execution task may promote the affected criterion to `TEST_TASK` with `test_trigger: EXPLICIT_TEST_TASK` and populate `test_ids`.

## Cheapest Decisive Evidence by Surface

| Surface | Default evidence |
| --- | --- |
| Route, action, capability, DTO | focused source/call-site inspection, typed contract, denial-path review, diff |
| D1 schema/query/migration | ordered migration inspection, SQL/schema constraints, `EXPLAIN QUERY PLAN`, scoped dry-run or read-only query when safe |
| UI states and accessibility structure | component/DOM source inspection, semantic attributes, state inventory, responsive CSS review |
| Notification lifecycle and recovery | state-transition contract, transaction boundaries, idempotency keys, queue/cron configuration, reconciliation queries |
| Performance and cost | query plans, bounded formulas, bundle/import inspection, current Cloudflare limits and binding configuration |
| Hosted/provider/release claim | source-matched hosted artifact or operator receipt; local evidence never substitutes |

## Supersession Map

- `11_TEST_ADVERSARIAL_QA_AND_EVIDENCE_PLAN.md` is a risk and evidence catalogue. Its test lists are not standing commands; apply this policy first.
- `15_REQUIREMENTS_TRACEABILITY_AND_FINAL_AUDIT.md` proof labels describe risk coverage, not mandatory automated suites; use the cheapest decisive evidence above.
- `IMPLEMENTATION_PLAN.md` unit pass language and compact packet commands are subject to this policy. Execute automated commands only under `TEST_TASK`; otherwise substitute the mapped non-test evidence and record the result in the unit receipt.
- `evidence/UNIT-*-receipt.md` planned test commands are dormant proposal examples. They do not authorize execution.
- Prior planning-audit test results remain historical source observations only and do not establish a recurring test gate.

## Stop Condition

This alignment is complete when the manifest uses suite `2026-07-11`, every criterion carries an explicit lean test decision, the test index is empty unless the user has authorized a `TEST_TASK`, canonical artifacts state this supersession unambiguously, manifest hashes validate, and no application/test/runtime/provider file has changed.
