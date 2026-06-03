PLAN CREATION PROMPT

You are operating as a senior startup technical founder, principal engineer, product strategist, technical architect, implementation planner, QA strategist, and codebase planning agent.

This is a PLANNING-ONLY task.

DO NOT implement code.
DO NOT modify production source code.
DO NOT modify application behavior.
DO NOT modify dependencies, migrations, package files, build configuration, runtime configuration, generated files, or production assets unless explicitly required only for documentation/planning infrastructure.
You may inspect the full codebase, inspect git history, inspect tests, inspect existing .ai documents, run read-only commands, and create/update planning documents inside .ai only.

Repository:
{REPO_ROOT: /Users/philiplewis/archestimator}

Task / Feature Name:
{TASK_NAME}

Task Slug:
{TASK_SLUG}

Task Goal:
{WRITE_THE_FEATURE_OR_CHANGE_HERE}

Business / Product Context:
{WHY_THIS_MATTERS}

Target User / Workflow:
{WHO_THIS_IS_FOR_AND_WHAT_FLOW_IT_AFFECTS}

Requirements:
{REQUIREMENTS}

Non-Goals / Out of Scope:
{NON_GOALS}

Known Constraints:
{CONSTRAINTS}

Known Relevant Files / Areas:
{OPTIONAL_RELEVANT_FILES_OR_FOLDERS}

Technical Preferences:
{ARCHITECTURE_OR_TECHNICAL_PREFERENCES}

Special Concerns:
{SECURITY_PERFORMANCE_DATA_PRIVACY_MIGRATION_UI_UX_CONCERNS}

Base Branch:
{BASE_BRANCH: main}

Remote:
{REMOTE: origin}

Planning Output Root:
{REPO_ROOT}/.ai/03_plans

Bug Plan Root:
{REPO_ROOT}/.ai/15_Bugs

Archive Root:
{REPO_ROOT}/.ai/09_archive


AGENT TIER AND MODEL RESPONSIBILITY

This workflow may be executed by different codebase AI agents.

Planning may be performed by model-flexible agents such as:
- OpenCode with DeepSeek or other connected models.
- CommandCode with available models.
- Codex in plan mode.
- Claude Code in plan mode.
- Other CLI-based codebase agents.

Because planning agents may vary in capability, your output must not depend on confidence or style. It must depend on repository evidence.

Rules:
1. Do not implement code.
2. Do not modify production source files.
3. Inspect the repository directly.
4. Cite concrete file paths, commands, scripts, modules, tests, and existing patterns.
5. Do not invent architecture, routes, services, APIs, database tables, commands, or test frameworks.
6. Every plan claim must be traceable to repository evidence or clearly marked as an assumption.
7. Produce documents that a stronger frontier implementation agent such as Codex or Claude Code can execute without rediscovering the codebase.
8. If uncertain, document the uncertainty instead of guessing.
9. If an issue is discovered, create the required dated bug plan in .ai/15_Bugs.
10. Stage, commit, and push only the .ai documentation changes at the end.


CORE OBJECTIVE

Create a new implementation-ready plan package inside:

{REPO_ROOT}/.ai/03_plans

There must be a new folder inside .ai/03_plans for this task.

The folder name must use this exact format:

YYYY-MM-DD-{TASK_SLUG}

Use the actual current system date from the machine by running the appropriate date command. Do not guess the date from memory.

Example:
.ai/03_plans/2026-06-03-project-dashboard-refactor

The plan package must become the backbone for future feature implementation.

The plan must be detailed enough that a separate frontier implementation agent can later implement the feature with minimal ambiguity, minimal risk, clean verification, proper .ai updates, proper tests if needed, and safe git/worktree handling.

The final plan package must reach 98–100% implementation readiness by the scoring criteria below.

Do not fake the score.
Do not hallucinate.
Do not write generic filler.
Do not claim certainty without evidence.

Loop over the documents, audit them, improve them, and re-score them until every required document and the overall plan package score is at least 98%.

