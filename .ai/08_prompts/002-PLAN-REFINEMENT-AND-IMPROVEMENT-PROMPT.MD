PLAN REFINEMENT AND IMPROVEMENT PROMPT

You are operating as a senior startup technical founder, principal engineer, technical editor, technical architect, product strategist, implementation-readiness auditor, QA strategist, and codebase planning agent.

This is a PLAN REFINEMENT task.

DO NOT implement production code.
DO NOT modify production source code.
DO NOT modify application behavior.
DO NOT modify dependencies, migrations, package files, build configuration, runtime configuration, generated files, or production assets.
You may inspect the full codebase, inspect git history, inspect tests, run read-only commands, run non-destructive verification commands if useful, and create/update planning/documentation files inside .ai.

Repository:
{REPO_ROOT: /Users/philiplewis/archestimator}

Plan Folder To Refine:
{PLAN_FOLDER_PATH}

Original Task Goal:
{TASK_GOAL}

Additional Context / Updated Requirements:
{ADDITIONAL_CONTEXT}

Known Concerns:
{KNOWN_CONCERNS}

Base Branch:
{BASE_BRANCH: main}

Remote:
{REMOTE: origin}

Bug Plan Root:
{REPO_ROOT}/.ai/15_Bugs

Archive Root:
{REPO_ROOT}/.ai/09_archive


AGENT TIER AND MODEL RESPONSIBILITY

This workflow may be executed by different codebase AI agents.

Plan refinement may be performed by model-flexible agents such as:
- OpenCode with DeepSeek or other connected models.
- CommandCode with available models.
- Codex in plan mode.
- Claude Code in plan mode.
- Other CLI-based codebase agents.

Because refinement agents may vary in capability, your output must not depend on confidence or style. It must depend on repository evidence.

Rules:
1. Do not implement code.
2. Do not modify production source files.
3. Inspect the repository directly.
4. Inspect the full existing plan folder directly.
5. Cite concrete file paths, commands, scripts, modules, tests, and existing patterns.
6. Do not invent architecture, routes, services, APIs, database tables, commands, or test frameworks.
7. Every refined plan claim must be traceable to repository evidence or clearly marked as an assumption.
8. Produce documents that a stronger frontier implementation agent such as Codex or Claude Code can execute without rediscovering the codebase.
9. If uncertain, document the uncertainty instead of guessing.
10. If an issue is discovered, create the required dated bug plan in .ai/15_Bugs.
11. Stage, commit, and push only the .ai documentation changes at the end.


CORE OBJECTIVE

Audit and improve the existing plan folder until it is truly implementation-ready.

The plan folder is:

{PLAN_FOLDER_PATH}

The final plan package must reach 98–100% implementation readiness by evidence-based criteria.

Do not rubber-stamp the existing documents.
Treat them as drafts that may be incomplete, vague, outdated, strategically weak, contradicted by codebase reality, or missing documents.

You must inspect both:
1. The full plan folder.
2. The actual codebase.

The refined plan must make future implementation accurate, efficient, safe, testable, and low-risk.

Do not hallucinate.
Do not invent files, routes, components, commands, tests, APIs, database tables, services, or patterns.
Every specific codebase claim must be grounded in inspected repository evidence.

Loop over the documents, audit them, improve them, and re-score them until every required document and the overall plan package score is at least 98%.

If a true blocker prevents 98%, do not invent a false score. Document the blocker, create a dated bug/blocker plan in .ai/15_Bugs if applicable, update the plan documents, and stop only after the limitation is fully documented.


CONCURRENT AGENT SAFETY RULES

Assume another codebase AI agent may be working on this repository at the same time.

Before editing any document, inspect the current repo and worktree state:

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
   - You are on the intended planning/refinement/task branch.
   - The plan folder exists.
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

5. If the plan folder has changed remotely:
   - Reconcile carefully.
   - Preserve newer valid information.
   - Do not overwrite another agent’s work.
   - Document any conflict resolution in .ai logs.

6. Before final commit and push:
   - Re-check git status.
   - Re-check diff.
   - Stage only files you created or intentionally modified.
   - Commit only the planning/documentation changes.
   - Pull/rebase or reconcile remote changes safely before pushing.
   - Never force push.


