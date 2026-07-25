# Agent Operating Protocol

## Purpose

Turn a user request into a correct repository result with the least process that
preserves quality. `AGENTS.md` is the entry contract; this file defines the
execution mechanics.

## Lean Engineering

Archestimator is beta software. Ordinary local edits are not production change
events. Analyze the real blast radius, then prefer direct replacement, deletion,
current utilities, and fix-forward repair. Do not add compatibility, flags,
rollout, rollback, hosted proof, or approvals without a proven current user,
persisted-data, integration, external-side-effect, or explicit requirement.

Tokens, elapsed time, tool calls, context, artifacts, agents, and repeated checks
are engineering costs. More process is justified only when it changes a decision,
reduces a named risk, or proves a required claim.

## Lane Selection

### Direct

Default for clear bounded work. Read the relevant files, edit, verify, finish.

### Brief

Use an in-session plan for multi-file, moderately risky, or ambiguous work. Keep
it to target, scope, sequence, evidence, and stop condition.

### Plan Pack

Use only when explicitly requested or for genuinely expensive-to-reverse work:
destructive data migration, live auth/token compatibility, material security
boundaries, broad architecture replacement, or coordinated multi-owner work.
Follow `.ai/00_system/PLAN_PACK_EXECUTION_POLICY.md`.

## Task Contract

For non-trivial work establish: objective and intent; scope and exclusions;
inputs and authoritative paths; constraints, dependencies, assumptions, and
authorization boundaries; owner and capability class; tool and write
permissions; required outputs; acceptance criteria; selected `Q0`-`Q3` quality
profile and evidence; stop condition; and escalation condition.

Direct work may keep this contract mental. Brief work records it in-session.
Plan Pack work persists it. Do not create an artifact merely to restate a clear
request.

## Execution

Executable work uses
`DISCOVER -> SPECIFY -> RED -> IMPLEMENT -> VERIFY -> MUTATE/ADVERSARIAL -> REVIEW -> FINISH`.
True contract-only work may collapse non-applicable stages while retaining its
classified evidence.

### Discover

- Read the FAST PATH and relevant source.
- Map affected callers, contracts, persisted state, external effects, and failure
  paths only until the solution can be chosen confidently.
- Verify unstable external claims from primary documentation when necessary.
- Treat plans, memory, logs, and worker reports as leads until checked against
  current source or authoritative external state.

### Specify

- Resolve ordinary reversible choices autonomously and record acceptance
  criteria, invariants, and applicable happy, denial, boundary, failure, and
  recovery examples.
- On equal evidence, choose the simpler, faster fix-forward path.
- Ask only when an irreversible, destructive, paid, credential-gated, external-
  production, or materially scope-changing choice cannot be derived safely.
- Record durable decisions only when future work would otherwise repeat or
  contradict them.

### Red

- For defects, capture a failing reproduction before repair when feasible.
- For new behavior, prove the evidence can fail with pre-implementation red, a
  negative fixture, or equivalent mutation evidence.

### Implement

- Make the smallest coherent change that completes the requested behavior.
- Prefer deletion and reuse over new abstractions.
- Preserve concurrent work; reread shared files immediately before editing.
- Do not widen scope for adjacent cleanup unless required by the current change.

### Verify

Classify the whole diff and run the selected profile under
`.ai/00_system/BETA_QUALITY_ENGINEERING_PROTOCOL.md` and
`.ai/00_system/VALIDATION_MATRIX.md`. Standing authorization covers the
required local tests, builds, browser checks, and other automated evidence.
Missing, skipped, flaky, weakened, malformed, stale, or failed evidence is not
green. Quality-system changes and classification uncertainty select at least
`Q2_CRITICAL_CHANGE_GATE`.

If evidence fails, diagnose, change the hypothesis or implementation, and retry.
Do not repeat an exhausted tactic or lower the objective.

### Mutate/Adversarial

