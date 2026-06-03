You are operating inside the local repository:

`/Users/philiplewis/archestimator`

Your mission is to implement, verify, document, commit, push, and archive **100% of the plans** contained in this plan folder:

`/Users/philiplewis/archestimator/.ai/03_plans/2026-06-03-mass-deletion-projects-estimate-sheets-library-components`

This is not a partial implementation task. Treat the plan folder as the source of truth. Read every document in it, audit the entire codebase, implement everything required, keep the app working, update the AI operating records, and archive the plan folder only after completion has been verified.

Do not ask for clarification unless execution is genuinely impossible. Make the best possible implementation decisions from the repository, the plan documents, existing architecture, tests, and current code behavior.

---

# Primary Objective

Implement all work described in:

`/Users/philiplewis/archestimator/.ai/03_plans/2026-06-03-mass-deletion-projects-estimate-sheets-library-components`

The implementation must be:

1. Complete.
2. Safe.
3. Efficient.
4. Clean.
5. Tested.
6. Committed in logical milestones.
7. Pushed to GitHub repeatedly and at the end.
8. Documented in the `.ai` system.
9. Archived correctly after verified completion.

The final state must leave the codebase working, with no broken imports, no stale references, no type errors, no lint failures, no failing tests caused by this work, no uncommitted changes, and no unpushed commits.

---

# Non-Negotiable Execution Rules

## 1. Read Everything First

Before editing code, inspect and understand:

* Every file inside:

  `/Users/philiplewis/archestimator/.ai/03_plans/2026-06-03-mass-deletion-projects-estimate-sheets-library-components`

* The current repository structure.

* The relevant app architecture.

* The relevant domain models.

* Existing deletion flows.

* Existing project flows.

* Existing estimate sheet flows.

* Existing library component flows.

* Existing data access patterns.

* Existing API routes / server actions / services.

* Existing UI components.

* Existing hooks.

* Existing validation schemas.

* Existing database schema / migrations / seed data.

* Existing test setup.

* Existing `.ai` roadmap, logs, tasks, and state files.

You must not implement from assumptions alone. Build a clear internal implementation map from the actual documents and actual code.

---

## 2. Audit the Whole Codebase

After reading the plan documents, audit the repository for all affected areas.

Search broadly for every relevant term, including but not limited to:

* `delete`
* `bulkDelete`
* `massDelete`
* `project`
* `projects`
* `estimate`
* `estimateSheet`
* `estimateSheets`
* `sheet`
* `sheets`
* `library`
* `component`
* `components`
* `selected`
* `selection`
* `checkbox`
* `confirm`
* `dialog`
* `modal`
* `toast`
* `archive`
* `softDelete`
* `hardDelete`
* `cascade`
* `supabase`
* `prisma`
* `drizzle`
* `api`
* `route`
* `server action`
* `mutation`
* `query`
* `invalidate`
* `cache`
* `revalidate`
* `optimistic`
* `permission`
* `auth`
* `tenant`
* `organization`
* `workspace`

Identify every file that must be modified, every file that may break, every stale reference that could remain, and every workflow that needs verification.

Do not limit the audit to obvious files. Follow imports, route usage, component usage, hooks, schema usage, and database relationships.

---

# Required Working Method

## Phase 1 — Repository and Plan Intake

Perform the following before implementation:

1. Confirm current branch and worktree state.
2. Confirm the repository path is correct.
3. Run `git status`.
4. Read the entire plan folder.
5. Produce an internal checklist from the plan documents.
6. Inspect package scripts and available commands.
7. Inspect database/schema tooling.
8. Inspect test tooling.
9. Inspect app routing and major feature directories.
10. Identify all implementation milestones.

Do not make code changes until the plan and codebase are understood.

---

## Phase 2 — Implementation Planning

Create a local execution checklist before editing. The checklist must cover:

* Exact plan requirements.
* Affected files.
* Expected user-facing behavior.
* Expected data behavior.
* Safety constraints.
* Deletion confirmation behavior.
* Bulk deletion behavior.
* Empty-state behavior.
* Loading-state behavior.
* Error-state behavior.
* Authorization / ownership behavior.
* Cache invalidation / data refresh behavior.
* Test coverage.
* Documentation updates.
* Archive steps.

Use the checklist to drive implementation. Do not skip any item unless the repository proves it is obsolete or irrelevant. If an item is obsolete, record why in the final report.

---

## Phase 3 — Implement in Milestones

Implement in logical, safe milestones. After each meaningful milestone:

1. Run targeted checks.
2. Fix all issues.
3. Run `git diff` and inspect your own changes.
4. Stage only relevant files.
5. Commit with a clear message.
6. Push to GitHub.

You must commit and push repeatedly throughout the work, not only at the end.

Use concise commit messages that explain the milestone, for example:

* `feat: add bulk deletion service for projects`
* `feat: wire mass deletion controls into estimate sheets`
* `fix: harden component deletion validation`
* `test: cover deletion workflows`
* `docs: update ai implementation records`
* `chore: archive completed mass deletion plan`

