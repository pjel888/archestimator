# ArchEstimator Beta Quality-System Migration — Codex Execution Prompt

## Execute this task; do not merely advise

You are the lead staff engineer, test architect, QA lead, application-security reviewer, and CI/CD owner for the repository `pjel888/archestimator`.

Your job is to convert ArchEstimator from its current alpha/pre-beta, opt-in-testing posture into a **beta-grade, fail-closed, evidence-driven engineering system** in which agent-generated production code cannot be considered complete or mergeable unless it has passed the applicable automated quality gauntlet.

This is not a request for a plan or a policy memo only. **Make the repository changes, install the required compatible development dependencies, create and repair tests, configure the quality tooling, wire the CI gates, update all agent instructions and adapters, run the applicable checks, and report exact evidence.** A documentation-only implementation is a failure.

No process can prove that software has zero defects. The required operational standard is:

> No behavior change is accepted without independent executable evidence; no red, skipped, flaky, weakened, or materially untested critical behavior is allowed to pass the gate; and no agent may claim completion when a required gate was not run or did not pass.

---

## 1. Explicit authorization and safety boundaries

This prompt is an explicit user authorization for the current task to:

- create, expand, repair, refactor, and run automated tests;
- run local builds as test gates;
- run browser automation, Playwright, screenshots, visual checks, Storybook, accessibility checks, mutation testing, fuzz/property tests, coverage tools, static analysis, dependency/security checks, local database migrations, and local Cloudflare/Miniflare tests;
- add or update **development-only** dependencies required for these gates and update the Bun lockfile;
- edit `AGENTS.md`, scoped `AGENTS.md` files, `.ai/**`, `.codex/**`, `.cursor/**`, `.commandcode/**`, GitHub workflow/configuration files, test/config files, scripts, source files needed for testability, and quality documentation;
- create GitHub Actions workflows and repository-side ruleset documentation or machine-readable settings manifests;
- use native subagents, emulated specialist passes, or sequential specialist passes under the existing one-writer-per-file and shared-worktree rules.

The authorization above is also a request to change the durable repository policy so that future agents have **standing authorization** to run the risk-appropriate local and CI quality gates for code changes without waiting for a new per-task `TEST_TASK` request.

Do **not**:

- commit, push, merge, create/switch/delete branches or worktrees, deploy, alter live Cloudflare data/resources, expose secrets, purchase services, or mutate production;
- run tests against production data or production endpoints;
- change remote GitHub rulesets, branch protection, repository secrets, or security settings until the corresponding checks exist on the default branch and have emitted stable check names at least once;
- claim that a remote rule, hosted check, deployment, or production behavior was verified unless it was actually read back from the authoritative remote system;
- overwrite, reset, clean, stash, revert, or delete unfamiliar concurrent work.

If authenticated GitHub administration is unavailable or the required checks are not yet registered, create an exact enforcement guide or ready-to-apply manifest and report `EXTERNAL_ENFORCEMENT_PENDING`; do not create a broken ruleset that deadlocks the repository.

---

## 2. Current repository facts that must be verified locally

Do not trust this list blindly; verify it against the current checkout before editing.

The repository currently appears to have:

- a root `AGENTS.md` that identifies the product as alpha/pre-beta and says automated product testing is user-controlled;
- `.ai/00_system/VALIDATION_MATRIX.md`, `.ai/00_system/AGENT_OPERATING_PROTOCOL.md`, `CODEX.md`, `.codex/config.toml`, agent payloads, and Cursor/CommandCode adapters that repeat or enforce the opt-in testing restriction;
- `scripts/validate-ai-workflow-adapters.mjs` that requires the legacy `NOT_REQUIRED|TEST_PROPOSAL|TEST_TASK` taxonomy and rejects language resembling mandatory testing;
- Bun unit tests, Vitest + Testing Library DOM/component tests, Playwright E2E tests, Storybook with an accessibility addon, TypeScript, ESLint, Cloudflare/OpenNext scripts, D1/R2/Durable Object/Queue/Cron proof scripts, observability checks, and performance checks;
- a `validate` script that does not yet make coverage, mutation testing, Gherkin acceptance tests, Cloudflare-runtime integration tests, Storybook accessibility, Playwright smoke, dependency/security scanning, or a release gate universally enforceable;
- a Vitest configuration dedicated to `jsdom`, which should not be overloaded with the Cloudflare Workers runtime pool;
- a Playwright configuration with Chromium by default and an optional multi-browser/mobile matrix;
- GitNexus instructions requiring impact analysis before symbol edits and `detect_changes()` before commit-related completion claims;
- recent auth/cache behavior that may include a root landing-page `Cache-Control` `no-transform` special case. If that behavior is present, add a regression test proving the root behavior, other marketing-route behavior, and sensitive-route cache behavior remain distinct.

Inventory the actual test counts, run times, current failures, coverage, critical paths, workflows, branch/ruleset state when readable, and all policy adapters before choosing the final implementation.

---

## 3. Non-negotiable engineering principles

Encode these principles in the canonical agent contract and enforce them in scripts/CI where practical.

