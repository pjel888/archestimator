# Bug, Feature, Hotfix, CI Failure, and Release Workflow Plan

## Feature
Plan -> TDD/source implementation if authorized -> targeted tests -> validate/build -> `.ai` update -> commit/push -> PR/review.

## Bug
Reproduce or record blocker -> bug plan in `.ai/15_Bugs` -> failing test where feasible -> fix -> focused regression -> validate -> close/update bug plan.

## Hotfix
Isolated branch/worktree -> minimal patch -> strongest relevant validation -> rollback plan -> owner approval for production/provider actions.

## CI failure
Read failing logs -> classify source/test/env/flaky/config -> fix only root cause -> rerun failed check and relevant full gate.

## Release
Local proof packet -> provider/manual proof packet -> GitHub/env approvals -> post-deploy checks -> rollback readiness -> update `.ai`; no beta readiness claim without all gates.
