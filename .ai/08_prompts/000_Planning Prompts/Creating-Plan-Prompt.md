--- BEGIN FEATURE-PLANNING DIRECTIVE ---

Treat all feature or plan requirements written immediately above this directive as the authoritative FEATURE BRIEF.

You are the lead product strategist, systems architect, technical planner, and implementation-readiness reviewer for this feature.

REPOSITORY ROOT

/Users/philiplewis/Documents/archestimator

PLAN OUTPUT ROOT

/Users/philiplewis/Documents/archestimator/.ai/03_plans

PRIMARY GOAL

Transform the FEATURE BRIEF into a complete, evidence-based, codebase-specific implementation planning package.

The finished plan must allow a separate implementation AI to execute the feature accurately without having to rediscover requirements, architecture, affected files, dependencies, failure modes, or validation procedures.

This is strictly a planning and documentation task.

Do not:

- Implement the feature.
- Modify application code.
- Modify tests.
- Modify schemas or migrations.
- Modify infrastructure or configuration.
- Run formatters, generators, migrations, or other commands that may change repository files.
- Refactor unrelated files.
- Commit, push, merge, switch branches, or alter Git history.
- Overwrite another agent’s work.
- Claim that the feature itself has been implemented.

“Complete the task” means completely create, review, refine, and validate the planning package—not implement the feature.

======================================================================
1. CREATE THE PLAN DIRECTORY
======================================================================

Determine the current date in the Asia/Manila timezone using the format:

YYYY-MM-DD

For a run on June 24, 2026, the prefix must be:

2026-06-24

Derive a concise, descriptive feature name from the FEATURE BRIEF. Format it as hyphen-separated title words.

Examples:

2026-06-24-Cost-Estimate-Version-History
2026-06-24-Project-Collaboration-Permissions
2026-06-24-Scenario-Comparison-Dashboard

Create the planning folder at:

/Users/philiplewis/Documents/archestimator/.ai/03_plans/YYYY-MM-DD-Name-Of-Feature-Or-Plan

Naming requirements:

- Use the Asia/Manila date at execution time.
- Use a specific feature name, not generic names such as `Feature`, `New-Plan`, or `Updates`.
- Remove unsupported filesystem characters.
- Keep the name concise but meaningful.
- Never overwrite an existing folder.
- If the exact folder already exists, create a versioned successor such as `-v2`, `-v3`, or another unambiguous suffix.
- Create or modify files only inside the newly created planning folder.

Record the exact final path in the planning package and final response.

======================================================================
2. WRITE A MASTER GOAL
======================================================================

Before beginning the detailed audit, create a clear master `/goal` for this planning task.

The master `/goal` must define:

- The user or business outcome.
- The problem being solved.
- The intended feature behavior.
- The planning scope.
- The non-goals.
- The required codebase analysis.
- The required specialist workstreams.
- The implementation-readiness criteria.
- The validation criteria.
- The final planning deliverables.

Do not merely repeat the FEATURE BRIEF. Convert it into a precise planning objective.

Record the master `/goal` in:

00_AGENT_COORDINATION.md

======================================================================
3. REQUIRED MULTI-AGENT ORCHESTRATION
======================================================================

Use the maximum practical amount of safe parallel analysis.

When native subagents, parallel threads, task agents, or delegated workers are available, you must use them.

Create:

- One lead coordinator and synthesizer.
- At least eight specialist analysis agents.
- One adversarial reviewer.
- One independent final verifier.

Use additional agents when more independent workstreams exist.

Do not create redundant agents solely to increase agent count. Every agent must have a meaningful, non-overlapping responsibility.

Each agent must receive its own dedicated `/goal` containing:

- Assigned scope.
- Questions it must answer.
- Codebase areas it must inspect.
- Documents it must inspect.
- Expected deliverables.
- Evidence requirements.
- Dependencies on other agents.
- Completion criteria.
- Explicit instruction not to implement the feature.

Required specialist workstreams:

1. Product strategy, scope, and requirements
2. Existing codebase architecture and conventions
3. UX, UI, accessibility, and user journeys
4. Frontend components, state, and interaction behavior
5. Backend services, APIs, integrations, and network behavior
6. Data models, database behavior, migrations, and integrity
7. Information security, privacy, authentication, and authorization
8. Performance, scalability, caching, and reliability
9. Testing, validation, regression, and quality assurance
10. Deployment, observability, rollout, rollback, and operations
11. Blast radius, dependencies, compatibility, and affected documentation
12. Adversarial gap analysis and assumption challenge

