# Validation Matrix

## User Test Authorization Gate

Automated product testing is user-controlled. Do not create, expand, repair, or
run tests, suites, builds-as-test-gates, browser automation, screenshots,
Storybook, or visual QA unless the user explicitly requests testing for the
current task.

Static contract validators for changed agent/prompt documentation are allowed;
they verify the edited contract rather than product behavior.

## Decisions

| Decision | When | Action |
|---|---|---|
| `NOT_REQUIRED` | Default | Use cheapest decisive non-test evidence |
| `TEST_PROPOSAL` | A named risk materially benefits from testing | Record risk and exact command; do not run |
| `TEST_TASK` | User explicitly requested tests/QA/coverage/reproduction | Run only the requested scope |

Risk, criticality, nearby tests, an existing cheap test, or agent preference do
not create test authority.

## Evidence Order

Choose the first source that can decisively prove the claim:

1. source/reference/diff inspection;
2. type/LSP/static/lint evidence;
3. deterministic dry-run or narrow local runtime evidence;
4. provider readback when authorized and relevant;
5. user-authorized automated test/build/browser evidence;
6. hosted/manual proof for claims that inherently require it.

Do not use a weaker evidence class for a stronger claim. Local proof is not
hosted proof; an unrun test is not passing; prose is not runtime evidence.

## Proportionality

- Small local change: focused source/diff/static evidence.
- Multi-file/shared contract: focused checks across affected boundaries.
- Data/auth/security/provider change: deeper denial, integrity, recovery, and
  readback analysis; propose tests when they would materially reduce risk.
- External release/production claim: hosted evidence for that exact claim.

Rerun only evidence invalidated by later edits. Stop when every requested
criterion has sufficient fresh evidence.

## Failure Handling

If evidence fails, inspect the output, fix the cause, and rerun the narrowest
affected check. Do not broaden automatically. Known unrelated failures remain
separate and must not be silently repaired or used to hide task regressions.

## Final Report

State the evidence actually run, its result, skipped user-gated tests when
material, and the remaining risk. Never claim evidence that was not collected.
