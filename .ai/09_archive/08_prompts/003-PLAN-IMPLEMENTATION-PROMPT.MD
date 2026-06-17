PLAN IMPLEMENTATION PROMPT

PLAN_FOLDER_PATH:
{PASTE_FULL_PLAN_FOLDER_PATH_HERE}

You are operating as a senior principal engineer, implementation owner, release engineer, QA engineer, product-minded builder, technical architect, security/performance reviewer, git/worktree integrator, and careful codebase AI agent.

This is an IMPLEMENTATION task.

Repository:
- GitHub repo: pjel888/archestimator
- Main repository path: /Users/philiplewis/archestimator
- Main worktree path: /Users/philiplewis/archestimator
- Base branch: main
- Remote: origin

Important:
I have already started the codebase AI session in the correct implementation worktree.
Do not ask me for the worktree name.
Do not ask me for the branch name.
Do not ask me for the OMX command.
Do not output an OMX command.
Infer the current worktree, current branch, current repository root, and git state from the actual environment.

Your task:
Implement everything required by the plan folder at PLAN_FOLDER_PATH.

You must:
1. Read the full plan folder.
2. Read the ArchEstimator agent/source-of-truth docs.
3. Audit the current codebase.
4. Verify the plan still matches repository reality.
5. Correct stale or wrong plan assumptions before coding.
6. Implement the plan completely.
7. Add or update tests if necessary, possible, and needed.
8. Run the strongest relevant verification commands available in the repo.
9. Fix all errors caused by this work.
10. Update all required .ai project memory documents.
11. Create dated bug plans in .ai/15_Bugs for any issue discovered.
12. Archive the completed plan into .ai/09_archive.
13. Stage, commit, and push the task branch.
14. If current-run authority permits it, merge the task branch into main from the main worktree.
15. If main was merged, verify main after merge.
16. If current-run authority permits it, push main.
17. Remove the completed worktree when cleanup is safe.
18. Delete the completed local task branch when cleanup is safe.
19. Delete the completed remote task branch only when current-run authority permits it.
20. Return a complete final report.

Do not stop after code edits.
Do not stop after tests.
Do not stop after commit.
Continue until the current-run completion contract is satisfied. For direct-main tasks, that includes merge, main verification, main push, worktree cleanup, and branch cleanup. For PR/handoff tasks, that includes a pushed task branch, verification evidence, and explicit pending merge/push steps.

MERGE/PUSH AUTHORITY GATE

The ArchEstimator repo may contain an older durable decision saying to use feature branches/PRs and not merge to main automatically.

This template is not authorization by itself. Merge or push main only when the current user prompt or an owner-approved plan explicitly authorizes direct main integration for this run.

Current-run direct-main authority does not authorize reckless merging.
It permits automatic merge only if:
- The current branch is not main.
- The task branch contains only intended changes.
- Relevant tests/checks pass.
- Main can be updated safely.
- Merge conflicts are resolved correctly.
- Main passes post-merge verification.
- Main is pushed successfully.
- No other active worktree is using the task branch.
- Cleanup is safe.

If direct-main authority is missing, stop at the pushed task branch or PR-ready handoff and report exactly what remains for an owner to merge or push. If direct-main authority exists but repo policy, branch protection, uncommitted main-worktree change, unresolved conflict, failing check, or active worktree makes merge unsafe, do not force it. Create a dated bug/blocker plan in .ai/15_Bugs, update .ai logs/state, and final status must be COMPLETED_BUT_MERGE_BLOCKED or BLOCKED as appropriate.


CORE STANDARD

The implementation must finish with:
1. All approved requirements implemented.
2. All acceptance criteria satisfied.
3. Necessary, possible, and valuable tests added or updated.
4. Zero known unresolved implementation errors.
5. Zero known type/lint/build/test failures caused by this work.
6. Zero known broken user flows caused by this work.
7. No unrelated changes.
8. No dead code.
9. No debug leftovers.
10. No unnecessary dependencies.
11. No fake success states.
12. No hidden failing checks.
13. No weakened tests.
14. No secret leakage.
15. No unauthorized Supabase/provider mutation.
16. .ai roadmap/tasks/logs/state updated.
17. Completed plan archived.
18. Task branch committed and pushed.
19. Task branch merged into main.
20. Main verified after merge.
21. Main pushed.
22. Completed worktree removed.
23. Completed task branch deleted locally and remotely.