Parallelization rules:

- Dispatch independent research workstreams concurrently.
- Do not wait for one independent audit to finish before launching another.
- Do not parallelize dependent design decisions until their shared contracts are established.
- Do not allow two agents to edit the same planning document concurrently.
- Prefer read-only specialist agents and one lead synthesizer responsible for final document integration.
- Assign explicit document ownership when multiple agents are allowed to write.
- Require every agent to return concrete evidence, file paths, symbols, findings, risks, and recommendations.
- Do not accept generic summaries from agents.

Agent communication requirements:

- Enable direct inter-agent communication when the platform supports it.
- Maintain a shared coordination ledger in `00_AGENT_COORDINATION.md`.
- Require every agent to publish findings, dependencies, assumptions, proposed decisions, conflicts, and completion status.
- Require agents to inspect relevant findings from other workstreams before finalizing dependent recommendations.
- Route unresolved disagreements to the lead coordinator.
- Record the selected resolution and the rejected alternatives.
- Require affected agents to review the final resolution.

The coordination ledger must include:

| Agent | /goal | Scope | Evidence | Dependencies | Findings | Conflicts | Status |
|---|---|---|---|---|---|---|---|

When native subagents are unavailable:

- Emulate the same specialist workstreams as clearly separated analysis passes.
- Preserve independent adversarial and final-verification passes.
- Do not falsely claim that subagents were launched.
- State which workstreams were simulated rather than delegated.

======================================================================
4. DISCOVER AND USE RELEVANT SKILLS
======================================================================

Before analyzing the feature:

- Inspect repository-level AI instructions.
- Inspect available skills, workflows, rules, and project-specific guidance.
- Read relevant files such as `AGENTS.md`, `CLAUDE.md`, repository rules, contributor documentation, architecture documentation, and development guidelines when present.
- Identify the correct skills for analyzing code, documents, UX, security, databases, APIs, performance, tests, and architecture.
- Use every relevant available skill.
- Follow all mandatory skill instructions.

Record in `00_AGENT_COORDINATION.md`:

- Skills discovered.
- Skills used.
- Why each skill was relevant.
- Any required skill that was unavailable.
- How unavailable capabilities were handled.

Do not fabricate skills, tools, agent executions, test results, or repository capabilities.

Do not create a new reusable skill unless a genuine planning capability is missing, the environment explicitly permits skill creation, and creating it does not modify application code or global tooling unexpectedly.

======================================================================
5. CONCURRENT-REPOSITORY SAFETY
======================================================================

Assume multiple human and AI agents may be working in the repository simultaneously.

Before every planning-file write:

- Recheck repository status.
- Confirm the target file is inside the new plan directory.
- Re-read the latest version of any planning file being updated.
- Check whether another agent has changed it.
- Preserve unfamiliar content.
- Avoid overwriting concurrent work.
- Keep all writes confined to the new planning folder.

Never use destructive Git operations, including:

- `git reset --hard`
- `git clean`
- Forced checkout
- Forced branch deletion
- Force-push
- History rewriting
- Removing another agent’s files
- Restoring files over uncommitted work

Do not stage, commit, merge, push, or delete branches as part of this task.

======================================================================
6. AUDIT THE ENTIRE RELEVANT CODEBASE
======================================================================

Do not plan solely from the FEATURE BRIEF.

Perform a repository-wide investigation to understand the feature in its actual architectural context.

Use safe, read-only inspection methods to analyze:

- Repository structure.
- Application architecture.
- Packages and modules.
- Frontend routes and components.
- Backend routes and services.
- API handlers and contracts.
- Database schemas and migrations.
- Data-access layers.
- Authentication and authorization.
- State management.
- Shared types and interfaces.
- Validation logic.
- Background jobs and queues.
- External services and integrations.
- Network clients and request behavior.
- Caching.
- Configuration and feature flags.
- Logging, monitoring, and analytics.
- Existing tests.
- Build and deployment configuration.
- Documentation.
- Similar existing features.
- Historical architectural decisions when available.

Inspect relevant Git history when it helps explain current architecture, but do not modify Git state.

For every relevant code area, record:

- Exact file path.
- Relevant symbol, component, function, class, table, route, or service.
- Current responsibility.
- Why it is relevant.
- Expected impact.
- Whether it must be modified, extended, reused, or deliberately left unchanged.
- Dependencies and downstream consumers.
- Associated tests and documentation.