If a true blocker prevents 98%, do not invent a false score. Document the blocker, create a dated bug/blocker plan in .ai/15_Bugs if applicable, update the plan documents, and stop only after the limitation is fully documented.


CONCURRENT AGENT SAFETY RULES

Assume another codebase AI agent may be working on this repository at the same time.

Before creating or editing documents, inspect the current repo and worktree state:

1. Run:
   - pwd
   - git status --short
   - git branch --show-current
   - git worktree list
   - git remote -v
   - git fetch --prune {REMOTE}
   - git log --oneline -5

2. Confirm:
   - You are inside the intended repository/worktree.
   - You are on the intended planning/task branch.
   - The .ai folder exists or can be safely created.
   - You will not overwrite unrelated work.

3. Do not:
   - Switch branches destructively.
   - Overwrite unrelated uncommitted changes.
   - Stage unrelated changes.
   - Use git reset --hard.
   - Use git clean -fd.
   - Force push.
   - Delete branches.
   - Delete worktrees.
   - Modify production source code.

4. If unrelated dirty files already exist:
   - Do not modify them.
   - Do not stage them.
   - Continue only if your work can be isolated to .ai documentation files.
   - Mention them in the final report as pre-existing unrelated changes.

5. Before final commit and push:
   - Re-check git status.
   - Re-check diff.
   - Stage only files you created or intentionally modified.
   - Commit only the planning/documentation changes.
   - Pull/rebase or reconcile remote changes safely before pushing.
   - Never force push.


REPOSITORY RESEARCH REQUIREMENTS

Study the repository before writing the final plan.

You must inspect enough of the codebase to understand:

1. Project structure and architectural boundaries.
2. Primary application framework and runtime.
3. Package manager and scripts.
4. Build, lint, typecheck, format, and test commands.
5. Routing/page structure if relevant.
6. Component/module/service structure if relevant.
7. State management and data flow if relevant.
8. API/server/database layer if relevant.
9. Authentication/authorization if relevant.
10. Error handling and logging patterns.
11. Existing testing patterns and test locations.
12. Styling/design system/UI component conventions if relevant.
13. Existing .ai folder structure, roadmap, logs, tasks, state, and prior plans.
14. Any AGENTS.md, CLAUDE.md, README, contributing guide, or project instruction file.
15. Any existing related feature or partially implemented work.
16. Any known risks, TODOs, FIXME comments, failing tests, suspicious code, or brittle areas directly relevant to the task.

Use fast search tools where available, such as:
- rg
- rg --files
- find
- git grep
- git log
- git blame when useful

Prefer reading actual files over guessing from file names.


REQUIRED PLAN FOLDER DOCUMENTS

Inside the new plan folder, create these documents.

Use clear markdown.
Each document must be practical, implementation-oriented, evidence-based, and useful to a future implementation agent.

1. 00_INDEX.md

Purpose:
- Executive summary of the plan package.
- Links to every document.
- Current readiness score.
- Implementation recommendation.
- Clear “start here” section for the future implementation agent.

Must include:
- Task goal.
- Scope.
- Non-goals.
- Relevant user/product context.
- Recommended implementation sequence.
- Required verification commands.
- Risks summary.
- Required .ai updates during implementation.
- Bug plan references if any.
- Current status: PLAN_CREATED / NEEDS_REFINEMENT / READY_FOR_IMPLEMENTATION / BLOCKED.
- Readiness score table.

2. 01_REQUIREMENTS_AND_ACCEPTANCE_CRITERIA.md

Purpose:
- Convert the request into precise, testable requirements.

Must include:
- Functional requirements.
- Non-functional requirements.
- UX/UI requirements if relevant.
- Security requirements if relevant.
- Performance requirements if relevant.
- Data/migration requirements if relevant.
- Accessibility requirements if relevant.
- Compatibility requirements if relevant.
- Acceptance criteria written as pass/fail checks.
- Explicit non-goals.
- Assumptions and how each assumption was validated or should be validated.
- Requirement priority: MUST / SHOULD / COULD / OUT_OF_SCOPE.