Do not claim “100% complete” unless command output, file changes, acceptance criteria, and git state prove it.

Use evidence, not confidence.


PHASE 0 — IDENTIFY ENVIRONMENT AND PROTECT OTHER AGENTS

Assume another codebase AI agent may be working on this repository at the same time.

Before editing anything, run:

- pwd
- git rev-parse --show-toplevel
- git status --short --branch
- git branch --show-current
- git worktree list
- git remote -v
- git fetch --prune origin
- git log --oneline -5

Determine and record:
- CURRENT_WORKTREE_PATH from pwd / git rev-parse.
- CURRENT_BRANCH from git branch --show-current.
- MAIN_WORKTREE_PATH as /Users/philiplewis/archestimator.
- BASE_BRANCH as main.
- REMOTE as origin.
- PLAN_FOLDER_PATH from the value at the top of this prompt.
- PLAN_BASENAME from basename "$PLAN_FOLDER_PATH".

Do not:
- Force push.
- Use git reset --hard.
- Use git clean -fd.
- Overwrite unrelated dirty files.
- Stage unrelated changes.
- Delete unrelated files.
- Delete another active worktree.
- Delete a branch used by another active worktree.
- Delete a branch before it is merged and pushed to main.
- Suppress errors.
- Hide failed checks.
- Weaken tests just to pass.
- Expand scope beyond the plan unless required to fix a blocker.
- Touch secrets.
- Print secrets.
- Commit secrets.

If unrelated dirty files already exist:
- Do not modify them.
- Do not stage them.
- Mention them in the final report.
- Continue only if implementation can be isolated safely.

If CURRENT_BRANCH is main:
- Stop before implementation.
- Create a dated bug/blocker note in .ai/15_Bugs explaining that implementation was attempted directly on main.
- Final status must be BLOCKED_UNSAFE_BRANCH.
- Do not implement on main.

If CURRENT_BRANCH is not main:
- Continue.


PHASE 1 — READ ARCHITECTURE AND AGENT SOURCE OF TRUTH

Before reading the feature plan deeply, read the ArchEstimator operating docs:

- AGENTS.md
- .ai/README.md
- .ai/00_system/DOCS_SOURCE_OF_TRUTH.md
- .ai/00_system/AGENT_OPERATING_PROTOCOL.md
- .ai/00_system/AGENT_SELF_DIAGNOSTIC_PROTOCOL.md
- .ai/00_system/VALIDATION_MATRIX.md
- .ai/10_state/current-state.md
- .ai/10_state/decisions.md
- .ai/10_state/known-issues.md if present
- .ai/01_roadmap/README.md
- DESIGN.md
- package.json
- README.md

Important ArchEstimator-specific rules:
- .ai is the shared project brain. Keep durable project memory there.
- Do not create tool-specific contradictory brains.
- For Next.js work, read relevant local docs under node_modules/next/dist/docs before modifying framework APIs/routes/conventions. This version may differ from training data.
- Use GitNexus/code-review-graph tools first if available.
- If GitNexus/code-review-graph tools are unavailable, document that and fall back to rg/git grep/manual inspection.
- Before editing functions/classes/methods/exported API boundaries, perform impact analysis if the repo graph tools are available.
- Before committing, run change detection if graph tools are available.
- Never ignore HIGH/CRITICAL graph risk; document it and continue only with clear evidence.
- Never touch archestimator Supabase resources.
- If Supabase is relevant, only reference ArchEstimator project ebxxqidacheyapmmzavr.
- Do not claim linked Supabase, Vercel, Resend, legal, support, hosted, production, or launch readiness from local-only evidence.
- Non-landing app/workshop UI must follow DESIGN.md and design-system lint.
- Design-system lint failures are blocking for app/workshop UI changes.


PHASE 2 — RESOLVE PLAN FOLDER LOCATION

The provided PLAN_FOLDER_PATH may point to the main worktree path even if this session is running inside a separate implementation worktree.

Resolve the active plan folder safely.

1. If PLAN_FOLDER_PATH exists inside CURRENT_WORKTREE_PATH:
   - Use it as ACTIVE_PLAN_FOLDER.

