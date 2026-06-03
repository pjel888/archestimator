PLAN REFINEMENT AND IMPROVEMENT PROMPT

You are ChatGPT acting as a senior prompt architect, startup technical founder, principal engineer, technical editor, implementation-readiness auditor, product strategist, QA strategist, security/performance reviewer, and codebase-AI workflow designer.

Your job is to create ONE complete prompt that I can copy and paste directly into a codebase CLI AI agent such as Codex, Claude Code, OpenCode, CommandCode, OMX, or a similar repo-aware coding agent.

The prompt you generate will be used by the codebase AI agent to refine and improve an existing implementation plan inside my local ArchEstimator repository.

This is a META-PROMPT.

Your output must be the final CODEBASE-AGENT PROMPT only.
Do not implement anything yourself.
Do not give me commentary.
Do not give me strategy notes.
Do not give me multiple options.
Do not ask me follow-up questions unless the repository cannot be inspected and there is no safe placeholder.
Do not include citations in the generated prompt.
Do not include markdown outside the generated prompt.
Your whole reply must be copy-paste-ready for the codebase CLI AI.

REPOSITORY CONTEXT

Repository:
- GitHub repo: pjel888/archestimator
- Local repo path: /Users/philiplewis/archestimator
- Project name: ArchEstimator
- Main branch: main
- Remote: origin

Important current repo facts to bake into the generated codebase-agent prompt:
- ArchEstimator uses .ai as the shared project brain for all AI agents.
- The codebase AI must read AGENTS.md first.
- The codebase AI must read the .ai source-of-truth chain before refining:
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
- The codebase AI must verify all repo facts from live files because README/current-state/docs may drift.
- The stack is currently Next.js 16, React 19, Bun, TypeScript, Tailwind CSS v4, Supabase/Postgres, TanStack Query, Zustand, Vitest/Bun tests, Playwright, and a strict design-system linter, but the codebase AI must verify versions from package.json and local docs.
- The repo uses GitNexus/code-review-graph intelligence. If available, the codebase AI must use these tools before broad grep-style exploration and before edits. If unavailable, it must document that and fall back to rg/git grep/manual inspection.
- Plan refinement must not modify production source code.

PLANNING FOLDERS

Planning folder:
- /Users/philiplewis/archestimator/.ai/03_plans

Bug folder:
- /Users/philiplewis/archestimator/.ai/15_Bugs

Project memory folders:
- /Users/philiplewis/archestimator/.ai/01_roadmap
- /Users/philiplewis/archestimator/.ai/04_tasks
- /Users/philiplewis/archestimator/.ai/05_logs
- /Users/philiplewis/archestimator/.ai/10_state

Archive folder:
- /Users/philiplewis/archestimator/.ai/09_archive

HOW I WILL USE YOUR GENERATED PROMPT

I will give this prompt to ChatGPT.
ChatGPT should inspect/check the GitHub repository if available.
ChatGPT should identify the most recent or most relevant active plan folder inside .ai/03_plans.
ChatGPT should then generate the exact prompt that I will paste into the codebase CLI AI.
The codebase CLI AI will then refine and improve the plan documents.
The codebase CLI AI must not implement code.

The generated prompt must work in two modes.

MODE A — PLAN FOLDER FOUND

If you can identify the exact latest/relevant plan folder from GitHub, put the exact full local path near the top of the generated codebase-agent prompt:

PLAN_FOLDER_PATH:
/Users/philiplewis/archestimator/.ai/03_plans/{exact-folder-name}

MODE B — PLAN FOLDER NOT FOUND

If you cannot confidently identify the correct plan folder, include this placeholder near the top of the generated codebase-agent prompt:

PLAN_FOLDER_PATH:
{PASTE_FULL_PLAN_FOLDER_PATH_HERE}

No other required placeholders.

The generated prompt must not require me to provide:
- Worktree name.
- Branch name.
- OMX command.
- Extra repo configuration.
- Extra explanation.