1. **Tests are part of implementation.** Production behavior without the required test evidence is incomplete.
2. **Bug fixes begin with a failing reproduction.** Record red-before-green evidence whenever feasible.
3. **Acceptance criteria precede implementation.** For user-visible or business behavior, derive executable examples before or independently from the implementation.
4. **Tests must be capable of failing.** Coverage alone is insufficient; mutation testing, negative cases, and independent review assess test strength.
5. **No metric gaming.** Never lower a threshold, narrow a glob, add an exclusion, weaken/delete an assertion, update a snapshot blindly, add retries, increase timeouts, mock the system under test, catch an expected failure, or skip a test merely to get green.
6. **No hidden red.** A retry that passes after a failure is flaky, not green. Required flaky tests fail the aggregate gate.
7. **No silent skips.** `test.skip`, `describe.skip`, `.only`, Cucumber `@wip`/`@skip`, quarantined critical tests, focused tests, and expired waivers fail CI.
8. **Critical negative behavior is first-class.** Authorization denial, cross-tenant access, invalid input, retries, duplicate events, corruption, partial failure, timeout, cancellation, and recovery must be tested where relevant.
9. **Test at the correct boundary.** Use fast unit tests for pure logic, runtime/integration tests for boundaries, and a small number of decisive E2E tests for complete journeys.
10. **Mock only true external boundaries.** Prefer real local D1/R2/Durable Object/Queue behavior and contract-faithful fakes over mocking internal implementation details.
11. **Determinism is mandatory.** Control time, randomness, IDs, locale, timezone, network, and test data. Tests cannot depend on execution order or production services.
12. **Quality gates fail closed.** Missing tools, missing reports, missing credentials for a required release proof, malformed artifacts, and unknown risk classification do not become a pass.
13. **Legacy debt may be ratcheted; new debt may not be introduced.** Do not make the migration impossible by demanding instant perfect coverage of every old file, but apply strict changed-code and critical-path gates immediately.
14. **Averages cannot hide critical failure.** A high aggregate score never offsets an auth bypass, data-integrity defect, surviving critical mutant, serious accessibility issue, or high-severity security finding.
15. **Evidence, not agent confidence, determines completion.** Agent prose is never a substitute for command output and machine-readable reports.

---

## 4. Required final architecture

Implement a coherent system with one canonical source of truth and concise adapters.

### 4.1 Canonical policy

Create or consolidate a canonical beta quality protocol under `.ai/00_system/`, for example:

- `.ai/00_system/BETA_QUALITY_ENGINEERING_PROTOCOL.md`
- `.ai/00_system/VALIDATION_MATRIX.md`

Keep `AGENTS.md` concise and authoritative. It must state the beta posture, standing test authorization, mandatory quality profiles, no-gaming rules, completion requirements, and pointers to detailed protocols.

Do not bloat the root instruction chain. Codex loads root and nested `AGENTS.md` files with nearer files overriding earlier ones, and the combined project-instruction size is bounded. Keep the root contract well below the configured instruction limit; put detailed mechanics in canonical `.ai/00_system` documents and add scoped `AGENTS.md` files only where path-specific rules materially help.

Recommended scoped contracts, only after verifying the paths:

- `tests/AGENTS.md`: test integrity, fixtures, no skips, assertion quality, runner ownership;
- `migrations/AGENTS.md`: migration, data-integrity, restore, and local-only verification rules;
- a scoped auth/security `AGENTS.md` only if there is a stable directory that owns those boundaries.

### 4.2 Replace the legacy test-decision taxonomy

Remove the durable `NOT_REQUIRED|TEST_PROPOSAL|TEST_TASK` model and replace it everywhere with this fail-closed profile model:

#### `Q0_CONTRACT_ONLY`

Use only when the diff changes no executable behavior: prose, comments, diagrams, or agent/prompt contracts. Agent instructions, workflows, thresholds, risk maps, and validation scripts are **not** low risk merely because they are text; quality-system changes must be escalated to `Q2_CRITICAL_CHANGE_GATE`.

Required evidence:

- agent/prompt/contract validators;
- schema and link/path checks relevant to the changed docs;
- `git diff --check`;
- contradiction and legacy-policy scan;
- proof that no executable or generated behavior changed.

#### `Q1_CHANGE_GATE`

Default for every production-code, test-code, configuration, or build behavior change that is not classified critical.

Required evidence, selected by the changed surface but not optional:

- type checking and lint/static checks;
- focused unit tests for changed logic and regression tests for defects;
- relevant component, route, contract, integration, or property tests;
- diff coverage gate;
- build or dry-run when compilation/bundling/configuration is affected;
- Gherkin acceptance scenarios for changed user-visible/business rules;
- Playwright or browser proof when behavior crosses a browser-visible boundary;
- accessibility proof for UI behavior;
- no skips, flakes, threshold reductions, or unauthorized exclusions.

#### `Q2_CRITICAL_CHANGE_GATE`

Automatically selected when any changed path or affected execution flow touches, or might touch:

- authentication, authorization, sessions, cookies, tokens, redirects, cache/privacy headers, or cross-tenant boundaries;
- D1 schema, migrations, queries, transactions, persisted data, recovery, deletion, import/export, or estimate calculations;
- uploads, file parsing, R2, image processing, downloads, public shares, or client portals;
- Durable Objects, collaboration/presence, concurrency, Queues, Cron, retries, idempotency, email, or external side effects;
- secrets, security controls, dependency/workflow security, logging/redaction, or observability/alerts;
- Cloudflare bindings, `wrangler.jsonc`, OpenNext runtime behavior, deployment configuration, or provider integration;
- the quality gate itself: `AGENTS.md`, `.ai/00_system`, `.codex`, quality scripts, thresholds, risk maps, test configuration, or GitHub workflows;
- broad shared libraries or a GitNexus impact result of HIGH/CRITICAL;
- any classification uncertainty.

Required evidence includes all applicable `Q1` evidence plus:

- full relevant suite, not just a single focused test;
- denial/abuse/boundary/failure/recovery tests;
- Cloudflare Workers-runtime integration tests when provider/runtime behavior is involved;
- changed/critical-module mutation testing;
- 100% critical changed-code branch coverage;
- security verification mapped to relevant OWASP ASVS controls;
- data migration from clean and prior fixtures plus restore/fix-forward rehearsal when data changes;
- concurrency/idempotency/fault-injection tests where applicable;
- cross-browser/device tests for affected critical journeys;
- independent read-only quality review; security review when security boundaries are involved;
- zero unresolved high/critical findings and zero surviving high-risk mutants.