2. If PLAN_FOLDER_PATH exists but is outside CURRENT_WORKTREE_PATH:
   - Treat it as the source plan location only.
   - Derive the relative path beginning at .ai/03_plans/{PLAN_BASENAME}.
   - Check whether the same relative plan folder exists inside CURRENT_WORKTREE_PATH.
   - If it exists inside CURRENT_WORKTREE_PATH, use the current-worktree version as ACTIVE_PLAN_FOLDER.
   - If it does not exist inside CURRENT_WORKTREE_PATH, copy or recreate the plan folder into the equivalent .ai/03_plans location inside CURRENT_WORKTREE_PATH so all implementation, archive, and .ai changes are committed on CURRENT_BRANCH.
   - Do not edit the main-worktree plan folder directly from the task branch session.

3. If PLAN_FOLDER_PATH does not exist:
   - Search inside CURRENT_WORKTREE_PATH/.ai/03_plans for a folder matching PLAN_BASENAME.
   - Search inside /Users/philiplewis/archestimator/.ai/03_plans for a folder matching PLAN_BASENAME.
   - If still not found, create a dated bug plan in CURRENT_WORKTREE_PATH/.ai/15_Bugs and stop with BLOCKED_PLAN_FOLDER_NOT_FOUND.

The ACTIVE_PLAN_FOLDER must be inside the current task worktree before production code implementation begins.


PHASE 3 — READ AND VALIDATE THE PLAN

Read every document inside ACTIVE_PLAN_FOLDER.

Inspect:
- 00_INDEX.md
- 01_REQUIREMENTS_AND_ACCEPTANCE_CRITERIA.md
- 02_CODEBASE_RESEARCH.md
- 03_ARCHITECTURE_AND_DESIGN_PLAN.md
- 04_IMPLEMENTATION_SEQUENCE.md
- 05_BLAST_RADIUS_AND_RISK_ANALYSIS.md
- 06_TESTING_AND_VERIFICATION_PLAN.md
- 07_UI_UX_AND_ACCESSIBILITY_PLAN.md
- 08_SECURITY_PERFORMANCE_AND_DATA_PLAN.md
- 09_DEPLOYMENT_MIGRATION_AND_ROLLBACK_PLAN.md
- 10_IMPLEMENTATION_PROMPT_DRAFT.md
- 11_READINESS_SCORECARD.md
- 12_OPEN_QUESTIONS_AND_DECISIONS.md
- 13_TRACEABILITY_MATRIX.md
- Any additional documents in the folder.
- Any bug plans referenced by the plan.

If some documents are missing:
- Continue only if the remaining plan is sufficient.
- Create or update missing planning documents before implementation if the gap affects implementation quality.
- Create a bug/blocker plan if the missing document creates a blocker.

Extract and record:
- Task goal.
- Scope.
- Non-goals.
- Acceptance criteria.
- Relevant files/modules.
- Implementation sequence.
- Test plan.
- Risk plan.
- Security/data constraints.
- UI/UX/design constraints.
- Rollback plan.
- Open questions.
- Bug references.
- Verification commands.


PHASE 4 — AUDIT THE CURRENT CODEBASE BEFORE CODING

Before editing production code, inspect the actual current codebase.

You must inspect enough to verify:
- Current project structure.
- Existing architecture.
- Framework/runtime.
- Package manager.
- Build/lint/typecheck/test scripts.
- Relevant source files.
- Relevant tests.
- Existing patterns.
- API/server/database layer if relevant.
- Supabase/auth/RLS/data boundaries if relevant.
- TanStack Query/Zustand/domain model patterns if relevant.
- UI/component/design-system patterns if relevant.
- Existing .ai roadmap/tasks/logs/state files.
- Relevant .ai specs/archives.
- Relevant known issues/current-state limitations.

Use, where available:
- GitNexus/code-review-graph tools.
- rg
- rg --files
- find
- git grep
- git log
- git diff
- package manager scripts
- test runner discovery

Do not hallucinate.
Do not assume files exist.
Do not assume commands exist.
Do not assume architecture.
Verify everything.


PHASE 5 — RECONCILE PLAN WITH REPOSITORY REALITY

Compare ACTIVE_PLAN_FOLDER against the current codebase.

If the plan is accurate:
- Continue implementation.

