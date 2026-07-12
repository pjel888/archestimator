---
name: ce-code-review
description: Review a named diff with a proportionate, evidence-backed reviewer set
argument-hint: "[mode:agent] [base:<ref>] [plan:<path>] [review target]"
---

# Code Review

**Archestimator lean override:** select the minimum reviewer set that can
challenge the named risks. A bounded diff may use one correctness reviewer or a
fresh self-review. Testing review, browser evidence, builds, and test execution
require explicit current-task user authorization. Do not treat available
personas as a quota.

## Scope

Review the current checkout by default. `base:<ref>` selects a diff base;
`plan:<path>` supplies requirements; a PR/branch target supplies read-only
context only. Never checkout, switch, create, commit, push, open a PR, or file
tickets from this skill.

`mode:agent` returns one JSON object and never edits. Default mode returns a
concise Markdown report and is also review-only. Applying fixes is a separate
caller-owned task.

## Lean Review Loop

1. Resolve the named target and read `git status --short --branch`.
2. Read the smallest complete diff plus task/plan context needed to understand
   intent.
3. Map only evidence-supported direct/transitive impact: public contracts,
   callers, data/auth boundaries, state transitions, cleanup/error paths, and
   relevant configuration.
4. Select review coverage from the actual risks.
5. Validate candidate findings against source and the diff.
6. Deduplicate, rank, report, and stop.

## Reviewer Selection

Reviewer count is a cost. Use zero child agents for a small, clear diff when a
fresh direct review is sufficient. Use one correctness reviewer for ordinary
independent judgment. Add a specialist only for a distinct named risk such as
security, data integrity, concurrency, accessibility, or performance; no persona or CE agent is automatic, and `mode:agent` does not force multi-agent review.

When using a Codex native child, assign an installed role and a bounded scope;
do not spawn generic workers outside active team runtime. Parallelize only
independent concerns and pass shared diff paths rather than duplicating large
context.

## Evidence And Test Gate

- Review source, diff, types, contracts, and deterministic static evidence by
  default.
- Only an explicit current-task user testing/QA request maps to `TEST_TASK` and
  authorizes test edits/runs, builds-as-gates, browser automation, screenshots,
  or broad QA.
- `TARGETED`, `BROADER`, severity, criticality, nearby tests, and
  `CHEAPEST_DECISIVE_EXISTING_TEST` are proposal-only metadata.
- Record a precise `TEST_PROPOSAL` when a named residual risk would materially
  benefit from testing; do not execute it without authorization.

## Finding Standard

Report only findings that are concrete, user-relevant, and supported by a
file/line anchor plus causal explanation. Rank them:

- `P0`: exploitable security issue, data loss/corruption, or unusable core path.
- `P1`: likely user-facing breakage or violated contract.
- `P2`: meaningful edge-case, performance, or maintainability defect.
- `P3`: narrow improvement with limited downside.

Do not inflate style preferences, hypothetical future needs, missing tests, or
unrelated pre-existing issues into blockers. Put uncertain but material items
under residual risks with the missing evidence stated.

## Output

Default Markdown:

1. `Coverage` - target, files, risks checked, exclusions.
2. `Findings` - severity, `path:line`, title, impact, suggested repair.
3. `Residual Risks` - only material unproven concerns.
4. `Validation` - non-test evidence read and any user-authorized test evidence.

`mode:agent` JSON:

```json
{
  "status": "pass|findings|failed",
  "coverage": {},
  "findings": [],
  "residual_risks": [],
  "testing_gaps": []
}
```

Stop after the report. Do not auto-fix, auto-commit, spawn a follow-up fixer, or
recommend a broader review merely because more personas or tools are available.