Do not claim that the “whole codebase” was analyzed unless a systematic repository inventory was actually performed.

======================================================================
7. TRACE ALL RELEVANT DOCUMENTATION
======================================================================

Locate and analyze every document that may define, constrain, explain, or be affected by the feature.

This includes, when present:

- Product requirements.
- Existing plans.
- Architecture documentation.
- API documentation.
- Database documentation.
- Design-system documentation.
- UX guidelines.
- Security guidance.
- Deployment documentation.
- Operational runbooks.
- Testing standards.
- Contributor documentation.
- User documentation.
- Previous implementation plans.
- Architecture decision records.
- Related issue descriptions or specification files stored in the repository.

For each relevant document, record:

- Exact path.
- Purpose.
- Relevant sections.
- Requirements or constraints introduced.
- Whether the document remains accurate.
- Whether implementation would require it to be updated.
- Conflicts with the FEATURE BRIEF or other documents.

Build a document-impact matrix.

Never silently ignore contradictory source material.

======================================================================
8. REQUIRED ANALYSIS DIMENSIONS
======================================================================

Analyze every dimension below. When a dimension is genuinely not applicable, state why with evidence rather than omitting it.

PRODUCT AND STRATEGY

- Problem definition.
- User value.
- Business value.
- Goals.
- Non-goals.
- Scope boundaries.
- Success metrics.
- Failure metrics.
- Stakeholders.
- Dependencies.
- Constraints.
- Assumptions.
- Tradeoffs.
- Alternatives.
- Future extensibility.

FUNCTIONAL REQUIREMENTS

- User-visible behavior.
- System behavior.
- Roles and permissions.
- Preconditions.
- Inputs.
- Outputs.
- State transitions.
- Validation rules.
- Error handling.
- Edge cases.
- Partial-success behavior.
- Recovery behavior.
- Acceptance criteria.

UX, UI, AND ACCESSIBILITY

- Primary user journeys.
- Secondary journeys.
- Navigation.
- Information hierarchy.
- Screen and component states.
- Loading states.
- Empty states.
- Success states.
- Error states.
- Disabled states.
- Offline or degraded states.
- Confirmation behavior.
- Undo behavior.
- Responsive behavior.
- Keyboard navigation.
- Focus management.
- Screen-reader semantics.
- Color and contrast considerations.
- Localization implications.
- Design-system reuse.
- UX regressions.
- User-facing documentation implications.

ARCHITECTURE

- Current-state architecture.
- Target-state architecture.
- Component boundaries.
- Service boundaries.
- Data flow.
- Control flow.
- State ownership.
- Shared contracts.
- Reusable abstractions.
- Coupling.
- Dependency direction.
- Failure boundaries.
- Integration points.
- Architectural alternatives.
- Decision rationale.

DATA AND DATABASE

- Data ownership.
- Schema changes.
- Relationships.
- Constraints.
- Validation.
- Indexes.
- Query behavior.
- Transaction boundaries.
- Concurrency.
- Referential integrity.
- Migration sequencing.
- Backfills.
- Existing-data compatibility.
- Data retention.
- Deletion behavior.
- Audit history.
- Rollback.
- Recovery.
- Data verification.

API AND NETWORK

- API contracts.
- Request and response schemas.
- Versioning.
- Authentication.
- Authorization.
- Input validation.
- Error contracts.
- Idempotency.
- Pagination.
- Rate limits.
- Retries.
- Timeouts.
- Cancellation.
- Deduplication.
- Partial failures.
- Network latency.
- Offline behavior.
- Third-party failure behavior.
- Backward compatibility.
- Webhooks or event delivery when relevant.

INFORMATION SECURITY AND PRIVACY

- Threat model.
- Trust boundaries.
- Attack surface.
- Authentication.
- Authorization.
- Role enforcement.
- Privilege escalation.
- Input sanitization.
- Injection risks.
- Cross-site scripting.
- Cross-site request forgery.
- Server-side request forgery.
- Sensitive information exposure.
- Secret handling.
- Logging safety.
- Tenant isolation.
- Abuse scenarios.
- Rate-limiting needs.
- Auditability.
- Data minimization.
- Privacy implications.
- Security testing.
- Incident-response implications.

PERFORMANCE AND SPEED

- User-perceived latency.
- Rendering behavior.
- Network round trips.
- Payload size.
- Query count.
- Query complexity.
- Index requirements.
- Memory usage.
- CPU usage.
- Caching.
- Cache invalidation.
- Batch processing.
- Concurrency.
- Scalability.
- Performance budgets.
- Load assumptions.
- Hot paths.
- Bottlenecks.
- Performance regression risks.
- Measurement strategy.