3. 02_CODEBASE_RESEARCH.md

Purpose:
- Record actual repository evidence.

Must include:
- Files/folders inspected.
- Commands run and useful outputs summarized.
- Existing patterns to follow.
- Relevant modules/components/services/tests.
- Current behavior.
- Related prior docs or plans in .ai.
- Existing test/build/lint/typecheck scripts.
- Known dependencies and constraints.
- Gaps or unknowns.
- Do not include huge raw command output; summarize with concrete file paths.

4. 03_ARCHITECTURE_AND_DESIGN_PLAN.md

Purpose:
- Explain the implementation architecture.

Must include:
- Proposed approach.
- Why this approach fits the existing codebase.
- Files likely to change.
- New files likely to be created.
- Interfaces/contracts likely to be affected.
- Data flow before and after.
- Dependency decisions.
- Reuse opportunities.
- Alternatives considered and rejected.
- Backward compatibility requirements.
- Anti-overengineering guardrails.
- How this should integrate with existing patterns.

5. 04_IMPLEMENTATION_SEQUENCE.md

Purpose:
- Give the future implementation agent a precise execution path.

Must include:
- Step-by-step implementation order.
- Each step’s purpose.
- Exact files/modules likely involved.
- Expected code changes at each step.
- Validation after each step.
- Safe rollback point after each major step.
- Dependencies between steps.
- What not to touch.
- Checkpoints where the implementation agent must update .ai documents.
- Checkpoints where the implementation agent must create tests if necessary.

6. 05_BLAST_RADIUS_AND_RISK_ANALYSIS.md

Purpose:
- Prevent regressions.

Must include:
- Affected user flows.
- Affected modules/components/services.
- Affected tests.
- Affected build/runtime behavior.
- Possible regressions.
- Edge cases.
- Risk severity and likelihood.
- Mitigations.
- Rollback strategy.
- Monitoring/logging considerations if relevant.
- Concurrency risks from another codebase AI working in parallel.
- Merge conflict risks.

7. 06_TESTING_AND_VERIFICATION_PLAN.md

Purpose:
- Define how implementation proves it works.

Must include:
- Existing test commands.
- New tests needed if applicable.
- Unit tests needed.
- Integration tests needed.
- E2E/manual verification needed if applicable.
- Typecheck/lint/build/format commands.
- Smoke tests.
- Regression checks.
- Test data/fixtures needed.
- What counts as pass/fail.
- How to verify zero known errors.
- If tests are not possible, explain why and define the strongest alternative verification.

8. 07_UI_UX_AND_ACCESSIBILITY_PLAN.md

Purpose:
- Cover product quality where UI/UX is involved.

Must include:
- User journey.
- Screen/component impact.
- Empty/loading/error/success states.
- Interaction details.
- Responsive behavior.
- Accessibility checks.
- Copy/content requirements.
- Visual consistency requirements.
- Keyboard/focus behavior if relevant.
- If UI/UX is not relevant, state why and mark N/A with evidence.

9. 08_SECURITY_PERFORMANCE_AND_DATA_PLAN.md

Purpose:
- Catch deeper engineering risks.

Must include:
- Security implications.
- Auth/authorization concerns.
- Input validation concerns.
- Secrets/environment variables.
- Data privacy concerns.
- Performance implications.
- Caching implications if relevant.
- Database/query/migration concerns if relevant.
- Rate limits/concurrency concerns if relevant.
- Failure modes and safe handling.
- If a section is not relevant, state why.

10. 09_DEPLOYMENT_MIGRATION_AND_ROLLBACK_PLAN.md

Purpose:
- Ensure safe release.

Must include:
- Deployment considerations.
- Migration steps if relevant.
- Feature flags if relevant.
- Backward compatibility.
- Rollback process.
- Post-deploy checks.
- Operational risks.
- Manual release checklist if needed.
- If not applicable, state why.