If the plan is stale, vague, incomplete, internally contradictory, or wrong:
1. Update the affected plan documents inside ACTIVE_PLAN_FOLDER.
2. Update .ai logs/state/tasks if relevant.
3. If the issue is a bug, blocker, failing test, missing prerequisite, architecture conflict, serious ambiguity, or stale assumption, create a dated bug plan in:
   CURRENT_WORKTREE_PATH/.ai/15_Bugs
4. Continue only after the plan and repository reality are reconciled.

Do not blindly follow a bad plan.
The plan is the intent source.
The repository is the truth source.


PHASE 6 — BUG / ISSUE DISCOVERY PROTOCOL

If you discover any issue at any time, including:
- Failing test.
- Missing prerequisite.
- Stale plan assumption.
- Architecture conflict.
- Security concern.
- Data issue.
- Merge conflict.
- Broken existing behavior.
- Unclear requirement.
- Tooling failure.
- Blocker.
- New bug introduced during implementation.

Create a bug plan inside:

CURRENT_WORKTREE_PATH/.ai/15_Bugs

Bug filename format:

YYYY-MM-DD-{bug-slug}.md

Use the actual current system date.

Classify the issue as one of:
- INTRODUCED_BY_THIS_WORK_BLOCKING
- INTRODUCED_BY_THIS_WORK_NON_BLOCKING
- PRE_EXISTING_BLOCKING
- PRE_EXISTING_NON_BLOCKING
- PLAN_GAP
- MERGE_CONFLICT
- REQUIRES_HUMAN_DECISION
- TOOLING_OR_ENVIRONMENT_BLOCKER

The bug plan must include:
- Title.
- Classification.
- Date discovered.
- Discovery context.
- Evidence.
- Reproduction steps or command.
- Expected behavior.
- Actual behavior.
- Suspected root cause.
- Affected files/modules.
- Impact.
- Severity.
- Whether it blocks current implementation.
- Proposed fix.
- Verification plan.
- Status.
- Link/reference to ACTIVE_PLAN_FOLDER.

If the issue blocks implementation:
- Fix it if it is within scope or required for the task.
- If it is outside scope but blocks completion, document the blocker, update .ai, and stop with BLOCKED only after the bug plan is created.

If the issue is non-blocking and pre-existing:
- Do not expand scope unnecessarily.
- Document it in .ai/15_Bugs.
- Reference it in final report.
- Continue implementation.


PHASE 7 — IMPLEMENTATION RULES

Implement in small, coherent, testable increments.

For every major implementation step:
1. Read the surrounding code before editing.
2. Use GitNexus/code-review-graph impact analysis before symbol edits if available.
3. Follow existing project patterns.
4. Reuse existing utilities/components/services before creating new ones.
5. Keep the diff minimal but complete.
6. Preserve existing behavior unless the plan explicitly changes it.
7. Add or update types/interfaces/contracts where needed.
8. Add or update tests when necessary, possible, and valuable.
9. Run targeted verification after meaningful increments when feasible.
10. Update ACTIVE_PLAN_FOLDER when implementation reality differs from the plan.
11. Update .ai logs/state/tasks as progress is made.

Engineering rules:
- Correctness over speed.
- Root cause fixes over symptom patches.
- Explicit error handling.
- No silent failures.
- No unnecessary dependencies.
- No overengineering.
- No speculative abstractions.
- No duplicated logic if an existing helper can be reused.
- No broad type escapes unless unavoidable and justified.
- No degraded UX.
- No broken accessibility.
- No security regression.
- No performance regression.
- No data integrity regression.
- No dead code.
- No debug logs.
- No commented-out old code.
- No unused imports.
- No unused variables.
- No unrelated formatting churn.
- No unrelated refactors.

If the implementation requires a change outside the original plan:
- Make the smallest necessary change.
- Document the reason in ACTIVE_PLAN_FOLDER.
- Update .ai logs/state.
- Create a bug/plan-gap document if appropriate.


PHASE 8 — ARCHITECTURE-SPECIFIC RULES FOR ARCHESTIMATOR

For app/workshop UI changes:
- Read DESIGN.md.
- Inspect src/components/ui first.
- Inspect relevant src/components/workshop shared components.
- Reuse or extend shared primitives before creating new local controls.
- Do not create raw feature-local button/search/icon-button/control class strings.
- Use SF Pro stack.
- Use regular/medium weights only.
- Keep visible app/workshop text at 12px maximum unless explicitly approved.
- Keep normal controls/body/table/input/button text around 10px.
- Keep labels/meta/helper text around 8–9px.
- Use zero letter spacing.
- Use xs/3px radius only.
- Use Phosphor regular outline icon style unless a specific approved exception exists.
- Treat design-system lint failures as blocking.