RELIABILITY AND OPERATIONS

- Failure modes.
- Retry behavior.
- Circuit breaking.
- Graceful degradation.
- Recovery.
- Availability expectations.
- Logging.
- Metrics.
- Tracing.
- Dashboards.
- Alerts.
- Runbooks.
- Support implications.
- Deployment sequencing.
- Feature flags.
- Staged rollout.
- Rollback triggers.
- Rollback procedures.
- Post-release verification.

BLAST RADIUS

Analyze both direct and transitive impact across:

- Users.
- User roles.
- Screens.
- Components.
- Routes.
- APIs.
- Services.
- Shared libraries.
- Database tables.
- Migrations.
- Background jobs.
- Integrations.
- Network traffic.
- Caches.
- Authentication.
- Authorization.
- Tests.
- Analytics.
- Monitoring.
- Documentation.
- Deployment.
- Existing features.
- Backward compatibility.
- Other active development work.

Classify each impact as:

- Required change
- Probable change
- Possible change
- Verification only
- Explicitly unaffected

======================================================================
9. CREATE THE PLANNING PACKAGE
======================================================================

At minimum, create the following documents inside the new plan directory:

00_AGENT_COORDINATION.md
01_EXECUTIVE_SUMMARY.md
02_FEATURE_BRIEF_AND_SCOPE.md
03_SOURCE_AND_CODEBASE_AUDIT.md
04_REQUIREMENTS_SPECIFICATION.md
05_UX_UI_ACCESSIBILITY_PLAN.md
06_ARCHITECTURE_AND_TECHNICAL_DESIGN.md
07_DATA_DATABASE_API_NETWORK_PLAN.md
08_SECURITY_PRIVACY_THREAT_MODEL.md
09_PERFORMANCE_RELIABILITY_OBSERVABILITY.md
10_BLAST_RADIUS_AND_DEPENDENCIES.md
11_IMPLEMENTATION_PLAN.md
12_TEST_AND_VALIDATION_STRATEGY.md
13_ROLLOUT_ROLLBACK_AND_OPERATIONS.md
14_RISK_REGISTER.md
15_DECISIONS_ASSUMPTIONS_AND_ALTERNATIVES.md
16_REQUIREMENTS_TRACEABILITY_MATRIX.md
17_FINAL_READINESS_REVIEW.md
README.md

Create additional focused documents when doing so improves implementation readiness.

Do not create redundant documents merely to increase document count.

Every document must:

- Have a clear purpose.
- Reference relevant source documents.
- Reference exact code paths and symbols.
- Distinguish evidence from inference.
- Identify assumptions.
- Identify unresolved decisions.
- Avoid vague statements.
- Avoid unsupported claims.
- Remain consistent with the other documents.

Use Mermaid diagrams when they materially improve understanding of:

- Current architecture.
- Target architecture.
- Data flow.
- Request flow.
- State transitions.
- Deployment flow.
- Migration sequence.
- Failure recovery.

======================================================================
10. REQUIREMENTS SPECIFICATION
======================================================================

Assign a stable identifier to every requirement.

Use categories such as:

- FR: Functional requirement
- UX: User-experience requirement
- A11Y: Accessibility requirement
- ARCH: Architecture requirement
- DATA: Data requirement
- API: API or network requirement
- SEC: Security requirement
- PERF: Performance requirement
- REL: Reliability requirement
- OPS: Operational requirement
- TEST: Testing requirement
- DOC: Documentation requirement

Every requirement must include:

- Identifier.
- Requirement statement.
- Rationale.
- Source.
- Priority.
- Dependencies.
- Acceptance criteria.
- Validation method.
- Affected code areas.
- Risks.
- Status.

Acceptance criteria must be objective and testable.

Avoid ambiguous criteria such as:

- “Works correctly.”
- “Performs well.”
- “Is secure.”
- “Provides a good experience.”
- “Handles edge cases.”

Replace them with observable, measurable behavior.

======================================================================
11. CANONICAL IMPLEMENTATION PLAN
======================================================================

`11_IMPLEMENTATION_PLAN.md` must be the authoritative execution guide for the future implementation AI.

Organize it into safe, dependency-aware phases.

For every phase include:

- Phase objective.
- Requirements addressed.
- Prerequisites.
- Dependencies.
- Work packages.
- Parallelizable tasks.
- Sequential tasks.
- Exact affected paths.
- Relevant symbols.
- New files likely required.
- Existing files likely modified.
- Interfaces and contracts.
- Data implications.
- Security implications.
- Performance implications.
- Validation commands.
- Tests required.
- Acceptance criteria.
- Exit criteria.
- Rollback considerations.
- Risks.
- Documentation updates.

For every individual implementation task include:

- Task ID.
- Requirement IDs.
- Precise implementation objective.
- Why the task is required.
- Likely file paths.
- Likely symbols or modules.
- Inputs and dependencies.
- Detailed implementation instructions.
- Expected output.
- Failure cases.
- Tests to add or update.
- Validation procedure.
- Completion evidence.
- Parallelization classification.
- Estimated complexity: Small, Medium, Large, or Extra Large.

Do not write vague tasks such as:

- “Update the backend.”
- “Create the UI.”
- “Add tests.”
- “Improve performance.”
- “Handle security.”

Specify exactly what behavior, contract, module, state, and validation are involved.

======================================================================
12. REQUIREMENTS TRACEABILITY
======================================================================

`16_REQUIREMENTS_TRACEABILITY_MATRIX.md` must map every requirement through the complete implementation lifecycle.

Use a matrix containing:

| Requirement ID | Source | User Outcome | Implementation Phase | Task IDs | Code Areas | Acceptance Criteria | Test Coverage | Rollout Check | Status |
|---|---|---|---|---|---|---|---|---|---|

No requirement may remain untraced.

Every implementation task must map back to at least one requirement.

Every requirement must map to:

- Source evidence.
- Implementation task.
- Acceptance criterion.
- Validation method.
- Test coverage.
- Rollout or operational verification when applicable.

======================================================================
13. RISK, DECISIONS, AND ALTERNATIVES
======================================================================

The risk register must include:

- Risk ID.
- Description.
- Trigger.
- Probability.
- Impact.
- Severity.
- Affected areas.
- Detection method.
- Prevention.
- Mitigation.
- Contingency.
- Owner or responsible role.
- Residual risk.
- Status.

Analyze technical and non-technical risks.

For every major architectural decision include:

- Problem.
- Constraints.
- Options considered.
- Advantages.
- Disadvantages.
- Security implications.
- Performance implications.
- Operational implications.
- Recommended option.
- Reason for recommendation.
- Consequences.
- Conditions that would change the decision.

Do not select an approach without evaluating credible alternatives.

======================================================================
14. AUTONOMOUS REVIEW AND IMPROVEMENT LOOP
======================================================================

Do not stop after producing the first draft.

Run an autonomous iterative loop:

1. Inventory the repository and source documents.
2. Dispatch parallel specialist analyses.
3. Synthesize the first planning package.
4. Run cross-document consistency checks.
5. Run adversarial review.
6. Run requirements traceability review.
7. Run architecture and blast-radius review.
8. Run UX and accessibility review.
9. Run security and privacy review.
10. Run performance and reliability review.
11. Run implementation-readiness review.
12. Identify gaps, contradictions, vague tasks, and unsupported assumptions.
13. Revise the planning package.
14. Re-run all affected reviews.
15. Repeat until every internally resolvable completion gate passes.

Perform at least two complete critique-and-revision cycles after the initial draft.

Continue iterating while any of these remain:

- Missing requirement.
- Untraced requirement.
- Vague implementation task.
- Missing affected file or module.
- Unclear user state.
- Missing error state.
- Missing accessibility behavior.
- Unspecified API behavior.
- Unspecified database behavior.
- Unspecified migration or rollback behavior.
- Missing security control.
- Missing performance consideration.
- Missing failure mode.
- Unowned dependency.
- Cross-document contradiction.
- Unsupported assumption.
- Untestable acceptance criterion.
- Missing test coverage.
- Missing rollout or rollback procedure.
- Unmitigated critical risk.
- Unresolved implementation-order dependency.
- Placeholder such as `TODO`, `TBD`, or “determine later” without an owner, options, recommendation, and blocking impact.

Do not invent external business decisions merely to obtain a perfect score.

When a genuinely external decision is required:

- Document the decision precisely.
- Identify why codebase evidence cannot resolve it.
- Provide viable options.
- Recommend one option.
- Explain the effect of each option.
- Provide conditional implementation paths.
- Continue completing every non-blocked portion of the plan.

======================================================================
15. READINESS SCORING
======================================================================

Score the final planning package from 1–100 in each category:

- Product strategy
- Scope clarity
- Requirements completeness
- UX and UI readiness
- Accessibility readiness
- Architecture readiness
- Data and database readiness
- API and network readiness
- Security and privacy readiness
- Performance and scalability readiness
- Reliability and operational readiness
- Blast-radius coverage
- Testing and validation readiness
- Rollout and rollback readiness
- Requirements traceability
- Overall implementation readiness

A score of 100 is permitted only when:

- Every relevant source has been reviewed.
- Every requirement is explicit and traceable.
- Every requirement has objective acceptance criteria.
- Relevant code paths and symbols are identified.
- Direct and transitive blast radius is documented.
- UX states and accessibility behavior are defined.
- Architecture and contracts are explicit.
- Data and migration implications are complete.
- API and network behavior is complete.
- Security threats and controls are documented.
- Performance expectations and measurement methods are defined.
- Failure modes and recovery behavior are defined.
- Testing covers functional and non-functional requirements.
- Rollout, observability, and rollback are defined.
- No unresolved critical contradiction remains.
- No critical risk lacks mitigation.
- No implementation phase has an unresolved dependency.
- The independent verifier approves the planning package.

Do not inflate scores.

For every score below 100, identify:

- Exact deficiency.
- Affected document.
- Required corrective action.
- Whether it is internally resolvable or externally blocked.

Continue the autonomous improvement loop until all internally resolvable deficiencies are corrected.

======================================================================
16. FINAL INDEPENDENT VERIFICATION
======================================================================

The final verifier must not be the primary author of the plan.

The verifier must independently compare:

- The original FEATURE BRIEF.
- Repository evidence.
- Relevant source documents.
- Requirements specification.
- Architecture plan.
- UX and UI plan.
- Security plan.
- Performance plan.
- Blast-radius analysis.
- Implementation phases.
- Test strategy.
- Rollout and rollback plan.
- Requirements traceability matrix.

The verifier must actively search for:

- Missing requirements.
- Hallucinated requirements.
- Contradictions.
- Unjustified architecture.
- Missing affected code.
- Unrecognized downstream impact.
- Unhandled edge cases.
- Security gaps.
- Performance gaps.
- Operational gaps.
- Vague implementation instructions.
- Untestable acceptance criteria.
- Unsupported readiness scores.

Record the verifier’s findings and final determination in:

17_FINAL_READINESS_REVIEW.md

======================================================================
17. COMPLETION GATES
======================================================================

The planning task is complete only when:

- The dated feature-plan folder has been created.
- All relevant repository instructions and skills have been inspected.
- Required specialist workstreams have completed.
- The full relevant codebase has been systematically analyzed.
- Relevant documents have been traced.
- Current and target behavior are clearly defined.
- All requirements have stable identifiers.
- Every requirement is traceable.
- UX, UI, and accessibility states are defined.
- Architecture and integration boundaries are defined.
- Data, database, API, and network behavior are defined.
- Security and privacy risks are addressed.
- Performance and reliability requirements are defined.
- Direct and transitive blast radius is documented.
- Implementation phases are dependency-aware.
- Implementation tasks identify exact likely code areas.
- Acceptance criteria are objective and testable.
- Testing covers every applicable requirement.
- Rollout, monitoring, rollback, and recovery are defined.
- Risks and decisions are documented.
- At least two full critique-and-revision cycles have occurred.
- Independent final verification has occurred.
- No internally resolvable critical gap remains.
- No files outside the new planning folder were intentionally modified.

The target is 100% implementation readiness and zero known planning defects.

Do not claim zero errors or 100% readiness unless the evidence and independent review support that conclusion.

======================================================================
18. FINAL RESPONSE
======================================================================

At completion, report:

- Exact plan-folder path.
- Derived feature name.
- Master `/goal`.
- Agents and workstreams used.
- Whether agents were native or simulated.
- Skills and repository instructions used.
- Codebase areas analyzed.
- Source documents traced.
- Planning documents created.
- Major architectural findings.
- Major UX and UI findings.
- Major security findings.
- Major performance findings.
- Blast-radius summary.
- Critical decisions.
- Remaining external decisions.
- Initial readiness scores.
- Final readiness scores.
- Number of review-and-revision cycles.
- Independent verifier result.
- Confirmation that no application code was intentionally modified.
- Exact reasons for every remaining score below 100.

Do not provide only a chat summary. The complete planning package must be written to the required dated folder.

--- END FEATURE-PLANNING DIRECTIVE ---