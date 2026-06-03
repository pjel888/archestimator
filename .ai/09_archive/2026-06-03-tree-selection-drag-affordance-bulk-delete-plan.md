You are operating inside the existing ArchEstimator repository. Your mission is to implement, verify, document, commit, push, and archive the full plan set located at:

`/Users/philiplewis/archestimator/.ai/03_plans/2026-06-03-tree-selection-drag-affordance-bulk-delete-plan`

This is not a partial implementation task. Treat every document in that plan folder as authoritative until you prove through codebase audit that a specific item is obsolete, duplicated, already implemented, technically invalid, or unsafe. Your job is to deliver the intended feature set completely, with the smallest clean set of changes necessary, while preserving all existing working behavior.

## Absolute operating rules

Do not ask the user for clarification unless the repository is physically missing or the plan folder cannot be accessed. Make the best implementation decision from the codebase, the plan documents, existing architecture, tests, and conventions.

Do not stop after the first pass. Continuously loop through: inspect → implement → test → audit → fix → retest → commit → push → update records. Repeat until the plan is fully implemented, the repo is clean, and verification passes.

Do not claim completion unless all relevant implementation work is done, all plan items are reconciled, verification has passed or unavoidable failures are clearly documented with root cause, and the plan folder has been archived.

Do not make broad rewrites. Preserve the existing architecture, design system, naming conventions, state patterns, API boundaries, and test style unless the plan explicitly requires a change.

Do not leave unstaged or uncommitted work at the end. Do not leave implemented plan files in the active plan folder once the work is complete and archived.

## Required first phase: full intake and audit

Start by reading every file inside:

`/Users/philiplewis/archestimator/.ai/03_plans/2026-06-03-tree-selection-drag-affordance-bulk-delete-plan`

Create a working checklist from the plan documents. Include every explicit requirement, implied dependency, UX behavior, data/state behavior, edge case, testing need, documentation need, and migration/archive requirement.

Then audit the full codebase before editing. Identify:

1. The app stack, package manager, framework, test runner, lint/typecheck/build commands, and relevant scripts.
2. The current implementation areas related to tree selection, drag affordance, bulk delete, UI state, keyboard/mouse interactions, data persistence, and any components/hooks/stores/services involved.
3. Existing tests that cover related behavior.
4. Missing test coverage that must be added.
5. Existing conventions for components, hooks, state, types, actions, mutations, optimistic updates, accessibility, error handling, and UI feedback.
6. Any mismatch between the plan and the current codebase.

Use the repository itself as the source of truth. If commands exist in package scripts or CI, use those. If multiple package managers are present, infer the active one from lockfiles and scripts. Do not invent commands.

## Required implementation scope

Implement everything required by the plan folder, including but not limited to the tree selection, drag affordance, and bulk delete work described there.

The implementation must be production-quality. That means:

* Selection behavior must be deterministic, predictable, and robust.
* Drag affordances must be visually clear without breaking existing interactions.
* Bulk delete must be safe, confirmed where appropriate, and consistent with existing delete behavior.
* State must remain coherent after selection, drag, deletion, cancellation, refresh, errors, undo/redo if present, and navigation.
* Existing functionality must not regress.
* Empty states, loading states, disabled states, error states, and partial-selection states must be handled.
* Keyboard and pointer interactions must not conflict.
* Accessibility must be considered: focus handling, ARIA where appropriate, keyboard reachability, visible affordances, and non-pointer usability.
* Types must be strict and clean.
* No dead code, unused exports, console noise, debug flags, temporary comments, or half-finished TODOs.
* No brittle timing hacks unless there is no clean alternative, and any unavoidable workaround must be documented inline with reason.

## Required execution loop

Work in repeated passes until complete:

### Pass 1 — Plan reconciliation

Convert the plan documents into an explicit checklist. Mark each item as:

* Not started
* In progress
* Implemented
* Verified
* Already existed
* Superseded by codebase reality
* Blocked, only if genuinely blocked by missing files/tools

Do not delete or archive the original plan folder yet.

### Pass 2 — Codebase mapping

Find every relevant file, component, hook, store, type, route, test, fixture, and utility. Understand the current flow before modifying anything.

### Pass 3 — Implementation

Implement the feature set incrementally. Prefer small, coherent changes over one giant edit. Keep behavior simple, testable, and aligned with existing patterns.

### Pass 4 — Tests

Add or update tests that prove the new behavior. Cover meaningful cases, not superficial snapshots only. Include the critical edge cases from the plan.

At minimum, test the core behavior around:

* Single selection
* Multi-selection, if supported or required
* Selection clearing
* Selection after deletion
* Bulk delete success
* Bulk delete cancellation, if confirmation exists
* Bulk delete failure handling, if the app has error paths
* Drag affordance visibility and interaction integrity
* Existing tree behavior that must continue working