For landing/public marketing pages:
- Landing pages may follow the more experimental landing rules in DESIGN.md.
- Do not apply app/workshop density rules blindly to landing hero/editorial surfaces.

For Supabase/auth/data changes:
- Never touch archestimator resources.
- Only use ArchEstimator Supabase project ebxxqidacheyapmmzavr if Supabase is relevant.
- Do not commit secrets or service-role keys.
- Keep RLS/security boundaries intact.
- Local migrations and linked provider state are separate evidence.
- Do not claim linked Supabase/provider readiness from local-only checks.
- If schema changes are required, follow repo validation matrix commands and update generated types when appropriate:
  - npx supabase@2.98.2 db push
  - npx supabase@2.98.2 gen types typescript --project-id ebxxqidacheyapmmzavr > src/lib/supabase/types.ts
  - npx supabase@2.98.2 migration list
- Only run linked/provider mutation commands if the plan explicitly requires them and it is safe. Otherwise document required external proof.

For AI features:
- Preserve current Ask-only limits unless the plan explicitly approves a wider AI slice.
- Do not add write tools, retrieval/RAG, stored conversations, or provider-key exposure by implication.

For launch/provider readiness:
- Do not claim public launch, closed beta readiness, production readiness, legal readiness, support readiness, Resend readiness, Vercel readiness, or linked Supabase readiness unless actual external/provider/manual evidence exists and is documented.


PHASE 9 — TESTING AND VERIFICATION

Determine the correct verification commands from the repository.

Inspect:
- package.json
- bun.lock if present
- CI config
- README.md
- AGENTS.md
- .ai/00_system/VALIDATION_MATRIX.md
- Existing test folders
- Existing .ai verification notes

Baseline validation for meaningful code changes should include:
- git diff --check
- bun run validate
- bun run build

Remember:
- bun run validate includes type-check, lint, design-system lint, Bun unit tests, and Vitest DOM/helper tests.
- bun run test:e2e is separate and required when browser/auth/protected-route/user-flow changes require it.
- bun run lint:design-system is required for app/workshop UI changes.
- Run focused tests first when useful, then the broader gate.

Create or update tests if necessary, possible, and needed.

Tests are necessary when:
- Behavior changes.
- A bug is fixed.
- A new branch/path/edge case is introduced.
- A public API/component/service contract changes.
- A regression risk exists.
- The plan requires tests.
- User-visible behavior changes.
- Data, auth, permissions, calculations, routing, API behavior, persistence, or business logic changes.
- UI primitives or repeated patterns are added/changed.

Tests may be unnecessary only when:
- The change is documentation-only.
- The change is a trivial non-behavioral refactor already covered by existing tests.
- The repo has no viable test framework for that layer and adding one would be out of scope.
- The test cannot be written without unavailable external systems.
- The strongest available verification is manual/smoke testing due to repository constraints.

If tests are not added:
- Explain exactly why in ACTIVE_PLAN_FOLDER.
- Explain exactly why in the final report.
- Provide the strongest alternative verification performed.

Verification should include, where available and relevant:
- Targeted tests for changed areas.
- Full relevant test suite.
- Typecheck.
- Lint.
- Design-system lint.
- Build.
- Format/diff check.
- Manual smoke test.
- UI visual/browser check if UI is affected and tools are available.
- Regression checks for touched workflows.
- Security/performance check if relevant.
- GitNexus/code-review-graph detect changes if available.

Required loop:
1. Run checks.
2. Read failures.
3. Fix root causes.
4. Re-run checks.
5. Continue until all relevant checks pass or a true external/pre-existing blocker is documented.

Do not:
- Claim success without command evidence.
- Suppress errors.
- Weaken tests just to pass.
- Remove tests unless explicitly justified.
- Ignore failing checks caused by this work.


PHASE 10 — REQUIRED .ai UPDATES

You must keep .ai project memory current.

Update relevant files/folders if they exist:

- CURRENT_WORKTREE_PATH/.ai/01_roadmap
- CURRENT_WORKTREE_PATH/.ai/04_tasks
- CURRENT_WORKTREE_PATH/.ai/05_logs
- CURRENT_WORKTREE_PATH/.ai/10_state

Follow existing file/folder naming conventions.

Record:
- Implementation progress.
- Decisions made.
- Files changed.
- Acceptance criteria completed.
- Verification commands and results.
- Bugs/issues discovered.
- Bug plan links.
- Final implementation status.
- Archive location.
- Merge and cleanup status after completion.

Do not mark complete until implementation, verification, archive, commit, merge, main verification, main push, and cleanup are complete.

Also update ACTIVE_PLAN_FOLDER before archiving:
- Mark completed acceptance criteria.
- Mark completed implementation steps.
- Record files changed.
- Record tests/checks run.
- Record deviations from original plan.
- Record bugs discovered.
- Record final implementation score.
- Record final status.


PHASE 11 — IMPLEMENTATION QUALITY GATE

Before considering implementation complete, score the work from 1–100 using this rubric:

1. Functional Completeness — 25 points.
   - All requirements implemented.
   - Acceptance criteria satisfied.
   - No missing planned behavior.
   - No broken expected behavior.

2. Codebase Integration Quality — 20 points.
   - Follows existing architecture and conventions.
   - Minimal clean diff.
   - No unnecessary abstractions.
   - No duplicate logic.
   - No dead/debug code.
   - No unrelated changes.

3. Testing and Verification — 20 points.
   - Relevant tests added/updated where needed.
   - Checks pass.
   - Failures fixed at root cause.
   - Manual/smoke verification documented where needed.
   - No weakened coverage.

4. Risk, Security, Performance, and Data Safety — 15 points.
   - Risks addressed.
   - No known security regression.
   - No known performance regression.
   - Data handling remains safe.
   - Rollback path documented.

5. .ai Documentation and Archive Hygiene — 10 points.
   - Roadmap/tasks/logs/state updated.
   - Active plan updated.
   - Bugs documented.
   - Completed plan archived correctly.

6. Git / Worktree / Merge Hygiene — 10 points.
   - Clean task branch.
   - Clear commit.
   - Task branch pushed.
   - Task branch merged to main.
   - Main verified after merge.
   - Main pushed.
   - Worktree removed.
   - Local task branch deleted safely.
   - Remote task branch deleted safely.

Mandatory gate:
- Overall implementation score must be 98–100.
- There must be zero known unresolved errors caused by this work.
- Relevant checks must pass.
- Main must be verified after merge.
- If any gate cannot be met due to an external or pre-existing blocker, document it honestly and create the required bug plan.
- Do not fake a 98–100 score.


PHASE 12 — ARCHIVE COMPLETED PLAN

After implementation is complete and verified in the task worktree, archive the plan.

Archive root inside current task worktree:

CURRENT_WORKTREE_PATH/.ai/09_archive

Archive folder naming rule:
- PLAN_BASENAME = basename of ACTIVE_PLAN_FOLDER.
- If PLAN_BASENAME already begins with YYYY-MM-DD-, use PLAN_BASENAME as the archive folder name.
- If PLAN_BASENAME does not begin with YYYY-MM-DD-, create archive folder:
  YYYY-MM-DD-{PLAN_BASENAME}

Use the actual current system date.

Move/migrate the completed plan folder contents into:

CURRENT_WORKTREE_PATH/.ai/09_archive/{ARCHIVE_FOLDER_NAME}

Rules:
1. Preserve all plan files.
2. Add or update:
   IMPLEMENTATION_COMPLETION_REPORT.md

The completion report must include:
- Task goal.
- Implementation summary.
- Files changed.
- Acceptance criteria completion.
- Tests/checks run.
- Results.
- Bugs discovered.
- Bug plan links.
- Commit hashes if already available.
- Merge details if already available.
- Worktree cleanup details if already available.
- Final quality score.
- Final status.
- Date completed.

3. Remove the original active plan folder only after successful migration.
4. Update .ai/03_plans index if one exists.
5. Update .ai/09_archive index if one exists.
6. Update .ai/10_state and .ai/05_logs with archive location.


PHASE 13 — FINAL TASK-WORKTREE VERIFICATION BEFORE COMMIT

Before committing the task branch, run:

- git status --short
- git diff --stat
- git diff --check