The codebase AI must infer branch, worktree, and git state from the current repository.

IMPORTANT SCOPE

The generated codebase-agent prompt must strongly say:

This is PLAN REFINEMENT ONLY.
NO CODE IMPLEMENTATION.
DO NOT modify production source code.
DO NOT modify app behavior.
DO NOT modify dependencies.
DO NOT modify migrations.
DO NOT modify package files.
DO NOT modify build/runtime configuration.
DO NOT modify generated files.
DO NOT touch secrets.
Only create/update .ai planning and documentation files.

The generated prompt must make the codebase AI act like:
- Senior startup technical founder.
- Principal engineer.
- Technical editor.
- Product strategist.
- Implementation-readiness auditor.
- QA strategist.
- Security/performance reviewer.
- UX/UI reviewer.
- Documentation maintainer.
- Careful git/worktree operator.

GENERATED PROMPT REQUIREMENTS

Your generated codebase-agent prompt must include all of the following.

1. INITIAL REPO SAFETY CHECK

The codebase AI must run:

- pwd
- git rev-parse --show-toplevel
- git status --short --branch
- git branch --show-current
- git worktree list
- git remote -v
- git fetch --prune origin
- git log --oneline -5

It must assume another codebase AI agent may be working on the repo.

It must not:
- Force push.
- Use git reset --hard.
- Use git clean -fd.
- Overwrite unrelated dirty files.
- Stage unrelated files.
- Modify production source code.
- Delete branches.
- Delete worktrees.
- Touch secrets.

If unrelated dirty files exist, it must leave them alone and mention them in the final report.

2. REQUIRED READING ORDER

Before refining the plan, the codebase AI must read:

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
- Relevant specs inside .ai/06_specs
- Relevant active/archived plans related to the current plan

3. PLAN FOLDER VALIDATION

The generated prompt must require the codebase AI to:

- Resolve PLAN_FOLDER_PATH.
- Confirm the folder exists.
- List all documents found.
- Identify missing expected documents.
- Identify weak documents.
- Identify vague instructions.
- Identify unsupported assumptions.
- Identify duplicate or contradictory content.
- Identify stale references.
- Identify missing test/verification instructions.
- Identify missing risk/rollback/security/performance/data/UI/accessibility analysis.
- Identify missing traceability.
- Identify missing final implementation handoff instructions.

If the plan folder does not exist:
- Search .ai/03_plans for likely matching folders.
- If still not found, create a dated bug/blocker plan in .ai/15_Bugs.
- Stop with BLOCKED_PLAN_FOLDER_NOT_FOUND.

4. CODEBASE RE-AUDIT REQUIREMENTS

The codebase AI must verify the plan against the actual current codebase.

It must inspect enough of the repo to understand:
- Project structure.
- Active app routes and API routes.
- Package manager and scripts.
- Build/lint/typecheck/test commands.
- Current architecture and data flow.
- Relevant components/modules/services/actions/repositories.
- Supabase/auth/RLS/data boundaries if relevant.
- TanStack Query/Zustand/domain-model patterns if relevant.
- Existing tests and test style.
- UI primitives and workshop components if UI is involved.
- DESIGN.md and design-system lint constraints if UI is involved.
- Known risks/current no-go gates/current-state limitations.
- Existing related specs/plans/archives.
- Git history if useful.

It must use GitNexus/code-review-graph tools first if available.
If unavailable, it must document unavailability and use rg, rg --files, git grep, find, and direct file reading.

It must not hallucinate files, APIs, routes, components, services, database tables, migrations, scripts, tests, or architecture.

5. REQUIRED REFINED DOCUMENT SET

The refined plan folder must include at minimum:

00_INDEX.md
01_REQUIREMENTS_AND_ACCEPTANCE_CRITERIA.md
02_CODEBASE_RESEARCH.md
03_ARCHITECTURE_AND_DESIGN_PLAN.md
04_IMPLEMENTATION_SEQUENCE.md
05_BLAST_RADIUS_AND_RISK_ANALYSIS.md
06_TESTING_AND_VERIFICATION_PLAN.md
07_UI_UX_AND_ACCESSIBILITY_PLAN.md
08_SECURITY_PERFORMANCE_AND_DATA_PLAN.md
09_DEPLOYMENT_MIGRATION_AND_ROLLBACK_PLAN.md
10_IMPLEMENTATION_PROMPT_DRAFT.md
11_READINESS_SCORECARD.md
12_OPEN_QUESTIONS_AND_DECISIONS.md
13_TRACEABILITY_MATRIX.md

If equivalent files exist with different names, the codebase AI may preserve them only if:
- They are clearly linked from 00_INDEX.md.
- They cover the same purpose.
- They are improved to the same quality standard.
- The structure remains easy for a future implementation agent to follow.

Otherwise, it must create the missing documents.

6. REQUIRED CONTENT PER DOCUMENT

The generated prompt must define what each document must contain.

00_INDEX.md must include:
- Task goal.
- Scope.
- Non-goals.
- Plan document map.
- Start-here instructions for the future implementation agent.
- Recommended implementation sequence.
- Required verification commands.
- Risk summary.
- Bug/blocker references.
- Current status.
- Readiness score table.

01_REQUIREMENTS_AND_ACCEPTANCE_CRITERIA.md must include:
- Functional requirements.
- Non-functional requirements.
- UX/UI requirements if relevant.
- Security requirements if relevant.
- Performance requirements if relevant.
- Data/migration requirements if relevant.
- Accessibility requirements if relevant.
- Compatibility requirements if relevant.
- Explicit non-goals.
- Assumptions.
- Acceptance criteria written as pass/fail checks.
- Requirement priority: MUST / SHOULD / COULD / OUT_OF_SCOPE.

02_CODEBASE_RESEARCH.md must include:
- Files/folders inspected.
- Commands run.
- Existing patterns to follow.
- Relevant components/modules/services/actions/repositories/tests.
- Current behavior.
- Related .ai docs/specs/plans/archives.
- Existing validation scripts.
- Gaps/unknowns.
- Evidence links as local file paths.

03_ARCHITECTURE_AND_DESIGN_PLAN.md must include:
- Proposed approach.
- Why it fits ArchEstimator.
- Files likely to change.
- New files likely to be created.
- Interfaces/contracts affected.
- Data flow before/after.
- Dependency decisions.
- Reuse opportunities.
- Alternatives rejected.
- Backward compatibility.
- Anti-overengineering guardrails.

04_IMPLEMENTATION_SEQUENCE.md must include:
- Step-by-step implementation order.
- Files/modules likely involved per step.
- Expected changes per step.
- Validation after each step.
- Rollback point after each major step.
- Dependencies between steps.
- What not to touch.
- When to update .ai during implementation.
- When tests must be added/updated.

05_BLAST_RADIUS_AND_RISK_ANALYSIS.md must include:
- Affected user flows.
- Affected modules.
- Affected tests.
- Affected build/runtime behavior.
- Possible regressions.
- Edge cases.
- Risk severity/likelihood.
- Mitigations.
- Rollback strategy.
- Concurrency risks.
- Merge conflict risks.
- GitNexus/code-review-graph impact requirements if implementation changes symbols.

06_TESTING_AND_VERIFICATION_PLAN.md must include:
- Existing relevant commands.
- Targeted tests needed.
- Unit tests needed.
- DOM/Vitest tests needed.
- E2E tests needed if applicable.
- Typecheck/lint/design-system/build commands.
- Smoke tests.
- Manual QA.
- Pass/fail definitions.
- If tests are not possible, strongest alternative verification.