Actual commit messages should reflect the real work done.

---

# Implementation Requirements

The exact requirements come from the plan folder. However, the implementation must generally satisfy the following standards unless the plan documents explicitly say otherwise.

## 1. Mass Deletion UX

Implement complete, safe mass deletion behavior for the relevant entities described in the plan folder, expected to include:

* Projects.
* Estimate sheets.
* Library components.

For each relevant area:

* Users must be able to select multiple records.
* Users must be able to clear selection.
* Users must be able to see selected count.
* Users must be able to trigger bulk deletion.
* Users must receive a clear confirmation step before destructive action.
* The confirmation must identify what is being deleted.
* Deletion must show loading / pending state.
* Deletion must prevent accidental double submission.
* Success must update the UI immediately.
* Failure must preserve user context and show a useful error.
* Empty states must remain clean.
* Selection state must reset after successful deletion.
* Selection state must not become stale after filtering, pagination, search, refresh, or navigation.

## 2. Single Deletion Compatibility

Existing single-record deletion must continue working.

Do not break:

* Existing delete buttons.
* Existing confirmation dialogs.
* Existing row actions.
* Existing cards.
* Existing menus.
* Existing routes.
* Existing mutations.
* Existing cache invalidation behavior.
* Existing success/error toasts.

If existing deletion is flawed, fix it while preserving expected behavior.

## 3. Data Integrity

Deletion must not corrupt related data.

Verify and enforce correct behavior for:

* Ownership / tenant / user scoping.
* Authorization.
* Foreign key relationships.
* Cascade behavior.
* Soft delete vs hard delete, depending on existing architecture and plan requirements.
* Orphan prevention.
* Batch operation atomicity where appropriate.
* Partial failure handling where atomicity is not available.
* Clear returned result shape.
* Clear error handling.

Do not implement unsafe deletion that can affect records outside the current user/workspace/project scope.

## 4. Performance

Bulk deletion must be efficient.

Avoid:

* One network request per row if a batch endpoint/service is appropriate.
* Repeated full-page reloads.
* Unnecessary duplicate queries.
* O(n²) state updates for normal list sizes.
* Stale cache behavior.
* Excessive re-renders from poorly placed state.

Prefer:

* Batch server-side operations.
* Proper indexes if schema changes require them.
* Shared deletion utilities where appropriate.
* Local optimistic UI only when safe and reversible.
* Server-confirmed updates for destructive workflows.

## 5. Code Quality

The final code must match the existing codebase conventions.

Preserve:

* Existing folder structure.
* Existing naming conventions.
* Existing design system.
* Existing component patterns.
* Existing state management style.
* Existing data fetching style.
* Existing validation style.
* Existing error handling style.
* Existing formatting.

Do not introduce unnecessary libraries. Do not create generic abstractions unless they clearly reduce duplication and match the current architecture.

## 6. Accessibility and UI Integrity

Deletion controls must be usable and accessible.

Ensure:

* Buttons have clear labels.
* Destructive actions are visually and semantically clear.
* Confirmation dialogs are keyboard-accessible if the existing dialog system supports it.
* Disabled/loading states are clear.
* Checkbox selection works reliably.
* Screen reader labels are present where needed.
* UI does not shift or break on empty/filtered states.
* Mobile/responsive behavior is not degraded.

## 7. Tests

Add or update tests according to the project’s existing test strategy.

At minimum, cover the most critical available layers:

* Unit tests for deletion helpers/services where applicable.
* Integration tests for batch deletion behavior where applicable.
* Component tests for selection and confirmation behavior where applicable.
* Regression tests for single deletion if touched.
* Authorization/scope tests if the codebase has server-side test coverage for it.

Do not invent a test framework. Use what the project already uses.

If test infrastructure is missing for a layer, document that clearly in the final report and cover with the strongest available verification commands.

---

# Required Verification Loop

You must continuously loop until the implementation is clean.

After each implementation milestone and again at the end, run the strongest applicable checks available in the repo.

Inspect `package.json` and use the actual scripts. Likely checks may include, but are not limited to:

* install/dependency verification if needed
* typecheck
* lint
* format check
* unit tests
* integration tests
* build
* database checks
* route checks
* affected test files
* app smoke checks

Use the actual repo commands, not guessed commands, after inspecting the scripts.

The final verification must include:

1. `git status`
2. Full typecheck, if available.
3. Full lint, if available.
4. Full test suite, if available.
5. Full build, if available.
6. Any relevant database/schema validation command, if available.
7. Manual code audit of changed files.
8. Search for stale references related to the completed plan.
9. Confirmation that plan files were archived.
10. Confirmation that `.ai` records were updated.
11. Final commit and push.

If any command fails, fix the failure and rerun the command. Continue until clean or until you can prove the failure is unrelated to this work. If unrelated, document the exact command, failure, evidence, and why it is unrelated.

---

# Git Requirements

You must use Git carefully and continuously.

## Before Changes

Run:

* `git status`
* `git branch --show-current`
* `git log --oneline -5`

Verify that you are in the intended repository and on the intended working branch.

## During Work

After each milestone:

1. Review changes with `git diff`.
2. Stage only relevant files.
3. Commit with a meaningful message.
4. Push to GitHub.
5. Continue to the next milestone.

Do not leave large unreviewed diffs until the end.

## End of Work

Before final report:

1. Run final verification.
2. Run `git status`.
3. Commit any remaining documentation/archive updates.
4. Push the final branch.
5. Confirm working tree is clean.
6. Confirm branch is pushed.

The final state must have no uncommitted work unless there is a very specific, documented reason.

---

# AI System Documentation Updates

You must update the repository’s AI operating records after implementation.

Update all relevant files inside:

`/Users/philiplewis/archestimator/.ai/01_roadmap`

`/Users/philiplewis/archestimator/.ai/05_logs`

`/Users/philiplewis/archestimator/.ai/04_tasks`

`/Users/philiplewis/archestimator/.ai/10_state`

The updates must reflect:

* What was implemented.
* What plan folder was completed.
* Important decisions.
* Important files changed.
* Tests/checks run.
* Results of checks.
* Known issues, if any.
* Follow-up tasks, if any.
* Completion status.
* Archive location.
* Commit hashes.
* Date of completion.

Do not overwrite valuable existing history. Append or update according to the existing conventions in each folder.

Before editing these `.ai` files, inspect the current structure and follow the existing format.

---

# Archive Requirement

After and only after implementation is verified complete:

1. Create an archive folder inside:

   `/Users/philiplewis/archestimator/.ai/09_archive`

2. The archive folder name must be the same as the plan folder name, prepended with the current date.

   Source plan folder basename:

   `2026-06-03-mass-deletion-projects-estimate-sheets-library-components`

   Archive folder should be created under:

   `/Users/philiplewis/archestimator/.ai/09_archive`

   Use a date-prepended folder name. If the basename already begins with a date, still preserve the original basename and prepend the completion date according to the existing archive naming convention in `.ai/09_archive`. If no convention exists, use:

   `YYYY-MM-DD-2026-06-03-mass-deletion-projects-estimate-sheets-library-components`

3. Move all files from the source plan folder into the archive folder.

4. Preserve file contents and relative structure.

5. Do not lose any plan documents.

6. Confirm the original plan folder is empty or removed according to existing repo convention.

7. Commit and push the archive migration.

8. Record the archive location in the `.ai` logs/state/tasks/roadmap updates.

---

# Final Report Requirement

At the end, produce a comprehensive final report.

The report must include:

## 1. Executive Summary

* What was implemented.
* Whether the plan is complete.
* Whether the codebase is clean.
* Whether everything was pushed.

## 2. Plan Documents Processed

List every file read from:

`/Users/philiplewis/archestimator/.ai/03_plans/2026-06-03-mass-deletion-projects-estimate-sheets-library-components`

For each file, summarize its role in the implementation.

## 3. Codebase Audit Summary

Summarize:

* Major areas inspected.
* Important dependencies discovered.
* Important existing patterns followed.
* Risks found and resolved.
* Stale references removed.
* Deletion-related flows verified.

## 4. Implementation Summary

Group by milestone.

For each milestone, include:

* What changed.
* Why it changed.
* Files modified.
* Any important design decisions.
* Any edge cases handled.

## 5. Testing and Verification

List every command run.

For each command, include:

* Command.
* Result.
* If failed initially, what failed.
* What was fixed.
* Final status.

## 6. Git Commit History

List all commits created during this task.

For each commit, include:

* Commit hash.
* Commit message.
* What it contained.
* Whether it was pushed.

## 7. AI Documentation Updates

List updates made under:

* `.ai/01_roadmap`
* `.ai/04_tasks`
* `.ai/05_logs`
* `.ai/10_state`

Explain what changed in each.

## 8. Archive Confirmation

Include:

* Source plan folder.
* Archive folder created.
* Files moved.
* Confirmation that archive was committed and pushed.

## 9. Remaining Issues

State clearly:

* No known issues, if true.
* Any known issue, if unavoidable.
* Any unrelated pre-existing failure, with evidence.
* Any recommended follow-up.

Do not hide failures. Do not claim success unless verified.

---

# Quality Bar

You must behave like a senior engineer protecting production quality.

Do not do shallow implementation. Do not mark the plan complete while TODOs remain. Do not rely on visual guesses. Do not ignore failing checks. Do not leave dead code. Do not leave duplicated deletion logic unless the existing architecture clearly requires it. Do not introduce broad rewrites unrelated to the plan.

The target final state is:

* The plan is fully implemented.
* Mass deletion works correctly for all planned areas.
* Existing behavior still works.
* Tests/checks pass.
* Code is clean.
* Documentation is updated.
* Plan folder is archived.
* All changes are committed.
* All commits are pushed.
* Final report is complete.

Begin by reading the plan folder and auditing the codebase.