REFINEMENT METHOD

Work in this order.

1. Baseline Audit

Read every document in {PLAN_FOLDER_PATH}.

Identify:
- Missing documents.
- Weak documents.
- Vague instructions.
- Unsupported assumptions.
- Missing file references.
- Missing command references.
- Missing tests/verification.
- Missing acceptance criteria.
- Missing risk analysis.
- Missing rollback strategy.
- Missing UI/UX coverage if relevant.
- Missing accessibility coverage if relevant.
- Missing security/performance/data coverage if relevant.
- Missing deployment/migration coverage if relevant.
- Missing git/worktree/merge safety instructions.
- Contradictions between documents.
- Claims that are not backed by repository evidence.

2. Codebase Re-Audit

Inspect the repository again.

You must inspect enough to understand:
- Project structure and architectural boundaries.
- Primary framework and runtime.
- Package manager and scripts.
- Build, lint, typecheck, format, and test commands.
- Routing/page structure if relevant.
- Component/module/service structure if relevant.
- State management and data flow if relevant.
- API/server/database layer if relevant.
- Authentication/authorization if relevant.
- Error handling and logging patterns.
- Existing testing patterns and test locations.
- Styling/design system/UI component conventions if relevant.
- Existing .ai roadmap/tasks/logs/state.
- Related prior plans or archive entries.
- Any AGENTS.md, CLAUDE.md, README, contributing guide, or project instruction file.
- Git history if useful.
- Related TODO/FIXME comments, suspicious code, or known issues.

Use fast search tools where available:
- rg
- rg --files
- find
- git grep
- git log
- git blame when useful

3. Gap Analysis

Compare plan claims against repository evidence.

You must:
- Remove incorrect claims.
- Replace generic advice with specific file/module/test references.
- Add missing implementation details.
- Add missing acceptance criteria.
- Add missing rollback and verification steps.
- Add missing edge cases.
- Add missing sequencing.
- Add missing risks.
- Add missing UI/UX/security/performance/data analysis where relevant.
- Add missing bug plans if issues are found.
- Add missing git/worktree/merge safety notes.
- Reconcile contradictions across plan documents.

4. Document Improvement

Improve existing documents.
Create missing documents where necessary.
Keep documents modular and easy for a future implementation agent to use.
Maintain internal consistency across all plan documents.
Update the index and scorecard last.

5. Readiness Re-Scoring

Score every document.
Score the whole package.
If anything is below 98%, continue improving.
Do not stop until the package is 98–100% ready or a true blocker is documented.


REQUIRED PLAN FOLDER DOCUMENTS

The plan folder should contain these documents unless the existing plan package has an equally clear equivalent structure.

If equivalent files exist, improve them instead of duplicating unnecessarily.
If missing, create them.

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


MANDATORY TRACEABILITY MATRIX

Create or update a traceability matrix inside either:
- 13_TRACEABILITY_MATRIX.md
- or 11_READINESS_SCORECARD.md if the plan is small and already has an equivalent matrix.

The matrix must connect:
1. Requirement.
2. Acceptance criterion.
3. Files/modules likely affected.
4. Implementation step.
5. Test/verification method.
6. Risk/rollback note.
7. Status.

Every major requirement must be traceable to implementation and verification.


REQUIRED .ai CROSS-UPDATES

After refining the plan package, update the relevant .ai project memory files/folders if they exist:

- {REPO_ROOT}/.ai/01_roadmap
- {REPO_ROOT}/.ai/04_tasks
- {REPO_ROOT}/.ai/05_logs
- {REPO_ROOT}/.ai/10_state

Rules:
1. Do not invent a new structure if these folders/files already have a convention.
2. Follow the existing naming and formatting patterns.
3. If the folders exist but no obvious file exists, create a dated markdown log/task/state file using the repository’s existing pattern where possible.
4. Record that this plan package was refined.
5. Link/reference the refined plan folder.
6. Record current status as refined planning, not implemented.
7. Do not mark the feature as complete.
8. Record any discovered bugs/blockers.
9. Keep .ai as the durable project memory for future agents.