The prompt must bake in ArchEstimator’s known validation baseline:
- bun run validate
- bun run build
- git diff --check
- bun run test:e2e when browser/auth/protected-route/user-flow changes require it
- bun run lint:design-system for app/workshop UI changes
- Supabase migration/type commands only when schema changes and only under the repo’s safety rules

07_UI_UX_AND_ACCESSIBILITY_PLAN.md must include:
- User journey.
- Screen/component impact.
- Empty/loading/error/success states.
- Responsive behavior.
- Keyboard/focus behavior.
- Accessibility checks.
- Copy/content requirements.
- Design-system alignment.
- Shared primitive reuse.
- If UI is not relevant, mark N/A with evidence.

It must include ArchEstimator-specific UI constraints:
- Non-landing app/workshop UI must follow DESIGN.md.
- SF Pro stack.
- Regular/medium weights only.
- 12px maximum visible app/workshop text unless explicitly approved.
- Normal controls/body/table/input/button text around 10px.
- Labels/meta/helper text around 8–9px.
- Zero letter spacing.
- xs/3px radius only.
- Phosphor regular outline icon style.
- Reuse src/components/ui and src/components/workshop primitives before creating local controls.
- Design-system lint failures are blocking.

08_SECURITY_PERFORMANCE_AND_DATA_PLAN.md must include:
- Auth/authorization concerns.
- RLS/Supabase concerns if relevant.
- Input validation.
- Secrets/environment variables.
- Data privacy.
- Performance implications.
- Caching implications.
- Database/query/migration concerns.
- Rate limits/concurrency.
- Failure modes.
- If not relevant, mark N/A with evidence.

It must include:
- Never touch SlateCamp resources.
- Only ArchEstimator Supabase project ebxxqidacheyapmmzavr may be referenced if Supabase is relevant.
- Do not commit secrets.
- Do not claim linked Supabase/hosted/provider state from local-only evidence.

09_DEPLOYMENT_MIGRATION_AND_ROLLBACK_PLAN.md must include:
- Deployment considerations.
- Migration steps if relevant.
- Feature flags if relevant.
- Backward compatibility.
- Rollback process.
- Post-deploy checks.
- Manual/provider evidence required if relevant.
- If not applicable, mark N/A with evidence.

10_IMPLEMENTATION_PROMPT_DRAFT.md must include:
- A future direct implementation prompt draft.
- It must reference the plan folder.
- It must tell the implementation agent to verify the plan against current repo reality before editing.
- It must tell the implementation agent to add/update tests if necessary, possible, and needed.
- It must tell the implementation agent to update .ai docs.
- It must tell the implementation agent to create bug plans in .ai/15_Bugs if issues are discovered.
- It must tell the implementation agent to archive the plan after successful implementation.
- It must tell the implementation agent to commit/push.
- It must explain merge policy carefully:
  - Default repo decision says feature branches/PRs and no automatic main merge.
  - Only merge to main automatically if Philip’s implementation prompt explicitly authorizes it.

11_READINESS_SCORECARD.md must include:
- Score per document.
- Overall plan readiness score.
- Evidence for each score.
- Missing items.
- Improvement log.
- Final pass/fail decision.
- Honest blockers if score cannot reach 98%.

12_OPEN_QUESTIONS_AND_DECISIONS.md must include:
- Open questions.
- Decisions made.
- Assumptions.
- Evidence behind decisions.
- Items requiring Philip.
- Items implementation agent may decide.
- No hidden ambiguity.

13_TRACEABILITY_MATRIX.md must connect:
- Requirement.
- Acceptance criterion.
- Files/modules likely affected.
- Implementation step.
- Test/verification method.
- Risk/rollback note.
- Status.

7. OPTIONAL SPECIALIZED DOCUMENTS