#### `Q3_RELEASE_GATE`

Required for a release candidate, a production release decision, or a main-branch release workflow.

Required evidence:

- all `Q2` requirements across the release scope;
- full unit/component/integration/BDD/a11y/E2E suites;
- full supported browser/device matrix;
- full or policy-defined comprehensive mutation campaign;
- performance and resource budgets;
- dependency and supply-chain checks, SBOM/provenance when supported;
- migration/restore rehearsal;
- observability/alert readiness;
- hosted smoke or provider readback only when explicitly authorized and necessary for the release claim;
- a signed-off release evidence manifest with no expired waiver and no S0/S1 defect.

A profile may be escalated automatically. It may never be downgraded by an agent merely to save time.

### 4.3 Automatic risk classification

Create a machine-readable risk map and a deterministic classifier, for example:

- `quality/risk-map.yml` or `.json`;
- `scripts/quality/classify-change.*`.

The classifier must use the merge base/default branch diff, path rules, and, when available, GitNexus impact information. It must output the selected profile and reasons. Unknown paths or errors escalate to `Q2`.

At minimum:

- true prose-only changes may be `Q0`;
- any executable application change is at least `Q1`;
- all critical paths above are `Q2`;
- release workflows explicitly select `Q3`;
- changes to the classifier, thresholds, exclusions, workflows, agent contracts, or gate scripts are `Q2`.

User labels or agent flags may escalate a profile but may not lower it.

---

## 5. Agentic development lifecycle

Update the agent framework and multi-agent directive so that quality is built into the lifecycle rather than appended at the end.

Use:

`DISCOVER -> SPECIFY -> RED -> IMPLEMENT -> VERIFY -> MUTATE/ADVERSARIAL -> REVIEW -> FINISH`

For nontrivial work:

1. **Lead/integrator**
   - establishes the objective, risk profile, affected flows, acceptance criteria, invariants, evidence requirements, and stop condition;
   - owns integration and the final evidence claim;
   - cannot override a failed mandatory gate.

2. **Specification/acceptance pass**
   - derives Gherkin or structured acceptance criteria from user-visible behavior and current product contracts before reviewing the final implementation;
   - includes happy, denial, boundary, failure, and recovery examples;
   - does not mirror implementation details.

3. **Implementer**
   - owns production-code files;
   - may not weaken or delete tests to make implementation pass;
   - refactors for testability only through coherent production design, not test-only branches.

4. **Quality engineer**
   - owns or reviews test files, fixtures, coverage, property tests, and mutation configuration;
   - checks that the test fails before the fix for bugs or that an equivalent mutation proves the assertion is meaningful;
   - reviews surviving mutants and coverage gaps.

5. **Security reviewer**
   - mandatory for security/auth/data-boundary changes;
   - read-only against the reviewed surface;
   - checks abuse cases, ASVS mapping, workflow/dependency security, and redaction.

6. **Release gatekeeper**
   - read-only;
   - receives the original requirements, risk classification, diff, test inventory, reports, and known gaps;
   - reports `PASS|FAIL|QUALITY_BLOCKED`;
   - never edits the surface it is approving.

Use the fewest actual agents that preserve these separations. Standard changes may use a lead plus independent quality pass. Critical changes require independent quality review and, when applicable, security review. If native subagents are unavailable, perform clearly separated sequential passes and never call a self-review “independent.”

Preserve one writer per file and the existing shared-worktree safety rules.

Every handoff must include:

- assignment and profile;
- requirements/acceptance IDs addressed;
- files read and changed;
- tests added/changed and why;
- exact commands and results;
- coverage and mutation metrics;
- security/a11y/performance findings;
- skipped or unavailable evidence;
- remaining risk and confidence;
- no completion claim for the parent task.

---

## 6. Test architecture to implement

Use the existing stack; do not add Jest, Cypress, or another redundant primary framework.

### 6.1 Pure unit tests

Use Bun test and/or Vitest according to current ownership and mutation compatibility.

Required characteristics:

- fast, isolated, deterministic;
- table-driven boundary cases;
- no network or production bindings;
- clear Arrange/Act/Assert or equivalent structure;
- explicit tests for calculations, parsers, validation, serialization, state transitions, permissions, and error mapping;
- regression test for every bug.

Keep one canonical test runner per module where possible rather than duplicating identical cases across Bun and Vitest.

### 6.2 Component and DOM integration tests

Use the existing Vitest + Testing Library setup for React behavior.

Test observable behavior, keyboard/focus behavior, accessibility names/roles, loading/error/empty states, permission states, and interactions. Avoid testing internal state or implementation details. Snapshot-only tests are insufficient.

Split or tune the current serial/heavy suite without weakening assertions. Track slow tests and keep deterministic timeouts; do not solve slowness by arbitrary timeout inflation.

### 6.3 Cloudflare Workers-runtime tests

Create a separate Workers Vitest configuration using the current `wrangler.jsonc` and the Cloudflare Vitest pool. Do not combine it with the `jsdom` configuration.

Cover applicable bindings and handlers locally:

- D1;
- R2;
- Durable Objects;
- Queue consumers;
- scheduled/Cron handlers;
- Email and Images adapters where locally testable;
- Worker runtime APIs, request/response behavior, and OpenNext boundaries.

Use isolated local storage and synthetic fixtures. Never hit production. Use Istanbul coverage for the Workers pool if native V8 coverage is unsupported. Await all storage operations and consume response bodies. Add explicit tests for Durable Object concurrency, alarms/state, Queue retry/idempotency, and local migration behavior when those surfaces exist.

### 6.4 API and contract tests

For route handlers, server actions, RPCs, and external adapters, test:

- request/response status and schema;
- authorization and tenant isolation;
- invalid/malformed payloads;
- idempotency and duplicate requests;
- timeout/cancellation/error translation;
- cache and privacy headers;
- backward compatibility for persisted or externally consumed contracts that beta users already depend on;
- no sensitive data in errors or logs.

Use real local service boundaries where practical and contract-faithful fakes for external services.

### 6.5 Executable Gherkin acceptance tests

Add Cucumber/Gherkin using `@cucumber/cucumber` or a demonstrably compatible maintained equivalent.

Structure:

- one `Feature` per capability;
- `Rule` sections for business rules;
- concise scenarios, normally 3–5 observable Given/When/Then steps;
- domain language, not selectors or implementation details;
- reusable thin step definitions;
- tags such as `@smoke`, `@regression`, `@critical`, `@auth`, `@data`, `@ui`, `@api`, `@readonly`;
- stable requirement tags such as `@REQ-AUTH-001` for critical traceability;
- JSON/JUnit and HTML reports in CI.

Use different drivers behind the same domain language when appropriate:

- direct domain/service driver for business rules;
- API/route driver for contracts;
- Playwright driver for end-to-end UI journeys.

Do not turn every unit edge case into Gherkin. Gherkin covers business rules and acceptance journeys.

Seed executable features for the highest-risk capabilities actually present in the repository. Verify existence before writing them. Candidate capabilities include:

- sign-in/session/authorization and sensitive-route behavior;
- estimate/project create, calculate, save, reload, and history;
- upload validation, processing, failure, retry, and finalization;
- collaboration invitation, role enforcement, revocation, and cross-tenant denial;
- export/download integrity and authorization;
- public share/client-portal access and privacy;
- Queue/Cron idempotency and recovery.

### 6.6 Playwright end-to-end tests

Preserve the existing Playwright setup and create clear tiers:

- PR smoke: Chromium, critical journeys, deterministic data, no production;
- critical-change matrix: affected desktop and mobile/browser projects;
- nightly/release: full supported Firefox/WebKit/Chromium/mobile matrix.

Requirements:

- test isolation and synthetic tenant/user fixtures;
- trace on first retry or failure, screenshots/video only as useful artifacts;
- blob reports for sharding and merged HTML reports;
- fail the aggregate gate if Playwright classifies any required test as flaky;
- no retry-until-green;
- browser console/page errors fail unless explicitly expected;
- assert meaningful user outcomes, not merely page load;
- visual regression only for stable critical surfaces, with dynamic content masked;
- do not use visual snapshots to freeze intentionally fluid public/marketing design.

### 6.7 Accessibility

Use the existing Storybook accessibility addon and component tests. Configure applicable stories so accessibility violations are errors in CI.

Also add page-level accessibility checks for critical journeys. Gate on zero serious/critical automated violations. Test keyboard navigation, focus order/return, labels, roles, error announcements, contrast where automatable, reduced motion, zoom/responsive behavior, and screen-reader-relevant semantics.

Automated tooling is not complete accessibility proof. Add a concise release manual checklist for keyboard and screen-reader smoke testing. A documented manual-only story may not be used to hide an automatable violation.

### 6.8 Property-based and fuzz testing

Add `fast-check` or a compatible maintained TypeScript property-testing library for pure logic with broad input spaces.

Derive invariants from actual product rules. Candidate surfaces:

- estimate arithmetic and rounding;
- unit conversion;
- parsers/imports;
- serialization/deserialization;
- identifier/slug handling;
- date/time and timezone handling;
- state-machine transitions;
- idempotency and deduplication;
- permission matrices.

Include Unicode, empty, extreme, malformed, duplicate, reordered, and boundary values. Persist useful minimal counterexamples as regression tests.

### 6.9 Mutation testing

Add StrykerJS using the Vitest runner for mutation-compatible TypeScript/domain modules. Use a dedicated mutation Vitest config rather than mutating browser, Storybook, or Cloudflare integration suites directly.

Implement:

- changed-source mutation for PRs;
- critical-module mutation for `Q2`;
- comprehensive scheduled/release mutation for `Q3`;
- HTML and machine-readable reports;
- incremental/cache support when reliable;
- TypeScript checking for mutants where compatible;
- explicit, reviewed mutation exclusions only for generated/type-only/framework boilerplate.

Default thresholds:

- changed noncritical modules: mutation score must be at least 80%, target 90%;
- changed critical modules: at least 90%;
- no surviving mutant that changes authorization, tenant isolation, calculation boundaries, data integrity, cache privacy, idempotency, or error/failure behavior;
- no uncovered mutant in changed critical code.

A surviving equivalent mutant may be excluded only with a precise documented reason. “Hard to test,” “slow,” or “the code is obvious” is not sufficient.

### 6.10 Data and migration tests

For active D1 migrations and data changes, test locally:

- apply all migrations from an empty database;
- upgrade from representative prior schema/data fixtures;
- constraints, indexes, foreign-key/integrity behavior, transaction boundaries, and query plans where material;
- authorization/tenant filters at the query boundary;
- interruption/partial failure and fix-forward or restore procedure;
- export/import or restore rehearsal;
- no mutation of legacy Supabase or live D1.

Destructive or irreversible behavior remains separately gated.

### 6.11 Reliability, concurrency, and fault injection

For applicable systems, test:

- duplicate Queue delivery;
- out-of-order events;
- retry exhaustion and dead-letter behavior;
- Durable Object concurrent requests;
- timeouts and cancellation;
- partial upload and corrupt file;
- downstream provider failure;
- idempotent Cron execution;
- stale sessions/tokens;
- network interruption;
- recovery without data duplication or leakage.

Use deterministic fakes/fault injectors and bounded retries.

### 6.12 AI/agent feature evaluations

If the repository contains an implemented AI assistant or agent feature, add a separate eval gate with:

- versioned representative cases;
- groundedness and source-use checks;
- permission/data-boundary tests;
- prompt-injection and tool-abuse cases;
- refusal/error behavior;
- latency and cost budgets;
- deterministic or statistically stable graders;
- no release on material regression.

Do not create fictional evals for a feature that is only planned.

---

## 7. Coverage policy

Configure persistent LCOV and machine-readable coverage for each relevant runner. Merge or summarize suite reports without double-counting files.

Immediate hard gates:

- changed executable statements, lines, and functions: **100%**;
- changed branches: **at least 95%** for `Q1`, **100%** for `Q2`;
- critical modules: **100% line/function/statement/branch coverage** for changed behavior;
- no global coverage regression.

Legacy/global target:

- lines: 90%;
- statements: 90%;
- functions: 90%;
- branches: 85%.

If the measured legacy baseline is below the target, commit a transparent baseline/threshold configuration that:

- cannot be lower than the measured baseline except for a documented measurement correction;
- fails on any decrease;
- ratchets upward when the suite improves;
- preserves strict changed-code and critical-module thresholds immediately;
- contains no exclusion for real business logic.

Create a deterministic diff-coverage checker against the merge base. Do not depend solely on a hosted SaaS. Coverage exclusions must be narrow, documented, and validated. Generated declarations, generated artifacts, and test fixtures may be excluded; business logic may not.

Coverage is a minimum signal, not proof of correctness. Mutation, negative tests, and acceptance evidence remain mandatory.

---

## 8. Static quality and maintainability metrics

Extend the existing TypeScript/ESLint quality checks using the smallest maintained compatible toolset. Prefer changed-code/no-new-debt enforcement over flooding the migration with unrelated legacy failures.

Measure and gate, where applicable:

- TypeScript errors and unsafe suppressions;
- ESLint warnings (`--max-warnings=0` for gated scopes);
- new `any`, `@ts-ignore`, `eslint-disable`, TODO/FIXME debt, and disabled rules;
- cyclomatic/cognitive complexity;
- dependency cycles and forbidden layer imports;
- unused files/exports/dependencies;
- duplicated blocks;
- dead branches and unreachable code;
- oversized functions/modules as a review signal;
- bundle size and server/client boundary violations.

Suggested tools include ESLint built-in complexity rules, a maintained dead-code tool such as Knip, a dependency-boundary/cycle tool, and a duplication checker. Do not add multiple overlapping products when one tool suffices.

Default changed-code constraints:

- no new dependency cycle;
- no new dead export/dependency;
- no unexplained suppression;
- no new duplicated business-logic block;
- critical changed functions should remain at or below cyclomatic complexity 10 unless a stricter existing rule applies;
- any exception requires explicit human-approved, expiring quality waiver and cannot cover security/data-integrity behavior.

Store thresholds in one machine-readable file and prevent agents from silently lowering them.

---

## 9. Security and supply-chain gauntlet

Adopt the relevant OWASP ASVS 5.0 controls as the security verification baseline for this web application. Create a concise mapping from critical capabilities to applicable control IDs rather than claiming full ASVS certification without evidence.

At minimum implement or wire:

- authn/authz and object-level/tenant-isolation negative tests;
- session, cookie, redirect, CSRF, cache/privacy, input validation, file-upload, injection, XSS, SSRF, path handling, rate-limit/abuse, logging/redaction, and error-disclosure checks where applicable;
- CodeQL for JavaScript/TypeScript when available, with a documented OSS fallback when unavailable;
- dependency review on pull requests;
- Dependabot/security update configuration;
- `bun audit` or a reliable compatible vulnerability check;
- secret scanning and push-protection setup instructions/readback;
- GitHub Actions workflow lint/security analysis;
- explicit minimum `GITHUB_TOKEN` permissions;
- no `pull_request_target` execution of untrusted code;
- third-party actions pinned to full commit SHAs;
- frozen lockfile install;
- SBOM and artifact provenance/attestation for release when supported;
- zero new high/critical security findings;
- medium findings fixed or covered by an explicit human-approved, expiring waiver.

Do not upload source maps, logs, traces, fixtures, or reports containing secrets or private user data.

---

## 10. Performance, resource, and observability gates

Reuse the repository’s existing performance and observability scripts instead of replacing them.

Integrate applicable checks for:

- route-transition budgets;
- query counts and N+1 regressions;
- bundle-size regression;
- Worker CPU/time/memory constraints where measurable;
- critical-flow latency;
- upload/processing throughput;
- error handling and structured logs;
- PII/secret redaction;
- alert scenario readiness;
- correlation/trace context;
- no swallowed errors.

Use stable baselines and repeated/median measurements for noisy performance data. Default to failing a material fixed-budget violation or a statistically credible regression above 10%, but preserve a stricter existing budget.

A performance or observability check that requires hosted proof must be reported separately from local evidence and run only with the required authorization.

---

## 11. QA operating procedures

Create one canonical QA procedure and concise checklists.

### Definition of Ready

Before implementation, derive or record:

- user-visible outcome;
- business rules and invariants;
- actors/roles/tenants;
- happy, denial, boundary, failure, recovery, and concurrency behavior;
- data migration/compatibility impact;
- security/privacy impact;
- accessibility impact;
- observability and performance expectations;
- selected quality profile and exact evidence.

Do not ask the user to restate obvious criteria that can be derived from current behavior and source. Escalate only genuinely material ambiguity.

### Definition of Done

A code change is done only when:

- every acceptance criterion maps to a test or explicit non-automatable evidence;
- bug reproduction was red before green when feasible;
- required suites passed;
- changed-code coverage passed;
- mutation threshold passed where required;
- zero required test is skipped, focused, flaky, or quarantined;
- zero unresolved S0/S1 defect;
- zero high/critical security finding;
- zero serious/critical accessibility violation in affected scope;
- migration/recovery/concurrency evidence exists when applicable;
- final diff and generated artifacts were reviewed;
- quality manifest is complete;
- no required evidence is merely proposed or unrun.