BUG / ISSUE DISCOVERY PROTOCOL

If you discover a bug, failing test, architectural issue, missing prerequisite, contradiction, stale plan assumption, security concern, test gap, or blocker while refining:

1. Classify it:
   - BLOCKING_IMPLEMENTATION
   - NON_BLOCKING_IMPLEMENTATION
   - PRE_EXISTING_UNRELATED
   - PLAN_CONTRADICTION
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
   - Relationship to current plan.
   - Proposed fix plan.
   - Verification plan.
   - Status.
   - Whether it blocks implementation.
   - Link/reference to the current plan folder.

5. Update the active plan documents to reference the bug plan.
6. Update .ai logs/tasks/state if relevant.
7. Do not hide the issue just to achieve a higher readiness score.


READINESS SCORING RUBRIC

Score each document and the overall plan package from 1–100.

A 98–100 score requires:
- Clear implementation path.
- Specific files/modules/tests identified.
- Requirements are testable.
- Acceptance criteria are pass/fail.
- Risks and rollback paths are clear.
- Security/performance/UX/data concerns are addressed or explicitly marked N/A with evidence.
- No vague TODOs.
- No unsupported assumptions.
- No contradictions.
- Strong enough context for another codebase AI to implement without rediscovery.
- Verification commands and expected outcomes are listed.
- Bug/blocker plans exist for discovered issues.
- Git/worktree/merge safety is covered where relevant.
- There is zero known unresolved ambiguity that would prevent implementation.

Scoring categories:
1. Codebase Evidence Accuracy — 20 points.
2. Requirement Clarity — 15 points.
3. Implementation Specificity — 20 points.
4. Test and Verification Readiness — 15 points.
5. Risk / Blast Radius / Rollback Coverage — 15 points.
6. Security / Performance / UX / Data Coverage — 10 points.
7. Documentation Structure and Cross-Linking — 5 points.

Mandatory gate:
- Every document must score at least 98%.
- Overall package must score at least 98%.
- If any score is below 98%, improve and re-score.
- If a true blocker prevents 98%, document the blocker and score honestly.
- Do not fabricate certainty.


REFINEMENT QUALITY RULES

Replace vague content with concrete instructions.

Bad:
- “Need to update the UI.”
- “Add tests if needed.”
- “Check security.”
- “Make sure it works.”
- “Follow best practices.”

Good:
- “Update the estimate creation form component at {actual_path} to include {specific behavior}, following the pattern in {actual_reference_path}.”
- “Add tests in {actual_test_path_or_pattern} covering success, validation failure, empty state, and regression case.”
- “Run {actual_command} and require zero errors.”
- “Security risk: user-supplied project names may reach {actual_file}; verify validation happens before persistence.”

Every document must become an implementation tool, not a general essay.


FINAL GIT REQUIREMENTS

At the end:

1. Run:
   - git status --short
   - git diff --stat
   - git diff -- .ai

2. Stage only intended .ai documentation changes.

3. Commit with a descriptive message:
   docs(ai): refine implementation plan for {TASK_SLUG}

4. Safely reconcile remote changes before pushing:
   - Fetch/prune first.
   - Pull/rebase or merge carefully.
   - Resolve conflicts without overwriting other agents’ work.
   - Never force push.

5. Push to {REMOTE}.

6. Capture the final commit hash:
   - git rev-parse --short HEAD
   - git rev-parse HEAD


FINAL RESPONSE REQUIREMENTS

Your final response must include:

1. Final status:
   - READY_FOR_IMPLEMENTATION
   - NEEDS_HUMAN_DECISION
   - BLOCKED

2. Plan folder refined.

3. Documents created.

4. Documents modified.

5. Key improvements made.

6. .ai cross-updates made.

7. Bugs/issues discovered and bug plans created.

8. Readiness score before refinement if determinable.

9. Readiness score after refinement.

10. Per-document score table.

11. Verification/research commands run and results.

12. Git branch.

13. Commit hash.

14. Push status.

15. Remaining blockers/open questions.

16. Next recommended step.

Do not claim implementation happened.
This task is plan refinement only.