- Run the profile-required mutation, negative, abuse, fault, concurrency,
  property, accessibility, security, and recovery evidence.
- Never lower thresholds, narrow scope, weaken assertions, add retries/timeouts,
  or skip evidence to obtain green.

### Review

- Use an independent read-only quality review for `Q2`; add a distinct security
  review for security/auth/data-boundary work and release review for `Q3`.
- A writer cannot independently approve the surface they changed.

### Finish

- Reconcile every requested requirement to evidence.
- Update canonical `.ai` truth only when project reality changed.
- Leave auxiliary gaps visible without downgrading completed implementation.
- Require an aggregate evidence manifest of `PASS`; otherwise report `FAIL` or
  an exact `QUALITY_BLOCKED` boundary.
- Report result, changed files, evidence, and real remaining risk.

## Collaboration

Work directly by default. Delegate only independent bounded slices where the
expected time, context-isolation, or coverage gain exceeds coordination cost.
The lead owns scope, integration, decisions, verification, and the final claim.
When orchestration is used, follow
`.ai/08_prompts/000_Planning Prompts/Multi-Agent-Execution-Directive.md` for
assignments, ownership, synchronization, handoffs, portability, and recovery.

Use one writer per shared file or contract. A lightweight ownership note is
enough for ordinary work. Formal leases/heartbeats are plan-pack-only and only
for actual concurrent contention.

Use the fewest roles needed while preserving the review separation required by
the selected profile.

## Blockers

Internally resolvable dependencies are continuation work. Reorder, repair,
substitute, or implement them. Optional tools, agents, and memory cannot block
safe local work. Required profile evidence or review that cannot be produced
remains `FAIL` or `QUALITY_BLOCKED`, never `PASS`.

`AUTH_BLOCKED` applies only to the exact prohibited external action after every
safe local prerequisite is complete. `TECH_BLOCKED` applies only when a core
deliverable remains impossible after materially different local fallbacks fail
and no runnable next unit remains.

## Failure And Completion

Classify failure before retrying. Retry a transient tool or transport failure
once; on recurrence refresh context and use a materially different tactic,
capability, lane, or serialization strategy. Then take over locally or isolate
the exact external boundary. Never repeat an exhausted tactic, lower the
objective, or turn an optional-lane failure into a blocker.

Completion requires every core criterion reconciled to a current artifact,
fresh machine-readable profile evidence, required independent reviews, final
source/diff review, disclosed failures/proof gaps, and no safe in-scope work,
ownership, handoff, or cleanup left.

## Supermemory

<!-- supermemory-bootstrap: required -->
Run `bun run supermemory:ensure` at session start. Search before broad,
non-trivial, or recovery work. Add one sanitized durable memory only when project
truth materially changes. Verify memory against current source. Failure is a
degraded capability, not an unrelated implementation blocker.

## Provider Authority

Standing authorization covers resources currently bound in `wrangler.jsonc`:
Worker `archestimator-proof`, D1 `ARCH_DB`, R2 `ARCH_UPLOADS_R2`, Durable Objects
`COLLAB_ROOMS`/`GLOBAL_PRESENCE`/`SUPPORT_INBOX`, Queues
`UPLOAD_JOBS_QUEUE`/`CLIENT_PORTAL_NOTIFICATIONS_QUEUE`, Email `EMAIL`, and Images
`IMAGES`. Agents may change active migrations, scoped SQL, schema/index/query
behavior, and bound integration configuration, and may fix mistakes forward.

No paid add-ons, unbound resources, unrelated accounts/projects, legacy Supabase
mutation, actual external deploy, secrets exposure, or irreversible destructive
action without exact authority.

## Repository Safety

Stay in the current shared checkout. Preserve unfamiliar changes. Never reset,
clean, stash, revert, overwrite, branch, worktree, commit, push, or rewrite Git
history unless explicitly requested. These rules protect shared state; they do
not gate ordinary local implementation.
