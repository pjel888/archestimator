You are the lead implementation planner responsible for converting all documents in:

<PLANNING_FOLDER>

into one authoritative, detailed, and executable implementation plan for a codebase AI.

This is a planning task only. Do not implement features, modify application code, create migrations, alter infrastructure, or change production configuration.

PRIMARY OBJECTIVE

Create a canonical implementation plan that another codebase AI can execute without needing to reinterpret the original feature intent.

The plan must be:

- Traceable to the source documents
- Specific enough for implementation
- Organized into safe execution phases
- Explicit about file, module, service, database, and interface impacts
- Testable
- Security-conscious
- Performance-conscious
- Safe to roll out and reverse
- Clear about parallelizable and sequential work
- Honest about assumptions and unresolved decisions

The target is complete implementation with minimal ambiguity and no avoidable errors. Do not promise zero errors without evidence. Instead, design verification gates capable of detecting errors before completion.

MANDATORY PARALLEL ORCHESTRATION

Use multiple concurrent planning agents.

When supported, launch:

- One lead coordinator
- At least six specialist agents
- One independent adversarial reviewer
- One final plan verifier

Every agent must receive a dedicated `/goal`, defined scope, expected output, dependencies, and completion criteria.

Required specialist workstreams should cover:

- Source-document and requirements analysis
- Codebase architecture and integration analysis
- UX, UI, accessibility, and user-state planning
- Backend, APIs, services, and network interactions
- Database, data integrity, migration, and rollback planning
- Security, privacy, authentication, and authorization
- Performance, scalability, caching, and reliability
- Testing and quality assurance
- Deployment, observability, rollout, and operations
- Blast radius and backward compatibility

All agents must communicate through a shared coordination ledger. Direct inter-agent communication should be enabled when available.

The ledger must contain:

- Agent `/goal`
- Assigned scope
- Findings
- Proposed decisions
- Dependencies
- Conflicts
- Open questions
- Source references
- Deliverable status

Do not allow separate agents to produce incompatible plans without reconciliation. The lead coordinator must synthesize one coherent implementation strategy.

If native subagents are unavailable, execute the same workstreams separately and preserve independent review.

SOURCE AUDIT

Read every relevant document completely before creating the final plan.

Create a source map that identifies:

- Every reviewed document
- Its purpose
- Its authority
- Relevant requirements
- Conflicts with other documents
- Missing information
- Assumptions required for planning
- Decisions still needing confirmation

Reference source material using exact file paths and section headings. Use line references only when stable.

Do not invent requirements. Clearly label every inference or assumption.

CODEBASE ANALYSIS

Inspect the existing codebase deeply enough to create an implementation-specific plan.

Identify:

- Existing architecture and conventions
- Relevant packages, modules, routes, services, components, and schemas
- Current data flow
- Similar existing features that should be reused
- Shared utilities and abstractions
- Integration boundaries
- Existing tests
- Existing technical debt affecting the feature
- Files likely to be added, modified, moved, or removed
- Compatibility constraints
- Concurrent work that may overlap with the implementation

Do not modify any code during this analysis.

CANONICAL IMPLEMENTATION PLAN

Create a single authoritative implementation plan, preferably named:

<PLANNING_FOLDER>/IMPLEMENTATION_PLAN.md

The plan must include the following sections.

1. Executive Summary
   - Feature objective
   - User value
   - Technical approach
   - Expected outcome

2. Source References
   - Documents reviewed
   - Requirement-to-source mapping
   - Conflicts and resolutions
   - Assumptions

3. Scope
   - In scope
   - Out of scope
   - Non-goals
   - Deferred work

4. Current-State Analysis
   - Existing behavior
   - Existing architecture
   - Relevant code paths
   - Current limitations

5. Target-State Design
   - Target user experience
   - Target system behavior
   - Architecture and component boundaries
   - Data and request flow
   - External integrations

6. User Experience and Interface Plan
   - User journeys
   - Roles and permissions
   - Screen and component behavior
   - Loading, empty, success, error, and degraded states
   - Responsive requirements
   - Accessibility requirements
   - UX acceptance criteria