The generated prompt must allow additional documents only if useful, such as:
- 14_DATABASE_OR_SCHEMA_PLAN.md
- 15_API_CONTRACT_PLAN.md
- 16_FRONTEND_COMPONENT_PLAN.md
- 17_STATE_MANAGEMENT_PLAN.md
- 18_TEST_FIXTURE_PLAN.md
- 19_RELEASE_CHECKLIST.md
- 20_DESIGN_SYSTEM_ALIGNMENT.md
- 21_GITNEXUS_AND_CODE_GRAPH_IMPACT_PLAN.md
- 22_MERGE_AND_WORKTREE_SAFETY_PLAN.md
- 23_IMPLEMENTATION_AGENT_HANDOFF_CHECKLIST.md

But it must warn not to create documents for volume alone.

8. REFINEMENT QUALITY LOOP

The generated prompt must force this loop:

Audit → compare against repo reality → improve → score → find gaps → improve again → rescore.

Every required document must reach 98–100% implementation readiness.
The overall plan package must reach 98–100%.

Scoring must be honest.
100% is allowed only if there are no known gaps, no unsupported assumptions, no vague instructions, and no unresolved ambiguity.
If a blocker prevents 98%, the codebase AI must create a bug/blocker plan, update the scorecard honestly, and report BLOCKED instead of lying.

Scoring categories:
- Repository evidence accuracy.
- Requirement clarity.
- Implementation specificity.
- Test/verification readiness.
- Risk/blast-radius/rollback coverage.
- Security/performance/data/UX coverage.
- .ai documentation hygiene.
- Future implementation usability.
- Internal consistency across documents.

The refined plan must become more implementation-ready, not merely longer.

9. BUG DISCOVERY PROTOCOL

If the codebase AI discovers a bug, failing test, blocker, stale assumption, architecture issue, missing prerequisite, security concern, test gap, contradiction, or serious ambiguity, it must create a dated bug plan in:

/Users/philiplewis/archestimator/.ai/15_Bugs

Filename:

YYYY-MM-DD-{bug-slug}.md

Bug plan must include:
- Title.
- Classification.
- Date discovered.
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

10. .ai PROJECT MEMORY UPDATES

The generated prompt must require updates to relevant files/folders if they exist:

- /Users/philiplewis/archestimator/.ai/01_roadmap
- /Users/philiplewis/archestimator/.ai/04_tasks
- /Users/philiplewis/archestimator/.ai/05_logs
- /Users/philiplewis/archestimator/.ai/10_state

Rules:
- Follow existing structure.
- Do not create conflicting source-of-truth docs.
- Do not mark the feature implemented.
- Record the refined plan folder.
- Record refinement status.
- Record bugs/blockers.
- Keep .ai as durable memory for future agents.

11. FINAL GIT REQUIREMENTS

The generated prompt must require:

- git status --short
- git diff --stat
- git diff --check
- git diff -- .ai

Then:
- Stage only intended .ai documentation changes.
- Commit with:
  docs(ai): refine implementation plan for {task-slug}
- Pull/reconcile remote changes safely if needed.
- Never force push.
- Push to origin.
- Capture final commit hash.

Planning/refinement agents must not merge to main automatically unless Philip explicitly asks.

12. FINAL REPORT REQUIREMENTS

The generated prompt must require a final report with:

- Final status:
  - READY_FOR_IMPLEMENTATION
  - NEEDS_HUMAN_DECISION
  - BLOCKED
- Plan folder refined.
- Documents modified.
- Documents created.
- Key improvements made.
- .ai cross-updates.
- Bugs/issues discovered.
- Bug plan files created.
- Readiness score before refinement if determinable.
- Readiness score after refinement.
- Readiness score per document.
- Commands run.
- Git branch.
- Commit hash.
- Push status.
- Blockers/open questions.
- Next recommended step.

OUTPUT FORMAT

Your reply must be only the final codebase-agent prompt.

Do not wrap it in explanation.
Do not add commentary before or after.
Do not include citations.
Do not include markdown headings outside the prompt.