Adapt the exact test types to the repo: unit, component, integration, E2E, or whatever already exists.

### Pass 5 — Verification

Run the relevant verification commands from the repo. At minimum, attempt the equivalent of:

* dependency integrity check if available
* lint
* typecheck
* unit/component tests
* integration/E2E tests if present and relevant
* production build

If a command does not exist, record that honestly. If a command fails, fix the cause and rerun. Do not ignore failures. Only document a failure as unresolved if it is unrelated to your changes or impossible to run in the environment, and prove that with evidence.

### Pass 6 — Self-audit

After implementation and tests pass, perform a second audit of your own diff. Look for:

* missed plan requirements
* regressions
* bad naming
* unnecessary complexity
* duplicated logic
* stale comments
* untested logic
* fragile behavior
* accessibility gaps
* uncommitted files
* incorrect archive/log/task/state updates

Fix issues found in the audit and rerun verification.

Repeat Passes 3–6 until there are no known defects.

## Git discipline

Use git continuously and professionally.

Before making changes, inspect:

* current branch
* current status
* recent commits
* remote tracking status

Commit in meaningful milestones. Do not wait until the very end for one giant commit unless the change is truly tiny. Each commit should represent a coherent unit of work, such as:

* audit/checklist or AI tracking updates
* selection state implementation
* drag affordance implementation
* bulk delete implementation
* tests
* documentation/state/archive updates
* final verification report

Stage intentionally. Review `git diff` before each commit. Use clear commit messages.

Push to GitHub after important commits and again at the end. If push fails, diagnose and fix. Do not leave local commits unpushed unless the remote is unavailable; if so, document the exact failure.

Never force push unless absolutely necessary and safe. Prefer normal fast-forward pushes.

## Required AI record updates

You must update the relevant AI tracking files/folders in:

`/Users/philiplewis/archestimator/.ai/01_roadmap`

`/Users/philiplewis/archestimator/.ai/05_logs`

`/Users/philiplewis/archestimator/.ai/04_tasks`

`/Users/philiplewis/archestimator/.ai/10_state`

Use the existing file structure and conventions in those folders. Do not invent a conflicting format. If there are existing dated logs, task ledgers, status files, or state snapshots, update them consistently.

The updates must capture:

* what plan folder was implemented
* implementation summary
* affected areas of the codebase
* checklist of completed requirements
* tests and verification commands run
* known issues, if any
* commit SHAs
* final status
* archive location
* next recommended follow-up, only if truly needed

## Required archive behavior

After the work is implemented and verified, archive the plan folder.

Create a new archive folder inside:

`/Users/philiplewis/archestimator/.ai/09_archive`

The archive folder name must be prepended with the implementation/archive date and must use the same plan folder name.

Use this naming pattern:

`YYYY-MM-DD-2026-06-03-tree-selection-drag-affordance-bulk-delete-plan`

Move all files from:

`/Users/philiplewis/archestimator/.ai/03_plans/2026-06-03-tree-selection-drag-affordance-bulk-delete-plan`

into the new archive folder.

Do not merely copy the files. Migrate them so the active plan folder no longer contains the implemented plan documents. If the empty source folder remains, remove it if that is consistent with repo conventions; otherwise leave it empty only if the project convention requires empty folders.

Add an implementation report inside the archive folder. Name it clearly, for example:

`IMPLEMENTATION_REPORT.md`

The report must include:

* plan folder name
* archive folder path
* implementation date
* final status
* summary of implemented behavior
* important milestones and landmarks
* files changed by category
* tests added or updated
* verification commands run and results
* commits made, with short SHA and message
* push status
* unresolved issues, if any
* notes for future maintainers

## Quality bar

The final result must be close to perfect by actual verification, not by assertion.

Before finalizing, confirm all of the following:

* Every plan document was read.
* Every plan requirement was implemented, already existed, or explicitly reconciled.
* The relevant code paths were audited.
* The implementation is minimal but complete.
* The UI behavior remains coherent.
* The feature works across normal, edge, and failure states.
* Tests were added or updated where needed.
* Lint/typecheck/test/build commands were run where available.
* Failures were fixed or honestly documented with cause.
* AI roadmap/log/task/state files were updated.
* The plan folder was archived under `.ai/09_archive` with the required dated name.
* The archive contains the migrated plan files and an implementation report.
* Changes were staged, committed, and pushed.
* The working tree is clean at the end.

## Final response required from you

At the end, provide a concise but comprehensive completion report. Include:

1. Final status.
2. Summary of what was implemented.
3. Important milestones and landmarks.
4. Tests and verification results.
5. Archive path.
6. AI tracking files updated.
7. Commits made, with short SHA and commit message.
8. Push status.
9. Remaining risks or follow-ups, if any.
10. Current git status.

Do not end with vague language. Be precise, evidence-based, and honest.
