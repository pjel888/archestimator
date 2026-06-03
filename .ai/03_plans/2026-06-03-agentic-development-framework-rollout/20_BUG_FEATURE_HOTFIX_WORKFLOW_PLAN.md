# Bug, Feature, Hotfix, CI Failure, and Release Workflow Plan

**Date:** 2026-06-03

## Feature workflow

1. DEFINE: brief, non-goals, owner decisions, beta relationship.
2. DISCOVER: repo evidence, graph/GitNexus, current-state, relevant specs.
3. DESIGN: architecture, contracts, test plan, rollback.
4. SETUP: branch, task packet, run log stub.
5. BUILD: TDD for code; docs update; minimal focused diff.
6. VALIDATE: required commands, focused tests, e2e/manual where relevant.
7. RELEASE: PR/review, merge per policy, update `.ai`, Notion mirror, archive after complete.

## Bug workflow

1. Evidence first: logs, screenshots, command output, failing test, or user report.
2. Reproduce or explain why reproduction is unavailable.
3. Classify severity and beta/release impact.
4. Create bug plan in `.ai/15_Bugs`.
5. Identify root cause.
6. Add regression test where possible.
7. Fix minimally.
8. Validate.
9. Update known issues/current state if durable.
10. PR and review.

## Hotfix workflow

1. Branch from production branch (`main`).
2. Minimal fix only; no opportunistic refactor.
3. Validate critical path and build where possible.
4. PR with emergency review.
5. Deploy with rollback plan.
6. Backmerge to `beta`/`dev` if used.
7. Postmortem and decision log.

## CI failure workflow

1. Preserve logs and failed check name.
2. Diagnose from evidence.
3. Do not weaken tests/checks without explicit approval.
4. Fix root cause or create bug/blocker.
5. Rerun affected check.
6. Update run log.

## Release workflow

1. Create release candidate from `beta`.
2. Map beta no-go gates.
3. Capture provider proof.
4. Run full validation and manual QA.
5. Capture rollback proof.
6. Prepare release notes and tag/commit.
7. Promote only with Philip approval.
8. Run post-release smoke.
