# Beta Quality Engineering Protocol

## Purpose

Archestimator is beta software. Every executable change is incomplete until the
repository classifies its risk, runs the required local quality profile, and
produces fresh machine-readable evidence. `AGENTS.md` is the concise entry
contract; this protocol owns detailed engineering policy and
`.ai/00_system/VALIDATION_MATRIX.md` owns the profile-to-evidence mapping.

Historical material under `.ai/09_archive/**` records the policy that applied at
the time. It is read-only history, not active instruction and is excluded from
active-policy scans.

## Standing Authorization And Boundaries

Agents have standing authorization to create, repair, refactor, and run the
risk-appropriate local automated quality gates for repository changes. This
includes unit, component, integration, Workers-runtime, acceptance, property,
mutation, coverage, accessibility, browser, performance, security, dependency,
local migration, and local build evidence selected by the active profile.
Tests are implementation work, not an optional follow-up.

This standing authorization is local and repository-scoped. It does not
authorize commit, push, merge, branch/worktree mutation, deployment, production
endpoints or data, live provider mutation, paid services, secret disclosure, or
remote GitHub enforcement changes. Hosted or provider evidence may be claimed
only after the exact authorized authoritative readback succeeds.

## Mandatory Risk Profiles

The classifier selects the highest applicable profile from the merge-base to
the current worktree. User or agent input may escalate a profile and may never
downgrade it.

- `Q0_CONTRACT_ONLY`: true prose, comments, or diagrams with no executable,
  generated, gate, workflow, threshold, risk-map, or adapter behavior.
- `Q1_CHANGE_GATE`: every noncritical production-code, test-code,
  configuration, build, or generated-behavior change.
- `Q2_CRITICAL_CHANGE_GATE`: auth, privacy, tenant, cache, persisted data,
  migrations, calculations, uploads, exports, public access, concurrency,
  provider/runtime, external effects, security, observability, broad shared
  libraries, HIGH/CRITICAL impact, classification uncertainty, and the quality
  system itself.
- `Q3_RELEASE_GATE`: release-candidate, production-release, or main-branch
  release decisions across the complete release scope.

Unknown paths, malformed classifier input, classifier failure, or missing risk
metadata select `Q2_CRITICAL_CHANGE_GATE`. Exact requirements are defined in
the Validation Matrix and machine-readable quality policy.

## Engineering Lifecycle

Nontrivial executable work follows:

`DISCOVER -> SPECIFY -> RED -> IMPLEMENT -> VERIFY -> MUTATE/ADVERSARIAL -> REVIEW -> FINISH`

1. **Discover:** classify the whole worktree diff and affected execution flows;
   identify invariants, critical capabilities, external effects, and failure
   paths.
2. **Specify:** record acceptance criteria and executable happy, denial,
   boundary, failure, and recovery examples before final implementation.
3. **Red:** for a defect, capture a failing reproduction before the repair when
   feasible. For new behavior, prove the new assertion can fail through a
   pre-implementation failure, negative fixture, or equivalent mutation.
4. **Implement:** make the smallest coherent production and evidence change.
   Do not add test-only production branches or mock internal behavior.
5. **Verify:** run the automatically selected profile and read every required
   result. Missing, malformed, skipped, cancelled, flaky, or stale evidence is
   not green.
6. **Mutate/Adversarial:** exercise applicable negative, abuse, fault,
   concurrency, property, and mutation cases. Coverage alone cannot prove test
   strength.
7. **Review:** use a read-only quality reviewer for critical changes and a
   separate read-only security reviewer for security/auth/data-boundary
   changes. The author of the reviewed surface cannot supply an independent
   approval.
8. **Finish:** aggregate the evidence manifest. Completion is `PASS` only when
   every required result exists and passes; otherwise report `FAIL` or
   `QUALITY_BLOCKED`.

For small work, one agent may perform writing roles sequentially. A required
independent review must come from a distinct reviewer or be reported as
unavailable; a separated self-review is never called independent.

## No-Gaming Contract

Never obtain green by lowering a threshold, narrowing a glob, adding an
exclusion, weakening or deleting a valid assertion, blindly updating a
snapshot, increasing retries or timeouts, catching an expected failure, mocking
the system under test, hiding a failure in an average, or skipping/quarantining
required evidence.

Focused tests, silent skips, expired waivers, retry-pass flakes, collection
errors, unhandled errors, surviving high-risk mutants, and unresolved
high/critical findings fail the aggregate gate. Averages never offset critical
red.

Legacy noncritical debt may be admitted only through the reviewed baseline
schema with identity, owner, rationale, acceptance criteria, and expiry. New or
increased debt, unknown debt, infrastructure failure, unhandled errors, and
critical-capability failures cannot be ratcheted.

## Evidence And Completion

Every quality run emits a human-readable summary and machine-readable manifest
containing:

- selected profile, merge base, changed paths, affected capabilities, and
  classification reasons;
- acceptance/requirement IDs and the evidence that proves each one;
- exact commands, timestamps, exit status, report paths, and artifact hashes;
- tests added or changed, red-before-green evidence, coverage and mutation
  metrics, and security/accessibility/performance findings;
- inherited dirty, task-owned, and overlapping paths without excluding any
  required whole-worktree evidence;
- missing, skipped, flaky, malformed, unavailable, or externally blocked proof;
- independent review identities and verdicts when required;
- aggregate `PASS|FAIL|QUALITY_BLOCKED`, remaining risk, and stop condition.

Agent prose, configured-only tooling, an unrun command, an old artifact, or
local evidence presented as hosted proof cannot satisfy the gate. Required
external evidence without authority is `QUALITY_BLOCKED`, never `PASS`.

## Shared Worktree And Failure Handling

Preserve unfamiliar concurrent changes. Ownership affects attribution and
repair authority, not classification or evidence scope. If required evidence
fails only because a protected concurrent file cannot be safely changed, record
the exact hashes and failure as `QUALITY_BLOCKED`.

Fix the cause of red evidence before rerunning the narrowest invalidated layer.
Do not weaken the gate or silently reclassify the change. Escalate only an exact
external, destructive, credentialed, or ownership boundary after all safe local
prerequisites are complete.