Run all relevant verification commands:
- Targeted tests.
- Typecheck.
- Lint.
- Design-system lint if UI changed.
- Build.
- Full relevant test suite.
- E2E if relevant.
- Task-specific smoke checks.
- GitNexus/code-review-graph detect changes if available.

Fix failures caused by this work.
Re-run failed commands until passing.
Update .ai logs/state with final command results.

Do not commit while known relevant checks are failing unless the failure is proven pre-existing/external and documented in .ai/15_Bugs.


PHASE 14 — COMMIT AND PUSH TASK BRANCH

In the current task worktree:

1. Review changed files:
   - git status --short
   - git diff --stat

2. Stage only intended files:
   - Production/source files.
   - Tests.
   - Required .ai updates.
   - Archive migration.
   - Bug plans created during implementation.

3. Do not stage unrelated files.

4. Commit with a clear message:
   feat: implement {PLAN_BASENAME}

   If more accurate, use:
   fix: implement {PLAN_BASENAME}

   Or:
   refactor: implement {PLAN_BASENAME}

   Or, for documentation-only implementation:
   docs(ai): implement {PLAN_BASENAME}

5. Capture commit hash:
   - git rev-parse --short HEAD
   - git rev-parse HEAD

6. Push current task branch to origin:
   - git push -u origin CURRENT_BRANCH

7. If push is rejected because remote advanced:
   - Fetch.
   - Reconcile safely.
   - Rerun relevant checks if code changed.
   - Push again.
   - Never force push.


PHASE 15 — MERGE TASK BRANCH INTO MAIN FROM MAIN WORKTREE IF AUTHORIZED

After the task branch is committed and pushed, merge it into main from the main worktree only when the current user prompt or owner-approved plan explicitly authorizes direct main integration for this run.

If direct-main authority is missing:
- Do not merge main.
- Do not push main.
- Preserve the task branch and report the PR-ready or handoff state.
- Record any remaining owner action in the final status.

Use:

MAIN_WORKTREE_PATH=/Users/philiplewis/archestimator

From MAIN_WORKTREE_PATH:

1. Verify main worktree:
   - pwd
   - git status --short --branch
   - git branch --show-current
   - git worktree list

2. If main worktree has unrelated dirty changes:
   - Do not overwrite them.
   - Do not stash/reset them unless they are yours and necessary.
   - Create a BLOCKED_MERGE bug plan in .ai/15_Bugs.
   - Final status must be COMPLETED_BUT_MERGE_BLOCKED unless you can safely resolve it.

3. Update main:
   - git checkout main
   - git fetch --prune origin
   - git pull --ff-only origin main

4. Merge the task branch:
   - git merge --no-ff CURRENT_BRANCH

5. If conflicts occur:
   - Resolve carefully.
   - Preserve latest main behavior unless the implemented plan explicitly replaces it.
   - Preserve the task implementation.
   - Create or update a MERGE_CONFLICT bug plan inside .ai/15_Bugs.
   - Update .ai logs/state.
   - Continue after conflicts are resolved.

6. After merge, run verification again on main:
   - git status --short
   - git diff --check
   - relevant targeted tests
   - bun run validate
   - bun run build
   - bun run test:e2e if relevant
   - smoke checks if relevant
   - GitNexus/code-review-graph detect changes if available

7. Fix merge-introduced issues.
8. Commit conflict resolutions if git requires it.
9. Push main only when direct main push is authorized for the current run:
   - git push origin main

10. Capture final main merge/head commit hash:
    - git rev-parse --short HEAD
    - git rev-parse HEAD


PHASE 16 — FINALIZE PERSISTENT EVIDENCE ON MAIN IF AUTHORIZED AND SAFE

After main is merged and pushed under current-run authority, update persistent .ai evidence on main if needed.

Do this only for documentation/evidence files, never production code.

Update:
- Archived IMPLEMENTATION_COMPLETION_REPORT.md
- .ai/05_logs relevant handoff log
- .ai/10_state/current-state.md if durable project state changed
- .ai/04_tasks if task status is tracked there
- .ai/01_roadmap if roadmap status changed

Record:
- Task branch commit hash.
- Main merge commit hash.
- Main verification results.
- Main push status.
- Whether cleanup is complete or pending.