7. Technical Architecture
   - Components and services
   - Interfaces and contracts
   - API behavior
   - Events and asynchronous processing
   - Concurrency and idempotency
   - Failure handling
   - Dependency boundaries

8. Data and Database Plan
   - Schema changes
   - Data ownership
   - Validation rules
   - Indexing
   - Migration sequencing
   - Backfill
   - Compatibility
   - Rollback and recovery
   - Data integrity verification

9. Security and Privacy
   - Authentication
   - Authorization
   - Input validation
   - Sensitive data
   - Threat model
   - Abuse cases
   - Auditability
   - Security acceptance criteria

10. Performance and Reliability
    - Performance budgets
    - Expected load
    - Query and request behavior
    - Caching
    - Rate limiting
    - Timeouts and retries
    - Availability expectations
    - Resource constraints
    - Degraded-mode behavior

11. Blast-Radius Analysis
    - Affected users
    - Affected modules and services
    - Database impact
    - Network impact
    - Third-party impact
    - Backward-compatibility risk
    - Operational risk

12. Phased Implementation

For every phase include:

- Objective
- Requirements addressed
- Inputs
- Exact work packages
- Likely files and modules affected
- Dependencies
- Parallelizable work
- Sequential work
- Expected outputs
- Validation commands
- Tests
- Exit criteria
- Risks
- Rollback considerations

13. File-Level Change Map
    - Existing files expected to change
    - New files expected
    - Responsibility of each file
    - Dependency relationships
    - Potential edit conflicts

14. Testing Strategy
    - Unit tests
    - Integration tests
    - Contract tests
    - End-to-end tests
    - Accessibility tests
    - Security tests
    - Migration tests
    - Performance tests
    - Regression tests
    - Manual verification
    - Failure-injection tests when relevant

15. Deployment and Rollout
    - Release sequence
    - Feature flags
    - Staged rollout
    - Monitoring
    - Alerting
    - Rollback triggers
    - Rollback procedure
    - Post-release validation

16. Observability and Operations
    - Logging
    - Metrics
    - Traces
    - Dashboards
    - Alerts
    - Runbooks
    - Support procedures

17. Risk Register
    - Risk
    - Probability
    - Impact
    - Severity
    - Mitigation
    - Owner
    - Detection method
    - Contingency

18. Pros and Cons
    - Benefits and costs of the recommended approach
    - Alternatives considered
    - Reasons alternatives were rejected

19. SWOT Analysis
    - Strengths
    - Weaknesses
    - Opportunities
    - Threats

20. Requirements Traceability Matrix
    - Requirement
    - Source
    - Implementation phase
    - Work package
    - Acceptance criterion
    - Test coverage
    - Status

21. Definition of Done
    - Functional completion
    - Technical completion
    - UX completion
    - Security completion
    - Performance completion
    - Testing completion
    - Operational completion
    - Documentation completion

22. Open Decisions
    - Decision required
    - Available options
    - Recommendation
    - Consequence of delaying the decision
    - Responsible owner

QUALITY REVIEW

Run at least three review passes:

1. Completeness and traceability review
2. Adversarial technical and operational review
3. Independent implementation-readiness verification

Score the finished implementation plan from 1–100 for:

- Strategic alignment
- Requirements coverage
- Technical specificity
- Implementation sequencing
- Risk management
- Testability
- Operational readiness
- Overall implementation readiness

A score of 100 requires:

- Complete source traceability
- No unresolved critical contradiction
- Objective acceptance criteria
- Complete implementation phases
- Explicit dependencies
- Complete test coverage planning
- Security, performance, migration, rollout, and rollback coverage
- No critical unowned risk
- Independent verifier approval

FINAL RESPONSE

Report:

- Agents and workstreams used
- Documents analyzed
- Codebase areas inspected
- Implementation plan created
- Important architectural decisions
- Major risks
- Open decisions
- Final readiness score
- Exact reasons for any score below 100