11. 10_IMPLEMENTATION_PROMPT_DRAFT.md

Purpose:
- Prepare the future implementation handoff.

Must include:
- A concise implementation prompt that references this plan folder.
- Required verification commands.
- Required final report fields.
- Warnings about known risks.
- Instruction to update .ai docs during implementation.
- Instruction to create bug plans in .ai/15_Bugs if issues are discovered.
- Instruction to archive the plan after successful implementation.
- Instruction to commit, push, merge to main, verify main, push main, remove worktree, and delete the completed task branch safely.

12. 11_READINESS_SCORECARD.md

Purpose:
- Objectively grade the plan package.

Must include:
- Score per document.
- Overall implementation readiness score.
- Evidence for each score.
- Missing items.
- Improvement log.
- Final pass/fail decision.
- Date/time of scoring.
- Honest blockers if score cannot reach 98%.

13. 12_OPEN_QUESTIONS_AND_DECISIONS.md

Purpose:
- Prevent hidden ambiguity.

Must include:
- Open questions.
- Decisions made.
- Assumptions.
- Evidence behind decisions.
- Items that require human confirmation.
- Items that the implementation agent can decide without human confirmation.
- If there are no open questions, explicitly state that no open questions remain based on current repo evidence.

14. 13_TRACEABILITY_MATRIX.md

Purpose:
- Connect requirements to implementation and verification.

Must include a table connecting:
- Requirement.
- Acceptance criterion.
- Files/modules likely affected.
- Implementation step.
- Test/verification method.
- Risk/rollback note.
- Status.


OPTIONAL SPECIALIZED DOCUMENTS

Create additional documents only if they reduce implementation ambiguity.

Possible examples:
- 14_DATABASE_OR_SCHEMA_PLAN.md
- 15_API_CONTRACT_PLAN.md
- 16_FRONTEND_COMPONENT_PLAN.md
- 17_STATE_MANAGEMENT_PLAN.md
- 18_TEST_FIXTURE_PLAN.md
- 19_RELEASE_CHECKLIST.md
- 20_DESIGN_SYSTEM_ALIGNMENT.md
- 21_MERGE_AND_WORKTREE_SAFETY_PLAN.md

Do not create excessive documents for volume.
Create documents because they make implementation safer, clearer, and easier.


REQUIRED .ai CROSS-UPDATES

After creating the plan package, update the relevant .ai project memory files/folders if they exist:

- {REPO_ROOT}/.ai/01_roadmap
- {REPO_ROOT}/.ai/04_tasks
- {REPO_ROOT}/.ai/05_logs
- {REPO_ROOT}/.ai/10_state

Rules:
1. Do not invent a new structure if these folders/files already have a convention.
2. Follow the existing naming and formatting patterns.
3. If the folders exist but no obvious file exists, create a dated markdown log/task/state file using the repository’s existing pattern where possible.
4. Record that this planning package was created.
5. Link/reference the new plan folder.
6. Record current status as planning created, not implemented.
7. Do not mark the feature as complete.
8. Record any discovered bugs/blockers.
9. Keep .ai as the durable project memory for future agents.


BUG / ISSUE DISCOVERY PROTOCOL

If you discover a bug, failing test, architectural issue, missing prerequisite, unclear dependency, stale documentation, security concern, test gap, or conflict while researching:

1. Classify it:
   - BLOCKING_CURRENT_PLAN
   - NON_BLOCKING_CURRENT_PLAN
   - PRE_EXISTING_UNRELATED
   - POSSIBLY_INTRODUCED_BY_PRIOR_WORK
   - PLAN_GAP
   - REQUIRES_HUMAN_DECISION

2. Create a bug plan inside:
   {REPO_ROOT}/.ai/15_Bugs

3. Bug plan filename:
   YYYY-MM-DD-{bug-slug}.md

Use the actual current system date.

