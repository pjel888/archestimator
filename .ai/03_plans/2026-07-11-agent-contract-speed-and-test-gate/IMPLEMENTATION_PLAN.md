# Implementation Plan

## Contract

Use one four-state test decision in planning and execution:

- `NOT_REQUIRED` - default; do not create or run tests.
- `TARGETED` - the smallest test that proves a named critical invariant.
- `BROADER` - an integrated suite is necessary because targeted evidence
  cannot cover the critical boundary.
- `TEST_TASK` - testing, QA, coverage, reproduction, or regression proof is the
  requested deliverable.

Verification never becomes optional. For `NOT_REQUIRED`, use the cheapest
decisive evidence: current-source inspection, focused diff/path/reference
checks, relevant static/type/lint checks, dry runs, or a narrow runtime smoke
only when the claim requires it.

## Test Triggers

Tests are allowed when explicitly requested, when the task itself is testing,
or when an MVP-critical invariant is exposed and cheaper evidence is
insufficient. Critical surfaces include auth/security/session/public access,
D1 schema or data integrity, estimate/money/proposal correctness, first-user
release/rollback/observability paths, and concurrency or shared contracts whose
failure could leak, corrupt, deny access, or materially misstate results.

Being a source edit, multi-file, user-visible, or adjacent to existing tests is
not a test trigger. Broad tests, builds, browser automation, Storybook, and
manual QA need an explicit or integrated critical claim.

## Work Units

| Unit | Scope | Owner | Depends on | Proof |
|---|---|---|---|---|
| U-01 | Repo/stack/policy inventory | explore lanes + lead | none | source map |
| U-02 | Official OpenAI guidance | researcher lane | none | cited research note |
| U-03 | Canonical protocols and root contract | lead | U-01, U-02 | focused diff/static checks |
| U-04 | Agent adapters and payloads | executor lane | U-03 contract | adapter resolver checks |
| U-05 | Planning suite and validators | lead | U-01, U-02 | prompt-suite validator |
| U-06 | Independent adversarial review and repair | verifier/reviewer | U-03..U-05 | findings ledger |
| U-07 | State, run log, and Supermemory closeout | lead | U-06 | durable receipts |

## Stop Condition

Stop when all active agent surfaces use the same test decision, the planning
schema and validator permit no-test criteria, affected deterministic checks
pass, independent review has no unresolved material finding, and durable state
is recorded. Do not run application tests merely because policy files changed.