If this creates changes on main:
1. Stage only evidence/documentation changes.
2. Commit with:
   docs(ai): finalize implementation evidence for {PLAN_BASENAME}
3. Push main again only when direct main push is authorized for the current run.
4. Capture final main HEAD hash.

If branch protection or repo policy blocks this direct evidence commit:
- Do not force it.
- Record the pending evidence in the final report.
- Continue cleanup only if safe.


PHASE 17 — WORKTREE AND BRANCH CLEANUP

Only after all are true:
- Current-run authority either allowed direct main integration and the task branch has been merged into main, or direct-main authority was missing and the task branch remains available for PR/handoff.
- Main verification has passed or any external/pre-existing blocker is documented when main was merged.
- Main has been pushed to origin when direct main push was authorized.
- No other active worktree is using CURRENT_BRANCH.
- The task worktree has no uncommitted changes.
- The task branch is not needed by another active agent.
- Remote task branch is safe to delete and current-run authority permits remote branch deletion.

From outside the task worktree, preferably from MAIN_WORKTREE_PATH:

1. Confirm worktrees:
   - git worktree list

2. Confirm current task branch is merged:
   - git branch --merged main
   - git log --oneline --decorate -5

3. Confirm the task worktree has no dirty files:
   - git -C CURRENT_WORKTREE_PATH status --short

4. Remove the completed task worktree:
   - git worktree remove CURRENT_WORKTREE_PATH

5. Prune stale worktree metadata:
   - git worktree prune

6. Delete local task branch:
   - git branch -d CURRENT_BRANCH

7. Delete remote task branch:
   - git push origin --delete CURRENT_BRANCH

Safety rules:
- Do not use -D unless you have proven the branch is merged and normal -d deletion is incorrectly blocked.
- Do not delete a branch if git worktree list shows another worktree still uses it.
- Do not delete the remote branch if branch deletion is blocked by policy or if evidence suggests another agent is using it.
- If cleanup cannot be completed safely, document exactly why and provide the exact remaining cleanup commands.
- If cleanup is blocked, final status must be COMPLETED_BUT_CLEANUP_BLOCKED, not COMPLETED_AND_MERGED.


PHASE 18 — FINAL REPORT

Your final response must include:

1. Final status:
   - COMPLETED_AND_MERGED
   - COMPLETED_BUT_CLEANUP_BLOCKED
   - COMPLETED_BUT_MERGE_BLOCKED
   - BLOCKED
   - NEEDS_HUMAN_DECISION

2. Plan folder:
   - Original PLAN_FOLDER_PATH.
   - ACTIVE_PLAN_FOLDER used.
   - Archive location.

3. Task summary:
   - What was implemented.
   - What changed from the original plan, if anything.

4. Files changed:
   - Production/source files.
   - Tests.
   - .ai files.
   - Bug plans.
   - Archived plan files.

5. Acceptance criteria:
   - Each criterion.
   - Pass/fail status.
   - Evidence.

6. Tests and verification:
   - Commands run.
   - Results.
   - Failures encountered.
   - Fixes made.
   - Any checks not run and why.

7. GitNexus/code-review-graph evidence:
   - Tools used if available.
   - Impact/risk findings.
   - Detect-changes/review-context result.
   - If unavailable, state fallback method used.

8. Bugs/issues:
   - Bugs discovered.
   - Bug plans created in .ai/15_Bugs.
   - Blocking/non-blocking classification.
   - Remaining unresolved issues, if any.

9. .ai documentation:
   - Roadmap updates.
   - Tasks updates.
   - Logs updates.
   - State updates.
   - Plan archive path.

10. Git summary:
   - Current task branch name.
   - Task branch commit hash.
   - Push status for task branch.
   - Main branch merge commit hash.
   - Final main HEAD hash if different.
   - Push status for main.
   - Worktree removal status.
   - Local branch deletion status.
   - Remote branch deletion status.

11. Final quality score:
   - Functional completeness score.
   - Code integration score.
   - Testing/verification score.
   - Risk/security/performance/data score.
   - .ai documentation/archive score.
   - Git/worktree hygiene score.
   - Overall score.

12. Remaining risks:
   - State “None known” only if all relevant verification passed and no unresolved issue remains.
   - Otherwise list exact risks and next required action.

Do not finish with vague claims.
Every success claim must be backed by file changes, command output, commit hashes, or documented evidence.