### Defect policy

Use a severity model:

- S0: security breach, auth bypass, data loss/corruption, cross-tenant leak;
- S1: core journey unavailable or materially incorrect;
- S2: significant degraded behavior or workaround;
- S3: minor/cosmetic.

S0/S1 always block release. Every fixed defect receives a regression test. A break-glass production fix, if ever separately authorized, creates an incident record and mandatory post-fix regression test.

### Flaky-test policy

- zero accepted flakes in required gates;
- fixed seeds/time and isolated data;
- a single infrastructure retry may diagnose a transient failure, but the aggregate result remains flaky/fail if the first run failed;
- critical tests may never be quarantined;
- any temporary noncritical quarantine needs an owner, issue, reason, and expiry of at most seven days;
- expired quarantine fails CI;
- agents cannot self-approve a waiver.

### Exploratory QA

Create focused release charters for behavior not fully captured by automation: usability, visual coherence, real keyboard/screen-reader use, unusual device/input behavior, and recovery experience. Manual evidence supplements, never replaces, automatable checks.

---

## 12. Traceability and quality evidence

Create a lightweight, machine-readable critical-capability registry, for example `quality/critical-capabilities.yml`, containing:

- stable capability/requirement ID;
- owning paths;
- risk class;
- business invariant;
- required suites/tags;
- security controls;
- owner.

Create a validator that fails if a critical capability has no mapped executable acceptance scenario or required test layer.

Produce a machine-readable quality manifest in CI and a readable job summary containing:

- commit/base/head;
- risk profile and reasons;
- changed production/test files;
- acceptance/requirement IDs;
- commands and exit results;
- test counts and failures/skips/flakes;
- coverage by suite, global, changed, and critical paths;
- mutation score, no-coverage mutants, surviving mutants;
- BDD scenarios;
- accessibility findings;
- security findings;
- performance budget results;
- waivers and expiry;
- external evidence not collected;
- final `PASS|FAIL|QUALITY_BLOCKED`.

Do not commit volatile HTML/coverage/test reports. Store them as CI artifacts and ignore local report directories. Commit only stable configuration, thresholds, risk/traceability data, and documentation.

---

## 13. Package scripts and local developer interface

Preserve useful existing aliases and add or normalize stable scripts. Use these names unless a current equivalent is demonstrably clearer:

- `quality:contracts`
- `quality:classify`
- `quality:static`
- `test:unit`
- `test:unit:coverage`
- `test:component`
- `test:component:coverage`
- `test:workers`
- `test:workers:coverage`
- `test:contracts`
- `test:property`
- `test:bdd`
- `test:bdd:smoke`
- `test:a11y`
- `test:e2e:smoke`
- `test:e2e:matrix`
- `test:mutation:changed`
- `test:mutation:critical`
- `test:mutation:full`
- `quality:fast`
- `quality:pr`
- `quality:critical`
- `quality:release`
- `quality:report`
- `quality:verify`

Expected semantics:

- `quality:fast`: rapid local feedback; never presented as merge proof;
- `quality:pr`: deterministic `Q1` aggregate;
- `quality:critical`: deterministic `Q2` aggregate;
- `quality:release`: `Q3` aggregate;
- `quality:verify`: select and run the automatically classified profile;
- existing `validate`: either become an alias to the appropriate PR gate or remain a documented subset; it must not be described as complete if it omits mandatory evidence.

Use the exact Bun version from `packageManager` in CI and `bun install --frozen-lockfile`.

Likely new dev dependencies, after compatibility verification, include:

- `@cucumber/cucumber`;
- `@stryker-mutator/core`;
- `@stryker-mutator/vitest-runner`;
- a compatible Stryker TypeScript checker;
- `@vitest/coverage-v8`;
- `@vitest/coverage-istanbul`;
- `@cloudflare/vitest-pool-workers`;
- `fast-check`;
- the smallest necessary workflow/static/dead-code tooling.

Do not upgrade unrelated production dependencies.

---

## 14. GitHub Actions and merge enforcement

Inventory all existing workflows before creating new ones. Consolidate rather than duplicate.

Create a least-privilege quality workflow for pull requests and pushes to `main`, plus scheduled and manual release workflows. Use concurrency cancellation for superseded PR runs, explicit job timeouts, cache only safe deterministic inputs, and upload reports even on test failure when safe.

Use stable job/check names, for example:

1. `quality / classify`
2. `quality / contracts`
3. `quality / static`
4. `quality / unit`
5. `quality / component`
6. `quality / workers`
7. `quality / bdd-smoke`
8. `quality / a11y`
9. `quality / build`
10. `quality / e2e-smoke`
11. `quality / mutation-changed`
12. `quality / security`
13. `quality / gate`

The aggregate `quality / gate` must depend on every job required by the selected profile and fail if a required job is skipped, cancelled, missing, flaky, or malformed. A skipped job is not a pass unless the classifier proves it is inapplicable.

For `Q2`, add the relevant critical/full jobs. For nightly/release:

- full BDD;
- full browser/device matrix, sharded with merged reports;
- comprehensive mutation;
- performance;
- dependency/security;
- migration/restore;
- quality trend report.

Upload:

- JUnit/test reports;
- LCOV/coverage summaries;
- Cucumber JSON/HTML;
- Stryker JSON/HTML;
- Playwright blob/HTML/traces;
- accessibility results;
- SARIF/security reports;
- quality manifest.

Harden workflows:

- explicit minimal permissions per job;
- third-party actions pinned to full commit SHAs;
- no secrets in untrusted PR jobs;
- no unsafe `pull_request_target`;
- immutable/frozen dependency installation;
- workflow lint and security checks;
- artifact retention appropriate to sensitivity.

Create or update:

- `.github/PULL_REQUEST_TEMPLATE.md` with risk, acceptance, evidence, migration, security, a11y, performance, and rollback fields;
- `CODEOWNERS` for quality policy/workflows, migrations, auth/security, and provider configuration, using actual repository owners/teams rather than invented handles;
- Dependabot configuration;
- bug/incident templates that require regression-test and severity information where useful.

Prepare a GitHub ruleset specification for `main`:

- require a pull request;
- require strict, up-to-date status checks;
- require `quality / gate` and applicable code-scanning/security checks;
- block force pushes and branch deletion;
- require conversation resolution;
- require code-owner review for quality-policy, workflow, migration, and critical-security files when the collaborator model can support it without deadlocking a solo-maintainer repository;
- restrict bypass to an explicit break-glass role/process;
- require incident follow-up for any bypass.

Do not claim the ruleset is active until it is applied and read back. If remote application is unavailable, write `docs/quality/GITHUB_ENFORCEMENT.md` with exact check names and application/readback steps.

---

## 15. Files and adapters that must be audited

Do not edit only `AGENTS.md`. Search the entire repository for contradictory test policy and stale aliases. At minimum audit and update, when present:

- `AGENTS.md`;
- nested `AGENTS.md` / `AGENTS.override.md`;
- `.ai/00_system/AGENT_OPERATING_PROTOCOL.md`;
- `.ai/00_system/AGENT_FRAMEWORK_PROTOCOL.md`;
- `.ai/00_system/VALIDATION_MATRIX.md`;
- the canonical multi-agent execution directive;
- planning, commit, implementation, review, checkpoint, and refactor prompts;
- `.ai/10_state/current-state.md` FAST PATH;
- `.ai/12_agents/README.md`;
- `.ai/12_agents/payloads/*.md`;
- `.ai/12_agents/codex-role-model-matrix.json`;
- `CODEX.md`;
- `CLAUDE.md`;
- `GEMINI.md` and deprecated adapters that still redirect;
- `.codex/config.toml`;
- `.codex/agents/*.toml`;
- `.codex/prompts/*.md`;
- `.cursorrules`;
- `.cursor/rules/**`;
- `.cursor/commands/**`;
- `.commandcode/**`;
- `scripts/validate-ai-workflow-adapters.mjs`;
- `package.json`, Bun lock/config;
- Vitest, Playwright, Storybook, TypeScript, ESLint, and Cloudflare test configs;
- `.github/workflows/**`, PR templates, CODEOWNERS, Dependabot;
- `.gitignore`;
- test and quality documentation.

Update the workflow validator so it:

- requires beta posture, standing test authorization, the four quality profiles, fail-closed completion, and no-gaming language;
- requires all active adapters to point to the canonical policy;
- rejects the old phrases and semantics, including:
  - `alpha/pre-beta` as the current quality posture;
  - “automated testing is user-controlled”;
  - “only TEST_TASK permits test execution or edits”;
  - `NOT_REQUIRED|TEST_PROPOSAL|TEST_TASK`;
  - blanket prohibitions on browser, Storybook, screenshots, tests, or builds;
  - “unapproved tests cannot block”;
  - any instruction that treats required testing as optional or merely proposed;
- checks that required scripts/configs/risk maps/thresholds exist;
- checks that no adapter silently lowers the quality profile;
- remains within a sensible canonical instruction word/byte budget.

Update `.codex/config.toml` so its developer instructions no longer contain the speed-first prohibition on Playwright/browser evidence. Replace it with risk-appropriate mandatory verification: browser evidence is required when the changed behavior crosses a browser boundary; speed may select tiers but never erase required proof.

If new native roles are added, update the role/model matrix and validators. Prefer a minimal `quality-engineer`, `security-reviewer`, and/or `release-gatekeeper` set rather than role proliferation.

---

## 16. Bootstrap strategy for the existing beta codebase

Do not use legacy debt as a reason to leave the new system aspirational.

1. Measure the baseline before changing thresholds.
2. Preserve existing passing tests and useful proof scripts.
3. Fix broken test infrastructure required for the new gate.
4. Enforce strict changed-code and critical-path rules immediately.
5. Establish a no-regression global baseline and ratchet.
6. Backfill current critical beta journeys now, not merely as future TODOs.
7. Record remaining noncritical legacy gaps in a prioritized risk register with owners and acceptance criteria.
8. Do not mark the task complete if the gate exists only on paper or if no representative mutation/BDD/Workers/coverage job has actually run successfully.

At minimum, prove the new infrastructure with:

- one meaningful Gherkin feature executed end to end;
- one Cloudflare Workers-runtime integration suite using actual local bindings;
- one property-based suite;
- one Stryker mutation run that kills representative mutants;
- diff coverage enforcement;
- one Storybook/page accessibility gate;
- one Playwright smoke journey;
- one security/dependency workflow validation;
- tests for the quality classifier/aggregator itself;
- regression coverage for the current root cache-header behavior if present.

Then expand to all current critical capabilities identified by the risk inventory.

---

## 17. Anti-bypass checks

Create deterministic checks that fail on attempts to weaken the gauntlet, including:

- lowered coverage/mutation/security/a11y/performance thresholds;
- broadened coverage/mutation exclusions;
- new skipped/focused/quarantined tests;
- new Cucumber `@wip`/`@skip` on required features;
- removed critical scenarios without replacement;
- blind snapshot updates;
- increased retries or timeouts without approved justification;
- disabled lint/type/security rules;
- test code that catches and ignores failures;
- mocks replacing the system under test;
- `|| true`, `continue-on-error`, or equivalent on required CI jobs;
- aggregate jobs that pass when dependencies are skipped/missing;
- action tags instead of full SHAs;
- untrusted PR workflows with write permissions/secrets;
- an agent-authored waiver without explicit human approval;
- legacy opt-in test policy reintroduced in any adapter.