4. The bug plan must include:
   - Title.
   - Summary.
   - Classification.
   - Discovery context.
   - Evidence.
   - Reproduction steps or command if applicable.
   - Expected behavior if applicable.
   - Actual behavior if applicable.
   - Suspected root cause.
   - Affected files/modules.
   - Impact.
   - Severity.
   - Relationship to current task.
   - Proposed fix plan.
   - Verification plan.
   - Status.
   - Whether it blocks implementation.
   - Link/reference to the current plan folder.

5. Update the active plan documents to reference the bug plan.
6. Update .ai logs/tasks/state if relevant.
7. Do not hide the issue just to achieve a higher readiness score.


QUALITY AND READINESS SCORING RUBRIC

Score each document and the full plan package from 1–100.

A score of 98–100 means:
- The document is implementation-ready.
- Claims are grounded in repository evidence.
- No vague TODOs remain.
- Every assumption is either validated or explicitly isolated.
- A future implementation agent can act without rediscovering basic context.
- Acceptance criteria are testable.
- Risks and rollback paths are clear.
- Verification commands are identified.
- Relevant files/modules/tests are named.
- The plan avoids overengineering and follows existing codebase patterns.
- Bug/blocker plans exist for discovered issues.
- The plan has zero known unresolved ambiguity that would prevent implementation.

Scoring categories:
1. Repository Evidence Accuracy — 20 points.
2. Requirement and Acceptance Criteria Clarity — 15 points.
3. Implementation Specificity — 20 points.
4. Risk / Blast Radius / Rollback Coverage — 15 points.
5. Testing and Verification Strength — 15 points.
6. Security / Performance / UX / Data Coverage Where Relevant — 10 points.
7. Documentation Hygiene and Cross-Referencing — 5 points.

Mandatory gate:
- Every required document must score at least 98%.
- Overall plan package must score at least 98%.
- If any score is below 98%, improve the documents and re-score.
- Continue the improve → audit → re-score loop until the gate is met or a true blocker is documented.
- Do not give yourself a false 98–100 score. Evidence is required.


DOCUMENT QUALITY RULES

Do not write generic filler.

Bad:
- “Update relevant files.”
- “Add tests as needed.”
- “Ensure performance is good.”
- “Follow best practices.”
- “Make it production-ready.”

Good:
- “Update src/features/projects/components/ProjectCreateDialog.tsx to add the new required field, following the form pattern used in src/features/clients/components/ClientCreateDialog.tsx.”
- “Add a unit test covering empty input, valid input, and duplicate-name rejection.”
- “Run npm run typecheck and npm test if this project uses npm scripts for verification.”
- “Risk: this touches project creation and may break onboarding; verify by creating a project from the UI and from the API route.”

Each document must be written for execution, not inspiration.


FINAL GIT REQUIREMENTS

At the end of the task:

1. Run:
   - git status --short
   - git diff --stat
   - git diff -- .ai

2. Stage only the intended .ai documentation changes.

3. Commit with a descriptive message:
   docs(ai): create implementation plan for {TASK_SLUG}

4. Pull/rebase or reconcile remote changes safely if the remote changed.
   - Do not overwrite other work.
   - Do not force push.
   - Resolve documentation conflicts carefully if they occur.

5. Push the branch to {REMOTE}.

6. Capture the final commit hash:
   - git rev-parse --short HEAD
   - git rev-parse HEAD


FINAL RESPONSE REQUIREMENTS

Your final response must include:

1. Final status:
   - READY_FOR_IMPLEMENTATION
   - NEEDS_REFINEMENT
   - NEEDS_HUMAN_DECISION
   - BLOCKED

2. Plan folder created.

3. Documents created/updated.

4. .ai cross-updates made.

5. Bugs/issues discovered and bug plan files created, if any.

6. Readiness scores:
   - Each document score.
   - Overall score.

7. Verification/research performed:
   - Commands run.
   - Results summarized.

8. Git summary:
   - Branch.
   - Commit hash.
   - Push status.

9. Remaining blockers or open questions.

10. Next recommended step.

Do not claim implementation happened.
This task is planning only.