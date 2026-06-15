PLAN CREATION PROMPT

You are ChatGPT acting as a senior prompt architect, startup technical founder, principal engineer, product strategist, technical architect, implementation planner, QA strategist, security/performance reviewer, and codebase-AI workflow designer.

Your job is to create ONE complete prompt that I can copy and paste directly into a codebase CLI AI agent such as Codex, Claude Code, OpenCode, CommandCode, OMX, or a similar repo-aware coding agent.

The prompt you generate will be used by the codebase AI agent to create a new implementation plan inside my local ArchEstimator repository.

This is a META-PROMPT.

Your output must be the final CODEBASE-AGENT PROMPT only.
Do not implement anything yourself.
Do not give me commentary.
Do not give me strategy notes.
Do not give me multiple options.
Do not ask me follow-up questions.
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
- The codebase AI must read the .ai source-of-truth chain before planning:
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
- For Next.js work, agents must not rely on old training data. The repo AGENTS.md says this Next.js version may have breaking API/convention changes and agents must read relevant local docs under node_modules/next/dist/docs before modifying framework APIs or route conventions.
- The repo uses GitNexus/code-review-graph intelligence. If available, the codebase AI must use these tools before broad grep-style exploration and before edits. If unavailable, it must document that and fall back to rg/git grep/manual inspection.
- Planning must not modify production source code.

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

I will paste your generated prompt into the codebase CLI AI.
Then I will write the feature/change request in plain English under it.

Therefore, the generated prompt must include this section near the top:

FEATURE / CHANGE REQUEST:
{PASTE_FEATURE_OR_CHANGE_REQUEST_HERE}

The generated prompt must be reusable for many different features.

The codebase AI’s job will be:
- Inspect the current repository.
- Understand the feature/change request.
- Create a new dated plan folder inside .ai/03_plans.
- Create all necessary planning documents inside that folder.
- Make the plan strong enough for a future frontier implementation agent such as Codex or Claude Code.
- Update the relevant .ai project memory files.
- Create dated bug/blocker plans in .ai/15_Bugs if issues are discovered.
- Stage, commit, and push only the .ai planning/documentation changes.
- Return a final report.

IMPORTANT SCOPE

The generated codebase-agent prompt must strongly say:

This is PLAN CREATION ONLY.
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
- Product strategist.
- Technical architect.
- QA strategist.
- Security/performance reviewer.
- UX/UI reviewer.
- Implementation planner.
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

Before creating the plan, the codebase AI must read:

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
- Relevant active/archived plans related to the feature

3. CODEBASE RESEARCH REQUIREMENTS

The codebase AI must inspect enough of the repo to understand:

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
- Existing related plans/specs/archives.
- Git history if useful.

It must use GitNexus/code-review-graph tools first if available.
If unavailable, it must document unavailability and use rg, rg --files, git grep, find, and direct file reading.

It must not hallucinate files, APIs, routes, components, services, database tables, migrations, scripts, tests, or architecture.

4. PLAN FOLDER CREATION

The codebase AI must create a new folder inside:

/Users/philiplewis/archestimator/.ai/03_plans

Folder format:

YYYY-MM-DD-{short-descriptive-task-slug}

It must use the actual system date from the machine.
It must create a clean slug from the feature request.
It must not guess the date from memory.

5. REQUIRED PLAN DOCUMENTS

The plan folder must include at minimum:

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

The generated prompt must define what each document must contain.

Each document must be implementation-oriented, not generic.

At minimum:

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

6. OPTIONAL SPECIALIZED DOCUMENTS

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

But it must warn not to create documents for volume alone.

7. READINESS LOOP

The generated prompt must force this loop:

Audit → improve → score → find gaps → improve again → rescore.

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

8. BUG DISCOVERY PROTOCOL

If the codebase AI discovers a bug, failing test, blocker, stale assumption, architecture issue, missing prerequisite, security concern, test gap, or serious ambiguity, it must create a dated bug plan in:

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

9. .ai PROJECT MEMORY UPDATES

The generated prompt must require updates to relevant files/folders if they exist:

- /Users/philiplewis/archestimator/.ai/01_roadmap
- /Users/philiplewis/archestimator/.ai/04_tasks
- /Users/philiplewis/archestimator/.ai/05_logs
- /Users/philiplewis/archestimator/.ai/10_state

Rules:
- Follow existing structure.
- Do not create conflicting source-of-truth docs.
- Do not mark the feature implemented.
- Record the new plan folder.
- Record planning status.
- Record bugs/blockers.
- Keep .ai as durable memory for future agents.

10. FINAL GIT REQUIREMENTS

The generated prompt must require:

- git status --short
- git diff --stat
- git diff --check
- git diff -- .ai

Then:
- Stage only intended .ai documentation changes.
- Commit with:
  docs(ai): create implementation plan for {task-slug}
- Pull/reconcile remote changes safely if needed.
- Never force push.
- Push to origin.
- Capture final commit hash.

Planning/refinement agents must not merge to main automatically unless Philip explicitly asks.

11. FINAL REPORT REQUIREMENTS

The generated prompt must require a final report with:

- Final status:
  - READY_FOR_IMPLEMENTATION
  - NEEDS_REFINEMENT
  - NEEDS_HUMAN_DECISION
  - BLOCKED
- Plan folder created.
- Documents created.
- Documents updated.
- .ai cross-updates.
- Bugs/issues discovered.
- Bug plan files created.
- Readiness score per document.
- Overall readiness score.
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