Changes to anti-bypass scripts or thresholds automatically select `Q2` and require independent review.

---

## 18. Required execution sequence

### Phase A — Discover and baseline

- Run `bun run supermemory:ensure` as currently required; treat failure as degraded tooling.
- Read the root agent contract and the FAST PATH.
- Inspect `git status --short --branch`.
- Inventory all policy adapters, workflows, configs, scripts, test directories, reports, and critical paths.
- Use GitNexus query/context/impact per current repository rules before symbol edits.
- Search for every legacy testing-policy phrase.
- Run the existing narrow baseline commands and record pre-existing failures separately.
- Measure current coverage and suite duration before setting thresholds.
- Inspect remote GitHub checks/rulesets read-only if tooling is authenticated.

### Phase B — Specify the target

- Build the critical-capability registry and path risk map from actual source.
- Select tool versions compatible with current Bun, Vitest, Next.js, React, Cloudflare, and TypeScript.
- Define the profile-to-command matrix and exact CI check names.
- Write acceptance criteria for the quality system itself.

### Phase C — Implement policy and infrastructure

- Update canonical policy and all adapters.
- Update validator and add validator tests.
- Add dependencies/configs/scripts.
- Add risk classifier, diff coverage, report aggregator, traceability, no-skip/no-weakening checks.
- Configure separate DOM and Workers Vitest projects.
- Add Cucumber, Stryker, property tests, accessibility, and CI.
- Integrate existing Cloudflare, observability, performance, Storybook, and Playwright scripts.

### Phase D — Backfill critical evidence

- Add/repair critical unit, contract, Workers, BDD, a11y, and E2E tests.
- Add negative, boundary, failure, concurrency, and recovery cases.
- Run mutation testing and repair weak tests until thresholds pass.
- Do not modify production behavior solely to satisfy a mistaken test; reconcile against requirements and current contracts.

### Phase E — Verify the verifier

- Intentionally prove that representative gates fail:
  - introduce a temporary local mutant or use Stryker and show it is killed;
  - verify a temporary skipped/focused test is rejected, then remove it;
  - verify a temporary threshold decrease or missing report is rejected, then remove it;
  - verify the aggregate gate fails on a required skipped job in a test fixture or unit test, not by corrupting the real workflow.
- Run contract validators and resolver/debug instruction inspection where available.
- Run the automatically selected quality profile and the fullest practical local gate.
- Run GitNexus `detect_changes()` or the repository’s safe wrapper before the final claim.
- Review the final diff and artifacts.

Do not leave temporary sabotage in the worktree.

---

## 19. Acceptance criteria for this migration

Do not report success unless all of the following are true:

1. The root and canonical agent contracts clearly describe beta quality posture and standing authorization for mandatory tests.
2. No active adapter retains the old opt-in test taxonomy or browser/test prohibition.
3. The policy validator rejects reintroduction of the old semantics.
4. A deterministic classifier selects `Q0`–`Q3` and cannot silently downgrade risk.
5. `quality:verify` runs the required profile.
6. Coverage is emitted, diff coverage is enforced, and the global no-regression ratchet exists.
7. Stryker is configured and a representative mutation run passes the defined threshold.
8. Executable Gherkin features and reports exist for real critical behavior.
9. Separate Workers-runtime tests use local Cloudflare bindings.
10. Property-based tests cover at least one real invariant-rich domain.
11. Playwright smoke and supported matrix tiers are defined.
12. Storybook/component and page-level accessibility gates are wired.
13. Security, dependency, workflow-hardening, and secret-protection procedures are represented in code/config and CI as available.
14. Required tests cannot be skipped, focused, flaky, or hidden with retries/`continue-on-error`.
15. Quality-system changes are themselves classified critical and independently reviewed.
16. Existing useful tests/proof scripts are preserved or intentionally consolidated.
17. CI has stable named jobs plus an aggregate fail-closed gate.
18. Ruleset/branch-protection requirements are applied and read back, or precisely documented as `EXTERNAL_ENFORCEMENT_PENDING`.
19. Reports and the final response distinguish local proof, CI configuration, remote enforcement, and hosted/production proof.
20. All commands actually run are reported honestly, including failures and unrun external checks.

---

## 20. Final response format

Return:

### Status

`PASS`, `FAIL`, or `QUALITY_BLOCKED`.

### What changed

Group exact paths by:

- canonical agent policy/adapters;
- test infrastructure;
- tests/features/evals;
- quality scripts/metrics;
- GitHub Actions/security;
- documentation.

### Risk model

- selected profile for this migration;
- critical capabilities and path rules;
- remaining legacy debt.

### Evidence table

For every command:

- command;
- scope;
- result/exit code;
- test counts;
- duration when meaningful;
- artifact/report path.

### Quality metrics

- global and changed coverage;
- critical-path coverage;
- mutation score and survivors;
- BDD scenarios;
- flakes/skips;
- accessibility findings;
- security findings;
- performance results.

### Remote enforcement

- workflows/check names created;
- ruleset/branch-protection state actually read back;
- exact pending administrator steps, if any.

### Remaining risk

Only real unresolved risks. Do not present an unrun command, planned test, or configured-but-unexecuted workflow as passing evidence.

---

## Final directive

Make this a working system, not an aspirational document. Prefer the existing Bun/Vitest/Playwright/Storybook/Cloudflare stack, add only the missing high-value tooling, and keep the agent contract concise while making the executable gates uncompromising.

When speed and proof conflict, optimize the implementation and tier the pipeline; do not remove the proof.
